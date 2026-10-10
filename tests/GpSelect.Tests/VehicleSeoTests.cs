using System.Text.Json;
using GpSelect.Api;
using GpSelect.Application;
using GpSelect.Domain;
using Xunit;

namespace GpSelect.Tests;

public class VehicleSeoTests
{
    private const string Template = "<head><!--page-meta-->old<!--/page-meta--></head><body><div id=\"root\"></div><script src=\"app.js\"></script></body>";
    private const string Script = "<script type=\"application/json\" id=\"vehicle-data\">";

    [Fact]
    public void Fill_embeds_the_public_contract_after_root_without_script_breakout()
    {
        var dto = PublicMapping.Map(VehicleUnit.Create("BMW", "M4", 2023, 6, "bmw-m4"), [])
            with { Description = "</script><script>alert(1)</script> & >", Status = VehicleStatus.Available };
        var html = VehicleSeo.Fill(Template, "head", "<main>body</main>", dto)!;
        Assert.Contains("<div id=\"root\"><main>body</main></div>" + Script, html);
        var start = html.IndexOf(Script, StringComparison.Ordinal) + Script.Length;
        var end = html.IndexOf("</script>", start, StringComparison.Ordinal);
        var json = html[start..end];
        Assert.DoesNotContain("</script", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<", json);
        Assert.DoesNotContain(">", json);
        Assert.DoesNotContain("&", json);
        using var parsed = JsonDocument.Parse(json);
        Assert.Equal(dto.Description, parsed.RootElement.GetProperty("description").GetString());
        Assert.Equal("Available", parsed.RootElement.GetProperty("status").GetString());
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        ApiJsonOptions.Configure(options);
        Assert.Equal(JsonSerializer.Serialize(dto, options), JsonSerializer.Serialize(JsonSerializer.Deserialize<VehiclePublicDto>(json, options), options));
    }

    [Fact]
    public void Fill_without_data_keeps_the_existing_output()
    {
        Assert.Equal("<head><!--page-meta-->\n    head\n    <!--/page-meta--></head><body><div id=\"root\">body</div><script src=\"app.js\"></script></body>",
            VehicleSeo.Fill(Template, "head", "body"));
    }

    [Theory]
    [InlineData("<div id=\"root\"></div>")]
    [InlineData("<!--page-meta--><!--/page-meta-->")]
    [InlineData("<!--/page-meta--><!--page-meta--><div id=\"root\"></div>")]
    public void Fill_with_data_still_rejects_missing_or_invalid_markers(string template)
    {
        var dto = PublicMapping.Map(VehicleUnit.Create("BMW", "M4", 2023, 6, "bmw-m4"), []);
        Assert.Null(VehicleSeo.Fill(template, "head", "body", dto));
    }
}
