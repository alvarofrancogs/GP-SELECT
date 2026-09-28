using GpSelect.Application;
using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace GpSelect.Api;
[ApiController][Route("api/public/vehicles")]
public class PublicVehiclesController(GpSelectDbContext db,IObjectStorage storage):ControllerBase {
 [HttpGet]
 public async Task<ActionResult<IReadOnlyList<VehiclePublicCardDto>>> List(CancellationToken ct){
  var vehicles=await db.Vehicles.AsNoTracking()
   .Where(x=>x.Status==VehicleStatus.ComingSoon||x.Status==VehicleStatus.Available)
   .OrderBy(x=>x.CreatedAt).ThenBy(x=>x.Id).Take(100).ToListAsync(ct);
  var ids=vehicles.Select(x=>x.Id).ToList();
  var images=await db.Images.AsNoTracking().Where(x=>ids.Contains(x.VehicleUnitId)).ToListAsync(ct);
  return Ok(vehicles.Select(v=>PublicMapping.MapCard(v,images.Where(x=>x.VehicleUnitId==v.Id))).ToList());
 }
 [HttpGet("{slug}")] public async Task<IActionResult> Get(string slug){var v=await db.Vehicles.AsNoTracking().FirstOrDefaultAsync(x=>x.PublicSlug==slug&&(x.Status==VehicleStatus.ComingSoon||x.Status==VehicleStatus.Available));if(v is null)return NotFound();return Ok(PublicMapping.Map(v,await db.Images.AsNoTracking().Where(x=>x.VehicleUnitId==v.Id).ToListAsync()));}
 [HttpGet("{slug}/images/{imageId:guid}/detail")] public async Task<IActionResult> Image(string slug,Guid imageId){var z=await db.Images.AsNoTracking().Join(db.Vehicles,x=>x.VehicleUnitId,y=>y.Id,(x,y)=>new{x,y}).SingleOrDefaultAsync(z=>z.x.Id==imageId&&z.y.PublicSlug==slug&&(z.y.Status==VehicleStatus.ComingSoon||z.y.Status==VehicleStatus.Available)&&z.x.State==ImageState.Ready);if(z is null||z.x.DetailKey is null)return NotFound();Response.Headers.CacheControl="public,max-age=31536000,immutable";return File(await storage.OpenReadAsync(z.x.DetailKey,HttpContext.RequestAborted),"image/jpeg");}
 [HttpGet("{slug}/images/{imageId:guid}/card")] public async Task<IActionResult> Card(string slug,Guid imageId){var z=await db.Images.AsNoTracking().Join(db.Vehicles,x=>x.VehicleUnitId,y=>y.Id,(x,y)=>new{x,y}).SingleOrDefaultAsync(z=>z.x.Id==imageId&&z.y.PublicSlug==slug&&(z.y.Status==VehicleStatus.ComingSoon||z.y.Status==VehicleStatus.Available)&&z.x.State==ImageState.Ready);if(z is null||z.x.CardKey is null)return NotFound();Response.Headers.CacheControl="public,max-age=31536000,immutable";return File(await storage.OpenReadAsync(z.x.CardKey,HttpContext.RequestAborted),"image/jpeg");}
}