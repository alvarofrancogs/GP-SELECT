using GpSelect.Domain;
using Microsoft.EntityFrameworkCore;

namespace GpSelect.Infrastructure;

public static class VehicleLock
{
    // Call inside a transaction, before reading photos: publication, gallery edits and the image worker share this lock.
    public static Task<VehicleUnit?> LockVehicleAsync(this GpSelectDbContext db, Guid id, CancellationToken ct = default) =>
        db.Vehicles.FromSqlInterpolated($"SELECT * FROM \"Vehicles\" WHERE \"Id\" = {id} FOR UPDATE").SingleOrDefaultAsync(ct);
}
