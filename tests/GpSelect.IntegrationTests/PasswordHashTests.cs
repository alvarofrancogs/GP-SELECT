using System.Buffers.Binary;
using GpSelect.Api;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace GpSelect.IntegrationTests;

public sealed class PasswordHashTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-base64!")]
    [InlineData("AA==")]
    [InlineData("AQ==")]
    public void Malformed_hash_has_a_clear_error(string? hash)
        => Assert.Contains("Admin:PasswordHash", SecurityConfig.PasswordHashError(hash));

    [Fact]
    public void Identity_v3_hash_is_accepted()
        => Assert.Null(SecurityConfig.PasswordHashError(new PasswordHasher<object>().HashPassword(null!, "Test-only-9")));

    [Theory]
    [InlineData(0, 0)] // v2 marker
    [InlineData(1, 3)] // unknown PRF
    [InlineData(5, 0)] // no iterations
    [InlineData(9, 15)] // salt too short
    [InlineData(9, int.MaxValue)] // salt extends past the payload
    public void Invalid_v3_fields_are_rejected(int offset, int value)
    {
        var bytes = Convert.FromBase64String(new PasswordHasher<object>().HashPassword(null!, "Test-only-9"));
        if (offset == 0) bytes[0] = (byte)value;
        else BinaryPrimitives.WriteUInt32BigEndian(bytes.AsSpan(offset, 4), (uint)value);
        Assert.NotNull(SecurityConfig.PasswordHashError(Convert.ToBase64String(bytes)));
    }

    [Fact]
    public void Production_rejects_the_hash_at_startup_without_echoing_it()
    {
        const string malformed = "private-malformed-hash!";
        using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            builder.UseSetting("Security:AllowedOrigin", "https://example.test");
            builder.UseSetting("Admin:Email", "admin@example.test");
            builder.UseSetting("Admin:PasswordHash", malformed);
        });
        var error = Assert.ThrowsAny<Exception>(() => factory.CreateClient()).GetBaseException().Message;
        Assert.Contains("Admin:PasswordHash", error);
        Assert.DoesNotContain(malformed, error);
    }
}
