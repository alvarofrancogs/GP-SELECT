using System.Globalization;
using System.Net.Mail;
using System.Text.RegularExpressions;

namespace GpSelect.Domain;

/// <summary>Appointment comes from the Citas form: day, time, name and phone, confirmed by a call, so the email is optional.</summary>
public enum EnquiryIntent { Vehicle, Search, Information, Appointment }
/// <summary>The language the visitor wrote in, which is the language the reply goes out in.</summary>
public enum EnquiryLanguage { Es, En }
public enum EnquiryNotificationStatus { Pending, Sent, Failed }

/// <summary>An enquiry from the contact, import or appointment form. The stored row is the source of truth; the email notification is best effort.
/// Rows are deleted after Enquiries:RetentionDays (30 days by default), regardless of notification status.</summary>
public sealed class Enquiry
{
    public const int NameMin = 2, NameMax = 200, EmailMax = 200, PhoneMax = 30, VehicleMin = 2, VehicleMax = 200, MessageMin = 10, MessageMax = 5000, BudgetMax = 100;
    public const int MaxNotificationAttempts = 6;
    public const int DeliveryMax = 120, VehicleYearMax = 40, MileageMax = 60, TimeframeMax = 60;
    /// <summary>The form offers a year ahead in the visitor's calendar, which can be a day ahead of UTC.</summary>
    public const int AppointmentDaysAhead = 366;
    private static readonly TimeSpan[] RetryDelays = [TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(5), TimeSpan.FromMinutes(30), TimeSpan.FromHours(2), TimeSpan.FromHours(12)];
    private static readonly Regex PhoneChars = new(@"^\+?[\d\s().-]+$", RegexOptions.Compiled);

    private Enquiry() { }

    public Guid Id { get; private set; } = Guid.NewGuid();
    public EnquiryIntent Intent { get; private set; }
    public EnquiryLanguage Language { get; private set; }
    public string Name { get; private set; } = "";
    public string? Email { get; private set; }
    public string? Phone { get; private set; }
    public string? Vehicle { get; private set; }
    public string? Message { get; private set; }
    public string? Budget { get; private set; }
    public string? Delivery { get; private set; }
    public string? VehicleYear { get; private set; }
    public string? Mileage { get; private set; }
    public string? Timeframe { get; private set; }
    public DateOnly? AppointmentDate { get; private set; }
    public TimeOnly? AppointmentTime { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public EnquiryNotificationStatus NotificationStatus { get; private set; } = EnquiryNotificationStatus.Pending;
    public int NotificationAttempts { get; private set; }
    public DateTimeOffset NotificationNextAttemptAt { get; private set; }
    public DateTimeOffset? NotifiedAt { get; private set; }

    public static Enquiry Create(EnquiryIntent intent, string? name, string? email, string? phone, string? vehicle, string? message, DateTimeOffset now,
        EnquiryLanguage language = EnquiryLanguage.Es, string? budget = null,
        string? delivery = null, string? year = null, string? mileage = null, string? timeframe = null,
        string? date = null, string? time = null)
    {
        var appointment = intent == EnquiryIntent.Appointment;
        if (!Enum.IsDefined(intent)) throw new DomainException("invalid_intent", "intent is invalid", "intent");
        if (!Enum.IsDefined(language)) throw new DomainException("invalid_language", "language is invalid", "language");
        var cleanName = Line(name, NameMax, "name") ?? throw new DomainException("required", "name is required", "name");
        if (cleanName.Length < NameMin) throw new DomainException("too_short", $"name needs at least {NameMin} characters", "name");

        var cleanEmail = Line(email, EmailMax, "email");
        if (cleanEmail is null && !appointment) throw new DomainException("required", "email is required", "email");
        if (cleanEmail is not null && (cleanEmail.Contains(' ') || !MailAddress.TryCreate(cleanEmail, out var address) || address.Address != cleanEmail || !address.Host.Contains('.')))
            throw new DomainException("invalid_email", "email is invalid", "email");

        var cleanPhone = Line(phone, PhoneMax, "phone");
        var digits = cleanPhone?.Count(char.IsAsciiDigit) ?? 0;
        if (cleanPhone is not null && (!PhoneChars.IsMatch(cleanPhone) || digits < 7 || digits > 15))
            throw new DomainException("invalid_phone", "phone is invalid", "phone");
        if (cleanPhone is null && appointment) throw new DomainException("required", "phone is required for an appointment", "phone");
        var day = appointment ? AppointmentDay(date, now) : (DateOnly?)null;
        var hour = appointment ? AppointmentHour(time) : (TimeOnly?)null;

        var cleanVehicle = Line(vehicle, VehicleMax, "vehicle");
        if (intent == EnquiryIntent.Vehicle && (cleanVehicle is null || cleanVehicle.Length < VehicleMin))
            throw new DomainException("required", "vehicle is required for a vehicle enquiry", "vehicle");

        var cleanMessage = Text(message, MessageMax, "message");
        if (intent == EnquiryIntent.Search && (cleanVehicle is null || cleanVehicle.Length < VehicleMin) && cleanMessage is null)
            throw new DomainException("required", "vehicle or message is required for a search enquiry", "vehicle");
        if (intent == EnquiryIntent.Information)
        {
            if (cleanMessage is null) throw new DomainException("required", "message is required", "message");
            if (cleanMessage.Length < MessageMin) throw new DomainException("too_short", $"message needs at least {MessageMin} characters", "message");
        }
        var cleanBudget = Line(budget, BudgetMax, "budget");

        return new Enquiry
        {
            Intent = intent, Language = language, Name = cleanName, Email = cleanEmail, Phone = cleanPhone, Vehicle = cleanVehicle, Message = cleanMessage, Budget = cleanBudget,
            Delivery = Line(delivery, DeliveryMax, "delivery"), VehicleYear = Line(year, VehicleYearMax, "year"),
            Mileage = Line(mileage, MileageMax, "mileage"), Timeframe = Line(timeframe, TimeframeMax, "timeframe"),
            AppointmentDate = day, AppointmentTime = hour,
            CreatedAt = now, NotificationNextAttemptAt = now,
        };
    }

    /// <summary>The day as the date input sends it (yyyy-MM-dd), from yesterday in UTC (the visitor's today can be behind it)
    /// to a year ahead.</summary>
    private static DateOnly AppointmentDay(string? value, DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new DomainException("required", "date is required for an appointment", "date");
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        if (!DateOnly.TryParseExact(value.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day)
            || day < today.AddDays(-1) || day > today.AddDays(AppointmentDaysAhead))
            throw new DomainException("invalid_date", "date must be a day from today to a year ahead", "date");
        return day;
    }

    /// <summary>The time as the time input sends it (HH:mm).</summary>
    private static TimeOnly AppointmentHour(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new DomainException("required", "time is required for an appointment", "time");
        if (!TimeOnly.TryParseExact(value.Trim(), "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var hour))
            throw new DomainException("invalid_time", "time is invalid", "time");
        return hour;
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
    private static string? Line(string? value, int max, string field) => VehicleRules.ShortText(value, max, field);

    /// <summary>Multi-line text: line breaks kept, only trimmed.</summary>
    private static string? Text(string? value, int max, string field) => VehicleRules.LongText(value, max, field);
}
