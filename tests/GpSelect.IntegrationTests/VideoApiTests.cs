using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using Xunit;

namespace GpSelect.IntegrationTests;

public sealed class VideoApiTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    private HttpClient admin => api.Admin;

    // --- Helpers (same as AdminApiTests) --------------------------------------------------------

    private static async Task<JsonElement> Json(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"{(int)response.StatusCode}: {body}");
        return JsonDocument.Parse(body).RootElement;
    }

    private static async Task<JsonElement> Problem(HttpResponseMessage response, HttpStatusCode expected)
    {
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == expected, $"expected {expected}, got {(int)response.StatusCode}: {body}");
        return JsonDocument.Parse(body).RootElement;
    }

    private static async Task AssertCode(HttpResponseMessage response, HttpStatusCode expected, string code) =>
        Assert.Equal(code, (await Problem(response, expected)).GetProperty("code").GetString());

    private async Task<Guid> CreateVehicle()
    {
        var created = await Json(await admin.PostAsJsonAsync("/api/admin/vehicles",
            new { make = "Porsche", model = "911", firstRegistrationYear = 2022, firstRegistrationMonth = 3 }));
        return created.GetProperty("id").GetGuid();
    }

    private static byte[] Png()
    {
        using var image = new Image<Rgba32>(8, 6, new Rgba32(40, 40, 40));
        using var stream = new MemoryStream();
        image.SaveAsPng(stream);
        return stream.ToArray();
    }

    /// <summary>The smallest file the API accepts as MP4: a box size, then "ftyp" at bytes 4–7.</summary>
    private static byte[] Mp4() =>
        [0, 0, 0, 0x18, (byte)'f', (byte)'t', (byte)'y', (byte)'p', (byte)'i', (byte)'s', (byte)'o', (byte)'m', 0, 0, 2, 0,
         (byte)'i', (byte)'s', (byte)'o', (byte)'m', (byte)'m', (byte)'p', (byte)'4', (byte)'1', 0, 0, 0, 8, (byte)'f', (byte)'r', (byte)'e', (byte)'e'];

    private static HttpRequestMessage Keyed(HttpMethod method, string path, object? body = null)
    {
        var request = new HttpRequestMessage(method, path) { Content = body is null ? null : JsonContent.Create(body) };
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
        return request;
    }

    private Task<HttpResponseMessage> VideoIntent(Guid vehicleId, string mimeType, long sizeBytes) =>
        admin.SendAsync(Keyed(HttpMethod.Post, $"/api/admin/vehicles/{vehicleId}/video/intent", new { mimeType, sizeBytes }));

    private Task<HttpResponseMessage> CompleteVideo(Guid vehicleId, Guid videoId) =>
        admin.SendAsync(Keyed(HttpMethod.Post, $"/api/admin/vehicles/{vehicleId}/video/{videoId}/complete"));

    /// <summary>Intent and PUT, without completing.</summary>
    private async Task<Guid> PutVideo(Guid vehicleId, byte[] bytes)
    {
        var ticket = await Json(await VideoIntent(vehicleId, "video/mp4", bytes.Length));
        Assert.Equal(900, ticket.GetProperty("expiresInSeconds").GetInt32());
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new("video/mp4");
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsync(ticket.GetProperty("uploadUrl").GetString(), content)).StatusCode);
        return ticket.GetProperty("videoId").GetGuid();
    }

    private async Task<Guid> UploadVideo(Guid vehicleId, byte[]? bytes = null)
    {
        var videoId = await PutVideo(vehicleId, bytes ?? Mp4());
        var completed = await Json(await CompleteVideo(vehicleId, videoId));
        Assert.Equal("Ready", completed.GetProperty("state").GetString());
        return videoId;
    }

    private Task<HttpResponseMessage> ImageIntent(Guid vehicleId, object body) =>
        admin.SendAsync(Keyed(HttpMethod.Post, $"/api/admin/vehicles/{vehicleId}/images/intent", body));

    /// <summary>The real image flow: intent, PUT, complete, then wait for the worker. A poster is the video's frame 0.</summary>
    private async Task<Guid> UploadImageAs(Guid vehicleId, object intent)
    {
        var bytes = Png();
        var ticket = await Json(await ImageIntent(vehicleId, intent));
        var imageId = ticket.GetProperty("imageId").GetGuid();
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new("image/png");
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PutAsync(ticket.GetProperty("uploadUrl").GetString(), content)).StatusCode);
        await Json(await admin.SendAsync(Keyed(HttpMethod.Post, $"/api/admin/vehicles/{vehicleId}/images/{imageId}/complete")));
        for (var i = 0; i < 60; i++)
        {
            var state = (await Json(await admin.GetAsync($"/api/admin/vehicles/{vehicleId}/images/{imageId}/status"))).GetProperty("state").GetString();
            if (state == "Ready") return imageId;
            Assert.NotEqual("Failed", state);
            await Task.Delay(500);
        }
        throw new TimeoutException("Image processing did not finish");
    }

    private Task<Guid> UploadImage(Guid vehicleId) => UploadImageAs(vehicleId, new { mimeType = "image/png", sizeBytes = Png().Length });

    private Task<Guid> UploadPoster(Guid vehicleId, Guid videoId) =>
        UploadImageAs(vehicleId, new { mimeType = "image/png", sizeBytes = Png().Length, kind = "videoPoster", videoId });

    private Task<HttpResponseMessage> Save(Guid vehicleId, object body) => admin.PostAsJsonAsync($"/api/admin/vehicles/{vehicleId}/save", body);
    private Task<HttpResponseMessage> KeepVideo(Guid vehicleId, Guid? keep) => Save(vehicleId, new { video = new { keep } });

    private async Task<JsonElement> Get(Guid vehicleId) => await Json(await admin.GetAsync($"/api/admin/vehicles/{vehicleId}"));

    private static JsonElement Image(JsonElement vehicle, Guid id) =>
        vehicle.GetProperty("images").EnumerateArray().Single(x => x.GetProperty("id").GetGuid() == id);

    private async Task<T> Db<T>(Func<GpSelectDbContext, Task<T>> query)
    {
        using var scope = api.Services.CreateScope();
        return await query(scope.ServiceProvider.GetRequiredService<GpSelectDbContext>());
    }

    private string StoredPath(string key) =>
        Path.Combine(api.Services.GetRequiredService<IConfiguration>()["Storage:Root"]!, key.Replace('/', Path.DirectorySeparatorChar));

    /// <summary>A saved video with its ready poster.</summary>
    private async Task<(Guid Video, Guid Poster)> SavedVideo(Guid vehicleId)
    {
        var video = await UploadVideo(vehicleId);
        var poster = await UploadPoster(vehicleId, video);
        await Json(await KeepVideo(vehicleId, video));
        return (video, poster);
    }

    // --- Upload ---------------------------------------------------------------------------------

    [Fact]
    public async Task Intent_rejects_non_mp4_and_oversized()
    {
        var id = await CreateVehicle();
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, (await VideoIntent(id, "video/webm", 1000)).StatusCode);
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, (await VideoIntent(id, "video/mp4", VideoRules.MaxUploadBytes + 1)).StatusCode);
    }

    [Fact]
    public async Task Complete_rejects_a_file_without_mp4_signature()
    {
        var id = await CreateVehicle();
        var videoId = await PutVideo(id, Png());
        await AssertCode(await CompleteVideo(id, videoId), HttpStatusCode.Conflict, "invalid_video");
        Assert.Equal(VideoState.PendingUpload, await Db(db => db.Videos.Where(x => x.Id == videoId).Select(x => x.State).SingleAsync()));
    }

    [Fact]
    public async Task Admin_can_preview_a_staged_video_without_caching()
    {
        var id = await CreateVehicle();
        var bytes = Mp4();
        var videoId = await UploadVideo(id, bytes);
        var video = (await Get(id)).GetProperty("videos").EnumerateArray().Single();
        Assert.True(video.GetProperty("isStaged").GetBoolean());

        using var response = await admin.GetAsync(video.GetProperty("url").GetString());
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(bytes, await response.Content.ReadAsByteArrayAsync());
        Assert.True(response.Headers.CacheControl!.NoStore);
        Assert.Equal($"/api/admin/vehicles/{id}/video/{videoId}", video.GetProperty("url").GetString());
    }

    [Fact]
    public async Task Archived_vehicle_refuses_video_intent()
    {
        var id = await CreateVehicle();
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsync($"/api/admin/vehicles/{id}/archive", null)).StatusCode);
        await AssertCode(await VideoIntent(id, "video/mp4", 1000), HttpStatusCode.Conflict, "archived");
    }

    [Fact]
    public async Task Poster_is_not_counted_in_the_30_photo_limit()
    {
        var id = await CreateVehicle();
        var videoId = (await Json(await VideoIntent(id, "video/mp4", 1000))).GetProperty("videoId").GetGuid();
        await Db(async db =>
        {
            for (var i = 0; i < 30; i++) db.Images.Add(VehicleImage.Create(id, $"quarantine/{id}/{Guid.NewGuid():N}.png", "image/png", 100));
            return await db.SaveChangesAsync();
        });

        Assert.Equal(HttpStatusCode.Conflict, (await ImageIntent(id, new { mimeType = "image/png", sizeBytes = 100 })).StatusCode);
        await Json(await ImageIntent(id, new { mimeType = "image/png", sizeBytes = 100, kind = "videoPoster", videoId }));
    }

    [Fact]
    public async Task Poster_needs_a_video_of_the_same_vehicle()
    {
        var id = await CreateVehicle();
        var other = await CreateVehicle();
        var foreign = await UploadVideo(other);
        Assert.Equal(HttpStatusCode.NotFound, (await ImageIntent(id, new { mimeType = "image/png", sizeBytes = 100, kind = "videoPoster", videoId = foreign })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await ImageIntent(id, new { mimeType = "image/png", sizeBytes = 100, kind = "videoPoster", videoId = Guid.NewGuid() })).StatusCode);
    }

    // --- Save -----------------------------------------------------------------------------------

    [Fact]
    public async Task Save_publishes_video_and_poster_and_the_poster_becomes_cover()
    {
        var id = await CreateVehicle();
        var photo = await UploadImage(id);
        var (videoId, poster) = await SavedVideo(id);

        var vehicle = await Get(id);
        var video = vehicle.GetProperty("videos").EnumerateArray().Single();
        Assert.Equal((videoId, false, "Ready"), (video.GetProperty("id").GetGuid(), video.GetProperty("isStaged").GetBoolean(), video.GetProperty("state").GetString()));
        Assert.Equal(poster, video.GetProperty("posterImageId").GetGuid());
        var posterImage = Image(vehicle, poster);
        Assert.Equal("VideoPoster", posterImage.GetProperty("kind").GetString());
        Assert.True(posterImage.GetProperty("isCover").GetBoolean());
        Assert.False(posterImage.GetProperty("isStaged").GetBoolean());
        Assert.Equal("Photo", Image(vehicle, photo).GetProperty("kind").GetString());
        Assert.False(Image(vehicle, photo).GetProperty("isCover").GetBoolean());

        // The admin list counts photos only, and its cover is the poster.
        var row = (await Json(await admin.GetAsync("/api/admin/vehicles"))).EnumerateArray().Single(x => x.GetProperty("id").GetGuid() == id);
        Assert.Equal((1, 1), (row.GetProperty("imageCount").GetInt32(), row.GetProperty("readyImageCount").GetInt32()));
        Assert.EndsWith($"{poster}/card", row.GetProperty("coverCardUrl").GetString());

        // Keeping the video already published changes nothing.
        await Json(await KeepVideo(id, videoId));
        Assert.True(Image(await Get(id), poster).GetProperty("isCover").GetBoolean());
    }

    [Fact]
    public async Task Replacing_a_video_deletes_the_old_one_and_its_storage()
    {
        var id = await CreateVehicle();
        var (a, posterA) = await SavedVideo(id);
        var keyA = await Db(db => db.Videos.Where(x => x.Id == a).Select(x => x.Key).SingleAsync());
        Assert.True(File.Exists(StoredPath(keyA)));

        var (b, posterB) = await SavedVideo(id);

        var vehicle = await Get(id);
        Assert.Equal(b, vehicle.GetProperty("videos").EnumerateArray().Single().GetProperty("id").GetGuid());
        Assert.True(Image(vehicle, posterB).GetProperty("isCover").GetBoolean());
        Assert.DoesNotContain(vehicle.GetProperty("images").EnumerateArray(), x => x.GetProperty("id").GetGuid() == posterA);
        Assert.False(File.Exists(StoredPath(keyA)));
        Assert.Equal(VideoState.Deleted, await Db(db => db.Videos.Where(x => x.Id == a).Select(x => x.State).SingleAsync()));
        var oldPoster = await Db(db => db.Images.SingleAsync(x => x.Id == posterA));
        Assert.Equal(ImageState.Deleted, oldPoster.State);
        Assert.False(File.Exists(StoredPath(oldPoster.DetailKey!)));
    }

    [Fact]
    public async Task Removing_the_video_returns_the_cover_to_the_first_photo()
    {
        var id = await CreateVehicle();
        var photo = await UploadImage(id);
        var (videoId, poster) = await SavedVideo(id);
        var key = await Db(db => db.Videos.Where(x => x.Id == videoId).Select(x => x.Key).SingleAsync());

        var saved = await Json(await KeepVideo(id, null));
        Assert.Empty(saved.GetProperty("videos").EnumerateArray());
        var image = Assert.Single(saved.GetProperty("images").EnumerateArray());
        Assert.Equal(photo, image.GetProperty("id").GetGuid());
        Assert.True(image.GetProperty("isCover").GetBoolean());
        Assert.False(File.Exists(StoredPath(key)));
        Assert.Equal(ImageState.Deleted, await Db(db => db.Images.Where(x => x.Id == poster).Select(x => x.State).SingleAsync()));
    }

    [Fact]
    public async Task Removing_the_only_image_of_a_listed_vehicle_is_refused()
    {
        var id = await CreateVehicle();
        await Json(await admin.PatchAsync($"/api/admin/vehicles/{id}", JsonContent.Create(new { priceEur = 125000 })));
        var (videoId, _) = await SavedVideo(id);
        // A vehicle with a video and no photos can be published.
        await Json(await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/status", new { status = "Available" }));

        await AssertCode(await KeepVideo(id, null), HttpStatusCode.Conflict, "last_public_image");
        Assert.Equal(videoId, (await Get(id)).GetProperty("videos").EnumerateArray().Single().GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task Replacing_the_video_of_a_listed_vehicle_without_photos_works_once_the_new_poster_is_ready()
    {
        var id = await CreateVehicle();
        await Json(await admin.PatchAsync($"/api/admin/vehicles/{id}", JsonContent.Create(new { priceEur = 125000 })));
        await SavedVideo(id);
        await Json(await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/status", new { status = "Available" }));

        var (b, posterB) = await SavedVideo(id);

        var vehicle = await Get(id);
        Assert.Equal("Available", vehicle.GetProperty("status").GetString());
        Assert.Equal(b, vehicle.GetProperty("videos").EnumerateArray().Single().GetProperty("id").GetGuid());
        var cover = Assert.Single(vehicle.GetProperty("images").EnumerateArray());
        Assert.Equal(posterB, cover.GetProperty("id").GetGuid());
        Assert.True(cover.GetProperty("isCover").GetBoolean());
    }

    [Fact]
    public async Task Save_refuses_a_video_whose_poster_failed()
    {
        var id = await CreateVehicle();
        var videoId = await UploadVideo(id);
        var poster = await UploadPoster(id, videoId);
        await Db(db => db.Images.Where(x => x.Id == poster).ExecuteUpdateAsync(u => u.SetProperty(x => x.State, ImageState.Failed)));

        await AssertCode(await KeepVideo(id, videoId), HttpStatusCode.Conflict, "video_poster_failed");
        Assert.True((await Get(id)).GetProperty("videos").EnumerateArray().Single().GetProperty("isStaged").GetBoolean());
    }

    [Theory]
    [InlineData(ImageState.Failed)]
    [InlineData(ImageState.Deleted)]
    public async Task Keeping_the_published_video_refuses_it_when_its_poster_failed_or_is_gone(ImageState posterState)
    {
        var id = await CreateVehicle();
        var (videoId, poster) = await SavedVideo(id);
        await Db(db => db.Images.Where(x => x.Id == poster).ExecuteUpdateAsync(u => u.SetProperty(x => x.State, posterState).SetProperty(x => x.IsCover, false)));

        await AssertCode(await KeepVideo(id, videoId), HttpStatusCode.Conflict, "video_poster_failed");
    }

    [Fact]
    public async Task Video_intent_replays_the_same_key_without_a_new_video()
    {
        var id = await CreateVehicle();
        var request = Keyed(HttpMethod.Post, $"/api/admin/vehicles/{id}/video/intent", new { mimeType = "video/mp4", sizeBytes = 1000 });
        var key = request.Headers.GetValues("Idempotency-Key").Single();
        var first = await Json(await admin.SendAsync(request));

        var again = new HttpRequestMessage(HttpMethod.Post, $"/api/admin/vehicles/{id}/video/intent") { Content = JsonContent.Create(new { mimeType = "video/mp4", sizeBytes = 1000 }) };
        again.Headers.Add("Idempotency-Key", key);
        var second = await Json(await admin.SendAsync(again));

        Assert.Equal(first.GetProperty("videoId").GetGuid(), second.GetProperty("videoId").GetGuid());
        Assert.Equal(1, await Db(db => db.Videos.CountAsync(x => x.VehicleUnitId == id)));
    }

    [Fact]
    public async Task Save_refuses_a_video_that_is_not_ready_or_not_this_vehicles()
    {
        var id = await CreateVehicle();
        var pending = await PutVideo(id, Mp4());
        await AssertCode(await KeepVideo(id, pending), HttpStatusCode.Conflict, "invalid_video");
        var foreign = await UploadVideo(await CreateVehicle());
        await AssertCode(await KeepVideo(id, foreign), HttpStatusCode.Conflict, "invalid_video");
    }

    [Fact]
    public async Task Poster_is_managed_through_the_video_not_the_photo_endpoints()
    {
        var id = await CreateVehicle();
        await UploadImage(id);
        var (_, poster) = await SavedVideo(id);

        await AssertCode(await admin.PostAsync($"/api/admin/vehicles/{id}/images/{poster}/cover", null), HttpStatusCode.BadRequest, "invalid_gallery");
        await AssertCode(await admin.PostAsync($"/api/admin/vehicles/{id}/images/{poster}/remove", null), HttpStatusCode.BadRequest, "invalid_gallery");
        await AssertCode(await Save(id, new { gallery = new { removed = new[] { poster } } }), HttpStatusCode.BadRequest, "invalid_gallery");
        Assert.True(Image(await Get(id), poster).GetProperty("isCover").GetBoolean());
    }
}
