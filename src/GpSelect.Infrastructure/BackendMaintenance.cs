using GpSelect.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GpSelect.Infrastructure;

public sealed class BackendMaintenance(GpSelectDbContext db, IObjectStorage storage, IConfiguration config, ILogger<BackendMaintenance> logger)
{
    public async Task RunAsync(DateTimeOffset now, CancellationToken ct)
    {
        var retentionDays = int.TryParse(config["Enquiries:RetentionDays"], out var days) ? days : 30;
        if (retentionDays < 1) throw new InvalidOperationException("Enquiries:RetentionDays must be at least 1.");
        var cutoff = now.AddDays(-retentionDays);
        // RETURNING counts the rows actually deleted, even if the outbox updated one concurrently.
        await using (var command = db.Database.GetDbConnection().CreateCommand())
        {
            await db.Database.OpenConnectionAsync(ct);
            command.CommandText = "DELETE FROM \"Enquiries\" WHERE \"CreatedAt\" < @cutoff RETURNING \"NotificationStatus\"";
            var parameter = command.CreateParameter(); parameter.ParameterName = "cutoff"; parameter.Value = cutoff;
            command.Parameters.Add(parameter);
            var deleted = 0; var undelivered = 0;
            await using (var reader = await command.ExecuteReaderAsync(ct))
                while (await reader.ReadAsync(ct))
                {
                    deleted++;
                    if (reader.GetString(0) != nameof(EnquiryNotificationStatus.Sent)) undelivered++;
                }
            logger.LogInformation("Enquiry retention deleted {Count} rows", deleted);
            logger.LogInformation("Enquiry retention deleted {Count} never-delivered rows", undelivered);
        }
        await db.IdempotencyRecords.Where(x => x.CreatedAt < now.AddHours(-48)).ExecuteDeleteAsync(ct);

        var abandonedBefore = now.AddHours(-24);
        var candidates = await db.Images.AsNoTracking().Where(x =>
            ((x.State == ImageState.Deleted && (x.StorageCleanedAt == null || x.StorageCleanedAt > abandonedBefore)) ||
                (x.State == ImageState.PendingUpload && x.CreatedAt < abandonedBefore &&
                !db.ImageJobs.Any(j => j.ImageId == x.Id))) &&
            db.Vehicles.Any(v => v.Id == x.VehicleUnitId && v.Status != VehicleStatus.Archived))
            .Select(x => new { x.Id, x.VehicleUnitId }).ToListAsync(ct);
        foreach (var candidate in candidates)
        {
            try
            {
                await using var tx = await db.Database.BeginTransactionAsync(ct);
                // Lock the vehicle against archiving, and the image against completion/deletion while cleaning storage.
                var vehicle = await db.Vehicles.FromSqlInterpolated($"SELECT * FROM \"Vehicles\" WHERE \"Id\" = {candidate.VehicleUnitId} FOR UPDATE")
                    .AsNoTracking().SingleOrDefaultAsync(ct);
                if (vehicle is null || vehicle.Status == VehicleStatus.Archived) continue;
                var image = await db.Images.FromSqlInterpolated($"SELECT * FROM \"Images\" WHERE \"Id\" = {candidate.Id} FOR UPDATE")
                    .AsNoTracking().SingleOrDefaultAsync(ct);
                if (image is null) continue;
                var abandoned = image.State == ImageState.PendingUpload && image.CreatedAt < abandonedBefore &&
                    !await db.ImageJobs.AnyAsync(j => j.ImageId == image.Id, ct);
                if (!abandoned && image.State != ImageState.Deleted) continue;
                if (image.State == ImageState.Deleted && image.StorageCleanedAt <= abandonedBefore) continue;
                var prefix = $"vehicles/{image.VehicleUnitId}/{image.Id}";
                // Derived keys can exist after a worker wrote them but lost the race to a removal.
                var keys = abandoned ? new[] { image.OriginalKey } :
                    new[] { image.OriginalKey, image.CardKey, image.DetailKey, prefix + "/card.jpg", prefix + "/detail.jpg" };
                foreach (var key in keys.Where(x => x is not null).Distinct())
                    await storage.DeleteAsync(key!, ct);
                if (abandoned) await db.Images.Where(x => x.Id == image.Id).ExecuteDeleteAsync(ct);
                else if (image.StorageCleanedAt is null)
                    await db.Images.Where(x => x.Id == image.Id && x.StorageCleanedAt == null)
                        .ExecuteUpdateAsync(u => u.SetProperty(x => x.StorageCleanedAt, (DateTimeOffset?)now), ct);
                // Retry deleted tombstones for 24 hours after the first successful clean to catch late writes.
                await tx.CommitAsync(ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning("Image {ImageId} maintenance failed ({Error})", candidate.Id, ex.GetType().Name);
            }
        }
    }

    /// <summary>Deletes stored objects no live image row points to. Only the two prefixes the API writes, and only objects
    /// older than 48 hours, so an upload or a processing run in flight is never touched.</summary>
    public async Task SweepOrphansAsync(DateTimeOffset now, CancellationToken ct)
    {
        var rows = await db.Images.AsNoTracking().Where(x => x.State != ImageState.Deleted)
            .Select(x => new { x.Id, x.VehicleUnitId, x.OriginalKey, x.CardKey, x.DetailKey }).ToListAsync(ct);
        var keys = new HashSet<string>(StringComparer.Ordinal);
        var folders = new HashSet<string>(StringComparer.Ordinal);
        foreach (var row in rows)
        {
            keys.Add(row.OriginalKey);
            if (row.CardKey is not null) keys.Add(row.CardKey);
            if (row.DetailKey is not null) keys.Add(row.DetailKey);
            folders.Add($"vehicles/{row.VehicleUnitId}/{row.Id}/");
        }
        var olderThan = now.AddHours(-48);
        var orphans = new List<string>();
        foreach (var prefix in new[] { "quarantine/", "vehicles/" })
            await foreach (var item in storage.ListAsync(prefix, ct))
            {
                if (item.LastModified >= olderThan || keys.Contains(item.Key)) continue;
                // Derivatives live in a folder per image: vehicles/{vehicleId}/{imageId}/card.jpg.
                var slash = item.Key.LastIndexOf('/');
                if (slash > 0 && folders.Contains(item.Key[..(slash + 1)])) continue;
                orphans.Add(item.Key);
            }
        // Deleted after listing: removing files while a directory is enumerated is not reliable.
        foreach (var key in orphans) await storage.DeleteAsync(key, ct);
        logger.LogInformation("Storage sweep deleted {Count} orphaned objects", orphans.Count);
    }
}

public sealed class BackendMaintenanceWorker(IServiceScopeFactory scopes, ILogger<BackendMaintenanceWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        DateTimeOffset? lastSweep = null;
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var maintenance = scope.ServiceProvider.GetRequiredService<BackendMaintenance>();
                var now = DateTimeOffset.UtcNow;
                await maintenance.RunAsync(now, stoppingToken);
                // Listing the whole bucket is the expensive part: once a day is enough.
                if (lastSweep is null || now - lastSweep >= TimeSpan.FromDays(1))
                {
                    lastSweep = now;
                    await maintenance.SweepOrphansAsync(now, stoppingToken);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError("Backend maintenance failed ({Error})", ex.GetType().Name);
            }
            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }
}
