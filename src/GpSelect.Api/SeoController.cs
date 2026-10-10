using System.Globalization;
using System.Security;
using System.Text;
using GpSelect.Application;
using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GpSelect.Api;

/// <summary>The public proxy sends the ES/EN catalogues, vehicle pages and <c>/sitemap.xml</c> here.
/// This answers with the SPA's own page, already carrying the vehicle's metadata, and a sitemap of the live inventory. Off (404) until <c>Seo:TemplateUrl</c> / <c>Seo:SiteUrl</c> are set.</summary>
[ApiController]
[ApiExplorerSettings(IgnoreApi = true)]
public class SeoController(GpSelectDbContext db, ISpaTemplate template, IConfiguration config, ILogger<SeoController> logger) : ControllerBase
{
    // The SPA's static routes in both languages (frontend/src/i18n/routes.ts, staticPageMeta in pageMeta.ts).
    private static readonly string[] StaticPaths =
        ["/", "/vehiculos", "/importacion", "/nosotros", "/contacto", "/en", "/en/vehicles", "/en/import", "/en/about", "/en/contact"];

    [HttpGet("seo/vehiculos")]
    public Task<IActionResult> Catalogue(CancellationToken ct) => CataloguePage("es", ct);

    [HttpGet("seo/en/vehicles")]
    public Task<IActionResult> EnglishCatalogue(CancellationToken ct) => CataloguePage("en", ct);

    private async Task<IActionResult> CataloguePage(string locale, CancellationToken ct)
    {
        var english = locale == "en";
        var path = english ? "/en/vehicles" : "/vehiculos";
        if (string.IsNullOrWhiteSpace(config["Seo:TemplateUrl"])) return NotFound();
        var html = await template.GetAsync($"{path.TrimStart('/')}/index.html", ct);
        const string open = "<!--vehicle-list-->";
        const string close = "<!--/vehicle-list-->";
        var start = html?.IndexOf(open, StringComparison.Ordinal) ?? -1;
        var end = start < 0 ? -1 : html!.IndexOf(close, start + open.Length, StringComparison.Ordinal);
        if (end < 0) return StatusCode(StatusCodes.Status503ServiceUnavailable);

        var vehicles = await db.Vehicles.AsNoTracking().Where(PublicVehiclesController.Listed)
            .OrderBy(x => x.Status == VehicleStatus.Sold).ThenByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id).Take(VehicleQueryLimits.MaxVehicles).ToListAsync(ct);
        var list = new StringBuilder();
        if (vehicles.Count > 0)
        {
            list.Append("<ul>");
            foreach (var v in vehicles)
            {
                var name = $"{v.Make} {v.Model}{(v.Variant is { Length: > 0 } ? $" {v.Variant}" : "")} ({v.FirstRegistrationYear})";
                list.Append($"<li><a href=\"{path}/{Uri.EscapeDataString(v.PublicSlug)}\">{VehicleSeo.E(name)}</a>"
                    + (v.Status == VehicleStatus.Sold ? (english ? " · Sold" : " · Vendido") : "") + "</li>");
            }
            list.Append("</ul>");
        }
        var page = html![..(start + open.Length)] + list + html[end..];
        Response.Headers.CacheControl = "public,max-age=60";
        return Content(page, "text/html; charset=utf-8");
    }

    [HttpGet("seo/vehiculos/{slug}")]
    public Task<IActionResult> Vehicle(string slug, CancellationToken ct) => VehiclePage(slug, "es", ct);

    [HttpGet("seo/en/vehicles/{slug}")]
    public Task<IActionResult> EnglishVehicle(string slug, CancellationToken ct) => VehiclePage(slug, "en", ct);

    private async Task<IActionResult> VehiclePage(string slug, string locale, CancellationToken ct)
    {
        var html = locale == "en" ? await template.GetAsync("en/spa.html", ct) : await template.GetAsync(ct);
        // 503 lets the proxy fall back to the plain SPA, which still works (it loads the vehicle itself).
        if (html is null) return StatusCode(StatusCodes.Status503ServiceUnavailable);

        var vehicle = await db.Vehicles.AsNoTracking().Where(PublicVehiclesController.WithPublicDetail)
            .FirstOrDefaultAsync(x => x.PublicSlug == slug, ct);
        string? page;
        if (vehicle is null)
        {
            page = VehicleSeo.Fill(html, VehicleSeo.NotFoundHead(locale), "");
            Response.StatusCode = StatusCodes.Status404NotFound;
        }
        else
        {
            var images = await db.Images.AsNoTracking().Where(x => x.VehicleUnitId == vehicle.Id).ToListAsync(ct);
            var dto = PublicMapping.Map(vehicle, images);
            page = VehicleSeo.Fill(html, VehicleSeo.Head(dto, SiteUrl(), locale), VehicleSeo.Body(dto, locale), dto);
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
        // Both catalogues change whenever a vehicle that was ever public changes, including when it leaves the list.
        // The other static pages carry no lastmod: no real content date exists for them.
        var catalogueChanged = await db.Vehicles.AsNoTracking().Where(x => x.PublishedAt != null)
            .MaxAsync(x => (DateTimeOffset?)x.UpdatedAt, ct);
        var xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        foreach (var path in StaticPaths)
            xml.Append($"  <url><loc>{SecurityElement.Escape(site + path)}</loc>"
                + ((path is "/vehiculos" or "/en/vehicles") && catalogueChanged is { } changed ? LastMod(changed) : "") + "</url>\n");
        foreach (var v in vehicles)
            foreach (var path in new[] { "/vehiculos", "/en/vehicles" })
                xml.Append($"  <url><loc>{SecurityElement.Escape($"{site}{path}/{Uri.EscapeDataString(v.PublicSlug)}")}</loc>"
                    + LastMod(v.UpdatedAt) + "</url>\n");
        xml.Append("</urlset>\n");
        Response.Headers.CacheControl = "public,max-age=300";
        return Content(xml.ToString(), "application/xml; charset=utf-8");
    }

    private static string LastMod(DateTimeOffset at) =>
        $"<lastmod>{at.UtcDateTime.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}</lastmod>";

    /// <summary>The public origin (https://domain, no path), or null when not configured or malformed.</summary>
    private string? SiteUrl()
    {
        var value = config["Seo:SiteUrl"];
        return Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme is "https" or "http"
            && uri.AbsolutePath == "/" && string.IsNullOrEmpty(uri.Query) ? uri.GetLeftPart(UriPartial.Authority) : null;
    }
}
