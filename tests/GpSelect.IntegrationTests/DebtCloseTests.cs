using GpSelect.Api;
using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GpSelect.IntegrationTests;

public sealed class DebtCloseTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Sweep_deletes_only_old_objects_no_live_image_points_to()
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IObjectStorage>();
        var root = scope.ServiceProvider.GetRequiredService<IConfiguration>()["Storage:Root"]!;
        var now = DateTimeOffset.UtcNow;

        var vehicle = VehicleUnit.Create("BMW", "M3", 2023, 1, $"sweep-{Guid.NewGuid():N}");
        var live = VehicleImage.Create(vehicle.Id, $"quarantine/{Guid.NewGuid():N}.jpg", "image/jpeg", 3);
        var removed = VehicleImage.Create(vehicle.Id, $"quarantine/{Guid.NewGuid():N}.jpg", "image/jpeg", 3);
        removed.Delete();
        db.Vehicles.Add(vehicle); db.Images.AddRange(live, removed);
        await db.SaveChangesAsync();

        var liveDerivative = $"vehicles/{vehicle.Id}/{live.Id}/card.jpg";
        var removedDerivative = $"vehicles/{vehicle.Id}/{removed.Id}/card.jpg";
        var orphan = $"quarantine/{Guid.NewGuid():N}.jpg";
        var recentOrphan = $"quarantine/{Guid.NewGuid():N}.jpg";
        foreach (var key in new[] { live.OriginalKey, removed.OriginalKey, liveDerivative, removedDerivative, orphan, recentOrphan })
        {
            await storage.PutAsync(key, new MemoryStream([1, 2, 3]), "image/jpeg", CancellationToken.None);
            if (key != recentOrphan) File.SetLastWriteTimeUtc(Path.Combine(root, key.Replace('/', Path.DirectorySeparatorChar)), now.AddHours(-49).UtcDateTime);
        }

        await scope.ServiceProvider.GetRequiredService<BackendMaintenance>().SweepOrphansAsync(now, CancellationToken.None);

        Assert.NotNull(await storage.HeadAsync(live.OriginalKey, CancellationToken.None));
        Assert.NotNull(await storage.HeadAsync(liveDerivative, CancellationToken.None));
        Assert.NotNull(await storage.HeadAsync(recentOrphan, CancellationToken.None));
        Assert.Null(await storage.HeadAsync(orphan, CancellationToken.None));
        Assert.Null(await storage.HeadAsync(removed.OriginalKey, CancellationToken.None));
        Assert.Null(await storage.HeadAsync(removedDerivative, CancellationToken.None));
    }

    [Fact]
    public async Task Global_login_limit_counts_every_address_together_and_only_logins()
    {
        using var limiter = SecurityConfig.LoginGlobalLimiter();
        static HttpContext Request(string method, string path, string ip)
        {
            var context = new DefaultHttpContext();
            context.Request.Method = method; context.Request.Path = path;
            context.Connection.RemoteIpAddress = System.Net.IPAddress.Parse(ip);
            return context;
        }
        for (var i = 0; i < SecurityConfig.LoginGlobalPermits; i++)
            Assert.True((await limiter.AcquireAsync(Request("POST", "/api/admin/auth/login", $"203.0.113.{i}"))).IsAcquired);
        Assert.False((await limiter.AcquireAsync(Request("POST", "/api/admin/auth/login", "198.51.100.1"))).IsAcquired);
        Assert.True((await limiter.AcquireAsync(Request("GET", "/api/admin/auth/me", "198.51.100.1"))).IsAcquired);
        Assert.True((await limiter.AcquireAsync(Request("GET", "/api/public/vehicles", "198.51.100.1"))).IsAcquired);
    }

    [Fact]
    public async Task Recovering_a_dead_run_gives_its_attempt_back_and_releases_the_image()
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var vehicle = VehicleUnit.Create("BMW", "M3", 2023, 1, $"recover-{Guid.NewGuid():N}");
        var image = VehicleImage.Create(vehicle.Id, $"vehicles/{vehicle.Id}/original.jpg", "image/jpeg", 100);
        image.StartProcessing();
        var job = ImageProcessingJob.Create(image.Id);
        job.Claim();
        db.Vehicles.Add(vehicle); db.Images.Add(image); db.ImageJobs.Add(job);
        await db.SaveChangesAsync();

        // A "now" past the lease: the hosted worker (real clock) still sees this run as alive and leaves it alone.
        var later = DateTimeOffset.UtcNow.AddMinutes(11);
        await ImageProcessingWorker.RecoverStaleAsync(db, later, CancellationToken.None);

        var savedJob = await db.ImageJobs.AsNoTracking().SingleAsync(x => x.Id == job.Id);
        var savedImage = await db.Images.AsNoTracking().SingleAsync(x => x.Id == image.Id);
        Assert.Equal((ImageJobState.Queued, 0, (DateTimeOffset?)null), (savedJob.State, savedJob.Attempts, savedJob.ClaimedAt));
        Assert.Equal(ImageState.PendingUpload, savedImage.State);
    }

    private sealed class CancelledNotifier : IEnquiryNotifier
    {
        public Task SendAsync(EnquiryNotification notification, CancellationToken ct) => throw new OperationCanceledException();
    }

    [Fact]
    public async Task Shutdown_during_a_send_is_not_a_failed_attempt()
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var marker = "Cancel " + Guid.NewGuid().ToString("N");
        // Each test class has its own database; a day old stays clear of the 30-day retention.
        var enquiry = Enquiry.Create(EnquiryIntent.Search, "Test User", "test@example.test", null, null, marker, DateTimeOffset.UtcNow.AddDays(-1));
        db.Enquiries.Add(enquiry);
        await db.SaveChangesAsync();

        var outbox = new EnquiryNotificationOutbox(db, new CancelledNotifier(), NullLogger<EnquiryNotificationOutbox>.Instance);
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => outbox.SendDueAsync(DateTimeOffset.UtcNow, CancellationToken.None, batch: 1));

        var saved = await db.Enquiries.AsNoTracking().SingleAsync(x => x.Id == enquiry.Id);
        Assert.Equal((EnquiryNotificationStatus.Pending, 0), (saved.NotificationStatus, saved.NotificationAttempts));
        db.Enquiries.Remove(await db.Enquiries.SingleAsync(x => x.Id == enquiry.Id));
        await db.SaveChangesAsync();
    }
}
