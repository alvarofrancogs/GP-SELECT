using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GpSelect.Api;

[ApiController]
[Route("api/admin/uploads")]
[Authorize(Roles = "Admin")]
public sealed class UploadsController(GpSelectDbContext db, IObjectStorage storage) : ControllerBase
{
    static readonly string[] Allowed = ["image/jpeg", "image/png", "image/webp"];

    /// <summary>Local stand-in for the signed storage URL. Images go to quarantine/ (20 MiB); a video goes straight to
    /// its final vehicles/…/videos/ key (100 MiB). The body limit is the larger one; each type checks its own.</summary>
    [HttpPut("{**key}")]
    [RequestSizeLimit(VideoRules.MaxUploadBytes)]
    public async Task<IActionResult> Put(string key)
    {
        if (string.IsNullOrWhiteSpace(key) || key.Contains("..", StringComparison.Ordinal) || key.Contains('\\'))
            return BadRequest();
        if (key.StartsWith("vehicles/", StringComparison.Ordinal) && key.Contains("/videos/", StringComparison.Ordinal))
            return await PutVideo(key);
        if (!key.StartsWith("quarantine/", StringComparison.Ordinal))
            return BadRequest();
        var image = await db.Images.SingleOrDefaultAsync(x => x.OriginalKey == key);
        if (image is null)
            return NotFound();
        if (image.State != ImageState.PendingUpload)
            return Conflict();
        if (Request.ContentLength is null or < 1 or > ImagePipeline.MaxUploadBytes)
            return Problem(statusCode: 413, title: "Image exceeds 20 MiB limit");
        if (Request.ContentLength != image.SizeBytes)
            return Problem(statusCode: 413, title: "Declared size does not match intent");
        var mime = Request.ContentType?.Split(';')[0].Trim();
        if (!Allowed.Contains(mime, StringComparer.OrdinalIgnoreCase) || !string.Equals(mime, image.MimeType, StringComparison.OrdinalIgnoreCase))
            return Problem(statusCode: 415, title: "Declared MIME type does not match intent");
        await storage.PutAsync(key, Request.Body, mime!, HttpContext.RequestAborted);
        return NoContent();
    }

    async Task<IActionResult> PutVideo(string key)
    {
        var video = await db.Videos.SingleOrDefaultAsync(x => x.Key == key);
        if (video is null)
            return NotFound();
        if (video.State != VideoState.PendingUpload)
            return Conflict();
        if (Request.ContentLength is null or < 1 or > VideoRules.MaxUploadBytes)
            return Problem(statusCode: 413, title: "Video exceeds 100 MiB limit");
        if (Request.ContentLength != video.SizeBytes)
            return Problem(statusCode: 413, title: "Declared size does not match intent");
        var mime = Request.ContentType?.Split(';')[0].Trim();
        if (!string.Equals(mime, video.MimeType, StringComparison.OrdinalIgnoreCase))
            return Problem(statusCode: 415, title: "Declared MIME type does not match intent");
        await storage.PutAsync(key, Request.Body, video.MimeType, HttpContext.RequestAborted);
        return NoContent();
    }
}
