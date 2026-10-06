using System.Net;
using GpSelect.Api;
using GpSelect.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace GpSelect.IntegrationTests;

/// <summary>Startup and request rules that need no database.</summary>
public sealed class ProductionReadinessTests
{
    [Theory]
    [InlineData("Smtp:Security", "None")]
    [InlineData("Smtp:Port", "0")]
    [InlineData("Smtp:Port", "invalid")]
    public void Invalid_smtp_options_fail_without_echoing_values(string key, string value)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Smtp:Host"] = "smtp.example.test", ["Smtp:From"] = "sender@example.test",
            ["Enquiries:NotificationEmail"] = "recipient@example.test", [key] = value
        }).Build();
        Assert.Contains(key, Assert.Throws<InvalidOperationException>(() => SmtpEnquiryNotifier.ValidateConfiguration(config, true)).Message);
    }

    [Fact]
    public void Disabled_form_does_not_require_smtp()
        => SmtpEnquiryNotifier.ValidateConfiguration(new ConfigurationBuilder().Build(), true);

    [Theory]
    [InlineData("Smtp:Host")]
    [InlineData("Smtp:From")]
    [InlineData("Enquiries:NotificationEmail")]
    public void Enabled_form_requires_smtp_in_production(string missingKey)
    {
        using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            builder.UseSetting("Security:AllowedOrigin", "https://www.example.test");
            builder.UseSetting("Admin:Email", "admin@example.test");
            builder.UseSetting("Admin:PasswordHash", new Microsoft.AspNetCore.Identity.PasswordHasher<object>().HashPassword(null!, "Test-only-9"));
            builder.UseSetting("DataProtection:KeysPath", "unused-keys");
            builder.UseSetting("Enquiries:Enabled", "true");
            builder.UseSetting("Smtp:Host", "smtp.example.test");
            builder.UseSetting("Smtp:From", "sender@example.test");
            builder.UseSetting("Enquiries:NotificationEmail", "recipient@example.test");
            builder.UseSetting(missingKey, "");
        });
        var error = Assert.ThrowsAny<Exception>(() => factory.CreateClient());
        Assert.Contains(missingKey, error.GetBaseException().Message);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    public void Retention_must_be_at_least_one_day(string days)
    {
        using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.UseSetting("Enquiries:RetentionDays", days);
        });
        var error = Assert.ThrowsAny<Exception>(() => factory.CreateClient());
        Assert.Contains("Enquiries:RetentionDays", error.GetBaseException().Message);
    }

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

    [Fact]
    public void Production_refuses_to_start_without_a_data_protection_key_path()
    {
        using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            builder.UseSetting("Security:AllowedOrigin", "https://www.example.test");
            builder.UseSetting("Admin:Email", "admin@example.test");
            builder.UseSetting("Admin:PasswordHash", new Microsoft.AspNetCore.Identity.PasswordHasher<object>().HashPassword(null!, "Test-only-9"));
            builder.UseSetting("DataProtection:KeysPath", "");
        });
        var error = Assert.ThrowsAny<Exception>(() => factory.CreateClient());
        Assert.Contains("DataProtection:KeysPath", error.GetBaseException().Message);
    }

    [Fact]
    public async Task Upload_urls_are_signed_for_the_public_storage_address()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Storage:Endpoint"] = "http://minio:9000", ["Storage:PublicEndpoint"] = "https://s3.example.test",
            ["Storage:AccessKey"] = "key", ["Storage:SecretKey"] = "secret", ["Storage:Bucket"] = "gpselect",
        }).Build();
        var url = new Uri(await new S3ObjectStorage(config).CreateUploadUrlAsync("quarantine/a.jpg", "image/jpeg", 1234, CancellationToken.None));
        Assert.Equal(("https", "s3.example.test", "/gpselect/quarantine/a.jpg"), (url.Scheme, url.Host, url.AbsolutePath));
    }
}
