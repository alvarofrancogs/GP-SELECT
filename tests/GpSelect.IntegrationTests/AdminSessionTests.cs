using System.Net;
using System.Net.Http.Json;
using GpSelect.Api;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace GpSelect.IntegrationTests;

public sealed class AdminSessionTests(ApiFactory api) : IClassFixture<ApiFactory>
{
    [Theory]
    [InlineData("Admin:Email", "changed@example.test")]
    [InlineData("Admin:PasswordHash", "changed-hash")]
    public async Task Existing_cookie_is_rejected_when_credentials_change(string key, string value)
    {
        var config = api.Services.GetRequiredService<IConfiguration>();
        var original = config[key];
        Assert.Equal(HttpStatusCode.OK, (await api.Admin.GetAsync("/api/admin/auth/me")).StatusCode);
        // Use a separate client so the expiry response does not change the fixture's admin cookie.
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/admin/auth/me");
        using var client = api.Anonymous();
        var login = await client.PostAsJsonAsync("/api/admin/auth/login", new { email = ApiFactory.AdminEmail, password = ApiFactory.AdminPassword });
        login.EnsureSuccessStatusCode();
        config[key] = value;
        try
        {
            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            Assert.Contains(response.Headers.GetValues("Set-Cookie"), x => x.Contains("expires=", StringComparison.OrdinalIgnoreCase));
        }
        finally { config[key] = original; }
    }

    [Fact]
    public void Fingerprint_normalizes_email_case()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        { ["Admin:Email"] = "ADMIN@example.test", ["Admin:PasswordHash"] = "hash" }).Build();
        var before = AdminSession.Fingerprint(config);
        config["Admin:Email"] = "admin@example.test";
        Assert.Equal(before, AdminSession.Fingerprint(config));
        Assert.Equal(22, before.Length);
    }
}
