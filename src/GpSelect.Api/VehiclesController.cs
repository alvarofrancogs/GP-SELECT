using GpSelect.Application; using GpSelect.Domain; using GpSelect.Infrastructure; using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc; using Microsoft.EntityFrameworkCore;
namespace GpSelect.Api;

[ApiController][Route("api/admin/vehicles")][Authorize(Roles="Admin")]
public class VehiclesController(GpSelectDbContext db, ISlugGenerator slugs, IObjectStorage storage) : ControllerBase
{
    private async Task<VehicleAdminDto> Map(VehicleUnit v) =>
        AdminMapping.Map(v, await db.Images.AsNoTracking().Where(x => x.VehicleUnitId == v.Id).ToListAsync());

    /// <summary>Two queries for the whole list: vehicles, then their active images grouped in memory.</summary>
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var vehicles = await db.Vehicles.AsNoTracking().OrderByDescending(x => x.UpdatedAt).ToListAsync();
        var ids = vehicles.Select(x => x.Id).ToList();
        var images = (await db.Images.AsNoTracking().Where(x => ids.Contains(x.VehicleUnitId) && x.State != ImageState.Deleted).ToListAsync())
            .ToLookup(x => x.VehicleUnitId);
        return Ok(vehicles.Select(v => AdminMapping.MapList(v, images[v.Id])));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id) { var v = await db.Vehicles.FindAsync(id); return v is null ? NotFound() : Ok(await Map(v)); }

    [HttpPost]
    public async Task<IActionResult> Create(CreateVehicleRequest r)
    {
        try
        {
            var v = VehicleUnit.Create(r.Make, r.Model, r.FirstRegistrationYear, r.FirstRegistrationMonth, slugs.Generate(r.Make, r.Model), r.InternalReference);
            db.Vehicles.Add(v); await db.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = v.Id }, await Map(v));
        }
        catch (DomainException e) { return DomainProblem(e); }
    }

    /// <summary>Merge-patch: only the properties present in the body change; an explicit null clears a clearable field.</summary>
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateVehicleRequest r)
    {
        var v = await db.Vehicles.FindAsync(id); if (v is null) return NotFound();
        try { v.Apply(r); await db.SaveChangesAsync(); return Ok(await Map(v)); }
        catch (DomainException e) { return DomainProblem(e); }
    }

    /// <summary>Draft (withdrawn), ComingSoon, Available, Reserved or Sold (optionally kept on show in the catalogue).
    /// Archived uses the archive endpoint.</summary>
    [HttpPost("{id:guid}/status")]
    public async Task<IActionResult> ChangeStatus(Guid id, StatusChangeRequest r)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        var v = await db.LockVehicleAsync(id); if (v is null) return NotFound();
        try { v.ChangeStatus(r.Status!.Value, await db.Images.Where(x => x.VehicleUnitId == id).ToListAsync(), r.ShowWhenSold); await db.SaveChangesAsync(); await tx.CommitAsync(); return Ok(await Map(v)); }
        catch (DomainException e) { return DomainProblem(e); }
    }

    /// <summary>The editor's single save: fields, photos (staged uploads kept, removals, order and so the cover) and
    /// status, in one transaction. Any error answers like the individual endpoints and leaves the vehicle unchanged.</summary>
    [HttpPost("{id:guid}/save")]
    public async Task<IActionResult> Save(Guid id, SaveVehicleRequest r)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        var v = await db.LockVehicleAsync(id); if (v is null) return NotFound();
        var images = await db.Images.Where(x => x.VehicleUnitId == id && x.State != ImageState.Deleted).ToListAsync();
        var oldCover = images.FirstOrDefault(x => x.IsCover)?.Id;
        var removed = new List<VehicleImage>();
        try
        {
            VehicleGallery.EnsureEditable(v);
            // Leaving the catalogue goes first, so a vehicle being withdrawn can lose its last photo or its price in
            // the same save; entering it goes last, once the photos it needs are in place.
            var target = r.Status?.Status;
            var leaves = target is not null && !VehicleVisibility.IsInCatalogue(target.Value, r.Status!.ShowWhenSold ?? v.ShowWhenSold);
            if (leaves) v.ChangeStatus(target!.Value, images, r.Status!.ShowWhenSold);
            // Sold has no price requirement; validate its final cover after applying the gallery.
            else if (target == VehicleStatus.Sold) v.ChangeStatus(VehicleStatus.Draft, images);
            if (r.Changes is not null) v.Apply(r.Changes);
            if (r.Gallery is not null)
            {
                var removing = r.Gallery.Removed ?? [];
                // Only the staged photos this editor lists are kept: another tab's uploads stay staged.
                var keeping = r.Gallery.Order ?? [];
                foreach (var image in images.Where(x => x.IsStaged && keeping.Contains(x.Id) && !removing.Contains(x.Id))) image.Publish();
                foreach (var imageId in removing.Distinct())
                {
                    var image = images.FirstOrDefault(x => x.Id == imageId) ?? throw new DomainException("invalid_gallery", "Unknown photo", "gallery");
                    VehicleGallery.Remove(v, image, images);
                    removed.Add(image);
                }
                if (r.Gallery.Order is not null) VehicleGallery.Reorder(images, r.Gallery.Order);
            }
            VehicleGallery.EnsureCover(images);
            if (target is not null && !leaves) v.ChangeStatus(target.Value, images, r.Status!.ShowWhenSold);
        }
        catch (DomainException e) { return DomainProblem(e); }

        var cover = images.FirstOrDefault(x => x.IsCover && x.State != ImageState.Deleted);
        var removedIds = removed.Select(x => x.Id).ToList();
        foreach (var job in await db.ImageJobs.Where(j => removedIds.Contains(j.ImageId) && (j.State == ImageJobState.Queued || j.State == ImageJobState.Processing)).ToListAsync()) job.Cancel();
        await db.SaveGalleryAsync(cover is not null && cover.Id != oldCover ? cover : null);
        await tx.CommitAsync();
        foreach (var key in removed.SelectMany(x => new[] { x.OriginalKey, x.CardKey, x.DetailKey }).OfType<string>())
            try { await storage.DeleteAsync(key, HttpContext.RequestAborted); } catch (Exception ex) { HttpContext.RequestServices.GetRequiredService<ILogger<VehiclesController>>().LogWarning(ex, "Image cleanup failed for {Key}", key); }
        return Ok(await Map(v));
    }

    [HttpPost("{id:guid}/publish")]
    public async Task<IActionResult> Publish(Guid id, [FromBody] PublishRequest? request)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        var v = await db.LockVehicleAsync(id); if (v is null) return NotFound();
        try { v.Publish(await db.Images.Where(x => x.VehicleUnitId == id).ToListAsync(), request?.Target ?? VehicleStatus.ComingSoon); await db.SaveChangesAsync(); await tx.CommitAsync(); return Ok(await Map(v)); }
        catch (DomainException e) { return DomainProblem(e); }
    }

    /// <summary>Hides the vehicle from the site and the working list until it is restored.</summary>
    [HttpPost("{id:guid}/archive")]
    public async Task<IActionResult> Archive(Guid id) { var v = await db.Vehicles.FindAsync(id); if (v is null) return NotFound(); v.Archive(); await db.SaveChangesAsync(); return NoContent(); }

    /// <summary>Brings an archived vehicle back as a draft.</summary>
    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> Restore(Guid id) { var v = await db.Vehicles.FindAsync(id); if (v is null) return NotFound(); v.Restore(); await db.SaveChangesAsync(); return Ok(await Map(v)); }

    [HttpGet("{id:guid}/preview")]
    public async Task<IActionResult> Preview(Guid id)
    {
        var v = await db.Vehicles.FindAsync(id); if (v is null) return NotFound();
        Response.Headers["X-Robots-Tag"] = "noindex, nofollow";
        var dto = PublicMapping.Map(v, await db.Images.Where(x => x.VehicleUnitId == id).ToListAsync());
        return Ok(dto with { Images = dto.Images.Select(x => x.Replace($"/api/public/vehicles/{Uri.EscapeDataString(v.PublicSlug)}/images/", $"/api/admin/vehicles/{v.Id}/preview/images/")).ToList() });
    }

    [HttpGet("{id:guid}/preview/images/{imageId:guid}/detail")]
    public async Task<IActionResult> PreviewImage(Guid id, Guid imageId)
    {
        var image = await db.Images.AsNoTracking().SingleOrDefaultAsync(x => x.Id == imageId && x.VehicleUnitId == id && x.State == ImageState.Ready);
        if (image is null || image.DetailKey is null) return NotFound();
        return await StoredImages.Serve(this, storage, image.DetailKey);
    }

    private ObjectResult DomainProblem(DomainException e) => DomainProblems.Create(this, e);
}

public sealed record PublishRequest(VehicleStatus Target);

/// <summary>Maps domain errors to problem details with a stable <c>code</c> and, when known, the <c>field</c>.</summary>
public static class DomainProblems
{
    public static int StatusFor(string code) => code switch
    {
        "archived" or "last_public_image" => StatusCodes.Status409Conflict,
        "incomplete" or "images_required" or "price_zero" => StatusCodes.Status422UnprocessableEntity,
        "enquiries_unavailable" => StatusCodes.Status503ServiceUnavailable,
        _ => StatusCodes.Status400BadRequest,
    };

    public static ObjectResult Create(ControllerBase controller, DomainException e)
    {
        var status = StatusFor(e.Code);
        var problem = controller.ProblemDetailsFactory.CreateProblemDetails(controller.HttpContext, status, title: e.Message);
        problem.Extensions["code"] = e.Code;
        if (e.Field is not null) problem.Extensions["field"] = e.Field;
        return new ObjectResult(problem) { StatusCode = status };
    }
}
