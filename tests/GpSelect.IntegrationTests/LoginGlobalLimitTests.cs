using System.Net;
using System.Net.Http.Json;
using GpSelect.Api;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace GpSelect.IntegrationTests;

/// <summary>The global login cap through the real pipeline: every spelling the router sends to the login action
/// shares one quota, whatever the client's address.</summary>
public sealed class LoginGlobalLimitTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    private static int peer;

    private static async Task<HttpStatusCode> FailedLogin(HttpClient client, string path)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = JsonContent.Create(new { email = ApiFactory.AdminEmail, password = "wrong-password" }),
        };
        // A new address each time: the per-address limit never applies, only the global one.
        request.Headers.Add("X-Test-Peer", $"198.51.102.{Interlocked.Increment(ref peer)}");
        return (await client.SendAsync(request)).StatusCode;
    }

    private static async Task<HttpStatusCode> Login(HttpClient client, string address, string password)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/admin/auth/login")
        {
            Content = JsonContent.Create(new { email = ApiFactory.AdminEmail, password }),
        };
        request.Headers.Add("X-Test-Peer", address);
        return (await client.SendAsync(request)).StatusCode;
    }

    [Fact]
    public async Task One_address_cannot_use_up_the_shared_quota_and_lock_the_admin_out()
    {
        using var host = api.WithWebHostBuilder(b => b.UseSetting("Security:LoginGlobalPermits", "10"));
        using var client = host.CreateClient();

        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i < 30; i++)
            statuses.Add(await Login(client, "198.51.103.7", "wrong-password"));

        Assert.All(statuses.Take(5), x => Assert.Equal(HttpStatusCode.Unauthorized, x));
        Assert.All(statuses.Skip(5), x => Assert.Equal(HttpStatusCode.TooManyRequests, x));
        // Only the five attempts that address was allowed count towards the shared quota.
        Assert.Equal(HttpStatusCode.OK, await Login(client, "198.51.103.8", ApiFactory.AdminPassword));
    }

    private static async Task<HttpResponseMessage> LoginWithDevice(HttpClient client, string address, string password, string? device)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/admin/auth/login")
        {
            Content = JsonContent.Create(new { email = ApiFactory.AdminEmail, password }),
        };
        request.Headers.Add("X-Test-Peer", address);
        if (device is not null) request.Headers.Add("Cookie", $"{AdminDevice.CookieName}={device}");
        return await client.SendAsync(request);
    }

    private static string DeviceCookie(HttpResponseMessage login) =>
        login.Headers.GetValues("Set-Cookie").Single(x => x.StartsWith(AdminDevice.CookieName + "=", StringComparison.Ordinal));

    private static string DeviceToken(HttpResponseMessage login) => DeviceCookie(login).Split(';')[0][(AdminDevice.CookieName.Length + 1)..];

    [Fact]
    public async Task A_browser_the_admin_signed_in_from_still_gets_in_when_the_shared_quota_is_used_up()
    {
        using var host = api.WithWebHostBuilder(b => b.UseSetting("Security:LoginGlobalPermits", "2"));
        using var client = host.CreateClient(new() { BaseAddress = new Uri("https://localhost"), HandleCookies = false });

        var signedIn = await LoginWithDevice(client, "198.51.104.1", ApiFactory.AdminPassword, null);
        Assert.Equal(HttpStatusCode.OK, signedIn.StatusCode);
        var cookie = DeviceCookie(signedIn);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/api/admin/auth", cookie, StringComparison.OrdinalIgnoreCase);
        var device = DeviceToken(signedIn);

        // Attackers spread over many addresses use up the quota shared by unknown clients.
        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginWithDevice(client, "198.51.104.10", "wrong-password", null)).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await LoginWithDevice(client, "198.51.104.11", "wrong-password", null)).StatusCode);

        // Unknown clients stay capped, the right password and a forged cookie included; the admin's browser does not.
        Assert.Equal(HttpStatusCode.TooManyRequests, (await LoginWithDevice(client, "198.51.104.2", ApiFactory.AdminPassword, null)).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await LoginWithDevice(client, "198.51.104.3", ApiFactory.AdminPassword, "forged")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await LoginWithDevice(client, "198.51.104.1", ApiFactory.AdminPassword, device)).StatusCode);
    }

    [Fact]
    public async Task A_stolen_device_cookie_has_its_own_capped_quota()
    {
        using var host = api.WithWebHostBuilder(b => b.UseSetting("Security:LoginGlobalPermits", "2"));
        using var client = host.CreateClient(new() { BaseAddress = new Uri("https://localhost"), HandleCookies = false });
        var device = DeviceToken(await LoginWithDevice(client, "198.51.105.1", ApiFactory.AdminPassword, null));

        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginWithDevice(client, "198.51.105.10", "wrong-password", device)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginWithDevice(client, "198.51.105.11", "wrong-password", device)).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await LoginWithDevice(client, "198.51.105.12", "wrong-password", device)).StatusCode);
    }

    [Fact]
    public async Task Changing_the_credentials_forgets_every_device()
    {
        using var host = api.WithWebHostBuilder(b => b.UseSetting("Security:LoginGlobalPermits", "1"));
        using var client = host.CreateClient(new() { BaseAddress = new Uri("https://localhost"), HandleCookies = false });
        var device = DeviceToken(await LoginWithDevice(client, "198.51.106.1", ApiFactory.AdminPassword, null));

        host.Services.GetRequiredService<IConfiguration>()["Admin:Email"] = "changed@gpselect.test";
        // The device no longer counts as known, so it falls back to the shared quota its own login used up.
        Assert.Equal(HttpStatusCode.TooManyRequests, (await LoginWithDevice(client, "198.51.106.1", ApiFactory.AdminPassword, device)).StatusCode);
    }

    [Theory]
    [InlineData("/api/admin/auth/login")]
    [InlineData("/api/admin/auth/login/")]
    [InlineData("/API/Admin/Auth/LOGIN")]
    public async Task Every_spelling_of_the_login_route_is_capped(string path)
    {
        using var host = api.WithWebHostBuilder(b => b.UseSetting("Security:LoginGlobalPermits", "2"));
        using var client = host.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, await FailedLogin(client, path));
        Assert.Equal(HttpStatusCode.Unauthorized, await FailedLogin(client, path));
        Assert.Equal(HttpStatusCode.TooManyRequests, await FailedLogin(client, path));
    }

    [Fact]
    public async Task Spellings_share_one_quota_and_the_catalogue_stays_open()
    {
        using var host = api.WithWebHostBuilder(b => b.UseSetting("Security:LoginGlobalPermits", "2"));
        using var client = host.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, await FailedLogin(client, "/api/admin/auth/login/"));
        Assert.Equal(HttpStatusCode.Unauthorized, await FailedLogin(client, "/API/ADMIN/AUTH/LOGIN"));
        Assert.Equal(HttpStatusCode.TooManyRequests, await FailedLogin(client, "/api/admin/auth/login"));
        Assert.Equal(HttpStatusCode.TooManyRequests, await FailedLogin(client, "/api/admin/auth/login/"));

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/public/vehicles")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/public/vehicles/")).StatusCode);
    }
}
