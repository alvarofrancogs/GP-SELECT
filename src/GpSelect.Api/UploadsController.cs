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
    const long Max = 20 * 1024 * 1024;
    static readonly string[] Allowed = ["image/jpeg", "image/png", "image/webp"];

    [HttpPut("{**key}")]
    [RequestSizeLimit(Max)]
    public async Task<IActionResult> Put(string key)
    {
        if (string.IsNullOrWhiteSpace(key) || key.Contains("..", StringComparison.Ordinal) || key.Contains('\\') || !key.StartsWith("quarantine/", StringComparison.Ordinal))
            return BadRequest();
        var image = await db.Images.SingleOrDefaultAsync(x => x.OriginalKey == key);
        if (image is null)
            return NotFound();
        if (image.State != ImageState.PendingUpload)
            return Conflict();
        if (Request.ContentLength is null or < 1 or > Max)
            return Problem(statusCode: 413, title: "Image exceeds 20 MiB limit");
        var mime = Request.ContentType?.Split(';')[0].Trim();
        if (!Allowed.Contains(mime, StringComparer.OrdinalIgnoreCase) || !string.Equals(mime, image.MimeType, StringComparison.OrdinalIgnoreCase))
            return Problem(statusCode: 415, title: "Declared MIME type does not match intent");
        await storage.PutAsync(key, Request.Body, mime!, HttpContext.RequestAborted);
        return NoContent();
    }
}
