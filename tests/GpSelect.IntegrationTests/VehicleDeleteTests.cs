using System.Net;
using System.Text.Json;
using GpSelect.Api;
using GpSelect.Application;
using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace GpSelect.IntegrationTests;

public sealed class VehicleDeleteTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    [Theory]
    [InlineData(VehicleStatus.Draft)]
    [InlineData(VehicleStatus.ComingSoon)]
    [InlineData(VehicleStatus.Available)]
    [InlineData(VehicleStatus.Reserved)]
    [InlineData(VehicleStatus.Sold)]
    [InlineData(VehicleStatus.Archived)]
    public async Task Delete_removes_vehicle_media_jobs_and_objects_in_any_status(VehicleStatus status)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IObjectStorage>();
        var vehicle = VehicleUnit.Create("BMW", "M4", 2023, 6, $"delete-{Guid.NewGuid():N}");
        var prefix = $"vehicles/{vehicle.Id}";
        var photo = VehicleImage.Create(vehicle.Id, $"{prefix}/original.jpg", "image/jpeg", 3);
        photo.Ready($"{prefix}/card.webp", $"{prefix}/detail.webp");
        photo.SetCover(true);
        var video = VehicleVideo.Create(vehicle.Id, 3);
        video.MarkReady(); video.Publish();
        var poster = VehicleImage.CreatePoster(vehicle.Id, video.Id, $"{prefix}/poster.jpg", "image/jpeg", 3);
        poster.Ready($"{prefix}/poster-card.webp", $"{prefix}/poster-detail.webp");
        var removed = VehicleImage.Create(vehicle.Id, $"{prefix}/removed.jpg", "image/jpeg", 3);
        removed.Delete();
        var removedVideo = VehicleVideo.Create(vehicle.Id, 3);
        removedVideo.Delete();
        var completedJob = ImageProcessingJob.Create(photo.Id);
        completedJob.Complete();
        var queuedJob = ImageProcessingJob.Create(poster.Id);
        // Do not let the background worker claim this synthetic job.
        db.Entry(queuedJob).Property(x => x.NextAttemptAt).CurrentValue = DateTimeOffset.UtcNow.AddDays(1);
        if (status == VehicleStatus.Archived) vehicle.Archive();
        else vehicle.ChangeStatus(status, [photo]);
        db.Vehicles.Add(vehicle);
        db.Images.AddRange(photo, poster, removed);
        db.Videos.AddRange(video, removedVideo);
        db.ImageJobs.AddRange(completedJob, queuedJob);
        await db.SaveChangesAsync();
        var keys = new[] { photo.OriginalKey, photo.CardKey!, photo.DetailKey!, poster.OriginalKey,
            poster.CardKey!, poster.DetailKey!, removed.OriginalKey, video.Key, removedVideo.Key };
        foreach (var key in keys)
        {
            using var content = new MemoryStream(new byte[] { 1, 2, 3 });
            await storage.PutAsync(key, content, "application/octet-stream", CancellationToken.None);
            Assert.NotNull(await storage.HeadAsync(key, CancellationToken.None));
        }

        using var anonymous = api.Anonymous();
        if (VehicleVisibility.IsInCatalogue(status))
            Assert.Equal(HttpStatusCode.OK, (await anonymous.GetAsync($"/api/public/vehicles/{vehicle.PublicSlug}")).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await api.Admin.DeleteAsync($"/api/admin/vehicles/{vehicle.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await api.Admin.GetAsync($"/api/admin/vehicles/{vehicle.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync($"/api/public/vehicles/{vehicle.PublicSlug}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await api.Admin.DeleteAsync($"/api/admin/vehicles/{vehicle.Id}")).StatusCode);
        db.ChangeTracker.Clear();
        Assert.False(await db.Vehicles.AnyAsync(x => x.Id == vehicle.Id));
        Assert.False(await db.Images.AnyAsync(x => x.VehicleUnitId == vehicle.Id));
        Assert.False(await db.Videos.AnyAsync(x => x.VehicleUnitId == vehicle.Id));
        Assert.False(await db.ImageJobs.AnyAsync(x => x.ImageId == photo.Id || x.ImageId == poster.Id));
        foreach (var key in keys) Assert.Null(await storage.HeadAsync(key, CancellationToken.None));
    }

    [Fact]
    public async Task Missing_vehicle_returns_404() =>
        Assert.Equal(HttpStatusCode.NotFound, (await api.Admin.DeleteAsync($"/api/admin/vehicles/{Guid.NewGuid()}")).StatusCode);

    [Fact]
    public async Task Storage_failure_after_commit_keeps_204_and_continues_cleaning_other_objects()
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IObjectStorage>();
        var vehicle = VehicleUnit.Create("BMW", "M4", 2023, 6, $"delete-failure-{Guid.NewGuid():N}");
        var photo = VehicleImage.Create(vehicle.Id, $"vehicles/{vehicle.Id}/original.jpg", "image/jpeg", 3);
        photo.Ready($"vehicles/{vehicle.Id}/card.webp", $"vehicles/{vehicle.Id}/detail.webp");
        db.Vehicles.Add(vehicle); db.Images.Add(photo); await db.SaveChangesAsync();
        foreach (var key in new[] { photo.OriginalKey, photo.CardKey!, photo.DetailKey! })
        {
            using var content = new MemoryStream(new byte[] { 1, 2, 3 });
            await storage.PutAsync(key, content, "image/jpeg", CancellationToken.None);
        }
        // Use the real controller/database with one failed object delete; the other HTTP tests cover auth/CSRF.
        var faulty = new DeleteFailureStorage(storage, photo.OriginalKey, async () =>
        {
            using var reader = api.Services.CreateScope();
            var otherDb = reader.ServiceProvider.GetRequiredService<GpSelectDbContext>();
            Assert.False(await otherDb.Vehicles.AnyAsync(x => x.Id == vehicle.Id));
        });
        var controller = new VehiclesController(db, scope.ServiceProvider.GetRequiredService<ISlugGenerator>(), faulty)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { RequestServices = scope.ServiceProvider } }
        };
        Assert.IsType<NoContentResult>(await controller.Delete(vehicle.Id));
        Assert.Equal(3, faulty.Attempts.Count);
        Assert.True(faulty.SawCommittedDeletion);
        Assert.NotNull(await storage.HeadAsync(photo.OriginalKey, CancellationToken.None));
        Assert.Null(await storage.HeadAsync(photo.CardKey!, CancellationToken.None));
        Assert.Null(await storage.HeadAsync(photo.DetailKey!, CancellationToken.None));
        Assert.Equal(HttpStatusCode.NotFound, (await api.Admin.GetAsync($"/api/admin/vehicles/{vehicle.Id}")).StatusCode);
    }

    [Fact]
    public async Task Delete_without_cookie_returns_401()
    {
        using var anonymous = api.Anonymous();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.DeleteAsync($"/api/admin/vehicles/{Guid.NewGuid()}")).StatusCode);
    }

    [Fact]
    public async Task Delete_from_foreign_origin_returns_csrf_failed_and_keeps_vehicle()
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var vehicle = VehicleUnit.Create("BMW", "M4", 2023, 6, $"delete-csrf-{Guid.NewGuid():N}");
        db.Vehicles.Add(vehicle); await db.SaveChangesAsync();
        using var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/admin/vehicles/{vehicle.Id}");
        request.Headers.Add("Origin", "https://evil.example");
        using var response = await api.Admin.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("csrf_failed", problem.RootElement.GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.OK, (await api.Admin.GetAsync($"/api/admin/vehicles/{vehicle.Id}")).StatusCode);
    }

    private sealed class DeleteFailureStorage(IObjectStorage inner, string failedKey, Func<Task> checkCommit) : IObjectStorage
    {
        public List<string> Attempts { get; } = [];
        public bool SawCommittedDeletion { get; private set; }
        public async Task DeleteAsync(string key, CancellationToken ct)
        {
            Attempts.Add(key);
            await checkCommit();
            SawCommittedDeletion = true;
            if (key == failedKey) throw new IOException("Storage unavailable for this object");
            await inner.DeleteAsync(key, ct);
        }
        public Task<string> CreateUploadUrlAsync(string key, string mime, long sizeBytes, CancellationToken ct) => inner.CreateUploadUrlAsync(key, mime, sizeBytes, ct);
        public Task<ObjectMetadata?> HeadAsync(string key, CancellationToken ct) => inner.HeadAsync(key, ct);
        public Task<Stream?> OpenReadAsync(string key, CancellationToken ct) => inner.OpenReadAsync(key, ct);
        public Task<Stream?> OpenRangeAsync(string key, long from, long length, CancellationToken ct) => inner.OpenRangeAsync(key, from, length, ct);
        public Task PutAsync(string key, Stream content, string mime, CancellationToken ct) => inner.PutAsync(key, content, mime, ct);
        public IAsyncEnumerable<StoredObject> ListAsync(string prefix, CancellationToken ct) => inner.ListAsync(prefix, ct);
    }
}
