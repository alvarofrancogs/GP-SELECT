using GpSelect.Infrastructure;
using Xunit;

namespace GpSelect.Tests;

public class VideoRangeTests
{
    [Theory]
    [InlineData("bytes=0-1", 100, 0, 2)]
    [InlineData("bytes=500-", 1000, 500, 500)]
    [InlineData("bytes=-500", 1000, 500, 500)]
    [InlineData("bytes=0-999999", 1000, 0, 1000)]
    public void Partial_ranges_are_resolved(string header, long size, long from, long length)
    {
        Assert.Equal(RangeResult.Partial, VideoRange.TryParse(header, size, out var f, out var l));
        Assert.Equal((from, length), (f, l));
    }

    [Theory]
    [InlineData("bytes=1000-", 1000)]
    [InlineData("bytes=-0", 1000)]
    public void Unsatisfiable_ranges_are_detected(string header, long size) =>
        Assert.Equal(RangeResult.Unsatisfiable, VideoRange.TryParse(header, size, out _, out _));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("bytes=0-1,5-6")]
    [InlineData("items=0-1")]
    [InlineData("bytes=abc")]
    [InlineData("bytes=5-2")]
    public void Missing_or_unsupported_ranges_serve_the_full_file(string? header) =>
        Assert.Equal(RangeResult.Full, VideoRange.TryParse(header, 100, out _, out _));
}
