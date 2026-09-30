using System.Net;
using GpSelect.Api;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace GpSelect.IntegrationTests;

/// <summary>Startup and request rules that need no database.</summary>
public sealed class ProductionReadinessTests
{
    [Theory]
    [InlineData("https://www.example.test", true, null)]
    [InlineData("https://www.example.test:8443", true, null)]
    [InlineData("http://127.0.0.1:5173", false, null)]
    [InlineData(null, false, null)]
    [InlineData(null, true, "required")]
    [InlineData("http://www.example.test", true, "HTTPS")]
    [InlineData("https://localhost", true, "local")]
    [InlineData("https://127.0.0.1", true, "local")]
    [InlineData("https://[::1]", true, "local")]
    [InlineData("https://*.example.test", false, "exact")]
    [InlineData("https://www.example.test/admin", false, "exact")]
    [InlineData("https://www.example.test/", false, "exact")]
    [InlineData("ftp://www.example.test", false, "exact")]
    public void Allowed_origin_is_exact_and_public_in_production(string? origin, bool production, string? error)
    {
        var message = SecurityConfig.AllowedOriginError(origin, production);
        if (error is null) Assert.Null(message);
        else Assert.Contains(error, message);
    }

    [Theory]
    [InlineData("203.0.113.9", "203.0.113.9")]
    [InlineData("::ffff:203.0.113.9", "203.0.113.9")]
    [InlineData("2001:db8:1:2:aaaa:bbbb:cccc:dddd", "2001:db8:1:2::/64")]
    [InlineData("2001:db8:1:2::1", "2001:db8:1:2::/64")]
    public void Login_partition_is_the_client_address(string address, string key)
        => Assert.Equal(key, SecurityConfig.LoginPartitionKey(IPAddress.Parse(address)));

    [Fact]
    public void Login_partition_without_an_address_is_shared()
        => Assert.Equal("unknown", SecurityConfig.LoginPartitionKey(null));

    [Theory]
    [InlineData("10.0.0.1", true)]
    [InlineData("10.0.0.1, 2001:db8::1", true)]
    [InlineData("", true)]
    [InlineData("10.0.0.0/8", false)]
    [InlineData("proxy.internal", false)]
    public void Trusted_proxies_are_literal_addresses(string value, bool valid)
        => Assert.Equal(valid, SecurityConfig.TryParseTrustedProxies(value, out _));

    [Fact]
    public async Task Rejected_request_bodies_keep_their_4xx_status()
    {
        var context = new Microsoft.AspNetCore.Http.DefaultHttpContext { TraceIdentifier = "trace-1" };
        context.Response.Body = new MemoryStream();
        var handled = await new BadRequestExceptionHandler().TryHandleAsync(context,
            new Microsoft.AspNetCore.Http.BadHttpRequestException("Request body too large.", 413), CancellationToken.None);
        Assert.True(handled);
        Assert.Equal(413, context.Response.StatusCode);
        context.Response.Body.Position = 0;
        var body = await new StreamReader(context.Response.Body).ReadToEndAsync();
        Assert.Contains("\"code\":\"request_rejected\"", body);
        Assert.DoesNotContain("Kestrel", body);

        Assert.False(await new BadRequestExceptionHandler().TryHandleAsync(new Microsoft.AspNetCore.Http.DefaultHttpContext(), new InvalidOperationException(), CancellationToken.None));
    }

    /// <summary>Development validates every DI registration at startup (the test host does not by default).</summary>
    [Fact]
    public void Development_host_builds_with_validated_services()
    {
        using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.UseSetting("ConnectionStrings:Default", "Host=127.0.0.1;Port=1;Database=none;Username=none;Password=none");
            builder.UseSetting("Security:AllowedOrigin", "http://127.0.0.1:5173");
            builder.UseSetting("Storage:Root", Path.Combine(Path.GetTempPath(), "gpselect-dev-" + Guid.NewGuid().ToString("N")));
        });
        Assert.NotNull(factory.Services); // building the host is the assertion
    }

    [Fact]
    public void Production_refuses_to_start_with_a_localhost_origin()
    {
        using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            builder.UseSetting("Security:AllowedOrigin", "http://localhost:5173");
        });
        var error = Assert.ThrowsAny<Exception>(() => factory.CreateClient());
        Assert.Contains("Security:AllowedOrigin", error.GetBaseException().Message);
    }

    [Fact]
    public void Production_refuses_to_start_without_admin_credentials()
    {
        using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            builder.UseSetting("Security:AllowedOrigin", "https://www.example.test");
            builder.UseSetting("Admin:Email", "");
            builder.UseSetting("Admin:PasswordHash", "");
        });
        var error = Assert.ThrowsAny<Exception>(() => factory.CreateClient());
        Assert.Contains("Admin:", error.GetBaseException().Message);
    }
}
