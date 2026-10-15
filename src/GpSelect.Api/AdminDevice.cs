using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;

namespace GpSelect.Api;

/// <summary>A browser the admin has signed in from. Its login attempts have their own quota instead of the one every
/// unknown client shares, so attempts from elsewhere cannot lock the admin out of it. The cookie is signed and bound to
/// the current credentials: changing the email or the password forgets every device.</summary>
public static class AdminDevice
{
    public const string CookieName = "gp_admin_device";
    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(180);

    private static ITimeLimitedDataProtector Protector(IServiceProvider services) =>
        services.GetRequiredService<IDataProtectionProvider>().CreateProtector("GpSelect.AdminDevice").ToTimeLimitedDataProtector();

    /// <summary>Called after a successful login. Kept on logout: it is not a session.</summary>
    public static void Remember(HttpContext ctx)
    {
        var services = ctx.RequestServices;
        var token = Protector(services).Protect($"{Guid.NewGuid():N}|{AdminSession.Fingerprint(services.GetRequiredService<IConfiguration>())}", Lifetime);
        ctx.Response.Cookies.Append(CookieName, token, new CookieOptions
        {
            HttpOnly = true,
            // Same rule as the session cookie: plain HTTP only in Development.
            Secure = ctx.Request.IsHttps || !services.GetRequiredService<IWebHostEnvironment>().IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Path = "/api/admin/auth",
            MaxAge = Lifetime,
            IsEssential = true,
        });
    }

    /// <summary>The device id when the request carries a valid cookie for the current credentials; otherwise null.</summary>
    public static string? Id(HttpContext ctx)
    {
        if (!ctx.Request.Cookies.TryGetValue(CookieName, out var token) || string.IsNullOrEmpty(token)) return null;
        try
        {
            var parts = Protector(ctx.RequestServices).Unprotect(token).Split('|');
            return parts.Length == 2 && parts[1] == AdminSession.Fingerprint(ctx.RequestServices.GetRequiredService<IConfiguration>()) ? parts[0] : null;
        }
        catch (CryptographicException)
        {
            return null;
        }
    }
}
