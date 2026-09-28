using GpSelect.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;
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
        var image = await db.Images.FirstOrDefaultAsync(x => x.Id == job.ImageId, ct); if (image is null) { job.Complete(); await db.SaveChangesAsync(ct); return; }
        try {
             image.StartProcessing(); await db.SaveChangesAsync(ct);
            await using var input = await storage.OpenReadAsync(image.OriginalKey, ct);
            if (!await IsSupported(input, image.MimeType, ct)) throw new InvalidDataException("File signature does not match an allowed image format");
             input.Position = 0; using var source = await Image.LoadAsync(new SixLabors.ImageSharp.Formats.DecoderOptions { MaxFrames=1, Configuration=Configuration.Default }, input, ct); if(source.Width > 10000 || source.Height > 10000 || (long)source.Width*source.Height > 40000000) throw new InvalidDataException("Image dimensions exceed policy"); source.Mutate(x => x.AutoOrient());
             using var card = source.Clone(x => x.Resize(new ResizeOptions { Size = new Size(800, 600), Mode = ResizeMode.Max }));
             using var detail = source.Clone(x => x.Resize(new ResizeOptions { Size = new Size(2400, 1800), Mode = ResizeMode.Max }));
             await using var cardStream = new MemoryStream(); await using var detailStream = new MemoryStream();
             var encoder = new JpegEncoder { Quality = 84 }; await card.SaveAsJpegAsync(cardStream, encoder, ct); await detail.SaveAsJpegAsync(detailStream, encoder, ct);
            cardStream.Position = detailStream.Position = 0; var prefix = $"vehicles/{image.VehicleUnitId}/{image.Id}";
            await storage.PutAsync(prefix + "/card.jpg", cardStream, "image/jpeg", ct); await storage.PutAsync(prefix + "/detail.jpg", detailStream, "image/jpeg", ct);
            image.Ready(prefix + "/card.jpg", prefix + "/detail.jpg"); job.Complete(); await db.SaveChangesAsync(ct);
         } catch (Exception ex) { logger.LogError(ex, "Image processing failed for {ImageId}", image.Id); image.Fail(ex.Message[..Math.Min(500, ex.Message.Length)]); job.Retry(ex.Message); await db.SaveChangesAsync(ct); }
    }
    private static async Task<bool> IsSupported(Stream s, string claimed, CancellationToken ct)
    {
        var b = new byte[12]; var n = await s.ReadAsync(b, ct); if (claimed.Equals("image/jpeg", StringComparison.OrdinalIgnoreCase)) return n >= 3 && b[0] == 0xff && b[1] == 0xd8 && b[2] == 0xff;
        if (claimed.Equals("image/png", StringComparison.OrdinalIgnoreCase)) return n >= 8 && b.AsSpan(0, 8).SequenceEqual(new byte[] {137,80,78,71,13,10,26,10});
        if (claimed.Equals("image/webp", StringComparison.OrdinalIgnoreCase)) return n >= 12 && b.AsSpan(0,4).SequenceEqual("RIFF"u8) && b.AsSpan(8,4).SequenceEqual("WEBP"u8);
        return false;
    }
}


