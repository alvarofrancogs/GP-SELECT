using GpSelect.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

namespace GpSelect.Infrastructure;

public sealed class ImageProcessingWorker(IServiceScopeFactory scopes, IObjectStorage storage, ILogger<ImageProcessingWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await ProcessOne(stoppingToken); } catch (Exception ex) { logger.LogError(ex, "Image worker iteration failed"); }
            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
        }
    }
    private async Task ProcessOne(CancellationToken ct)
    {
        using var scope = scopes.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
          var leaseCutoff = DateTimeOffset.UtcNow.AddMinutes(-10); await db.ImageJobs.Where(x => x.State == ImageJobState.Processing && (x.ClaimedAt == null || x.ClaimedAt < leaseCutoff)).ExecuteUpdateAsync(u => u.SetProperty(x => x.State, ImageJobState.Queued).SetProperty(x => x.ClaimedAt, (DateTimeOffset?)null).SetProperty(x => x.NextAttemptAt, DateTimeOffset.UtcNow), ct); var candidate = await db.ImageJobs.Where(x => x.State == ImageJobState.Queued && x.NextAttemptAt <= DateTimeOffset.UtcNow).OrderBy(x => x.CreatedAt).Select(x=>x.Id).FirstOrDefaultAsync(ct);
         if (candidate == Guid.Empty) return;
          var claimedAt = DateTimeOffset.UtcNow; var claimed=await db.ImageJobs.Where(x=>x.Id==candidate&&x.State==ImageJobState.Queued&&x.NextAttemptAt<=DateTimeOffset.UtcNow).ExecuteUpdateAsync(s=>s.SetProperty(x=>x.State,ImageJobState.Processing).SetProperty(x=>x.Attempts,x=>x.Attempts+1).SetProperty(x=>x.ClaimedAt,claimedAt),ct);
         if(claimed==0)return;
         var job=await db.ImageJobs.SingleAsync(x=>x.Id==candidate,ct);
        var image = await db.Images.FirstOrDefaultAsync(x => x.Id == job.ImageId, ct); if (image is null || image.State == ImageState.Deleted) { job.Complete(); await db.SaveChangesAsync(ct); return; }
        try {
             image.StartProcessing(); await db.SaveChangesAsync(ct);
            await using var original = await storage.OpenReadAsync(image.OriginalKey, ct);
            await using var input = await ImagePipeline.ReadBoundedAsync(original, ImagePipeline.MaxUploadBytes, ct);
            using var source = await ImagePipeline.DecodeAsync(input, image.MimeType, ct);
            var rendered = await ImagePipeline.RenderAsync(source, ct);
            await using var cardStream = rendered.Card;
            await using var detailStream = rendered.Detail;
            var prefix = $"vehicles/{image.VehicleUnitId}/{image.Id}";
            await storage.PutAsync(prefix + "/card.jpg", cardStream, "image/jpeg", ct); await storage.PutAsync(prefix + "/detail.jpg", detailStream, "image/jpeg", ct);
            // The tracked image may be stale: the admin can remove it while it is processed. Finish it with a
            // conditional update, in one transaction with the cover change, so a removed image stays removed.
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var finished = await db.Images.Where(x => x.Id == image.Id && x.State == ImageState.Processing).ExecuteUpdateAsync(u => u
                .SetProperty(x => x.State, ImageState.Ready).SetProperty(x => x.CardKey, prefix + "/card.jpg")
                .SetProperty(x => x.DetailKey, prefix + "/detail.jpg").SetProperty(x => x.FailureReason, (string?)null), ct);
            job.Complete(); await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
            if (finished == 0)
            {
                await tx.CommitAsync(ct);
                foreach (var key in new[] { prefix + "/card.jpg", prefix + "/detail.jpg" })
                    try { await storage.DeleteAsync(key, ct); } catch (Exception ex) { logger.LogWarning(ex, "Cleanup of {Key} failed", key); }
                return;
            }
            // The cover is the first ready image: a newly ready image can take it.
            var siblings = await db.Images.Where(x => x.VehicleUnitId == image.VehicleUnitId && x.State != ImageState.Deleted).ToListAsync(ct);
            await db.SaveGalleryAsync(VehicleGallery.EnsureCover(siblings), ct);
            await tx.CommitAsync(ct);
         } catch (Exception ex) { logger.LogError(ex, "Image processing failed for {ImageId}", image.Id); await FailAsync(db, image.Id, job.Id, ex.Message, ct); }
    }

    public static async Task FailAsync(GpSelectDbContext db, Guid imageId, Guid jobId, string reason, CancellationToken ct)
    {
        db.ChangeTracker.Clear();
        var failureReason = reason[..Math.Min(500, reason.Length)];
        await db.Images.Where(x => x.Id == imageId && x.State == ImageState.Processing)
            .ExecuteUpdateAsync(u => u
                .SetProperty(x => x.State, ImageState.Failed)
                .SetProperty(x => x.FailureReason, failureReason), ct);

        var job = await db.ImageJobs.FirstOrDefaultAsync(x => x.Id == jobId, ct);
        if (job is not null && job.State == ImageJobState.Processing)
        {
            job.Retry(reason);
            await db.SaveChangesAsync(ct);
        }
    }
}


