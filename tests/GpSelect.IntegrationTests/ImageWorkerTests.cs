using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace GpSelect.IntegrationTests;

public sealed class ImageWorkerTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Failure_does_not_revive_a_removed_image_or_its_cancelled_job()
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var (image, job) = await SeedProcessingAsync(db);

        // The worker still tracks Processing while another context removes the image.
        using (var adminScope = api.Services.CreateScope())
        {
            var adminDb = adminScope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
            var removedImage = await adminDb.Images.SingleAsync(x => x.Id == image.Id);
            var cancelledJob = await adminDb.ImageJobs.SingleAsync(x => x.Id == job.Id);
            removedImage.Delete();
            cancelledJob.Cancel();
            await adminDb.SaveChangesAsync();
        }

        await ImageProcessingWorker.FailAsync(db, image.Id, job.Id, "Decode failed", CancellationToken.None);

        using var readScope = api.Services.CreateScope();
        var readDb = readScope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var savedImage = await readDb.Images.SingleAsync(x => x.Id == image.Id);
        var savedJob = await readDb.ImageJobs.SingleAsync(x => x.Id == job.Id);
        Assert.Equal(ImageState.Deleted, savedImage.State);
        Assert.Null(savedImage.FailureReason);
        Assert.Equal(ImageJobState.Failed, savedJob.State);
        Assert.Equal("Cancelled", savedJob.Error);
    }

    [Fact]
    public async Task Failure_marks_a_processing_image_failed_and_requeues_its_job()
    {
        const string reason = "Decode failed";
        await AssertProcessingFailureAsync(reason, reason);
    }

    [Fact]
    public async Task Failure_truncates_the_image_reason_to_500_characters()
    {
        var reason = new string('a', 500) + "extra detail";
        await AssertProcessingFailureAsync(reason, reason[..500]);
    }

    [Fact]
    public async Task Worker_completes_the_job_of_an_image_it_can_no_longer_claim()
    {
        // The claim only takes a PendingUpload or Failed image; a Ready one stands in for an image the admin
        // removed after the worker loaded it, which cannot be timed from a test.
        Guid imageId, jobId;
        using (var scope = api.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
            var (image, job) = await SeedQueuedAsync(db, x => x.Ready("card.jpg", "detail.jpg"));
            (imageId, jobId) = (image.Id, job.Id);
        }

        var savedJob = await WaitForJobAsync(jobId, x => x.State == ImageJobState.Complete);

        using var readScope = api.Services.CreateScope();
        var savedImage = await readScope.ServiceProvider.GetRequiredService<GpSelectDbContext>().Images.SingleAsync(x => x.Id == imageId);
        Assert.Equal(ImageState.Ready, savedImage.State);
        Assert.Equal("card.jpg", savedImage.CardKey);
        Assert.Null(savedJob.Error);
    }

    [Fact]
    public async Task Worker_fails_an_image_left_processing_so_its_job_retries_it()
    {
        Guid imageId, jobId;
        using (var scope = api.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
            var (image, job) = await SeedQueuedAsync(db, x => x.StartProcessing());
            (imageId, jobId) = (image.Id, job.Id);
        }

        var savedJob = await WaitForJobAsync(jobId, x => x.Error is not null);

        using var readScope = api.Services.CreateScope();
        var savedImage = await readScope.ServiceProvider.GetRequiredService<GpSelectDbContext>().Images.SingleAsync(x => x.Id == imageId);
        Assert.Equal(ImageState.Failed, savedImage.State);
        Assert.Equal(ImageJobState.Queued, savedJob.State);
    }

    private async Task<ImageProcessingJob> WaitForJobAsync(Guid jobId, Func<ImageProcessingJob, bool> done)
    {
        for (var i = 0; i < 120; i++)
        {
            using var scope = api.Services.CreateScope();
            var job = await scope.ServiceProvider.GetRequiredService<GpSelectDbContext>().ImageJobs.SingleAsync(x => x.Id == jobId);
            if (done(job))
                return job;
            await Task.Delay(250);
        }
        throw new TimeoutException("The worker did not reach the expected job state");
    }

    private static async Task<(VehicleImage Image, ImageProcessingJob Job)> SeedQueuedAsync(GpSelectDbContext db, Action<VehicleImage> state)
    {
        var vehicle = VehicleUnit.Create("BMW", "M4", 2024, 1, $"worker-test-{Guid.NewGuid():N}");
        var image = VehicleImage.Create(vehicle.Id, $"vehicles/{vehicle.Id}/original.jpg", "image/jpeg", 100);
        state(image);
        var job = ImageProcessingJob.Create(image.Id);
        db.Vehicles.Add(vehicle);
        db.Images.Add(image);
        db.ImageJobs.Add(job);
        await db.SaveChangesAsync();
        return (image, job);
    }

    private async Task AssertProcessingFailureAsync(string reason, string expectedImageReason)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var (image, job) = await SeedProcessingAsync(db);
        var beforeFailure = DateTimeOffset.UtcNow;

        await ImageProcessingWorker.FailAsync(db, image.Id, job.Id, reason, CancellationToken.None);

        using var readScope = api.Services.CreateScope();
        var readDb = readScope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var savedImage = await readDb.Images.SingleAsync(x => x.Id == image.Id);
        var savedJob = await readDb.ImageJobs.SingleAsync(x => x.Id == job.Id);
        Assert.Equal(ImageState.Failed, savedImage.State);
        Assert.Equal(expectedImageReason, savedImage.FailureReason);
        Assert.Equal(ImageJobState.Queued, savedJob.State);
        Assert.Equal(reason, savedJob.Error);
        Assert.Equal(1, savedJob.Attempts);
        Assert.Null(savedJob.ClaimedAt);
        Assert.True(savedJob.NextAttemptAt >= beforeFailure.AddSeconds(10));
    }

    private static async Task<(VehicleImage Image, ImageProcessingJob Job)> SeedProcessingAsync(GpSelectDbContext db)
    {
        var vehicle = VehicleUnit.Create("BMW", "M4", 2024, 1, $"worker-test-{Guid.NewGuid():N}");
        var image = VehicleImage.Create(vehicle.Id, $"vehicles/{vehicle.Id}/original.jpg", "image/jpeg", 100);
        image.StartProcessing();
        var job = ImageProcessingJob.Create(image.Id);
        job.Claim();
        db.Vehicles.Add(vehicle);
        db.Images.Add(image);
        db.ImageJobs.Add(job);
        await db.SaveChangesAsync();
        return (image, job);
    }
}
