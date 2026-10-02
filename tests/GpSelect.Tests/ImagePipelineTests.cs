using System.Buffers.Binary;
using System.Text;
using GpSelect.Infrastructure;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Metadata;
using SixLabors.ImageSharp.Metadata.Profiles.Exif;
using SixLabors.ImageSharp.Metadata.Profiles.Iptc;
using SixLabors.ImageSharp.Metadata.Profiles.Xmp;
using SixLabors.ImageSharp.PixelFormats;
using Xunit;

namespace GpSelect.Tests;

public class ImagePipelineTests
{
    [Fact]
    public async Task ReadBounded_copies_a_non_seekable_stream_into_a_rewound_buffer()
    {
        var bytes = Enumerable.Range(0, 100).Select(x => (byte)x).ToArray();
        using var source = new NonSeekableStream(bytes);

        using var result = await ImagePipeline.ReadBoundedAsync(source, 100, CancellationToken.None);

        Assert.False(source.CanSeek);
        Assert.Equal(100L, result.Length);
        Assert.Equal(0L, result.Position);
        Assert.Equal(bytes, result.ToArray());
    }

    [Fact]
    public async Task ReadBounded_rejects_more_than_the_limit()
    {
        using var source = new NonSeekableStream(new byte[11]);

        var error = await Assert.ThrowsAsync<InvalidDataException>(() =>
            ImagePipeline.ReadBoundedAsync(source, 10, CancellationToken.None));

        Assert.Equal("Image exceeds size policy", error.Message);
    }

    [Fact]
    public async Task Decode_rejects_oversized_dimensions_from_the_header_alone()
    {
        using var input = CreateHeaderOnlyPng(20000, 20000);

        var error = await Assert.ThrowsAsync<InvalidDataException>(() =>
            ImagePipeline.DecodeAsync(input, "image/png", CancellationToken.None));

        Assert.Contains("dimensions", error.Message);
        Assert.Equal("Image dimensions exceed policy", error.Message);
    }

    [Fact]
    public async Task Decode_strips_metadata_and_keeps_the_orientation()
    {
        using var original = new Image<Rgb24>(40, 20);
        original.Metadata.ExifProfile = new ExifProfile();
        original.Metadata.ExifProfile.SetValue(ExifTag.Orientation, (ushort)6);
        original.Metadata.ExifProfile.SetValue(ExifTag.GPSLatitude,
            new Rational[] { new(40u, 1u), new(25u, 1u), new(0u, 1u) });
        original.Metadata.IptcProfile = new IptcProfile();
        original.Metadata.IptcProfile.SetValue(IptcTag.Caption, "Private caption");
        original.Metadata.XmpProfile = new XmpProfile(Encoding.UTF8.GetBytes(
            "<?xpacket begin=\"\" id=\"W5M0MpCehiHzreSzNTczkc9d\"?><x:xmpmeta xmlns:x=\"adobe:ns:meta/\"></x:xmpmeta><?xpacket end=\"w\"?>"));
        using var input = new MemoryStream();
        await original.SaveAsJpegAsync(input);
        input.Position = 0;
        var seeded = Image.Identify(input).Metadata;
        Assert.True(seeded.ExifProfile!.TryGetValue(ExifTag.GPSLatitude, out _));
        Assert.NotNull(seeded.IptcProfile);
        Assert.NotNull(seeded.XmpProfile);
        input.Position = 0;

        using var decoded = await ImagePipeline.DecodeAsync(input, "image/jpeg", CancellationToken.None);

        Assert.Equal(20, decoded.Width);
        Assert.Equal(40, decoded.Height);
        AssertNoMetadata(decoded.Metadata);
        var rendered = await ImagePipeline.RenderAsync(decoded, CancellationToken.None);
        using var card = rendered.Card;
        using var detail = rendered.Detail;
        Assert.Equal(0L, card.Position);
        Assert.Equal(0L, detail.Position);
        AssertNoMetadata(Image.Identify(card).Metadata);
        AssertNoMetadata(Image.Identify(detail).Metadata);
    }

    private static void AssertNoMetadata(ImageMetadata metadata)
    {
        Assert.Null(metadata.ExifProfile);
        Assert.Null(metadata.IptcProfile);
        Assert.Null(metadata.XmpProfile);
    }

    [Fact]
    public async Task Decode_rejects_a_signature_that_does_not_match()
    {
        using var original = new Image<Rgb24>(1, 1);
        using var input = new MemoryStream();
        await original.SaveAsPngAsync(input);
        input.Position = 0;

        var error = await Assert.ThrowsAsync<InvalidDataException>(() =>
            ImagePipeline.DecodeAsync(input, "image/jpeg", CancellationToken.None));

        Assert.Equal("File signature does not match an allowed image format", error.Message);
    }

    private static MemoryStream CreateHeaderOnlyPng(int width, int height)
    {
        var stream = new MemoryStream();
        stream.Write(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
        var header = new byte[13];
        BinaryPrimitives.WriteInt32BigEndian(header.AsSpan(0, 4), width);
        BinaryPrimitives.WriteInt32BigEndian(header.AsSpan(4, 4), height);
        header[8] = 8;
        header[9] = 6;
        WriteChunk(stream, "IHDR", header);
        WriteChunk(stream, "IEND", Array.Empty<byte>());
        stream.Position = 0;
        return stream;
    }

    private static void WriteChunk(Stream stream, string type, byte[] data)
    {
        var length = new byte[4];
        BinaryPrimitives.WriteInt32BigEndian(length, data.Length);
        stream.Write(length);
        var chunk = Encoding.ASCII.GetBytes(type).Concat(data).ToArray();
        stream.Write(chunk);

        uint crc = 0xFFFFFFFF;
        foreach (var value in chunk)
        {
            crc ^= value;
            for (var bit = 0; bit < 8; bit++)
                crc = (crc & 1) != 0 ? (crc >> 1) ^ 0xEDB88320u : crc >> 1;
        }
        var checksum = new byte[4];
        BinaryPrimitives.WriteUInt32BigEndian(checksum, ~crc);
        stream.Write(checksum);
    }

    private sealed class NonSeekableStream(byte[] bytes) : Stream
    {
        private readonly MemoryStream inner = new(bytes);
        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override int Read(byte[] buffer, int offset, int count) =>
            inner.Read(buffer, offset, Math.Min(count, 7));

        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) =>
            inner.ReadAsync(buffer[..Math.Min(buffer.Length, 7)], cancellationToken);

        public override void Flush() => throw new NotSupportedException();
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        protected override void Dispose(bool disposing)
        {
            if (disposing)
                inner.Dispose();
            base.Dispose(disposing);
        }
    }
}
