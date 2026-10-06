using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace GpSelect.IntegrationTests;

public sealed class BackendMaintenanceTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    [Theory]
    [InlineData(EnquiryNotificationStatus.Pending)]
    [InlineData(EnquiryNotificationStatus.Sent)]
    [InlineData(EnquiryNotificationStatus.Failed)]
    public async Task Retention_deletes_old_enquiries_regardless_of_delivery(EnquiryNotificationStatus status)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var now = DateTimeOffset.UtcNow;
        var old = Enquiry.Create(EnquiryIntent.Search, "Test User", "test@example.test", null, null, "Looking for a vehicle", now.AddDays(-31));
        var recent = Enquiry.Create(EnquiryIntent.Search, "Test User", "test@example.test", null, null, "Looking for a vehicle", now.AddDays(-29));
        if (status == EnquiryNotificationStatus.Sent) old.NotificationSent(now.AddDays(-31));
        if (status == EnquiryNotificationStatus.Failed)
            for (var i = 0; i < Enquiry.MaxNotificationAttempts; i++) old.NotificationFailed(now.AddDays(-31));
        db.Enquiries.AddRange(old, recent);
        await db.SaveChangesAsync();
        await scope.ServiceProvider.GetRequiredService<BackendMaintenance>().RunAsync(now, CancellationToken.None);
        Assert.False(await db.Enquiries.AnyAsync(x => x.Id == old.Id));
        Assert.True(await db.Enquiries.AnyAsync(x => x.Id == recent.Id));
    }

    [Theory]
    [InlineData(25, false, false, false)]
    [InlineData(23, false, false, true)]
    [InlineData(25, true, false, true)]
    [InlineData(25, false, true, true)]
    public async Task Only_abandoned_intents_are_removed(int ageHours, bool completed, bool archived, bool kept)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IObjectStorage>();
        var now = DateTimeOffset.UtcNow;
        var vehicle = VehicleUnit.Create("BMW", "M4", 2024, 1, $"maintenance-{Guid.NewGuid():N}");
        if (archived) vehicle.Archive();
        var image = VehicleImage.Create(vehicle.Id, $"quarantine/{Guid.NewGuid():N}.jpg", "image/jpeg", 3, staged: true);
        if (completed) image.Ready($"vehicles/{image.Id}/card.jpg", $"vehicles/{image.Id}/detail.jpg");
        db.Vehicles.Add(vehicle); db.Images.Add(image);
        db.Entry(image).Property(x => x.CreatedAt).CurrentValue = now.AddHours(-ageHours);
        await db.SaveChangesAsync();
        using var content = new MemoryStream(new byte[] { 1, 2, 3 });
        await storage.PutAsync(image.OriginalKey, content, "image/jpeg", CancellationToken.None);
        await scope.ServiceProvider.GetRequiredService<BackendMaintenance>().RunAsync(now, CancellationToken.None);
        Assert.Equal(kept, await db.Images.AnyAsync(x => x.Id == image.Id));
        Assert.Equal(kept, await storage.HeadAsync(image.OriginalKey, CancellationToken.None) is not null);
    }

    [Fact]
    public async Task A_completed_upload_waiting_for_its_job_is_kept()
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var now = DateTimeOffset.UtcNow;
        var vehicle = VehicleUnit.Create("BMW", "M4", 2024, 1, $"maintenance-{Guid.NewGuid():N}");
        var image = VehicleImage.Create(vehicle.Id, $"quarantine/{Guid.NewGuid():N}.jpg", "image/jpeg", 3, staged: true);
        var job = ImageProcessingJob.Create(image.Id);
        db.Vehicles.Add(vehicle); db.Images.Add(image); db.ImageJobs.Add(job);
        db.Entry(image).Property(x => x.CreatedAt).CurrentValue = now.AddDays(-2);
        db.Entry(job).Property(x => x.NextAttemptAt).CurrentValue = now.AddDays(1);
        await db.SaveChangesAsync();
        await scope.ServiceProvider.GetRequiredService<BackendMaintenance>().RunAsync(now, CancellationToken.None);
        Assert.True(await db.Images.AnyAsync(x => x.Id == image.Id && x.State == ImageState.PendingUpload));
    }

    [Fact]
    public async Task Idempotency_expires_after_48_hours()
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var now = DateTimeOffset.UtcNow;
        var old = new IdempotencyRecord { Operation = "test", Key = Guid.NewGuid().ToString(), ResponseJson = "{}", CreatedAt = now.AddHours(-49) };
        var recent = new IdempotencyRecord { Operation = "test", Key = Guid.NewGuid().ToString(), ResponseJson = "{}", CreatedAt = now.AddHours(-47) };
        db.IdempotencyRecords.AddRange(old, recent);
        await db.SaveChangesAsync();
        await scope.ServiceProvider.GetRequiredService<BackendMaintenance>().RunAsync(now, CancellationToken.None);
        Assert.False(await db.IdempotencyRecords.AnyAsync(x => x.Id == old.Id));
        Assert.True(await db.IdempotencyRecords.AnyAsync(x => x.Id == recent.Id));
    }

    [Fact]
    public async Task Deleted_image_objects_are_cleaned_and_cleanup_is_repeatable()
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IObjectStorage>();
        var vehicle = VehicleUnit.Create("BMW", "M4", 2024, 1, $"maintenance-{Guid.NewGuid():N}");
        var image = VehicleImage.Create(vehicle.Id, $"quarantine/{Guid.NewGuid():N}.jpg", "image/jpeg", 3);
        image.Delete(); db.Vehicles.Add(vehicle); db.Images.Add(image); await db.SaveChangesAsync();
        var keys = new[] { image.OriginalKey, $"vehicles/{vehicle.Id}/{image.Id}/card.jpg", $"vehicles/{vehicle.Id}/{image.Id}/detail.jpg" };
        foreach (var key in keys)
        {
            using var content = new MemoryStream(new byte[] { 1, 2, 3 });
            await storage.PutAsync(key, content, "image/jpeg", CancellationToken.None);
        }
        var maintenance = scope.ServiceProvider.GetRequiredService<BackendMaintenance>();
        var now = DateTimeOffset.FromUnixTimeSeconds(DateTimeOffset.UtcNow.ToUnixTimeSeconds());
        await maintenance.RunAsync(now, CancellationToken.None);
        Assert.Equal(now, await db.Images.Where(x => x.Id == image.Id).Select(x => x.StorageCleanedAt).SingleAsync());
        await maintenance.RunAsync(now.AddHours(1), CancellationToken.None);
        Assert.Equal(now, await db.Images.Where(x => x.Id == image.Id).Select(x => x.StorageCleanedAt).SingleAsync());
        foreach (var key in keys) Assert.Null(await storage.HeadAsync(key, CancellationToken.None));
        Assert.True(await db.Images.AnyAsync(x => x.Id == image.Id && x.State == ImageState.Deleted));
    }

    [Theory]
    [InlineData(25, false)]
    [InlineData(24, false)]
    [InlineData(23, true)]
    public async Task Deleted_image_cleanup_retries_only_within_24_hours_of_the_first_clean(int hoursSinceCleaned, bool retried)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IObjectStorage>();
        var now = DateTimeOffset.FromUnixTimeSeconds(DateTimeOffset.UtcNow.ToUnixTimeSeconds());
        var cleanedAt = now.AddHours(-hoursSinceCleaned);
        var vehicle = VehicleUnit.Create("BMW", "M4", 2024, 1, $"maintenance-{Guid.NewGuid():N}");
        var image = VehicleImage.Create(vehicle.Id, $"quarantine/{Guid.NewGuid():N}.jpg", "image/jpeg", 3);
        image.Delete(); db.Vehicles.Add(vehicle); db.Images.Add(image);
        db.Entry(image).Property(x => x.StorageCleanedAt).CurrentValue = cleanedAt;
        await db.SaveChangesAsync();
        // An object written after the first clean must only be removed during the retry window.
        using var content = new MemoryStream(new byte[] { 1, 2, 3 });
        await storage.PutAsync(image.OriginalKey, content, "image/jpeg", CancellationToken.None);
        await scope.ServiceProvider.GetRequiredService<BackendMaintenance>().RunAsync(now, CancellationToken.None);
        Assert.Equal(!retried, await storage.HeadAsync(image.OriginalKey, CancellationToken.None) is not null);
        var saved = await db.Images.AsNoTracking().SingleAsync(x => x.Id == image.Id);
        Assert.Equal(ImageState.Deleted, saved.State);
        Assert.Equal(cleanedAt, saved.StorageCleanedAt);
    }
}
