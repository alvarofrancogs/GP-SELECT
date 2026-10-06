using GpSelect.Infrastructure;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace GpSelect.IntegrationTests;

public sealed class S3UploadTests
{
    [Fact]
    public async Task Upload_signature_includes_declared_length_and_content_type()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Storage:Endpoint"] = "https://s3.example.test", ["Storage:Bucket"] = "photos",
            ["Storage:AccessKey"] = "test-key", ["Storage:SecretKey"] = "test-secret"
        }).Build();
        var storage = new S3ObjectStorage(config);
        var first = new Uri(await storage.CreateUploadUrlAsync("quarantine/a.jpg", "image/jpeg", 1234, CancellationToken.None));
        var second = new Uri(await storage.CreateUploadUrlAsync("quarantine/a.jpg", "image/jpeg", 1235, CancellationToken.None));
        var query = Query(first);
        Assert.True(query.ContainsKey("X-Amz-SignedHeaders"), string.Join(", ", query.Keys));
        Assert.Contains("content-length", query["X-Amz-SignedHeaders"].Split(';'));
        Assert.Contains("content-type", query["X-Amz-SignedHeaders"].Split(';'));
        Assert.NotEqual(query["X-Amz-Signature"], Query(second)["X-Amz-Signature"]);
    }

    [Fact]
    public async Task File_storage_keeps_its_local_upload_url()
    {
        var storage = new FileObjectStorage(new ConfigurationBuilder().Build());
        Assert.Equal("/api/admin/uploads/quarantine/a.jpg",
            await storage.CreateUploadUrlAsync("quarantine/a.jpg", "image/jpeg", 1234, CancellationToken.None));
    }

    private static Dictionary<string, string> Query(Uri url) => url.Query.TrimStart('?').Split('&')
        .Select(x => x.Split('=', 2)).ToDictionary(x => Uri.UnescapeDataString(x[0]), x => Uri.UnescapeDataString(x[1]));
}

