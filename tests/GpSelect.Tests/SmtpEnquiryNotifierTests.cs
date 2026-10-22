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
    public void Notification_includes_only_populated_import_details_after_budget()
    {
        Enquiry Create(string? delivery = null, string? year = null, string? mileage = null, string? timeframe = null) =>
            Enquiry.Create(EnquiryIntent.Search, "Ana", "ana@example.test", null, "BMW M4 CS", null,
                DateTimeOffset.UtcNow, budget: "60.000 €", delivery: delivery, year: year, mileage: mileage, timeframe: timeframe);
        var full = EnquiryNotification.For(Create("Madrid", "2023", "20.000 km", "Este mes")).Body;
        Assert.Contains("Presupuesto: 60.000 €\nEntrega en: Madrid\nAño: 2023\nKilometraje aproximado: 20.000 km\nPara cuándo: Este mes\nRecibida:", full);
        var partial = EnquiryNotification.For(Create(year: "2023")).Body;
        Assert.Contains("Presupuesto: 60.000 €\nAño: 2023\nRecibida:", partial);
        var empty = EnquiryNotification.For(Create(" ", " ", " ", " ")).Body;
        foreach (var label in new[] { "Entrega en:", "Año:", "Kilometraje aproximado:", "Para cuándo:" })
        {
            Assert.DoesNotContain(label, empty);
            if (label != "Año:") Assert.DoesNotContain(label, partial);
        }
    }

    [Fact]
    public void Notification_handles_missing_budget_and_message()
    {
        var notification = EnquiryNotification.For(Enquiry.Create(EnquiryIntent.Search, "Ana López", "ana@example.test",
            null, "BMW", null, DateTimeOffset.UtcNow));
        Assert.Contains("Presupuesto: —\n", notification.Body);
        Assert.EndsWith("\n(sin mensaje)", notification.Body);
    }

    [Fact]
    public void Appointment_notification_has_the_weekday_and_asks_for_a_call_without_reply_to()
    {
        var notification = EnquiryNotification.For(Enquiry.Create(EnquiryIntent.Appointment, "Ana López", null, "+34 600 000 000", null, null,
            new DateTimeOffset(2026, 10, 22, 9, 0, 0, TimeSpan.Zero), EnquiryLanguage.En, date: "2026-10-23", time: "10:30"));
        Assert.Equal("GP SELECT · Petición de cita · 23/10/2026 10:30 · en inglés · Ana López", notification.Subject);
        Assert.StartsWith("Tipo: cita (llamar para confirmar día, hora y lugar)\nIdioma: inglés (responde en inglés)\nDía: viernes 23/10/2026\nHora: 10:30\n"
            + "Nombre: Ana López\nTeléfono: +34 600 000 000\nRecibida: 2026-10-22 09:00 UTC\n", notification.Body);
        Assert.DoesNotContain("Email:", notification.Body);
        Assert.EndsWith("\n\n(sin mensaje)", notification.Body);
        Assert.Null(notification.ReplyTo);
        using var message = SmtpEnquiryNotifier.BuildMessage(notification, "sender@example.test", "recipient@example.test");
        Assert.Empty(message.ReplyTo);
    }

    [Fact]
    public void Appointment_with_an_email_shows_it_and_replies_to_it()
    {
        var notification = EnquiryNotification.For(Enquiry.Create(EnquiryIntent.Appointment, "Ana", "ana@example.test", "600 000 000", null,
            "Quiero ver el M4.", new DateTimeOffset(2026, 10, 22, 9, 0, 0, TimeSpan.Zero), date: "2026-10-25", time: "09:15"));
        Assert.Equal("GP SELECT · Petición de cita · 25/10/2026 09:15 · Ana", notification.Subject);
        Assert.Contains("Día: domingo 25/10/2026\nHora: 09:15\nNombre: Ana\nTeléfono: 600 000 000\nEmail: ana@example.test\n", notification.Body);
        Assert.EndsWith("\n\nQuiero ver el M4.", notification.Body);
        using var message = SmtpEnquiryNotifier.BuildMessage(notification, "sender@example.test", "recipient@example.test");
        Assert.Equal("ana@example.test", Assert.Single(message.ReplyTo.Mailboxes).Address);
    }
}
