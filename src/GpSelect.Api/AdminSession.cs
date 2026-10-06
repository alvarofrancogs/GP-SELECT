using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.WebUtilities;

namespace GpSelect.Api;

public static class AdminSession
{
    public const string CredentialClaim = "gpselect:credentials";

    public static string Fingerprint(IConfiguration config) => WebEncoders.Base64UrlEncode(
        SHA256.HashData(Encoding.UTF8.GetBytes($"{config["Admin:Email"]?.ToLowerInvariant()}\n{config["Admin:PasswordHash"]}"))[..16]);

    public static async Task ValidateAsync(CookieValidatePrincipalContext context)
    {
        var config = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        if (!string.IsNullOrWhiteSpace(config["Admin:Email"]) && !string.IsNullOrWhiteSpace(config["Admin:PasswordHash"]) &&
            context.Principal?.FindFirst(CredentialClaim)?.Value == Fingerprint(config)) return;
        context.RejectPrincipal();
        await context.HttpContext.SignOutAsync(context.Scheme.Name);
    }
}
