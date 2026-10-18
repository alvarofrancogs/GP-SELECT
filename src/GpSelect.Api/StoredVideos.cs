using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace GpSelect.Api;

internal static class StoredVideos
{
    // Serves the video honouring a single Range request. `size` comes from the DB row, so storage is never HEADed.
    public static async Task<IActionResult> Serve(ControllerBase controller, IObjectStorage storage, string key, long size, string? cacheControl)
    {
        var http = controller.HttpContext;
        var response = controller.Response;
        response.Headers.AcceptRanges = "bytes";

        var result = VideoRange.TryParse(http.Request.Headers.Range.ToString(), size, out var from, out var length);
        if (result == RangeResult.Unsatisfiable)
        {
            response.Headers.ContentRange = $"bytes */{size}";
            return controller.StatusCode(StatusCodes.Status416RangeNotSatisfiable);
        }

        var stream = result == RangeResult.Partial
            ? await storage.OpenRangeAsync(key, from, length, http.RequestAborted)
            : await storage.OpenReadAsync(key, http.RequestAborted);
        if (stream is null)
        {
            http.RequestServices.GetRequiredService<ILoggerFactory>()
                .CreateLogger("GpSelect.Api.StoredVideos").LogWarning("Video object is missing from storage: {Key}", key);
            return controller.NotFound();
        }

        if (cacheControl is not null) response.Headers.CacheControl = cacheControl;
        response.ContentType = "video/mp4";
        response.ContentLength = length;
        if (result == RangeResult.Partial)
        {
            response.StatusCode = StatusCodes.Status206PartialContent;
            response.Headers.ContentRange = $"bytes {from}-{from + length - 1}/{size}";
        }

        await using (stream) await stream.CopyToAsync(response.Body, http.RequestAborted);
        return new EmptyResult();
    }
}
