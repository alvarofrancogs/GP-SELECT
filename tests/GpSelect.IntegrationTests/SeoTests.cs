using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using GpSelect.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace GpSelect.IntegrationTests;

/// <summary>SEO-2: vehicle pages and the sitemap served to crawlers (SeoController).</summary>
public sealed class SeoTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    private HttpClient admin => api.Admin;

    private static async Task<JsonElement> Json(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"{(int)response.StatusCode}: {body}");
        return JsonDocument.Parse(body).RootElement;
    }

    private async Task<(Guid Id, string Slug)> CreateVehicle()
    {
        var created = await Json(await admin.PostAsJsonAsync("/api/admin/vehicles",
            new { make = "BMW", model = "M4", firstRegistrationYear = 2023, firstRegistrationMonth = 6, internalReference = "REF-SECRET" }));
        return (created.GetProperty("id").GetGuid(), created.GetProperty("slug").GetString()!);
    }

    private Task<HttpResponseMessage> SetStatus(Guid id, string status) => admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/status", new { status });

    /// <summary>The real upload flow, as in AdminApiTests: intent, PUT, complete, then wait for the worker.</summary>
    private async Task<Guid> UploadImage(Guid vehicleId)
    {
        using var image = new Image<Rgba32>(8, 6, new Rgba32(40, 40, 40));
        using var stream = new MemoryStream();
        image.SaveAsPng(stream);
        var bytes = stream.ToArray();
        var intent = new HttpRequestMessage(HttpMethod.Post, $"/api/admin/vehicles/{vehicleId}/images/intent") { Content = JsonContent.Create(new { mimeType = "image/png", sizeBytes = bytes.Length }) };
        intent.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var ticket = await Json(await admin.SendAsync(intent));
        var imageId = ticket.GetProperty("imageId").GetGuid();
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new("image/png");
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsync(ticket.GetProperty("uploadUrl").GetString(), content)).StatusCode);
        var complete = new HttpRequestMessage(HttpMethod.Post, $"/api/admin/vehicles/{vehicleId}/images/{imageId}/complete");
        complete.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
        await Json(await admin.SendAsync(complete));
        for (var i = 0; i < 60; i++)
        {
            var state = (await Json(await admin.GetAsync($"/api/admin/vehicles/{vehicleId}/images/{imageId}/status"))).GetProperty("state").GetString();
            if (state == "Ready") return imageId;
            Assert.NotEqual("Failed", state);
            await Task.Delay(500);
        }
        throw new TimeoutException("Image processing did not finish");
    }

    private async Task<(Guid Id, string Slug, Guid Image)> PublishedVehicle()
    {
        var (id, slug) = await CreateVehicle();
        await Json(await admin.PatchAsync($"/api/admin/vehicles/{id}", JsonContent.Create(new
        {
            priceEur = 86900, mileageKm = 12500, fuelType = "Gasolina",
            description = "Unidad cuidada </script><script>alert(1)</script> & revisada",
            equipment = new[] { "Asientos M Carbon" },
        })));
        var image = await UploadImage(id);
        await Json(await SetStatus(id, "Available"));
        return (id, slug, image);
    }

    private static JsonElement JsonLd(string html)
    {
        const string open = "<script data-page-meta type=\"application/ld+json\">";
        var start = html.IndexOf(open, StringComparison.Ordinal) + open.Length;
        return JsonDocument.Parse(html[start..html.IndexOf("</script>", start, StringComparison.Ordinal)]).RootElement;
    }

    [Fact]
    public async Task Vehicle_page_carries_its_metadata_and_readable_content()
    {
        var (_, slug, image) = await PublishedVehicle();
        var response = await api.Anonymous().GetAsync($"/seo/vehiculos/{slug}");
        var html = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        const string dataScript = "<script type=\"application/json\" id=\"vehicle-data\">";
        Assert.Contains(dataScript, html);
        var dataStart = html.IndexOf(dataScript, StringComparison.Ordinal) + dataScript.Length;
        using var data = JsonDocument.Parse(html[dataStart..html.IndexOf("</script>", dataStart, StringComparison.Ordinal)]);
        Assert.Equal(slug, data.RootElement.GetProperty("slug").GetString());
        Assert.Contains("<title data-page-meta>BMW M4 (2023) · 12.500 km · GP SELECT</title>", html);
        Assert.Contains($"<link data-page-meta rel=\"canonical\" href=\"{ApiFactory.SiteUrl}/vehiculos/{slug}\">", html);
        Assert.Contains($"property=\"og:image\" content=\"{ApiFactory.SiteUrl}/api/public/vehicles/{slug}/images/{image}/detail\"", html);
        Assert.Contains("content=\"index,follow\"", html);
        // The template's placeholder title is gone; the markers stay for the next fill.
        Assert.DoesNotContain("<title data-page-meta>GP SELECT</title>", html);

        var ld = JsonLd(html).GetProperty("@graph")[0];
        Assert.Equal("Car", ld.GetProperty("@type").GetString());
        Assert.Equal("Brand", ld.GetProperty("brand").GetProperty("@type").GetString());
        Assert.Equal(86900, ld.GetProperty("offers").GetProperty("price").GetDecimal());
        Assert.Equal(12500, ld.GetProperty("mileageFromOdometer").GetProperty("value").GetInt32());

        // Readable without JavaScript, and vehicle text can never break out of the page.
        Assert.Contains("<h1>BMW M4</h1>", html);
        // The contact link carries the readable name the form shows, not the slug.
        Assert.Contains("/contacto?vehiculo=BMW%20M4%20%282023%29&amp;intent=vehicle", html);
        Assert.Contains("<dd>12.500 km</dd>", html);
        Assert.Contains("<li>Asientos M Carbon</li>", html);
        Assert.DoesNotContain("<script>alert(1)</script>", html);
        Assert.Contains("&lt;/script&gt;&lt;script&gt;alert(1)", html);
        Assert.DoesNotContain("REF-SECRET", html);
    }

    [Fact]
    public async Task Sold_vehicle_keeps_its_page_without_an_offer()
    {
        var (id, slug, _) = await PublishedVehicle();
        await Json(await SetStatus(id, "Sold"));
        var response = await api.Anonymous().GetAsync($"/seo/vehiculos/{slug}");
        var html = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(JsonLd(html).GetProperty("@graph")[0].TryGetProperty("offers", out _));
        Assert.Contains("Este vehículo ya no está disponible.", html);
        Assert.DoesNotContain("Solicitar información", html);
    }

    [Fact]
    public async Task Unknown_or_unpublished_vehicle_is_a_404_kept_out_of_the_index()
    {
        var (_, draft) = await CreateVehicle();
        foreach (var slug in new[] { "no-existe", draft })
        {
            var response = await api.Anonymous().GetAsync($"/seo/vehiculos/{slug}");
            var html = await response.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.DoesNotContain("id=\"vehicle-data\"", html);
            Assert.Contains("content=\"noindex\"", html);
            Assert.Contains("<div id=\"root\"></div>", html);
        }
    }

    [Fact]
    public async Task Without_a_usable_template_the_proxy_is_told_to_fall_back()
    {
        try
        {
            api.Template.Html = null;
            Assert.Equal(HttpStatusCode.ServiceUnavailable, (await api.Anonymous().GetAsync("/seo/vehiculos/cualquiera")).StatusCode);
            api.Template.Html = "<html><head><title>Sin marcadores</title></head><body><div id=\"root\"></div></body></html>";
            Assert.Equal(HttpStatusCode.ServiceUnavailable, (await api.Anonymous().GetAsync("/seo/vehiculos/cualquiera")).StatusCode);
        }
        finally
        {
            api.Template.Html = ApiFactory.FixedSpaTemplate.Shell;
        }
    }

    [Fact]
    public async Task Sitemap_lists_the_static_routes_and_the_listed_vehicles_only()
    {
        var (listedId, listed, _) = await PublishedVehicle();
        var (_, draft) = await CreateVehicle();
        // A vehicle that left the catalogue still dates the catalogue page, but is not listed itself.
        var (archivedId, archived, _) = await PublishedVehicle();
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsync($"/api/admin/vehicles/{archivedId}/archive", null)).StatusCode);
        // Fixed dates, later than anything other tests in this class create.
        await SetUpdatedAt(listedId, new DateTimeOffset(2099, 3, 4, 10, 0, 0, TimeSpan.Zero));
        await SetUpdatedAt(archivedId, new DateTimeOffset(2099, 5, 6, 23, 30, 0, TimeSpan.Zero));
        var response = await api.Anonymous().GetAsync("/seo/sitemap.xml");
        var xml = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/xml", response.Content.Headers.ContentType?.MediaType);
        // Only the catalogue has a real content date among the static routes.
        foreach (var path in new[] { "/", "/importacion", "/nosotros", "/contacto", "/en", "/en/import", "/en/about", "/en/contact" })
            Assert.Contains($"<url><loc>{ApiFactory.SiteUrl}{path}</loc></url>", xml);
        Assert.Contains($"<loc>{ApiFactory.SiteUrl}/vehiculos</loc><lastmod>2099-05-06</lastmod>", xml);
        Assert.Contains($"<loc>{ApiFactory.SiteUrl}/en/vehicles</loc></url>", xml);
        // English vehicle pages stay out until they have their own English text (B4).
        Assert.DoesNotContain("/en/vehicles/", xml);
        Assert.Contains($"<loc>{ApiFactory.SiteUrl}/vehiculos/{listed}</loc><lastmod>2099-03-04</lastmod>", xml);
        Assert.DoesNotContain(draft, xml);
        Assert.DoesNotContain(archived, xml);
    }

    private async Task SetUpdatedAt(Guid id, DateTimeOffset at)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        await db.Vehicles.Where(x => x.Id == id).ExecuteUpdateAsync(x => x.SetProperty(v => v.UpdatedAt, at));
    }

    [Fact]
    public async Task Catalogue_links_only_listed_vehicles_in_public_list_order_and_preserves_the_template()
    {
        var (availableId, available, _) = await PublishedVehicle();
        await Json(await admin.PatchAsync($"/api/admin/vehicles/{availableId}",
            JsonContent.Create(new { make = "BMW <&>", model = "M4 <&>", variant = "Competition <&>" })));
        var (_, draft) = await CreateVehicle();
        var (archivedId, archived, _) = await PublishedVehicle();
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsync($"/api/admin/vehicles/{archivedId}/archive", null)).StatusCode);
        var (hiddenId, hidden, _) = await PublishedVehicle();
        await Json(await SetStatus(hiddenId, "Sold"));
        var (soldId, sold, _) = await PublishedVehicle();
        await Json(await admin.PostAsJsonAsync($"/api/admin/vehicles/{soldId}/status", new { status = "Sold", showWhenSold = true }));

        var response = await api.Anonymous().GetAsync("/seo/vehiculos?marca=BMW");
        var html = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("utf-8", response.Content.Headers.ContentType?.CharSet);
        Assert.True(response.Headers.CacheControl?.Public);
        Assert.Equal(TimeSpan.FromSeconds(60), response.Headers.CacheControl?.MaxAge);
        Assert.Contains($"<a href=\"/vehiculos/{available}\">BMW &lt;&amp;&gt; M4 &lt;&amp;&gt; Competition &lt;&amp;&gt; (2023)</a>", html);
        Assert.Contains($"<a href=\"/vehiculos/{sold}\">BMW M4 (2023)</a> · Vendido", html);
        foreach (var slug in new[] { draft, archived, hidden }) Assert.DoesNotContain($"/vehiculos/{slug}\"", html);

        var cards = await Json(await api.Anonymous().GetAsync("/api/public/vehicles"));
        var links = System.Text.RegularExpressions.Regex.Matches(html, "<li><a href=\"/vehiculos/([^\"]+)\">");
        Assert.Equal(cards.EnumerateArray().Select(x => Uri.EscapeDataString(x.GetProperty("slug").GetString()!)),
            links.Select(x => x.Groups[1].Value));
        var empty = System.Text.RegularExpressions.Regex.Replace(html,
            "(?<=<!--vehicle-list-->)[\\s\\S]*?(?=<!--/vehicle-list-->)", "");
        Assert.Equal(ApiFactory.FixedSpaTemplate.CatalogueShell, empty);
    }

    [Fact]
    public async Task Empty_catalogue_keeps_the_markers_empty()
    {
        // A separate database keeps this independent of the shared fixture's published vehicles.
        var emptyApi = new ApiFactory();
        try
        {
            await emptyApi.InitializeAsync();
            var response = await emptyApi.Anonymous().GetAsync("/seo/vehiculos");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(ApiFactory.FixedSpaTemplate.CatalogueShell, await response.Content.ReadAsStringAsync());
        }
        finally { await ((IAsyncLifetime)emptyApi).DisposeAsync(); }
    }

    [Fact]
    public async Task Catalogue_without_a_usable_template_returns_503()
    {
        try
        {
            foreach (var html in new string?[] { null, ApiFactory.FixedSpaTemplate.Shell })
            {
                api.Template.CatalogueHtml = html;
                Assert.Equal(HttpStatusCode.ServiceUnavailable, (await api.Anonymous().GetAsync("/seo/vehiculos")).StatusCode);
            }
        }
        finally { api.Template.CatalogueHtml = ApiFactory.FixedSpaTemplate.CatalogueShell; }
    }

    [Fact]
    public async Task Catalogue_without_template_url_is_off()
    {
        using var disabled = api.WithWebHostBuilder(builder => builder.UseSetting("Seo:TemplateUrl", ""));
        using var client = disabled.CreateClient();
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/seo/vehiculos")).StatusCode);
    }
}
