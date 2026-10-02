using GpSelect.Domain;
using Microsoft.EntityFrameworkCore;

namespace GpSelect.Infrastructure;

public static class CoverPersistence
{
    /// <summary>Saves a gallery change. A unique index allows one active cover per vehicle, so when the cover
    /// moves the old one is cleared in a first save and the new one is set in a second. Call it inside the
    /// caller's transaction so both saves commit together.</summary>
    public static async Task SaveGalleryAsync(this GpSelectDbContext db, VehicleImage? newCover, CancellationToken ct = default)
    {
        if (newCover is not null)
        {
            newCover.SetCover(false);
            await db.SaveChangesAsync(ct);
            newCover.SetCover(true);
        }
        await db.SaveChangesAsync(ct);
    }
}
