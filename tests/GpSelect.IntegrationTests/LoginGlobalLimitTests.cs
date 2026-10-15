using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
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
