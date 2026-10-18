namespace GpSelect.Infrastructure;

public enum RangeResult { Full, Partial, Unsatisfiable }

// Single-range parser for the Range header (RFC 9110). Malformed, multi-range and non-bytes headers are ignored (full file).
public static class VideoRange
{
    public static RangeResult TryParse(string? header, long size, out long from, out long length)
    {
        from = 0; length = size;
        if (string.IsNullOrWhiteSpace(header) || !header.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase)) return RangeResult.Full;
        var spec = header[6..].Trim();
        var dash = spec.IndexOf('-');
        if (spec.Contains(',') || dash < 0) return RangeResult.Full;
        var a = spec[..dash].Trim(); var b = spec[(dash + 1)..].Trim();
        long start, end;
        if (a.Length == 0)
        {
            if (!long.TryParse(b, out var suffix) || suffix < 0) return RangeResult.Full;
            if (suffix == 0 || size == 0) return RangeResult.Unsatisfiable;
            start = Math.Max(0, size - suffix); end = size - 1;
        }
        else
        {
            if (!long.TryParse(a, out start) || start < 0) return RangeResult.Full;
            if (b.Length == 0) end = size - 1;
            else if (!long.TryParse(b, out end) || end < start) return RangeResult.Full;
            if (start >= size) return RangeResult.Unsatisfiable;
            end = Math.Min(end, size - 1);
        }
        from = start; length = end - start + 1;
        return RangeResult.Partial;
    }
}

// Read-only view over the next `limit` bytes of an inner stream; disposing it disposes the inner stream.
internal sealed class LimitedReadStream(Stream inner, long limit) : Stream
{
    long left = limit;
    public override bool CanRead => true; public override bool CanSeek => false; public override bool CanWrite => false;
    public override long Length => throw new NotSupportedException(); public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }
    public override int Read(byte[] buffer, int offset, int count) => Read(buffer.AsSpan(offset, count));
    public override int Read(Span<byte> buffer) { if (left <= 0) return 0; var n = inner.Read(buffer[..(int)Math.Min(buffer.Length, left)]); left -= n; return n; }
    public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken ct = default) { if (left <= 0) return 0; var n = await inner.ReadAsync(buffer[..(int)Math.Min(buffer.Length, left)], ct); left -= n; return n; }
    public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken ct) => ReadAsync(buffer.AsMemory(offset, count), ct).AsTask();
    public override void Flush() { }
    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
    public override void SetLength(long value) => throw new NotSupportedException();
    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    protected override void Dispose(bool disposing) { if (disposing) inner.Dispose(); base.Dispose(disposing); }
    public override ValueTask DisposeAsync() => inner.DisposeAsync();
}
