using System.Globalization;
using System.Text;
using System.Text.Json;
using GpSelect.Application;
using GpSelect.Domain;

namespace GpSelect.Api;

/// <summary>Server-rendered metadata and readable content for a vehicle page. It mirrors the client's
/// <c>getVehiclePageMeta</c> and <c>renderPageHead</c> (frontend/src/lib/pageMeta.ts): change both together.</summary>
public static class VehicleSeo
{
    // The frontend build wraps each page's head metadata in these markers (frontend/build/seoPlugin.ts).
    public const string HeadStart = "<!--page-meta-->";
    public const string HeadEnd = "<!--/page-meta-->";
    public const string EmptyRoot = "<div id=\"root\"></div>";

    public const string DefaultImage = "/assets/seo/og-default.jpg";
    private const string Location = "Murcia · Clientes en España y Europa";

    public static string Identity(VehiclePublicDto v) => $"{v.Make} {v.Model} ({v.Year})";
    public static string Path(VehiclePublicDto v) => $"/vehiculos/{Uri.EscapeDataString(v.Slug)}";

    /// <summary>Only a vehicle still for sale with a real price carries an offer, as on the client.</summary>
    public static bool HasPublicPrice(VehiclePublicDto v) => v.Status != VehicleStatus.Sold && v.PriceEur is > 0;

    /// <summary>Fills the template; null when the template was not built with the expected markers.</summary>
    public static string? Fill(string template, string head, string body)
    {
        var start = template.IndexOf(HeadStart, StringComparison.Ordinal);
        var end = template.IndexOf(HeadEnd, StringComparison.Ordinal);
        var root = template.IndexOf(EmptyRoot, StringComparison.Ordinal);
        if (start < 0 || end < start || root < 0) return null;
        return template[..(start + HeadStart.Length)] + "\n    " + head + "\n    " + template[end..root]
            + $"<div id=\"root\">{body}</div>" + template[(root + EmptyRoot.Length)..];
    }

    public static string Head(VehiclePublicDto v, string? siteUrl)
    {
        var identity = Identity(v);
        var url = siteUrl is null ? null : siteUrl + Path(v);
        var image = v.Images.FirstOrDefault();
        var jsonLd = new Dictionary<string, object?>
        {
            ["@context"] = "https://schema.org", ["@type"] = "Car", ["name"] = identity,
            ["brand"] = new Dictionary<string, object?> { ["@type"] = "Brand", ["name"] = v.Make }, ["model"] = v.Model,
            // The year is the first registration, not a model year.
            ["dateVehicleFirstRegistration"] = v.Year.ToString(CultureInfo.InvariantCulture),
            ["url"] = url, ["image"] = image is null ? null : Absolute(image, siteUrl), ["description"] = v.Description,
            ["mileageFromOdometer"] = v.MileageKm is { } km ? new Dictionary<string, object?> { ["@type"] = "QuantitativeValue", ["value"] = km, ["unitCode"] = "KMT" } : null,
            ["fuelType"] = v.FuelType, ["vehicleTransmission"] = v.Transmission, ["color"] = v.ExteriorColour,
            ["offers"] = HasPublicPrice(v) ? new Dictionary<string, object?> { ["@type"] = "Offer", ["price"] = v.PriceEur, ["priceCurrency"] = "EUR", ["url"] = url } : null,
        };
        return Render(
            title: $"{identity} · Vehículos europeos · GP SELECT",
            description: $"Consulta las fotos y los datos de este {identity} en GP SELECT. Selección de vehículos europeos desde Murcia para clientes de España y Europa.",
            robots: "index,follow", canonical: url, image: image, imageAlt: identity, siteUrl, jsonLd);
    }

    public static string NotFoundHead() => Render(
        title: "Vehículo no encontrado · GP SELECT",
        description: "Esta página no está disponible. Consulta el catálogo de GP SELECT o vuelve al inicio para conocer nuestra selección de vehículos europeos.",
        robots: "noindex", canonical: null, image: null, imageAlt: null, siteUrl: null, jsonLd: null);

    /// <summary>What a reader without JavaScript (and AI crawlers) gets: the same facts the page shows.
    /// The frontend hides it once JavaScript runs and React replaces it.</summary>
    public static string Body(VehiclePublicDto v)
    {
        var html = new StringBuilder("<div class=\"static-content\"><header><a href=\"/\">GP SELECT</a></header><main>");
        html.Append("<p><a href=\"/vehiculos\">Vehículos</a></p>");
        html.Append($"<h1>{E($"{v.Make} {v.Model}")}</h1>");
        if (v.Variant is { Length: > 0 }) html.Append($"<p>{E(v.Variant)}</p>");
        if (v.Status == VehicleStatus.Sold) html.Append("<p>Este vehículo ya no está disponible.</p>");
        else if (HasPublicPrice(v)) html.Append($"<p>Precio: {E(Price(v.PriceEur!.Value))}</p>");

        var specs = new (string Label, string? Value)[]
        {
            ("Primera matriculación", v.Month is >= 1 and <= 12 ? $"{v.Month:00}/{v.Year}" : v.Year.ToString(CultureInfo.InvariantCulture)),
            ("Kilometraje", v.MileageKm is { } km ? $"{km.ToString("#,0", Spanish)} km" : null),
            ("Potencia", v.PowerHp is { } hp ? $"{hp.ToString("#,0", Spanish)} CV" : null),
            ("Combustible", v.FuelType), ("Transmisión", v.Transmission), ("Carrocería", v.BodyType),
            ("Tracción", v.Drivetrain), ("Color exterior", v.ExteriorColour), ("Color interior", v.Interior),
            ("Procedencia", v.Provenance),
        };
        html.Append("<section><h2>Especificaciones</h2><dl>");
        foreach (var (label, value) in specs.Where(x => !string.IsNullOrWhiteSpace(x.Value)))
            html.Append($"<dt>{E(label)}</dt><dd>{E(value!)}</dd>");
        foreach (var spec in v.CustomSpecifications.Where(x => !string.IsNullOrWhiteSpace(x.Label) && !string.IsNullOrWhiteSpace(x.Value)))
            html.Append($"<dt>{E(spec.Label!)}</dt><dd>{E(spec.Value!)}</dd>");
        html.Append("</dl></section>");
        if (v.Description is { Length: > 0 }) html.Append($"<section><h2>Descripción</h2><p>{E(v.Description)}</p></section>");
        if (v.History is { Length: > 0 }) html.Append($"<section><h2>Historial</h2><p>{E(v.History)}</p></section>");
        if (v.Equipment.Count > 0) html.Append($"<section><h2>Equipamiento</h2><ul>{string.Concat(v.Equipment.Select(x => $"<li>{E(x)}</li>"))}</ul></section>");
        if (v.Status != VehicleStatus.Sold)
            html.Append($"<p><a href=\"/contacto?vehiculo={Uri.EscapeDataString(v.Slug)}&amp;intent=vehicle\">Solicitar información</a></p>");
        html.Append($"</main><footer><p>{E(Location)}</p><nav><ul>");
        foreach (var (href, label) in new[] { ("/", "GP SELECT"), ("/vehiculos", "Vehículos"), ("/importacion", "Importación"), ("/nosotros", "Nosotros"), ("/contacto", "Contacto") })
            html.Append($"<li><a href=\"{href}\">{E(label)}</a></li>");
        return html.Append("</ul></nav></footer></div>").ToString();
    }

    private static readonly CultureInfo Spanish = CultureInfo.GetCultureInfo("es-ES");
    private static string Price(decimal value) => $"{value.ToString("#,0", Spanish)} €";
    // Same escaping as the client's escapeHtml: accented text stays readable in the source.
    private static string E(string value) => value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;")
        .Replace("\"", "&quot;").Replace("'", "&#39;");
    private static string Absolute(string path, string? siteUrl) => siteUrl is null ? path : siteUrl + path;

    private static string Render(string title, string description, string robots, string? canonical, string? image, string? imageAlt,
        string? siteUrl, Dictionary<string, object?>? jsonLd)
    {
        var shareImage = Absolute(image ?? DefaultImage, siteUrl);
        var shareAlt = image is null ? "GP SELECT · Murcia · Clientes en España y Europa" : imageAlt ?? title;
        var tags = new List<string> { $"<title data-page-meta>{E(title)}</title>" };
        void Meta(string attribute, string key, string value) => tags.Add($"<meta data-page-meta {attribute}=\"{key}\" content=\"{E(value)}\">");
        Meta("name", "description", description);
        Meta("name", "robots", robots);
        if (canonical is not null) tags.Add($"<link data-page-meta rel=\"canonical\" href=\"{E(canonical)}\">");
        Meta("property", "og:type", "website");
        Meta("property", "og:title", title);
        Meta("property", "og:description", description);
        Meta("property", "og:locale", "es_ES");
        Meta("property", "og:site_name", "GP SELECT");
        if (canonical is not null) Meta("property", "og:url", canonical);
        Meta("property", "og:image", shareImage);
        Meta("property", "og:image:alt", shareAlt);
        if (image is null)
        {
            Meta("property", "og:image:type", "image/jpeg");
            Meta("property", "og:image:width", "1200");
            Meta("property", "og:image:height", "630");
        }
        Meta("name", "twitter:card", "summary_large_image");
        Meta("name", "twitter:title", title);
        Meta("name", "twitter:description", description);
        Meta("name", "twitter:image", shareImage);
        Meta("name", "twitter:image:alt", shareAlt);
        if (jsonLd is not null)
        {
            // The default encoder escapes '<', so text from the vehicle can never close the script.
            var json = JsonSerializer.Serialize(jsonLd.Where(x => x.Value is not null).ToDictionary(x => x.Key, x => x.Value), JsonLdOptions);
            tags.Add($"<script data-page-meta type=\"application/ld+json\">{json}</script>");
        }
        return string.Join("\n    ", tags);
    }

    private static readonly JsonSerializerOptions JsonLdOptions = new() { DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull };
}
