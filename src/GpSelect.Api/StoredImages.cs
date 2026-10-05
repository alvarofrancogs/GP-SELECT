using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace GpSelect.Api;

internal static class StoredImages
{
    public static async Task<IActionResult> Serve(ControllerBase controller, IObjectStorage storage, string key, string? cacheControl = null)
    {
        var stream = await storage.OpenReadAsync(key, controller.HttpContext.RequestAborted);
        if (stream is null)
        {
            controller.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>()
                .CreateLogger("GpSelect.Api.StoredImages").LogWarning("Image object is missing from storage: {Key}", key);
            return controller.NotFound();
        }

        if (cacheControl is not null) controller.Response.Headers.CacheControl = cacheControl;
        return controller.File(stream, "image/jpeg");
    }
}
