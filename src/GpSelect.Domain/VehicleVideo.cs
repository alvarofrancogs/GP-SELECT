namespace GpSelect.Domain;

public enum VideoState { PendingUpload, Ready, Deleted }

public static class VideoRules
{
    public const long MaxUploadBytes = 100L * 1024 * 1024;
    public const string MimeType = "video/mp4";

    /// <summary>An MP4 starts with a box size (4 bytes) followed by "ftyp".</summary>
    public static bool HasMp4Signature(ReadOnlySpan<byte> first8) =>
        first8.Length >= 8 && first8[4] == 0x66 && first8[5] == 0x74 && first8[6] == 0x79 && first8[7] == 0x70;
}

/// <summary>The optional video of a vehicle: one MP4, kept as uploaded. Its first frame is a <see cref="VehicleImage"/> poster.</summary>
public sealed class VehicleVideo
{
    private VehicleVideo() { }
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid VehicleUnitId { get; private set; }
    public string Key { get; private set; } = "";
    public string MimeType { get; private set; } = VideoRules.MimeType;
    public long SizeBytes { get; private set; }
    public VideoState State { get; private set; } = VideoState.PendingUpload;
    /// <summary>Uploaded from the editor but not saved yet: never public.</summary>
    public bool IsStaged { get; private set; } = true;
    public DateTimeOffset CreatedAt { get; private set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? StorageCleanedAt { get; private set; }

    public static VehicleVideo Create(Guid vehicle, long size)
    {
        var video = new VehicleVideo { VehicleUnitId = vehicle, SizeBytes = size };
        video.Key = $"vehicles/{vehicle}/videos/{video.Id:N}.mp4";
        return video;
    }

    public void MarkReady()
    {
        if (State != VideoState.PendingUpload) throw new DomainException("invalid_video_state", "Video is not uploadable");
        State = VideoState.Ready;
    }

    /// <summary>The editor saved: the video becomes part of the vehicle.</summary>
    public void Publish() => IsStaged = false;

    public void Delete() => State = VideoState.Deleted;
}
