using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using GpSelect.Domain;
using GpSelect.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using Xunit;

namespace GpSelect.IntegrationTests;

public sealed class AdminApiTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    private HttpClient admin => api.Admin;

    // --- Helpers --------------------------------------------------------------------------------

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

    private async Task<(Guid Id, string Slug)> CreateVehicle(string reference = "REF-INTERNAL")
    {
        var created = await Json(await admin.PostAsJsonAsync("/api/admin/vehicles",
            new { make = "BMW", model = "M4", firstRegistrationYear = 2023, firstRegistrationMonth = 6, internalReference = reference }));
        return (created.GetProperty("id").GetGuid(), created.GetProperty("slug").GetString()!);
    }

    private Task<HttpResponseMessage> Patch(Guid id, object body) => admin.PatchAsync($"/api/admin/vehicles/{id}", JsonContent.Create(body));
    private Task<HttpResponseMessage> SetStatus(Guid id, string status) => admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/status", new { status });

    private static byte[] Png()
    {
        using var image = new Image<Rgba32>(8, 6, new Rgba32(40, 40, 40));
        using var stream = new MemoryStream();
        image.SaveAsPng(stream);
        return stream.ToArray();
    }

    /// <summary>The real upload flow: intent, PUT to the returned URL, complete, then wait for the worker.</summary>
    private async Task<Guid> UploadImage(Guid vehicleId, bool staged = false)
    {
        var bytes = Png();
        var intent = new HttpRequestMessage(HttpMethod.Post, $"/api/admin/vehicles/{vehicleId}/images/intent") { Content = JsonContent.Create(new { mimeType = "image/png", sizeBytes = bytes.Length, staged }) };
        intent.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var ticket = await Json(await admin.SendAsync(intent));
        var imageId = ticket.GetProperty("imageId").GetGuid();

        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new("image/png");
        var upload = await admin.PutAsync(ticket.GetProperty("uploadUrl").GetString(), content);
        Assert.Equal(HttpStatusCode.NoContent, upload.StatusCode);

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

    private async Task<bool> IsListed(string slug)
    {
        var list = await Json(await api.Anonymous().GetAsync("/api/public/vehicles"));
        return list.EnumerateArray().Any(x => x.GetProperty("slug").GetString() == slug);
    }

    [Fact]
    public async Task Status_endpoint_rejects_numeric_strings_and_the_list_keeps_working()
    {
        var (id, _) = await CreateVehicle();
        await Problem(await SetStatus(id, "7"), HttpStatusCode.BadRequest);
        Assert.Equal("Draft", (await Json(await admin.GetAsync($"/api/admin/vehicles/{id}"))).GetProperty("status").GetString());
        await Json(await admin.GetAsync("/api/admin/vehicles"));
    }

    // --- Auth -----------------------------------------------------------------------------------

    [Fact]
    public async Task Login_issues_a_secure_http_only_cookie_and_admin_routes_require_it()
    {
        using var client = api.Anonymous();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/vehicles")).StatusCode);
        await Problem(await client.PostAsJsonAsync("/api/admin/auth/login", new { email = ApiFactory.AdminEmail, password = "wrong" }), HttpStatusCode.Unauthorized);

        var login = await client.PostAsJsonAsync("/api/admin/auth/login", new { email = ApiFactory.AdminEmail, password = ApiFactory.AdminPassword });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var cookie = Assert.Single(login.Headers.GetValues("Set-Cookie")).ToLowerInvariant();
        Assert.Contains("httponly", cookie);
        Assert.Contains("secure", cookie);
        Assert.Contains("samesite=strict", cookie);

        var me = await Json(await client.GetAsync("/api/admin/auth/me"));
        Assert.Equal(("Admin", ApiFactory.AdminEmail), (me.GetProperty("role").GetString(), me.GetProperty("email").GetString()));
    }

    [Fact]
    public async Task Csrf_accepts_the_configured_origin_and_rejects_others()
    {
        var body = new { make = "Audi", model = "RS 6", firstRegistrationYear = 2023 };

        var foreign = new HttpRequestMessage(HttpMethod.Post, "/api/admin/vehicles") { Content = JsonContent.Create(body) };
        foreign.Headers.Remove("Origin");
        foreign.Headers.Add("Origin", "https://evil.example");
        var rejected = await Problem(await admin.SendAsync(foreign), HttpStatusCode.Forbidden);
        Assert.Equal("csrf_failed", rejected.GetProperty("code").GetString());

        using var noOrigin = api.Anonymous();
        (await noOrigin.PostAsJsonAsync("/api/admin/auth/login", new { email = ApiFactory.AdminEmail, password = ApiFactory.AdminPassword })).EnsureSuccessStatusCode();
        await Problem(await noOrigin.PostAsJsonAsync("/api/admin/vehicles", body), HttpStatusCode.Forbidden);

        Assert.Equal(HttpStatusCode.Created, (await admin.PostAsJsonAsync("/api/admin/vehicles", body)).StatusCode);
    }

    [Fact]
    public async Task Csrf_falls_back_to_the_referer_and_rejects_a_foreign_one()
    {
        using var client = await SignedIn("198.51.100.40");
        var body = new { make = "Porsche", model = "911", firstRegistrationYear = 2022 };

        var foreign = new HttpRequestMessage(HttpMethod.Post, "/api/admin/vehicles") { Content = JsonContent.Create(body) };
        foreign.Headers.Referrer = new Uri("https://evil.example/admin");
        Assert.Equal("csrf_failed", (await Problem(await client.SendAsync(foreign), HttpStatusCode.Forbidden)).GetProperty("code").GetString());

        var own = new HttpRequestMessage(HttpMethod.Post, "/api/admin/vehicles") { Content = JsonContent.Create(body) };
        own.Headers.Referrer = new Uri(ApiFactory.AllowedOrigin + "/admin/nuevo");
        Assert.Equal(HttpStatusCode.Created, (await client.SendAsync(own)).StatusCode);
    }

    [Fact]
    public async Task Logout_needs_the_allowed_origin_and_ends_the_session()
    {
        using var client = await SignedIn("198.51.100.41");
        await Problem(await client.PostAsync("/api/admin/auth/logout", null), HttpStatusCode.Forbidden);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/admin/auth/me")).StatusCode);

        client.DefaultRequestHeaders.Add("Origin", ApiFactory.AllowedOrigin);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/admin/auth/logout", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/vehicles")).StatusCode);
    }

    // --- Login rate limit -----------------------------------------------------------------------

    private static HttpRequestMessage Login(string password, string peer, string? forwardedFor = null, string? loginEmail = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/admin/auth/login") { Content = JsonContent.Create(new { email = ApiFactory.AdminEmail, password }) };
        request.Headers.Add("X-Test-Peer", peer);
        if (forwardedFor is not null) request.Headers.Add("X-Forwarded-For", forwardedFor);
        if (loginEmail is not null) request.Headers.Add("X-Login-Email", loginEmail);
        return request;
    }

    private async Task<HttpClient> SignedIn(string peer)
    {
        var client = api.Anonymous();
        (await client.SendAsync(Login(ApiFactory.AdminPassword, peer))).EnsureSuccessStatusCode();
        return client;
    }

    [Fact]
    public async Task Login_limit_answers_429_and_a_client_header_cannot_reset_it()
    {
        using var client = api.Anonymous();
        const string peer = "198.51.100.7";
        for (var i = 0; i < 5; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(Login("wrong", peer, loginEmail: $"attempt-{i}@evil.example"))).StatusCode);

        // The sixth attempt is refused even with the right password and a fresh X-Login-Email.
        var refused = await client.SendAsync(Login(ApiFactory.AdminPassword, peer, loginEmail: "fresh@evil.example"));
        var problem = await Problem(refused, HttpStatusCode.TooManyRequests);
        Assert.Equal("rate_limited", problem.GetProperty("code").GetString());
        Assert.True(problem.TryGetProperty("correlationId", out _));
        Assert.InRange(refused.Headers.RetryAfter?.Delta?.TotalSeconds ?? 0, 1, 60);
        Assert.False(refused.Headers.Contains("Set-Cookie"));

        // Another client is not affected.
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(Login(ApiFactory.AdminPassword, "198.51.100.8"))).StatusCode);
    }

    [Fact]
    public async Task Login_limit_groups_an_ipv6_client_by_its_64_prefix()
    {
        using var client = api.Anonymous();
        for (var i = 1; i <= 5; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(Login("wrong", $"2001:db8:0:7::{i}"))).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.SendAsync(Login("wrong", "2001:db8:0:7::ffff"))).StatusCode);
    }

    [Fact]
    public async Task Forwarded_for_is_only_trusted_from_a_configured_proxy()
    {
        using var client = api.Anonymous();

        // A direct client cannot pick a new address per request.
        for (var i = 0; i < 5; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(Login("wrong", "203.0.113.5", forwardedFor: $"192.0.2.{i + 10}"))).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.SendAsync(Login("wrong", "203.0.113.5", forwardedFor: "192.0.2.99"))).StatusCode);

        // Behind the trusted proxy each real client has its own bucket.
        for (var i = 0; i < 5; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(Login("wrong", ApiFactory.TrustedProxy, forwardedFor: "192.0.2.1"))).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.SendAsync(Login("wrong", ApiFactory.TrustedProxy, forwardedFor: "192.0.2.1"))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(Login("wrong", ApiFactory.TrustedProxy, forwardedFor: "192.0.2.2"))).StatusCode);
    }

    [Fact]
    public async Task Correlation_id_is_echoed_only_when_it_is_short_and_plain()
    {
        using var client = api.Anonymous();
        var plain = new HttpRequestMessage(HttpMethod.Get, "/api/public/vehicles");
        plain.Headers.Add("X-Correlation-ID", "req-42.abc_DEF");
        var response = await client.SendAsync(plain);
        Assert.Equal("req-42.abc_DEF", response.Headers.GetValues("X-Correlation-ID").Single());
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());

        foreach (var hostile in new[] { new string('a', 65), "<script>", "a b" })
        {
            var request = new HttpRequestMessage(HttpMethod.Get, "/api/public/vehicles");
            request.Headers.TryAddWithoutValidation("X-Correlation-ID", hostile);
            Assert.Matches("^[0-9a-f]{32}$", (await client.SendAsync(request)).Headers.GetValues("X-Correlation-ID").Single());
        }
    }

    // --- Contracts ------------------------------------------------------------------------------

    [Fact]
    public async Task Create_persists_internal_reference_and_enums_are_names()
    {
        var (id, _) = await CreateVehicle("REF-0042");
        var detail = await Json(await admin.GetAsync($"/api/admin/vehicles/{id}"));
        Assert.Equal("REF-0042", detail.GetProperty("internalReference").GetString());
        Assert.Equal("Draft", detail.GetProperty("status").GetString());

        var row = (await Json(await admin.GetAsync("/api/admin/vehicles"))).EnumerateArray().Single(x => x.GetProperty("id").GetGuid() == id);
        Assert.Equal("Draft", row.GetProperty("status").GetString());

        await Problem(await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/status", new { status = 2 }), HttpStatusCode.BadRequest);
        await Problem(await SetStatus(id, "Flying"), HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Patch_distinguishes_absent_null_and_value_and_persists()
    {
        var (id, _) = await CreateVehicle();
        await Json(await Patch(id, new
        {
            variant = "Competition", powerHp = 510, mileageKm = 28400, drivetrain = "Trasera", priceEur = 86900,
            equipment = new[] { " Head-Up Display ", "head-up display", "Harman Kardon" },
            customSpecifications = new[] { new { label = "Par máximo", value = "650 Nm" } },
        }));

        // Absent properties keep their value.
        await Json(await Patch(id, new { description = "Coupé de ejemplo." }));
        var kept = await Json(await admin.GetAsync($"/api/admin/vehicles/{id}"));
        Assert.Equal(("Competition", 510, "Coupé de ejemplo."), (kept.GetProperty("variant").GetString(), kept.GetProperty("powerHp").GetInt32(), kept.GetProperty("description").GetString()));
        Assert.Equal(new[] { "Head-Up Display", "Harman Kardon" }, kept.GetProperty("equipment").EnumerateArray().Select(x => x.GetString()));
        Assert.Equal("650 Nm", kept.GetProperty("customSpecifications")[0].GetProperty("value").GetString());

        // Explicit null or blank clears a clearable field.
        await Json(await admin.PatchAsync($"/api/admin/vehicles/{id}", new StringContent("""{"variant":null,"drivetrain":"  ","equipment":[]}""", System.Text.Encoding.UTF8, "application/json")));
        var cleared = await Json(await admin.GetAsync($"/api/admin/vehicles/{id}"));
        Assert.Equal(JsonValueKind.Null, cleared.GetProperty("variant").ValueKind);
        Assert.Equal(JsonValueKind.Null, cleared.GetProperty("drivetrain").ValueKind);
        Assert.Equal(0, cleared.GetProperty("equipment").GetArrayLength());
        Assert.Equal(510, cleared.GetProperty("powerHp").GetInt32());

        // Required fields cannot be cleared; errors name the field.
        var problem = await Problem(await admin.PatchAsync($"/api/admin/vehicles/{id}", new StringContent("""{"make":null}""", System.Text.Encoding.UTF8, "application/json")), HttpStatusCode.BadRequest);
        Assert.Equal(("required", "make"), (problem.GetProperty("code").GetString(), problem.GetProperty("field").GetString()));
        var range = await Problem(await Patch(id, new { powerHp = 2001 }), HttpStatusCode.BadRequest);
        Assert.Equal("powerHp", range.GetProperty("field").GetString());
    }

    [Fact]
    public async Task Patch_with_a_nul_character_is_a_400_not_a_500()
    {
        var (id, _) = await CreateVehicle();
        var problem = await Problem(await Patch(id, new { model = "M4\u0000" }), HttpStatusCode.BadRequest);
        Assert.Equal(("invalid_text", "model"), (problem.GetProperty("code").GetString(), problem.GetProperty("field").GetString()));
    }

    private HttpRequestMessage Intent(Guid vehicleId)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/admin/vehicles/{vehicleId}/images/intent") { Content = JsonContent.Create(new { mimeType = "image/png", sizeBytes = 100 }) };
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
        return request;
    }

    [Fact]
    public async Task Archived_vehicle_gallery_is_read_only_and_public_images_cache_for_a_day()
    {
        var (id, _) = await CreateVehicle();
        var photo = await UploadImage(id);
        var pending = (await Json(await admin.SendAsync(Intent(id)))).GetProperty("imageId").GetGuid();
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsync($"/api/admin/vehicles/{id}/archive", null)).StatusCode);

        async Task AssertArchived(HttpResponseMessage response) =>
            Assert.Equal("archived", (await Problem(response, HttpStatusCode.Conflict)).GetProperty("code").GetString());

        await AssertArchived(await admin.SendAsync(Intent(id)));
        var complete = new HttpRequestMessage(HttpMethod.Post, $"/api/admin/vehicles/{id}/images/{pending}/complete");
        complete.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
        await AssertArchived(await admin.SendAsync(complete));
        await AssertArchived(await admin.PostAsync($"/api/admin/vehicles/{id}/images/{photo}/cover", null));
        await AssertArchived(await admin.PostAsync($"/api/admin/vehicles/{id}/images/{photo}/remove", null));
        await AssertArchived(await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/images/reorder", new { imageIds = new[] { photo } }));
        await AssertArchived(await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/save", new { gallery = new { removed = new[] { photo } } }));

        await Json(await admin.PostAsync($"/api/admin/vehicles/{id}/restore", null));
        await Json(await admin.SendAsync(Intent(id)));

        var (publicId, slug) = await CreateVehicle();
        await Json(await Patch(publicId, new { priceEur = 86900 }));
        await UploadImage(publicId);
        await Json(await SetStatus(publicId, "Available"));
        using var visitor = api.Anonymous();
        var url = (await Json(await visitor.GetAsync($"/api/public/vehicles/{slug}"))).GetProperty("images")[0].GetString();
        var image = await visitor.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, image.StatusCode);
        Assert.Equal(TimeSpan.FromDays(1), image.Headers.CacheControl!.MaxAge);
    }

    [Fact]
    public async Task Status_cover_and_public_visibility_follow_the_rules()
    {
        var (id, slug) = await CreateVehicle();
        await Json(await Patch(id, new { priceEur = 86900, powerHp = 510 }));

        // No ready cover: cannot be listed.
        var blocked = await Problem(await SetStatus(id, "Available"), HttpStatusCode.UnprocessableEntity);
        Assert.Equal("images_required", blocked.GetProperty("code").GetString());

        // The first ready image becomes the cover automatically.
        var first = await UploadImage(id);
        var second = await UploadImage(id);
        var images = (await Json(await admin.GetAsync($"/api/admin/vehicles/{id}"))).GetProperty("images").EnumerateArray().ToList();
        Assert.True(images.Single(x => x.GetProperty("id").GetGuid() == first).GetProperty("isCover").GetBoolean());
        Assert.False(images.Single(x => x.GetProperty("id").GetGuid() == second).GetProperty("isCover").GetBoolean());

        var available = await Json(await SetStatus(id, "Available"));
        Assert.Equal("Available", available.GetProperty("status").GetString());
        var publishedAt = available.GetProperty("publishedAt").GetDateTimeOffset();
        Assert.True(await IsListed(slug));

        // Public detail: cover first, structured fields, no internal data.
        using var visitor = api.Anonymous();
        var publicBody = await (await visitor.GetAsync($"/api/public/vehicles/{slug}")).Content.ReadAsStringAsync();
        var publicDetail = JsonDocument.Parse(publicBody).RootElement;
        Assert.Contains(first.ToString(), publicDetail.GetProperty("images")[0].GetString());
        Assert.Equal((510, "Available"), (publicDetail.GetProperty("powerHp").GetInt32(), publicDetail.GetProperty("status").GetString()));
        Assert.DoesNotContain("REF-INTERNAL", publicBody);
        Assert.DoesNotContain("internalReference", publicBody);
        var cardBody = await (await visitor.GetAsync("/api/public/vehicles")).Content.ReadAsStringAsync();
        Assert.DoesNotContain("REF-INTERNAL", cardBody);

        // Reserved stays public; Sold leaves the list but keeps its detail URL; Draft withdraws it.
        await Json(await SetStatus(id, "Reserved"));
        Assert.True(await IsListed(slug));
        await Json(await SetStatus(id, "Sold"));
        Assert.False(await IsListed(slug));
        // A body without status is refused instead of reading as Draft.
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/status", new { showWhenSold = true })).StatusCode);
        Assert.False(await IsListed(slug));
        // Kept on show: back in the catalogue, marked as sold, after anything still for sale.
        var kept = await Json(await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/status", new { status = "Sold", showWhenSold = true }));
        Assert.True(kept.GetProperty("showWhenSold").GetBoolean());
        Assert.True(await IsListed(slug));
        Assert.Equal("Sold", (await Json(await visitor.GetAsync("/api/public/vehicles"))).EnumerateArray().Single(x => x.GetProperty("slug").GetString() == slug).GetProperty("status").GetString());
        await Json(await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/status", new { status = "Sold", showWhenSold = false }));
        Assert.False(await IsListed(slug));
        Assert.Equal("Sold", (await Json(await visitor.GetAsync($"/api/public/vehicles/{slug}"))).GetProperty("status").GetString());
        await Json(await SetStatus(id, "Draft"));
        Assert.False(await IsListed(slug));
        Assert.Equal(HttpStatusCode.NotFound, (await visitor.GetAsync($"/api/public/vehicles/{slug}")).StatusCode);

        // Publishing again keeps the first publication date.
        var republished = await Json(await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/publish", new { target = "ComingSoon" }));
        Assert.Equal("ComingSoon", republished.GetProperty("status").GetString());
        // PostgreSQL stores microseconds; the first response still held .NET's 100 ns ticks.
        Assert.True((republished.GetProperty("publishedAt").GetDateTimeOffset() - publishedAt).Duration() < TimeSpan.FromMilliseconds(1));

        // The cover is the first photo: choosing another cover moves it to the front, and so does reordering.
        var third = await UploadImage(id);
        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync($"/api/admin/vehicles/{id}/images/{third}/cover", null)).StatusCode);
        var gallery = (await Json(await admin.GetAsync($"/api/admin/vehicles/{id}"))).GetProperty("images").EnumerateArray().ToList();
        Assert.Equal(new[] { third, first, second }, gallery.Select(x => x.GetProperty("id").GetGuid()));
        Assert.True(gallery[0].GetProperty("isCover").GetBoolean());
        Assert.Single(gallery, x => x.GetProperty("isCover").GetBoolean());
        Assert.Contains(third.ToString(), (await Json(await visitor.GetAsync($"/api/public/vehicles/{slug}"))).GetProperty("images")[0].GetString());
        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/images/reorder", new { imageIds = new[] { first, third, second } })).StatusCode);
        gallery = (await Json(await admin.GetAsync($"/api/admin/vehicles/{id}"))).GetProperty("images").EnumerateArray().ToList();
        Assert.Equal(first, gallery[0].GetProperty("id").GetGuid());
        Assert.True(gallery[0].GetProperty("isCover").GetBoolean());
        Assert.Single(gallery, x => x.GetProperty("isCover").GetBoolean());
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsync($"/api/admin/vehicles/{id}/images/{third}/remove", null)).StatusCode);

        // Removing the cover promotes the next ready image; the last ready image of a listed vehicle stays.
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsync($"/api/admin/vehicles/{id}/images/{first}/remove", null)).StatusCode);
        var remaining = Assert.Single((await Json(await admin.GetAsync($"/api/admin/vehicles/{id}"))).GetProperty("images").EnumerateArray());
        Assert.True(remaining.GetProperty("isCover").GetBoolean());
        var last = await Problem(await admin.PostAsync($"/api/admin/vehicles/{id}/images/{second}/remove", null), HttpStatusCode.Conflict);
        Assert.Equal("last_public_image", last.GetProperty("code").GetString());

        // Archived is never public and frozen until it is restored, as a draft.
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsync($"/api/admin/vehicles/{id}/archive", null)).StatusCode);
        Assert.Equal("archived", (await Problem(await SetStatus(id, "Available"), HttpStatusCode.Conflict)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Conflict, (await Patch(id, new { variant = "x" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await visitor.GetAsync($"/api/public/vehicles/{slug}")).StatusCode);
        var restored = await Json(await admin.PostAsync($"/api/admin/vehicles/{id}/restore", null));
        Assert.Equal("Draft", restored.GetProperty("status").GetString());
        Assert.False(await IsListed(slug));
        Assert.Equal("Reserved", (await Json(await SetStatus(id, "Reserved"))).GetProperty("status").GetString());
        Assert.True(await IsListed(slug));
    }

    [Fact]
    public async Task Editor_save_applies_everything_at_once_and_nothing_before()
    {
        var (id, slug) = await CreateVehicle();
        await Json(await Patch(id, new { priceEur = 86900 }));
        var first = await UploadImage(id);
        await Json(await SetStatus(id, "Available"));
        using var visitor = api.Anonymous();
        async Task<List<string>> PublicImages() => (await Json(await visitor.GetAsync($"/api/public/vehicles/{slug}"))).GetProperty("images").EnumerateArray().Select(x => x.GetString()!).ToList();

        // A staged upload is processed but stays out of the vehicle: not public, not the cover, not counted.
        var staged = await UploadImage(id, staged: true);
        var before = await PublicImages();
        Assert.Single(before);
        Assert.DoesNotContain(before, x => x.Contains(staged.ToString()));
        Assert.Equal(HttpStatusCode.NotFound, (await visitor.GetAsync($"/api/public/vehicles/{slug}/images/{staged}/detail")).StatusCode);
        var editor = (await Json(await admin.GetAsync($"/api/admin/vehicles/{id}"))).GetProperty("images").EnumerateArray().ToList();
        Assert.True(editor.Single(x => x.GetProperty("id").GetGuid() == staged).GetProperty("isStaged").GetBoolean());
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync($"/api/admin/vehicles/{id}/images/{staged}/cover", null)).StatusCode);

        // An invalid part refuses the whole save: nothing changes.
        var refused = await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/save", new
        {
            changes = new { variant = "Touring", powerHp = 99999 },
            gallery = new { order = new[] { staged, first }, removed = Array.Empty<Guid>() },
        });
        Assert.Equal("powerHp", (await Problem(refused, HttpStatusCode.BadRequest)).GetProperty("field").GetString());
        var unchanged = await Json(await admin.GetAsync($"/api/admin/vehicles/{id}"));
        Assert.Equal(JsonValueKind.Null, unchanged.GetProperty("variant").ValueKind);
        Assert.Equal(before, await PublicImages());

        // One save: fields, the staged photo kept and moved to the front (so it is the cover), the old one removed, status.
        var saved = await Json(await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/save", new
        {
            changes = new { variant = "Touring" },
            gallery = new { order = new[] { staged }, removed = new[] { first } },
            status = new { status = "Reserved" },
        }));
        Assert.Equal(("Touring", "Reserved"), (saved.GetProperty("variant").GetString(), saved.GetProperty("status").GetString()));
        var image = Assert.Single(saved.GetProperty("images").EnumerateArray());
        Assert.Equal(staged, image.GetProperty("id").GetGuid());
        Assert.True(image.GetProperty("isCover").GetBoolean());
        Assert.False(image.GetProperty("isStaged").GetBoolean());
        Assert.Contains(staged.ToString(), Assert.Single(await PublicImages()));

        // Withdrawing and removing the last photo in the same save is allowed: the vehicle leaves the catalogue first.
        var withdrawn = await Json(await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/save", new
        {
            gallery = new { order = Array.Empty<Guid>(), removed = new[] { staged } },
            status = new { status = "Draft" },
        }));
        Assert.Empty(withdrawn.GetProperty("images").EnumerateArray());
        Assert.False(await IsListed(slug));
    }

    private async Task<Dictionary<Guid, bool>> StagedById(Guid id) =>
        (await Json(await admin.GetAsync($"/api/admin/vehicles/{id}"))).GetProperty("images").EnumerateArray()
            .ToDictionary(x => x.GetProperty("id").GetGuid(), x => x.GetProperty("isStaged").GetBoolean());

    [Fact]
    public async Task Save_publishes_only_the_staged_photos_it_lists()
    {
        var (id, slug) = await CreateVehicle();
        await Json(await Patch(id, new { priceEur = 86900 }));
        var a = await UploadImage(id);
        await Json(await SetStatus(id, "Available"));
        var b = await UploadImage(id, staged: true);
        var c = await UploadImage(id, staged: true); // uploaded from another tab

        await Json(await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/save", new
        {
            gallery = new { order = new[] { a, b }, removed = Array.Empty<Guid>() },
        }));
        var staged = await StagedById(id);
        Assert.False(staged[b]);
        Assert.True(staged[c]);
        var images = (await Json(await api.Anonymous().GetAsync($"/api/public/vehicles/{slug}"))).GetProperty("images").EnumerateArray().Select(x => x.GetString()!).ToList();
        Assert.Equal(2, images.Count);
        Assert.DoesNotContain(images, x => x.Contains(c.ToString()));

        // A save without an order publishes no staged photo.
        await Json(await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/save", new { gallery = new { removed = Array.Empty<Guid>() } }));
        Assert.True((await StagedById(id))[c]);
    }

    [Fact]
    public async Task Save_publishes_staged_photos_left_from_an_earlier_session()
    {
        var (id, _) = await CreateVehicle();
        var a = await UploadImage(id);
        var b = await UploadImage(id, staged: true); // left staged before the editor was opened

        await Json(await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/save", new
        {
            gallery = new { order = new[] { a, b }, removed = Array.Empty<Guid>() },
        }));
        Assert.False((await StagedById(id))[b]);
    }

    [Fact]
    public async Task Save_can_withdraw_and_zero_the_price_together()
    {
        var (id, slug) = await CreateVehicle();
        await Json(await Patch(id, new { priceEur = 86900 }));
        await UploadImage(id);
        await Json(await SetStatus(id, "Available"));

        var saved = await Json(await admin.PostAsJsonAsync($"/api/admin/vehicles/{id}/save", new
        {
            changes = new { priceEur = 0 },
            status = new { status = "Draft" },
        }));
        Assert.Equal("Draft", saved.GetProperty("status").GetString());
        Assert.Equal(0m, saved.GetProperty("priceEur").GetDecimal());
        Assert.False(await IsListed(slug));
    }

    [Fact]
    public async Task Admin_list_uses_the_same_queries_for_any_number_of_vehicles()
    {
        for (var i = 0; i < 3; i++) await CreateVehicle();
        await WaitForImageJobs();

        api.Sql.Clear();
        var rows = await Json(await admin.GetAsync("/api/admin/vehicles"));
        var imageQueries = api.Sql.Commands.Count(x => x.Contains("FROM \"Images\""));
        var vehicleQueries = api.Sql.Commands.Count(x => x.Contains("FROM \"Vehicles\""));

        Assert.True(rows.GetArrayLength() >= 3);
        Assert.Equal((1, 1), (vehicleQueries, imageQueries));
    }

    /// <summary>The image worker shares the database; wait until it is idle before counting queries.</summary>
    private async Task WaitForImageJobs()
    {
        for (var i = 0; i < 60; i++)
        {
            using var scope = api.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<GpSelectDbContext>();
            if (!await db.ImageJobs.AnyAsync(x => x.State == ImageJobState.Queued || x.State == ImageJobState.Processing)) return;
            await Task.Delay(500);
        }
    }
}
