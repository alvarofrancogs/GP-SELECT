using GpSelect.Domain;
using GpSelect.Infrastructure;
using MimeKit;
using Xunit;

namespace GpSelect.Tests;

public sealed class SmtpEnquiryNotifierTests
{
    [Fact]
    public void Message_preserves_the_notification_and_uses_configured_mailboxes()
    {
        var notification = EnquiryNotification.For(Enquiry.Create(EnquiryIntent.Search, "María Pérez",
            "customer@example.test", null, null, "Busco un vehículo.\nGracias.", DateTimeOffset.UtcNow));
        using var message = SmtpEnquiryNotifier.BuildMessage(notification, "sender@example.test", "recipient@example.test");
        Assert.Equal("sender@example.test", Assert.Single(message.From.Mailboxes).Address);
        Assert.Equal("GP SELECT", Assert.Single(message.From.Mailboxes).Name);
        Assert.Equal("recipient@example.test", Assert.Single(message.To.Mailboxes).Address);
        Assert.Equal(notification.ReplyTo, Assert.Single(message.ReplyTo.Mailboxes).Address);
        Assert.Equal(notification.Subject, message.Subject);
        // MIME bodies use CRLF line endings.
        Assert.Equal(notification.Body.ReplaceLineEndings("\r\n"), Assert.IsType<TextPart>(message.Body).Text.ReplaceLineEndings("\r\n"));
        Assert.Equal("text/plain", message.Body.ContentType.MimeType);
        Assert.Empty(message.Cc);
        Assert.Empty(message.Bcc);
    }

}
