using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;

namespace GpSelect.Infrastructure;

public static class ImagePipeline
{
    public const long MaxUploadBytes = 20 * 1024 * 1024;

    public static async Task<MemoryStream> ReadBoundedAsync(Stream source, long maxBytes, CancellationToken ct)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(maxBytes);
        var output = new MemoryStream();
        try
        {
            var buffer = new byte[81920];
            while (true)
            {
                // Read at most one byte beyond the limit, without trusting Length or CanSeek.
                var remaining = maxBytes - output.Length;
                var count = remaining < buffer.Length ? (int)remaining + 1 : buffer.Length;
                var read = await source.ReadAsync(buffer.AsMemory(0, count), ct);
                if (read == 0)
                    break;
                if (read > remaining)
                    throw new InvalidDataException("Image exceeds size policy");
                await output.WriteAsync(buffer.AsMemory(0, read), ct);
            }
            output.Position = 0;
            return output;
        }
        catch
        {
            output.Dispose();
            throw;
        }
    }

    public static async Task<Image> DecodeAsync(MemoryStream input, string mimeType, CancellationToken ct)
    {
        input.Position = 0;
        if (!await IsSupported(input, mimeType, ct))
            throw new InvalidDataException("File signature does not match an allowed image format");

        var options = new DecoderOptions { MaxFrames = 1, Configuration = Configuration.Default };
        input.Position = 0;
        var info = await Image.IdentifyAsync(options, input, ct);
        if (info.Width > 10000 || info.Height > 10000 || (long)info.Width * info.Height > 40000000)
            throw new InvalidDataException("Image dimensions exceed policy");

        input.Position = 0;
        var source = await Image.LoadAsync(options, input, ct);
        try
        {
            source.Mutate(x => x.AutoOrient());
            source.Metadata.ExifProfile = null;
            source.Metadata.IptcProfile = null;
            source.Metadata.XmpProfile = null;
            return source;
        }
        catch
        {
            source.Dispose();
            throw;
        }
    }

    public static async Task<(MemoryStream Card, MemoryStream Detail)> RenderAsync(Image source, CancellationToken ct)
    {
        using var card = source.Clone(x => x.Resize(new ResizeOptions { Size = new Size(800, 600), Mode = ResizeMode.Max }));
        using var detail = source.Clone(x => x.Resize(new ResizeOptions { Size = new Size(2400, 1800), Mode = ResizeMode.Max }));
        var cardStream = new MemoryStream();
        var detailStream = new MemoryStream();
        try
        {
            var encoder = new JpegEncoder { Quality = 84 };
            await card.SaveAsJpegAsync(cardStream, encoder, ct);
            await detail.SaveAsJpegAsync(detailStream, encoder, ct);
            cardStream.Position = 0;
            detailStream.Position = 0;
            return (cardStream, detailStream);
        }
        catch
        {
            cardStream.Dispose();
            detailStream.Dispose();
            throw;
        }
    }

    private static async Task<bool> IsSupported(Stream input, string claimed, CancellationToken ct)
    {
        var bytes = new byte[12];
        var count = await input.ReadAsync(bytes, ct);
        if (claimed.Equals("image/jpeg", StringComparison.OrdinalIgnoreCase))
            return count >= 3 && bytes[0] == 0xff && bytes[1] == 0xd8 && bytes[2] == 0xff;
        if (claimed.Equals("image/png", StringComparison.OrdinalIgnoreCase))
            return count >= 8 && bytes.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
        if (claimed.Equals("image/webp", StringComparison.OrdinalIgnoreCase))
            return count >= 12 && bytes.AsSpan(0, 4).SequenceEqual("RIFF"u8) && bytes.AsSpan(8, 4).SequenceEqual("WEBP"u8);
        return false;
    }
}
