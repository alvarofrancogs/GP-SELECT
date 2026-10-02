using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GpSelect.Api;

[ApiController]
[Route("api/admin/vehicles/{vehicleId:guid}/images")]
[Authorize(Roles = "Admin")]
public sealed class ImageController(GpSelectDbContext db, IObjectStorage storage) : ControllerBase
{
    const long Max = 20 * 1024 * 1024;
    static readonly string[] Allowed = ["image/jpeg", "image/png", "image/webp"];

    static string Hash(object value)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }))));
    }

    string? Key()
    {
        return Request.Headers["Idempotency-Key"].FirstOrDefault();
    }

    IActionResult Replay(string hash, GpSelect.Infrastructure.IdempotencyRecord old)
    {
        return old.RequestHash == hash
            ? new ContentResult { StatusCode = old.StatusCode, ContentType = "application/json", Content = old.ResponseJson }
            : Problem(statusCode: 409, title: "Idempotency key was already used with a different payload", detail: "Use a new Idempotency-Key.");
    }

    [HttpPost("intent")]
    public async Task<IActionResult> Intent(Guid vehicleId, ImageIntentRequest request)
    {
        if (!Allowed.Contains(request.MimeType, StringComparer.OrdinalIgnoreCase))
            return Problem(statusCode: 415, title: "Unsupported image format");
        if (request.SizeBytes is < 1 or > Max)
            return Problem(statusCode: 413, title: "Image exceeds 20 MiB limit");
        if (!await db.Vehicles.AnyAsync(x => x.Id == vehicleId))
            return NotFound();
        var key = Key();
        if (string.IsNullOrWhiteSpace(key) || key.Length > 200)
            return Problem(statusCode: 400, title: "Idempotency-Key is required");
        var op = $"intent:{vehicleId}";
        var hash = Hash(request);
        var old = await db.IdempotencyRecords.SingleOrDefaultAsync(x => x.Operation == op && x.Key == key);
        if (old is not null)
            return Replay(hash, old);
        if (await db.Images.CountAsync(x => x.VehicleUnitId == vehicleId && x.State != ImageState.Deleted) >= 30)
            return Problem(statusCode: 409, title: "Maximum of 30 images reached");
        var image = VehicleImage.Create(vehicleId, $"quarantine/{vehicleId}/{Guid.NewGuid():N}.{Ext(request.MimeType)}", request.MimeType, request.SizeBytes, request.Staged);
        // New images go after the existing ones, so the order the admin sees is the upload order until reordered.
        image.Order((await db.Images.Where(x => x.VehicleUnitId == vehicleId && x.State != ImageState.Deleted).MaxAsync(x => (int?)x.SortOrder) ?? -1) + 1);
        db.Images.Add(image);
        var result = new
        {
            imageId = image.Id,
            uploadUrl = await storage.CreateUploadUrlAsync(image.OriginalKey, request.MimeType, HttpContext.RequestAborted),
            expiresInSeconds = 900
        };
        db.IdempotencyRecords.Add(new()
        {
            Operation = op,
            Key = key!,
            RequestHash = hash,
            StatusCode = 200,
            ResponseJson = JsonSerializer.Serialize(result)
        });
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            var race = await db.IdempotencyRecords.SingleOrDefaultAsync(x => x.Operation == op && x.Key == key);
            if (race is not null)
                return Replay(hash, race);
            throw;
        }
        return Ok(result);
    }

    static string Ext(string mime)
    {
        return mime.ToLowerInvariant() switch
        {
            "image/jpeg" => "jpg",
            "image/png" => "png",
            _ => "webp"
        };
    }

    [HttpPut("{imageId:guid}/upload")]
    [RequestSizeLimit(Max)]
    public async Task<IActionResult> Upload(Guid vehicleId, Guid imageId)
    {
        var image = await db.Images.SingleOrDefaultAsync(x => x.Id == imageId && x.VehicleUnitId == vehicleId);
        if (image is null)
            return NotFound();
        if (image.State != ImageState.PendingUpload)
            return Conflict();
        if (Request.ContentLength is null or < 1 or > Max)
            return Problem(statusCode: 413, title: "Image exceeds 20 MiB limit");
        var mime = Request.ContentType?.Split(';')[0].Trim();
        if (!Allowed.Contains(mime, StringComparer.OrdinalIgnoreCase) || !string.Equals(mime, image.MimeType, StringComparison.OrdinalIgnoreCase))
            return Problem(statusCode: 415, title: "Declared MIME type does not match intent");
        await storage.PutAsync(image.OriginalKey, Request.Body, mime!, HttpContext.RequestAborted);
        return NoContent();
    }

    [HttpPost("{imageId:guid}/complete")]
    public async Task<IActionResult> Complete(Guid vehicleId, Guid imageId)
    {
        var key = Key();
        if (string.IsNullOrWhiteSpace(key) || key.Length > 200)
            return Problem(statusCode: 400, title: "Idempotency-Key is required");
        var image = await db.Images.FirstOrDefaultAsync(x => x.Id == imageId && x.VehicleUnitId == vehicleId);
        if (image is null)
            return NotFound();
        var hash = Hash(new { vehicleId, imageId });
        var op = $"complete:{vehicleId}:{imageId}";
        var old = await db.IdempotencyRecords.SingleOrDefaultAsync(x => x.Operation == op && x.Key == key);
        if (old is not null)
            return Replay(hash, old);
        if (image.State == ImageState.PendingUpload)
        {
            var meta = await storage.HeadAsync(image.OriginalKey, HttpContext.RequestAborted);
            if (meta is null || meta.SizeBytes < 1 || meta.SizeBytes > Max || meta.SizeBytes != image.SizeBytes || !string.Equals(meta.ContentType, image.MimeType, StringComparison.OrdinalIgnoreCase))
                return Problem(statusCode: 409, title: "Uploaded object is missing or invalid");
            if (!await db.ImageJobs.AnyAsync(x => x.ImageId == image.Id && (x.State == ImageJobState.Queued || x.State == ImageJobState.Processing)))
                db.ImageJobs.Add(ImageProcessingJob.Create(image.Id));
        }
        var state = image.State switch
        {
            ImageState.PendingUpload => "Queued",
            ImageState.Processing => "Processing",
            ImageState.Ready => "Ready",
            ImageState.Deleted => "Deleted",
            ImageState.Failed => "Failed",
            _ => image.State.ToString()
        };
        var result = new { imageId = image.Id, state };
        var status = image.State == ImageState.Deleted ? 410 : 200;
        db.IdempotencyRecords.Add(new()
        {
            Operation = op,
            Key = key!,
            RequestHash = hash,
            StatusCode = status,
            ResponseJson = JsonSerializer.Serialize(result)
        });
        await db.SaveChangesAsync();
        return new JsonResult(result) { StatusCode = status };
    }

    [HttpGet("{imageId:guid}/status")]
    public async Task<IActionResult> Status(Guid vehicleId, Guid imageId)
    {
        var x = await db.Images.FirstOrDefaultAsync(x => x.Id == imageId && x.VehicleUnitId == vehicleId);
        return x is null ? NotFound() : Ok(new { imageId, state = x.State, error = x.FailureReason });
    }

    [HttpGet("{imageId:guid}/card")]
    public async Task<IActionResult> Card(Guid vehicleId, Guid imageId)
    {
        var x = await db.Images.AsNoTracking().SingleOrDefaultAsync(x => x.Id == imageId && x.VehicleUnitId == vehicleId && x.State == ImageState.Ready);
        if (x is null || x.CardKey is null)
            return NotFound();
        return File(await storage.OpenReadAsync(x.CardKey, HttpContext.RequestAborted), "image/jpeg");
    }

    [HttpGet("{imageId:guid}/detail")]
    public async Task<IActionResult> Detail(Guid vehicleId, Guid imageId)
    {
        var x = await db.Images.AsNoTracking().SingleOrDefaultAsync(x => x.Id == imageId && x.VehicleUnitId == vehicleId && x.State == ImageState.Ready);
        if (x is null || x.DetailKey is null)
            return NotFound();
        return File(await storage.OpenReadAsync(x.DetailKey, HttpContext.RequestAborted), "image/jpeg");
    }

    /// <summary>The cover is the first photo: making an image the cover moves it to the front.</summary>
    [HttpPost("{imageId:guid}/cover")]
    public async Task<IActionResult> Cover(Guid vehicleId, Guid imageId)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        var active = await db.Images.Where(x => x.VehicleUnitId == vehicleId && x.State != ImageState.Deleted).ToListAsync();
        var x = active.FirstOrDefault(x => x.Id == imageId);
        if (x is null)
            return NotFound();
        if (x.State != ImageState.Ready || x.IsStaged)
            return Conflict();
        await db.SaveGalleryAsync(VehicleGallery.MakeCover(active, x));
        await tx.CommitAsync();
        return Ok(new { imageId, isCover = true });
    }

    /// <summary>Soft-deletes the image. If it was the cover, the next ready image becomes the cover;
    /// a listed vehicle cannot lose its last ready image (409 last_public_image).</summary>
    [HttpPost("{imageId:guid}/remove")]
    public async Task<IActionResult> Remove(Guid vehicleId, Guid imageId)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        var vehicle = await db.Vehicles.FindAsync(vehicleId);
        if (vehicle is null)
            return NotFound();
        var active = await db.Images.Where(x => x.VehicleUnitId == vehicleId && x.State != ImageState.Deleted).ToListAsync();
        var x = active.FirstOrDefault(x => x.Id == imageId);
        if (x is null)
            return NotFound();
        VehicleImage? promoted;
        try
        {
            promoted = VehicleGallery.Remove(vehicle, x, active);
        }
        catch (DomainException e)
        {
            return DomainProblems.Create(this, e);
        }
        foreach (var job in await db.ImageJobs.Where(j => j.ImageId == x.Id && (j.State == ImageJobState.Queued || j.State == ImageJobState.Processing)).ToListAsync())
            job.Cancel();
        await db.SaveGalleryAsync(promoted);
        await tx.CommitAsync();
        foreach (var objectKey in new[] { x.OriginalKey, x.CardKey, x.DetailKey }.Where(k => k is not null).Select(k => k!))
        {
            try
            {
                await storage.DeleteAsync(objectKey, HttpContext.RequestAborted);
            }
            catch (Exception ex)
            {
                HttpContext.RequestServices.GetRequiredService<ILogger<ImageController>>().LogWarning(ex, "Image cleanup failed for {Key}", objectKey);
            }
        }
        return NoContent();
    }

    /// <summary>New order for every active image; the first ready image becomes the cover.</summary>
    [HttpPost("reorder")]
    public async Task<IActionResult> Reorder(Guid vehicleId, [FromBody] ReorderRequest request)
    {
        var ids = request.ImageIds;
        if (ids.Count > 30 || ids.Distinct().Count() != ids.Count)
            return Problem(statusCode: 400, title: "Invalid image order");
        await using var tx = await db.Database.BeginTransactionAsync();
        var images = await db.Images.Where(x => x.VehicleUnitId == vehicleId && x.State != ImageState.Deleted).ToListAsync();
        VehicleImage? cover;
        try
        {
            cover = VehicleGallery.Reorder(images, ids);
        }
        catch (DomainException)
        {
            return Problem(statusCode: 400, title: "Images must belong to vehicle and be active");
        }
        await db.SaveGalleryAsync(cover);
        await tx.CommitAsync();
        return Ok();
    }
}

/// <summary>Staged: an editor upload that stays out of the vehicle (never public, never the cover) until the editor saves.</summary>
public sealed record ImageIntentRequest(string MimeType, long SizeBytes, bool Staged = false);
public sealed record ReorderRequest(IReadOnlyList<Guid> ImageIds);
