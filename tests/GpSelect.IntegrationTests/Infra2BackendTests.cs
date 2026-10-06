using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Xml.Linq;
using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Xunit;

namespace GpSelect.IntegrationTests;

public sealed class Infra2BackendTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Lists_keep_more_than_100_vehicles_and_put_the_newest_first()
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var vehicles = new List<VehicleUnit>();
        for (var i = 0; i < 101; i++)
        {
            var (vehicle, image) = NewVehicle();
            vehicle.Publish([image], VehicleStatus.Available);
            db.Vehicles.Add(vehicle); db.Images.Add(image);
            db.Entry(vehicle).Property(x => x.CreatedAt).CurrentValue = DateTimeOffset.UtcNow.AddDays(1).AddMinutes(i);
            vehicles.Add(vehicle);
        }
        await db.SaveChangesAsync();
        using var client = api.Anonymous();
        foreach (var path in new[] { "/api/public/vehicles", "/api/admin/vehicles" })
        {
            var response = await (path.Contains("admin") ? api.Admin : client).GetAsync(path);
            response.EnsureSuccessStatusCode();
            var rows = (await response.Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray().ToList();
            if (path.Contains("public")) Assert.Equal(vehicles[^1].PublicSlug, rows[0].GetProperty("slug").GetString());
            foreach (var v in vehicles) Assert.Contains(rows, x => x.GetProperty("slug").GetString() == v.PublicSlug);
        }
        var sitemap = XDocument.Parse(await client.GetStringAsync("/seo/sitemap.xml"));
        var locations = sitemap.Descendants(XName.Get("loc", "http://www.sitemaps.org/schemas/sitemap/0.9"))
            .Select(x => x.Value).Where(x => x.Contains("/vehiculos/")).ToList();
        foreach (var v in vehicles) Assert.Contains(ApiFactory.SiteUrl + "/vehiculos/" + v.PublicSlug, locations);
    }

    [Theory]
    [InlineData("Sold", HttpStatusCode.OK)]
    [InlineData("Available", HttpStatusCode.UnprocessableEntity)]
    [InlineData("ComingSoon", HttpStatusCode.UnprocessableEntity)]
    public async Task Save_validates_zero_price_against_the_target_status(string target, HttpStatusCode expected)
    {
        var (vehicle, _) = await SeedVehicle(available: true);
        var response = await api.Admin.PostAsJsonAsync($"/api/admin/vehicles/{vehicle.Id}/save",
            new { changes = new { priceEur = 0 }, status = new { status = target, showWhenSold = true } });
        Assert.Equal(expected, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        if (expected != HttpStatusCode.OK) Assert.Equal("price_zero", body.GetProperty("code").GetString());
        using var scope = api.Services.CreateScope();
        var saved = await scope.ServiceProvider.GetRequiredService<GpSelectDbContext>().Vehicles.FindAsync(vehicle.Id);
        Assert.Equal(expected == HttpStatusCode.OK ? VehicleStatus.Sold : VehicleStatus.Available, saved!.Status);
        Assert.Equal(expected == HttpStatusCode.OK ? 0m : 100m, saved.PriceEur);
        if (expected == HttpStatusCode.OK) Assert.True(saved.ShowWhenSold);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Concurrent_completes_create_one_job(bool sameKey)
    {
        var (vehicle, image) = await SeedVehicle(ready: false);
        using (var scope = api.Services.CreateScope())
        {
            var storage = scope.ServiceProvider.GetRequiredService<IObjectStorage>();
            await storage.PutAsync(image.OriginalKey, new MemoryStream(new byte[] { 1, 2, 3 }), "image/jpeg", CancellationToken.None);
        }
        var path = $"/api/admin/vehicles/{vehicle.Id}/images/{image.Id}/complete";
        var key = Guid.NewGuid().ToString();
        var results = await Task.WhenAll(Send(path, key), Send(path, sameKey ? key : Guid.NewGuid().ToString()));
        Assert.All(results, response => Assert.Equal(HttpStatusCode.OK, response.StatusCode));
        using var check = api.Services.CreateScope();
        Assert.Equal(1, await check.ServiceProvider.GetRequiredService<GpSelectDbContext>().ImageJobs.CountAsync(x => x.ImageId == image.Id));
    }

    [Fact]
    public async Task Database_rejects_a_second_job_even_with_another_id()
    {
        var (_, image) = await SeedVehicle(ready: false);
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var first = ImageProcessingJob.Create(image.Id);
        db.ImageJobs.Add(first);
        db.Entry(first).Property(x => x.NextAttemptAt).CurrentValue = DateTimeOffset.UtcNow.AddDays(1);
        await db.SaveChangesAsync();
        db.ImageJobs.Add(ImageProcessingJob.Create(image.Id));
        var error = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        Assert.Equal("IX_ImageJobs_ImageId", Assert.IsType<PostgresException>(error.InnerException).ConstraintName);
    }

    [Fact]
    public async Task Concurrent_intents_cannot_exceed_30_photos()
    {
        var (vehicle, _) = await SeedVehicle(ready: false);
        using (var scope = api.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
            for (var i = 0; i < 28; i++)
                db.Images.Add(VehicleImage.Create(vehicle.Id, $"quarantine/{Guid.NewGuid():N}.jpg", "image/jpeg", 3));
            await db.SaveChangesAsync();
        }
        var path = $"/api/admin/vehicles/{vehicle.Id}/images/intent";
        var results = await Task.WhenAll(Enumerable.Range(0, 5).Select(_ =>
            Send(path, Guid.NewGuid().ToString(), new { mimeType = "image/jpeg", sizeBytes = 3 })));
        Assert.Single(results, x => x.StatusCode == HttpStatusCode.OK);
        Assert.Equal(4, results.Count(x => x.StatusCode == HttpStatusCode.Conflict));
        using var check = api.Services.CreateScope();
        Assert.Equal(30, await check.ServiceProvider.GetRequiredService<GpSelectDbContext>().Images.CountAsync(x => x.VehicleUnitId == vehicle.Id));
    }

    [Theory]
    [InlineData("publish")]
    [InlineData("status")]
    [InlineData("save")]
    public async Task Publishing_and_removing_the_last_cover_cannot_both_succeed(string endpoint)
    {
        var (vehicle, image) = await SeedVehicle();
        object body = endpoint switch
        {
            "publish" => new { target = "Available" },
            "status" => new { status = "Available" },
            _ => new { status = new { status = "Available" } }
        };
        var results = await Task.WhenAll(
            api.Admin.PostAsJsonAsync($"/api/admin/vehicles/{vehicle.Id}/{endpoint}", body),
            api.Admin.PostAsync($"/api/admin/vehicles/{vehicle.Id}/images/{image.Id}/remove", null));
        Assert.Single(results, x => x.IsSuccessStatusCode);
        Assert.Contains(results, x => x.StatusCode is HttpStatusCode.Conflict or HttpStatusCode.UnprocessableEntity);
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        var saved = await db.Vehicles.FindAsync(vehicle.Id);
        if (saved!.Status == VehicleStatus.Available)
            Assert.True(await db.Images.AnyAsync(x => x.VehicleUnitId == vehicle.Id && x.State == ImageState.Ready && x.IsCover));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task File_upload_enforces_the_intent_size(bool legacyRoute)
    {
        var (vehicle, image) = await SeedVehicle(ready: false);
        var path = legacyRoute ? $"/api/admin/vehicles/{vehicle.Id}/images/{image.Id}/upload" : $"/api/admin/uploads/{image.OriginalKey}";
        foreach (var size in new[] { 4, 3 })
        {
            using var content = new ByteArrayContent(new byte[size]);
            content.Headers.ContentType = new("image/jpeg");
            var response = await api.Admin.PutAsync(path, content);
            Assert.Equal(size == 3 ? HttpStatusCode.NoContent : HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
        }
    }

    private Task<HttpResponseMessage> Send(string path, string key, object? body = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, path);
        request.Headers.Add("Idempotency-Key", key);
        if (body is not null) request.Content = JsonContent.Create(body);
        return api.Admin.SendAsync(request);
    }

    private static (VehicleUnit Vehicle, VehicleImage Image) NewVehicle(bool ready = true)
    {
        var vehicle = VehicleUnit.Create("BMW", "M4", 2024, 1, $"infra2-{Guid.NewGuid():N}");
        var image = VehicleImage.Create(vehicle.Id, $"quarantine/{Guid.NewGuid():N}.jpg", "image/jpeg", 3);
        if (ready) { image.Ready($"vehicles/{image.Id}/card.jpg", $"vehicles/{image.Id}/detail.jpg"); image.SetCover(true); }
        return (vehicle, image);
    }

    private async Task<(VehicleUnit Vehicle, VehicleImage Image)> SeedVehicle(bool ready = true, bool available = false)
    {
        var (vehicle, image) = NewVehicle(ready);
        vehicle.Apply(new VehicleChanges { PriceEur = Optional<decimal?>.Of(100m) });
        if (available) vehicle.Publish([image], VehicleStatus.Available);
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
        db.Vehicles.Add(vehicle); db.Images.Add(image);
        await db.SaveChangesAsync();
        return (vehicle, image);
    }
}
