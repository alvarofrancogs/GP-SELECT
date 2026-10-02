using System.Linq.Expressions;
using GpSelect.Application;
using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace GpSelect.Api;

[ApiController][Route("api/public/vehicles")]
public class PublicVehiclesController(GpSelectDbContext db, IObjectStorage storage) : ControllerBase
{
    // SQL twins of VehicleVisibility: the catalogue lists ComingSoon, Available, Reserved and the Sold vehicles kept
    // on show; detail pages also serve Sold vehicles that were published at some point.
    private static readonly Expression<Func<VehicleUnit, bool>> Listed = x =>
        x.Status == VehicleStatus.ComingSoon || x.Status == VehicleStatus.Available || x.Status == VehicleStatus.Reserved
        || (x.Status == VehicleStatus.Sold && x.ShowWhenSold);
    private static readonly Expression<Func<VehicleUnit, bool>> WithPublicDetail = x =>
        x.Status == VehicleStatus.ComingSoon || x.Status == VehicleStatus.Available || x.Status == VehicleStatus.Reserved
        || (x.Status == VehicleStatus.Sold && (x.ShowWhenSold || x.PublishedAt != null));

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<VehiclePublicCardDto>>> List(CancellationToken ct)
    {
        // Newest first, sold vehicles kept on show after everything still for sale.
        var vehicles = await db.Vehicles.AsNoTracking().Where(Listed).OrderBy(x => x.Status == VehicleStatus.Sold)
            .ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).Take(100).ToListAsync(ct);
        var ids = vehicles.Select(x => x.Id).ToList();
        var images = (await db.Images.AsNoTracking().Where(x => ids.Contains(x.VehicleUnitId)).ToListAsync(ct)).ToLookup(x => x.VehicleUnitId);
        return Ok(vehicles.Select(v => PublicMapping.MapCard(v, images[v.Id])).ToList());
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> Get(string slug)
    {
        var v = await db.Vehicles.AsNoTracking().Where(WithPublicDetail).FirstOrDefaultAsync(x => x.PublicSlug == slug);
        if (v is null) return NotFound();
        return Ok(PublicMapping.Map(v, await db.Images.AsNoTracking().Where(x => x.VehicleUnitId == v.Id).ToListAsync()));
    }

    [HttpGet("{slug}/images/{imageId:guid}/detail")]
    public Task<IActionResult> Image(string slug, Guid imageId) => Serve(slug, imageId, detail: true);

    [HttpGet("{slug}/images/{imageId:guid}/card")]
    public Task<IActionResult> Card(string slug, Guid imageId) => Serve(slug, imageId, detail: false);

    private async Task<IActionResult> Serve(string slug, Guid imageId, bool detail)
    {
        var vehicle = await db.Vehicles.AsNoTracking().Where(WithPublicDetail).Where(x => x.PublicSlug == slug).Select(x => (Guid?)x.Id).FirstOrDefaultAsync();
        if (vehicle is null) return NotFound();
        var image = await db.Images.AsNoTracking().SingleOrDefaultAsync(x => x.Id == imageId && x.VehicleUnitId == vehicle && x.State == ImageState.Ready && !x.IsStaged);
        var key = detail ? image?.DetailKey : image?.CardKey;
        if (key is null) return NotFound();
        Response.Headers.CacheControl = "public,max-age=86400";
        return File(await storage.OpenReadAsync(key, HttpContext.RequestAborted), "image/jpeg");
    }
}
