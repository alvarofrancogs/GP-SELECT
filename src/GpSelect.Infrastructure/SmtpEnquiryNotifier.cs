using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;

namespace GpSelect.Infrastructure;

public sealed class SmtpEnquiryNotifier(IConfiguration config) : IEnquiryNotifier
{
    public static void ValidateConfiguration(IConfiguration config, bool production)
    {
        var configured = !string.IsNullOrWhiteSpace(config["Smtp:Host"]);
        if (production && bool.TryParse(config["Enquiries:Enabled"], out var enabled) && enabled && !configured)
            throw new InvalidOperationException("Smtp:Host, Smtp:From and Enquiries:NotificationEmail are required when Enquiries:Enabled is true in Production.");
        if (!configured) return;
        foreach (var key in new[] { "Smtp:From", "Enquiries:NotificationEmail" })
            if (!System.Net.Mail.MailAddress.TryCreate(config[key], out var address) || address.Address != config[key])
                throw new InvalidOperationException($"{key} must be one email address when Smtp:Host is configured.");
        _ = Port(config);
        _ = Security(config);
    }

    private static int Port(IConfiguration config)
    {
        if (string.IsNullOrWhiteSpace(config["Smtp:Port"])) return 587;
        if (int.TryParse(config["Smtp:Port"], out var port) && port is >= 1 and <= 65535) return port;
        throw new InvalidOperationException("Smtp:Port must be between 1 and 65535.");
    }

    private static SecureSocketOptions Security(IConfiguration config) => config["Smtp:Security"] switch
    {
        null or "" or "StartTls" => SecureSocketOptions.StartTls,
        "SslOnConnect" => SecureSocketOptions.SslOnConnect,
        _ => throw new InvalidOperationException("Smtp:Security must be StartTls or SslOnConnect.")
    };

    public static MimeMessage BuildMessage(EnquiryNotification notification, string from, string recipient)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("GP SELECT", from));
        message.To.Add(MailboxAddress.Parse(recipient));
        message.ReplyTo.Add(MailboxAddress.Parse(notification.ReplyTo));
        message.Subject = notification.Subject;
        message.Body = new TextPart("plain") { Text = notification.Body };
        return message;
    }

    public async Task SendAsync(EnquiryNotification notification, CancellationToken ct)
    {
        using var message = BuildMessage(notification, config["Smtp:From"]!, config["Enquiries:NotificationEmail"]!);
        using var client = new SmtpClient();
        await client.ConnectAsync(config["Smtp:Host"]!, Port(config), Security(config), ct);
        if (!string.IsNullOrWhiteSpace(config["Smtp:Username"]))
            await client.AuthenticateAsync(config["Smtp:Username"]!, config["Smtp:Password"] ?? "", ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }
}
