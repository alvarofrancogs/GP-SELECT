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
}
