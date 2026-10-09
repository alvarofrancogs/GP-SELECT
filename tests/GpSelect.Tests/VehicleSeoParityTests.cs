using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using GpSelect.Api;
using GpSelect.Application;
using Xunit;

namespace GpSelect.Tests;

public class VehicleSeoParityTests
{
    public static IEnumerable<object[]> Cases()
    {
        using var fixture = JsonDocument.Parse(File.ReadAllText(System.IO.Path.Combine(AppContext.BaseDirectory, "fixtures", "vehicle-seo.json")));
        foreach (var item in fixture.RootElement.EnumerateArray())
            yield return new object[] { item.GetProperty("name").GetString()!, item.GetRawText() };
    }

    [Theory]
    [MemberData(nameof(Cases))]
    public void Head_matches_shared_fixture(string name, string json)
    {
        using var fixture = JsonDocument.Parse(json);
        var root = fixture.RootElement;
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        ApiJsonOptions.Configure(options);
        var vehicle = root.GetProperty("vehicle").Deserialize<VehiclePublicDto>(options)!;
        var head = VehicleSeo.Head(vehicle, root.GetProperty("siteUrl").GetString());
        var expected = root.GetProperty("expected");
        var title = Regex.Match(head, "<title data-page-meta>(.*?)</title>", RegexOptions.Singleline);
        var description = Regex.Match(head, "<meta data-page-meta name=\"description\" content=\"(.*?)\">", RegexOptions.Singleline);
        var script = Regex.Match(head, "<script data-page-meta type=\"application/ld\\+json\">(.*?)</script>", RegexOptions.Singleline);
        Assert.True(title.Success && description.Success && script.Success, name);
        Assert.Equal(expected.GetProperty("title").GetString(), WebUtility.HtmlDecode(title.Groups[1].Value));
        Assert.Equal(expected.GetProperty("description").GetString(), WebUtility.HtmlDecode(description.Groups[1].Value));
        Assert.DoesNotContain("<", script.Groups[1].Value);
        Assert.True(JsonNode.DeepEquals(JsonNode.Parse(expected.GetProperty("jsonLd").GetRawText()), JsonNode.Parse(script.Groups[1].Value)), name);
    }
}
