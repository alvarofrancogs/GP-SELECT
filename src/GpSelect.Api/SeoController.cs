using System.Globalization;
using System.Security;
using System.Text;
using GpSelect.Application;
using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GpSelect.Api;

/// <summary>Search and social crawlers do not run JavaScript. The public proxy sends <c>/vehiculos/{slug}</c> and
/// <c>/sitemap.xml</c> here; this answers with the SPA's own page, already carrying the vehicle's metadata, and
/// with a sitemap of the live inventory. Off (404) until <c>Seo:TemplateUrl</c> / <c>Seo:SiteUrl</c> are set.</summary>
[ApiController]
[ApiExplorerSettings(IgnoreApi = true)]
public class SeoController(GpSelectDbContext db, ISpaTemplate template, IConfiguration config, ILogger<SeoController> logger) : ControllerBase
{
    // The SPA's static routes (frontend/src/lib/pageMeta.ts, staticPageMeta).
    private static readonly string[] StaticPaths = ["/", "/vehiculos", "/importacion", "/nosotros", "/contacto"];

    [HttpGet("seo/vehiculos/{slug}")]
    public async Task<IActionResult> Vehicle(string slug, CancellationToken ct)
    {
        var html = await template.GetAsync(ct);
        // 503 lets the proxy fall back to the plain SPA, which still works (it loads the vehicle itself).
        if (html is null) return StatusCode(StatusCodes.Status503ServiceUnavailable);

        var vehicle = await db.Vehicles.AsNoTracking().Where(PublicVehiclesController.WithPublicDetail)
            .FirstOrDefaultAsync(x => x.PublicSlug == slug, ct);
        string? page;
        if (vehicle is null)
        {
            page = VehicleSeo.Fill(html, VehicleSeo.NotFoundHead(), "");
            Response.StatusCode = StatusCodes.Status404NotFound;
        }
        else
        {
            var images = await db.Images.AsNoTracking().Where(x => x.VehicleUnitId == vehicle.Id).ToListAsync(ct);
            var dto = PublicMapping.Map(vehicle, images);
            page = VehicleSeo.Fill(html, VehicleSeo.Head(dto, SiteUrl()), VehicleSeo.Body(dto));
        }
        if (page is null)
        {
            logger.LogError("SPA template has no page-meta markers or empty root; serving the plain SPA instead");
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }
        // Short: an edit in the Admin reaches crawlers and link previews within a minute.
        Response.Headers.CacheControl = "public,max-age=60";
        return new ContentResult { Content = page, ContentType = "text/html; charset=utf-8", StatusCode = Response.StatusCode };
    }

    [HttpGet("seo/sitemap.xml")]
    public async Task<IActionResult> Sitemap(CancellationToken ct)
    {
        var site = SiteUrl();
        if (site is null) return NotFound();
        // The listed vehicles only: a sold one kept off the list is reachable by its link but not promoted.
        var vehicles = await db.Vehicles.AsNoTracking().Where(PublicVehiclesController.Listed)
            .OrderByDescending(x => x.UpdatedAt).Select(x => new { x.PublicSlug, x.UpdatedAt }).ToListAsync(ct);
        var xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        foreach (var path in StaticPaths)
            xml.Append($"  <url><loc>{SecurityElement.Escape(site + path)}</loc></url>\n");
        foreach (var v in vehicles)
            xml.Append($"  <url><loc>{SecurityElement.Escape($"{site}/vehiculos/{Uri.EscapeDataString(v.PublicSlug)}")}</loc>"
                + $"<lastmod>{v.UpdatedAt.UtcDateTime.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}</lastmod></url>\n");
        xml.Append("</urlset>\n");
        Response.Headers.CacheControl = "public,max-age=300";
        return Content(xml.ToString(), "application/xml; charset=utf-8");
    }

    /// <summary>The public origin (https://domain, no path), or null when not configured or malformed.</summary>
    private string? SiteUrl()
    {
        var value = config["Seo:SiteUrl"];
        return Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme is "https" or "http"
            && uri.AbsolutePath == "/" && string.IsNullOrEmpty(uri.Query) ? uri.GetLeftPart(UriPartial.Authority) : null;
    }
}
