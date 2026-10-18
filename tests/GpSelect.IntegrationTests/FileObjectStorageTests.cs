using GpSelect.Infrastructure;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace GpSelect.IntegrationTests;

public sealed class FileObjectStorageTests
{
    [Theory]
    [InlineData("vehicles/missing.jpg")]
    [InlineData("vehicles/missing-directory/missing.jpg")]
    public async Task OpenRead_returns_null_for_a_missing_object(string key)
    {
        var root = Path.Combine(Path.GetTempPath(), "gpselect-storage-" + Guid.NewGuid().ToString("N"));
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Storage:Root"] = root }).Build();
        var storage = new FileObjectStorage(config);
        Directory.CreateDirectory(Path.Combine(root, "vehicles"));
        try
        {
            await using var stream = await storage.OpenReadAsync(key, CancellationToken.None);
            Assert.Null(stream);
        }
        finally { Directory.Delete(root, recursive: true); }
    }

    [Fact]
    public async Task Open_range_reads_only_the_requested_bytes()
    {
        var root = Path.Combine(Path.GetTempPath(), "gpselect-storage-" + Guid.NewGuid().ToString("N"));
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Storage:Root"] = root }).Build();
        var storage = new FileObjectStorage(config);
        try
        {
            await storage.PutAsync("vehicles/clip.mp4", new MemoryStream(Enumerable.Range(0, 100).Select(i => (byte)i).ToArray()), "video/mp4", CancellationToken.None);
            await using var stream = await storage.OpenRangeAsync("vehicles/clip.mp4", 10, 5, CancellationToken.None);
            Assert.NotNull(stream);
            using var copy = new MemoryStream();
            await stream!.CopyToAsync(copy);
            Assert.Equal(new byte[] { 10, 11, 12, 13, 14 }, copy.ToArray());
        }
        finally { Directory.Delete(root, recursive: true); }
    }
}
