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

    [Theory]
    [InlineData(EnquiryIntent.Vehicle, "Consulta sobre un vehículo", "comprar un vehículo en stock")]
    [InlineData(EnquiryIntent.Search, "Búsqueda de vehículo", "buscar un vehículo")]
    [InlineData(EnquiryIntent.Information, "Petición de información", "información general")]
    public void Notification_includes_intent_and_budget(EnquiryIntent intent, string subject, string type)
    {
        var notification = EnquiryNotification.For(Enquiry.Create(intent, "Ana López", "ana@example.test",
            null, "BMW", "Quisiera más información.", DateTimeOffset.UtcNow, budget: "30.000 €"));
        Assert.Equal($"GP SELECT · {subject} · Ana López", notification.Subject);
        Assert.Contains($"Tipo: {type}\n", notification.Body);
        Assert.Contains("Vehículo: BMW\nPresupuesto: 30.000 €\n", notification.Body);
    }

    [Fact]
    public void Notification_handles_missing_budget_and_message()
    {
        var notification = EnquiryNotification.For(Enquiry.Create(EnquiryIntent.Search, "Ana López", "ana@example.test",
            null, "BMW", null, DateTimeOffset.UtcNow));
        Assert.Contains("Presupuesto: —\n", notification.Body);
        Assert.EndsWith("\n(sin mensaje)", notification.Body);
    }
}
