using System.Net.Http.Json;
using System.Text.Json;
using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace GpSelect.IntegrationTests;

/// <summary>The editor rebuilds its photo tracking from the server after a reload: each photo says whether the
/// worker still has a queued, running or retryable job for it.</summary>
public sealed class EditorImageTrackingTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Each_photo_says_whether_the_worker_still_has_a_job_for_it()
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var vehicle = VehicleUnit.Create("BMW", "M3", 2023, 1, $"tracking-{Guid.NewGuid():N}");
        db.Vehicles.Add(vehicle);
        VehicleImage Photo(Action<VehicleImage> state, Action<ImageProcessingJob>? job)
        {
            var image = VehicleImage.Create(vehicle.Id, $"quarantine/{Guid.NewGuid():N}.jpg", "image/jpeg", 3, staged: true);
            state(image);
            db.Images.Add(image);
            if (job is not null)
            {
                var created = ImageProcessingJob.Create(image.Id);
                job(created);
                db.ImageJobs.Add(created);
            }
            return image;
        }
        // A retry waits at least 10 s, so the hosted worker leaves these jobs alone during the test.
        static void Waiting(ImageProcessingJob job) { job.Claim(); job.Retry("transient"); }

        var queued = Photo(_ => { }, Waiting);
        var running = Photo(x => x.StartProcessing(), job => job.Claim());
        var retrying = Photo(x => { x.StartProcessing(); x.Fail("transient"); }, Waiting);
        var done = Photo(x => { x.StartProcessing(); x.Ready("card.jpg", "detail.jpg"); }, job => { job.Claim(); job.Complete(); });
        var abandoned = Photo(_ => { }, null);
        var cancelled = Photo(x => { x.StartProcessing(); x.Fail("gone"); }, job => { job.Claim(); job.Cancel(); });
        await db.SaveChangesAsync();

        var body = await api.Admin.GetFromJsonAsync<JsonElement>($"/api/admin/vehicles/{vehicle.Id}");
        var pending = body.GetProperty("images").EnumerateArray()
            .ToDictionary(x => x.GetProperty("id").GetGuid(), x => x.GetProperty("jobPending").GetBoolean());

        Assert.True(pending[queued.Id]);
        Assert.True(pending[running.Id]);
        Assert.True(pending[retrying.Id]);
        Assert.False(pending[done.Id]);
        Assert.False(pending[abandoned.Id]);
        Assert.False(pending[cancelled.Id]);
    }
}
