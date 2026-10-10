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

    [Theory]
    [InlineData("es", "es_ES", "en_GB", "/vehiculos/bmw-m4")]
    [InlineData("en", "en_GB", "es_ES", "/en/vehicles/bmw-m4")]
    public void Head_has_reciprocal_languages_in_client_tag_order(string locale, string ogLocale, string alternate, string path)
    {
        var dto = PublicMapping.Map(VehicleUnit.Create("BMW", "M4", 2023, 6, "bmw-m4"), []);
        const string site = "https://gpselect.com";
        var head = VehicleSeo.Head(dto, site, locale);
        var tags = new[]
        {
            "<title", "name=\"description\"", "name=\"robots\" content=\"index,follow\"",
            $"rel=\"canonical\" href=\"{site}{path}\"",
            $"hreflang=\"es\" href=\"{site}/vehiculos/bmw-m4\"",
            $"hreflang=\"en\" href=\"{site}/en/vehicles/bmw-m4\"",
            $"hreflang=\"x-default\" href=\"{site}/en/vehicles/bmw-m4\"",
            "property=\"og:type\"", "property=\"og:title\"", "property=\"og:description\"",
            $"property=\"og:locale\" content=\"{ogLocale}\"", $"property=\"og:locale:alternate\" content=\"{alternate}\"",
            "property=\"og:site_name\"", "property=\"og:url\"", "property=\"og:image\"", "property=\"og:image:alt\"",
            "property=\"og:image:type\"", "property=\"og:image:width\"", "property=\"og:image:height\"",
            "name=\"twitter:card\"", "name=\"twitter:title\"", "name=\"twitter:description\"", "name=\"twitter:image\"",
            "name=\"twitter:image:alt\"", "type=\"application/ld+json\"",
        };
        var previous = -1;
        foreach (var tag in tags)
        {
            var index = head.IndexOf(tag, StringComparison.Ordinal);
            Assert.True(index > previous, tag);
            previous = index;
        }
        var withoutSite = VehicleSeo.Head(dto, null, locale);
        Assert.DoesNotContain("hreflang", withoutSite);
        Assert.DoesNotContain("canonical", withoutSite);
        Assert.DoesNotContain("og:locale:alternate", withoutSite);
    }

    [Fact]
    public void English_body_translates_fixed_values_and_marks_Spanish_free_text()
    {
        var dto = PublicMapping.Map(VehicleUnit.Create("BMW", "M4", 2023, 6, "bmw-m4"), []) with
        {
            Status = VehicleStatus.Available, PriceEur = 86900.50m, MileageKm = 4500, PowerHp = 510,
            FuelType = " GASOLINA ", Transmission = "automático", BodyType = "Berlina", Drivetrain = "Integral",
            ExteriorColour = "Negro", Interior = "Cuero negro", Provenance = "Alemania",
            Description = "Descripción <&>", History = "Historial <&>", Equipment = ["Equipamiento <&>"],
        };
        var html = VehicleSeo.Body(dto, "en");
        Assert.Contains("<p>Price: €86,901</p>", html);
        foreach (var value in new[] { "06/2023", "4,500 km", "510 hp", "Petrol", "Automatic", "Saloon", "All-wheel drive", "Black", "Black leather", "Germany" })
            Assert.Contains($"<dd>{value}</dd>", html);
        Assert.Contains("<p lang=\"es\">Descripción &lt;&amp;&gt;</p>", html);
        Assert.Contains("<p lang=\"es\">Historial &lt;&amp;&gt;</p>", html);
        Assert.Contains("<ul lang=\"es\"><li>Equipamiento &lt;&amp;&gt;</li></ul>", html);
        Assert.Contains("href=\"/en/contact?vehiculo=BMW%20M4%20%282023%29&amp;intent=vehicle\">Enquire about this car", html);
        foreach (var path in new[] { "/en", "/en/vehicles", "/en/import", "/en/about", "/en/contact" })
            Assert.Contains($"href=\"{path}\"", html);
        Assert.Contains("Murcia, Spain · Clients across Europe", html);
        var sold = VehicleSeo.Body(dto with { Status = VehicleStatus.Sold }, "en");
        Assert.Contains("This vehicle is no longer available.", sold);
        Assert.DoesNotContain("Price:", sold);
        Assert.DoesNotContain("intent=vehicle", sold);
    }

    [Fact]
    public void English_not_found_is_noindex_without_canonical_or_alternates()
    {
        var head = VehicleSeo.NotFoundHead("en");
        Assert.Contains("<title data-page-meta>Vehicle not found · GP SELECT</title>", head);
        Assert.Contains("This page is not available. Browse the GP SELECT catalogue or go back to the home page to see our selection of European cars.", head);
        Assert.Contains("name=\"robots\" content=\"noindex\"", head);
        Assert.Contains("property=\"og:locale\" content=\"en_GB\"", head);
        Assert.DoesNotContain("canonical", head);
        Assert.DoesNotContain("hreflang", head);
    }
}
