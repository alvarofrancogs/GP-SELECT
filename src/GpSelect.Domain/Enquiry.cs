using System.Net.Mail;
using System.Text.RegularExpressions;

namespace GpSelect.Domain;

public enum EnquiryIntent { Vehicle, Search }
public enum EnquiryNotificationStatus { Pending, Sent, Failed }

/// <summary>A contact-form enquiry. The stored row is the source of truth; the email notification is best effort.
/// CreatedAt exists so a retention policy can delete old rows once it is defined.</summary>
public sealed class Enquiry
{
    public const int NameMin = 2, NameMax = 200, EmailMax = 200, PhoneMax = 30, VehicleMin = 2, VehicleMax = 200, MessageMin = 10, MessageMax = 5000;
    public const int MaxNotificationAttempts = 6;
    private static readonly TimeSpan[] RetryDelays = [TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(5), TimeSpan.FromMinutes(30), TimeSpan.FromHours(2), TimeSpan.FromHours(12)];
    private static readonly Regex PhoneChars = new(@"^\+?[\d\s().-]+$", RegexOptions.Compiled);

    private Enquiry() { }

    public Guid Id { get; private set; } = Guid.NewGuid();
    public EnquiryIntent Intent { get; private set; }
    public string Name { get; private set; } = "";
    public string Email { get; private set; } = "";
    public string? Phone { get; private set; }
    public string? Vehicle { get; private set; }
    public string Message { get; private set; } = "";
    public DateTimeOffset CreatedAt { get; private set; }
    public EnquiryNotificationStatus NotificationStatus { get; private set; } = EnquiryNotificationStatus.Pending;
    public int NotificationAttempts { get; private set; }
    public DateTimeOffset NotificationNextAttemptAt { get; private set; }
    public DateTimeOffset? NotifiedAt { get; private set; }

    public static Enquiry Create(EnquiryIntent intent, string? name, string? email, string? phone, string? vehicle, string? message, DateTimeOffset now)
    {
        if (!Enum.IsDefined(intent)) throw new DomainException("invalid_intent", "intent is invalid", "intent");
        var cleanName = Line(name, NameMax, "name") ?? throw new DomainException("required", "name is required", "name");
        if (cleanName.Length < NameMin) throw new DomainException("too_short", $"name needs at least {NameMin} characters", "name");

        var cleanEmail = Line(email, EmailMax, "email") ?? throw new DomainException("required", "email is required", "email");
        if (cleanEmail.Contains(' ') || !MailAddress.TryCreate(cleanEmail, out var address) || address.Address != cleanEmail || !address.Host.Contains('.'))
            throw new DomainException("invalid_email", "email is invalid", "email");

        var cleanPhone = Line(phone, PhoneMax, "phone");
        var digits = cleanPhone?.Count(char.IsAsciiDigit) ?? 0;
        if (cleanPhone is not null && (!PhoneChars.IsMatch(cleanPhone) || digits < 7 || digits > 15))
            throw new DomainException("invalid_phone", "phone is invalid", "phone");

        var cleanVehicle = Line(vehicle, VehicleMax, "vehicle");
        if (intent == EnquiryIntent.Vehicle && (cleanVehicle is null || cleanVehicle.Length < VehicleMin))
            throw new DomainException("required", "vehicle is required for a vehicle enquiry", "vehicle");

        var cleanMessage = Text(message, MessageMax, "message") ?? throw new DomainException("required", "message is required", "message");
        if (cleanMessage.Length < MessageMin) throw new DomainException("too_short", $"message needs at least {MessageMin} characters", "message");

        return new Enquiry
        {
            Intent = intent, Name = cleanName, Email = cleanEmail, Phone = cleanPhone, Vehicle = cleanVehicle, Message = cleanMessage,
            CreatedAt = now, NotificationNextAttemptAt = now,
        };
    }

    public void NotificationSent(DateTimeOffset now)
    {
        NotificationAttempts++;
        NotificationStatus = EnquiryNotificationStatus.Sent;
        NotifiedAt = now;
    }

    /// <summary>Backs off 1 min, 5 min, 30 min, 2 h, 12 h; after the last attempt the enquiry stays stored as Failed.</summary>
    public void NotificationFailed(DateTimeOffset now)
    {
        NotificationAttempts++;
        if (NotificationAttempts >= MaxNotificationAttempts) { NotificationStatus = EnquiryNotificationStatus.Failed; return; }
        NotificationNextAttemptAt = now + RetryDelays[Math.Min(NotificationAttempts - 1, RetryDelays.Length - 1)];
    }

    /// <summary>One line: whitespace (line breaks included) collapsed, empty becomes null.</summary>
    private static string? Line(string? value, int max, string field)
    {
        RejectControl(value, field);
        return VehicleRules.ShortText(value, max, field);
    }

    /// <summary>Multi-line text: line breaks kept, only trimmed.</summary>
    private static string? Text(string? value, int max, string field)
    {
        RejectControl(value, field);
        return VehicleRules.LongText(value, max, field);
    }

    /// <summary>Only line breaks and tabs are allowed; NUL and the rest cannot reach the database or an email.</summary>
    private static void RejectControl(string? value, string field)
    {
        if (value is null) return;
        foreach (var c in value)
            if (char.IsControl(c) && c is not ('\n' or '\r' or '\t'))
                throw new DomainException("invalid_text", $"{field} contains control characters", field);
    }
}
