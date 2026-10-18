using System.Text.Json;
using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GpSelect.Api;

/// <summary>The vehicle's optional video. It is uploaded staged, straight to its final key (it is never processed),
/// and becomes part of the vehicle when the editor saves it (<see cref="VehiclesController.Save"/>).</summary>
[ApiController]
[Route("api/admin/vehicles/{vehicleId:guid}/video")]
[Authorize(Roles = "Admin")]
public sealed class VideoController(GpSelectDbContext db, IObjectStorage storage) : ControllerBase
{
    [HttpPost("intent")]
    public async Task<IActionResult> Intent(Guid vehicleId, VideoIntentRequest request)
    {
        if (!string.Equals(request.MimeType, VideoRules.MimeType, StringComparison.OrdinalIgnoreCase))
            return Problem(statusCode: 415, title: "Only MP4 videos are supported");
        if (request.SizeBytes is < 1 or > VideoRules.MaxUploadBytes)
            return Problem(statusCode: 413, title: "Video exceeds 100 MiB limit");
        await using var tx = await db.Database.BeginTransactionAsync();
        var refusal = await AdminWrites.RefuseUnlessEditable(this, db, vehicleId);
        if (refusal is not null)
            return refusal;
        var key = AdminWrites.IdempotencyKey(this);
        if (!AdminWrites.IsValidKey(key))
            return Problem(statusCode: 400, title: "Idempotency-Key is required");
        var op = $"video-intent:{vehicleId}";
        var hash = AdminWrites.Hash(request);
        var old = await db.IdempotencyRecords.SingleOrDefaultAsync(x => x.Operation == op && x.Key == key);
        if (old is not null)
            return AdminWrites.Replay(this, hash, old);
        var video = VehicleVideo.Create(vehicleId, request.SizeBytes);
        db.Videos.Add(video);
        var result = new
        {
            videoId = video.Id,
            uploadUrl = await storage.CreateUploadUrlAsync(video.Key, VideoRules.MimeType, video.SizeBytes, HttpContext.RequestAborted),
            expiresInSeconds = 900
        };
        db.IdempotencyRecords.Add(new() { Operation = op, Key = key!, RequestHash = hash, StatusCode = 200, ResponseJson = JsonSerializer.Serialize(result) });
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return Ok(result);
    }

    /// <summary>Checks the uploaded object (size and type from HEAD, the MP4 signature from its first bytes) and marks
    /// the video Ready. A file that fails the check leaves the video waiting for its upload (409 invalid_video).</summary>
    [HttpPost("{videoId:guid}/complete")]
    public async Task<IActionResult> Complete(Guid vehicleId, Guid videoId)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        var refusal = await AdminWrites.RefuseUnlessEditable(this, db, vehicleId);
        if (refusal is not null)
            return refusal;
        var key = AdminWrites.IdempotencyKey(this);
        if (!AdminWrites.IsValidKey(key))
            return Problem(statusCode: 400, title: "Idempotency-Key is required");
        var video = await db.Videos.FirstOrDefaultAsync(x => x.Id == videoId && x.VehicleUnitId == vehicleId && x.State != VideoState.Deleted);
        if (video is null)
            return NotFound();
        var op = $"video-complete:{vehicleId}:{videoId}";
        var hash = AdminWrites.Hash(new { vehicleId, videoId });
        var old = await db.IdempotencyRecords.SingleOrDefaultAsync(x => x.Operation == op && x.Key == key);
        if (old is not null)
            return AdminWrites.Replay(this, hash, old);
        if (video.State == VideoState.PendingUpload)
        {
            if (!await IsUploadedMp4(video))
                return DomainProblems.Create(this, new DomainException("invalid_video", "The uploaded file is missing or is not an MP4 video"));
            video.MarkReady();
        }
        var result = new { videoId = video.Id, state = video.State.ToString() };
        db.IdempotencyRecords.Add(new() { Operation = op, Key = key!, RequestHash = hash, StatusCode = 200, ResponseJson = JsonSerializer.Serialize(result) });
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return Ok(result);
    }

    async Task<bool> IsUploadedMp4(VehicleVideo video)
    {
        var meta = await storage.HeadAsync(video.Key, HttpContext.RequestAborted);
        if (meta is null || meta.SizeBytes != video.SizeBytes || !string.Equals(meta.ContentType, video.MimeType, StringComparison.OrdinalIgnoreCase))
            return false;
        // Only the first 8 bytes are read: the video is never loaded whole.
        await using var head = await storage.OpenRangeAsync(video.Key, 0, 8, HttpContext.RequestAborted);
        if (head is null)
            return false;
        var first8 = new byte[8];
        var read = await head.ReadAtLeastAsync(first8, first8.Length, throwOnEndOfStream: false, HttpContext.RequestAborted);
        return VideoRules.HasMp4Signature(first8.AsSpan(0, read));
    }

    /// <summary>Admin preview, staged or saved; never cached.</summary>
    [HttpGet("{videoId:guid}")]
    public async Task<IActionResult> Get(Guid vehicleId, Guid videoId)
    {
        var video = await db.Videos.AsNoTracking().SingleOrDefaultAsync(x => x.Id == videoId && x.VehicleUnitId == vehicleId && x.State == VideoState.Ready);
        if (video is null)
            return NotFound();
        return await StoredVideos.Serve(this, storage, video.Key, video.SizeBytes, "no-store");
    }
}

public sealed record VideoIntentRequest(string MimeType, long SizeBytes);
