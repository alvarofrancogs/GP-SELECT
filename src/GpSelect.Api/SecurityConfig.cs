using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;

namespace GpSelect.Api;

/// <summary>Security rules read by Program.cs, kept apart so they can be tested without a host.</summary>
public static partial class SecurityConfig
{
    /// <summary>Null when valid. In production the origin must be HTTPS and not a local address.</summary>
    public static string? AllowedOriginError(string? origin, bool production)
    {
        if (string.IsNullOrWhiteSpace(origin))
            return production ? "Security:AllowedOrigin is required in Production: set the exact public origin, e.g. https://<domain>." : null;
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https") || uri.GetLeftPart(UriPartial.Authority) != origin)
            return "Security:AllowedOrigin must be one exact HTTP(S) origin without a path, trailing slash or wildcard.";
        if (production && uri.Scheme != "https")
            return "Security:AllowedOrigin must use HTTPS in Production.";
        if (production && (uri.IsLoopback || uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)))
            return "Security:AllowedOrigin cannot be a local address in Production.";
        return null;
    }

    /// <summary>The login limit is per client address, never per a value the client sends.
    /// IPv6 clients are grouped by /64, the block a single subscriber usually controls.</summary>
    public static string LoginPartitionKey(IPAddress? address)
    {
        if (address is null) return "unknown";
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();
        if (address.AddressFamily != AddressFamily.InterNetworkV6) return address.ToString();
        var bytes = address.GetAddressBytes();
        Array.Clear(bytes, 8, 8);
        return new IPAddress(bytes) + "/64";
    }

    /// <summary>Comma-separated literal proxy addresses; empty means no proxy is trusted.</summary>
    public static bool TryParseTrustedProxies(string? value, out IReadOnlyList<IPAddress> proxies)
    {
        var parsed = new List<IPAddress>();
        proxies = parsed;
        foreach (var item in (value ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (!IPAddress.TryParse(item, out var address) || item.Contains('/')) return false;
            parsed.Add(address);
        }
        return true;
    }

    /// <summary>Echo the caller's correlation id only when it is short and plain; otherwise make one.</summary>
    public static string CorrelationId(string? requested)
        => requested is not null && PlainId().IsMatch(requested) ? requested : Guid.NewGuid().ToString("N");

    [GeneratedRegex("^[A-Za-z0-9._-]{1,64}$")]
    private static partial Regex PlainId();
}
