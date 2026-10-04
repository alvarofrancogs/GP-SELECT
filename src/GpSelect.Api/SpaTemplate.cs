namespace GpSelect.Api;

/// <summary>The frontend's built <c>spa.html</c>, the page that server-rendered vehicle pages fill in.</summary>
public interface ISpaTemplate
{
    /// <summary>Null when SEO pages are off (no <c>Seo:TemplateUrl</c>) or the template cannot be fetched.</summary>
    Task<string?> GetAsync(CancellationToken ct);
}

/// <summary>Fetches the template from wherever the frontend is served (another container, a CDN), so it always
/// matches the deployed build. Kept for a minute: a new deployment shows up without restarting the API.</summary>
public sealed class HttpSpaTemplate(IHttpClientFactory clients, IConfiguration config, ILogger<HttpSpaTemplate> logger) : ISpaTemplate
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(1);
    private (string Html, DateTimeOffset At)? cached;

    public async Task<string?> GetAsync(CancellationToken ct)
    {
        var url = config["Seo:TemplateUrl"];
        if (string.IsNullOrWhiteSpace(url)) return null;
        var current = cached;
        if (current is { } hit && DateTimeOffset.UtcNow - hit.At < Lifetime) return hit.Html;
        try
        {
            var html = await clients.CreateClient().GetStringAsync(url, ct);
            cached = (html, DateTimeOffset.UtcNow);
            return html;
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            logger.LogWarning(e, "SPA template unavailable at {Url}", url);
            // A stale template is still a valid page; nothing at all means the proxy falls back to the plain SPA.
            return current?.Html;
        }
    }
}
