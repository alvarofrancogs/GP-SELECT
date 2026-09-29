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

    /// <summary>Draft (withdrawn), ComingSoon, Available, Reserved or Sold. Archived uses the archive endpoint.</summary>
    [HttpPost("{id:guid}/status")]
    public async Task<IActionResult> ChangeStatus(Guid id, StatusChangeRequest r)
    {
        var v = await db.Vehicles.FindAsync(id); if (v is null) return NotFound();
        try { v.ChangeStatus(r.Status, await db.Images.Where(x => x.VehicleUnitId == id).ToListAsync()); await db.SaveChangesAsync(); return Ok(await Map(v)); }
        catch (DomainException e) { return DomainProblem(e); }
    }

    [HttpPost("{id:guid}/publish")]
    public async Task<IActionResult> Publish(Guid id, [FromBody] PublishRequest? request)
    {
        var v = await db.Vehicles.FindAsync(id); if (v is null) return NotFound();
        try { v.Publish(await db.Images.Where(x => x.VehicleUnitId == id).ToListAsync(), request?.Target ?? VehicleStatus.ComingSoon); await db.SaveChangesAsync(); return Ok(await Map(v)); }
        catch (DomainException e) { return DomainProblem(e); }
    }

    [HttpPost("{id:guid}/archive")]
    public async Task<IActionResult> Archive(Guid id) { var v = await db.Vehicles.FindAsync(id); if (v is null) return NotFound(); v.Archive(); await db.SaveChangesAsync(); return NoContent(); }

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
        return File(await storage.OpenReadAsync(image.DetailKey, HttpContext.RequestAborted), "image/jpeg");
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
