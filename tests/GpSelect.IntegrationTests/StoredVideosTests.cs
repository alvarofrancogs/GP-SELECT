using GpSelect.Api;
using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace GpSelect.IntegrationTests;

public sealed class StoredVideosTests
{
    sealed class StubController : ControllerBase { }

    [Fact]
    public async Task Unsatisfiable_range_is_an_empty_416_with_content_range()
    {
        var root = Path.Combine(Path.GetTempPath(), "gpselect-storage-" + Guid.NewGuid().ToString("N"));
        var storage = new FileObjectStorage(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Storage:Root"] = root }).Build());
        var http = new DefaultHttpContext();
        http.Request.Headers.Range = "bytes=1000-";
        http.Response.Body = new MemoryStream();
        var controller = new StubController { ControllerContext = new ControllerContext { HttpContext = http } };

        var result = await StoredVideos.Serve(controller, storage, "vehicles/clip.mp4", 1000, null);
        Assert.IsNotAssignableFrom<IClientErrorActionResult>(result);
        await result.ExecuteResultAsync(controller.ControllerContext);

        Assert.Equal(416, http.Response.StatusCode);
        Assert.Equal("bytes */1000", http.Response.Headers.ContentRange.ToString());
        Assert.Equal("bytes", http.Response.Headers.AcceptRanges.ToString());
        Assert.Equal(0, http.Response.Body.Length);
        Assert.Null(http.Response.ContentType);
    }
}
