using GpSelect.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GpSelect.Infrastructure;

/// <summary>The email for one enquiry. Subject and body are plain text; the recipient comes from Enquiries:NotificationEmail.
/// The email is for GP SELECT, so it stays in Spanish; it says which language to reply in.</summary>
public sealed record EnquiryNotification(Guid EnquiryId, string Subject, string Body, string ReplyTo)
{
    public static EnquiryNotification For(Enquiry e)
    {
        var (subject, type) = e.Intent switch
        {
            EnquiryIntent.Vehicle => ("Consulta sobre un vehículo", "comprar un vehículo en stock"),
            EnquiryIntent.Search => ("Búsqueda de vehículo", "buscar un vehículo"),
            EnquiryIntent.Information => ("Petición de información", "información general"),
            _ => throw new InvalidOperationException("Unknown enquiry intent.")
        };
        return new(e.Id,
            // Name is one line (validated), so it is safe in a subject.
            $"GP SELECT · {subject}{(e.Language == EnquiryLanguage.En ? " · en inglés" : "")} · {e.Name}",
            string.Join('\n', new string?[] {
                $"Tipo: {type}",
                $"Idioma: {(e.Language == EnquiryLanguage.En ? "inglés (responde en inglés)" : "español")}",
                $"Nombre: {e.Name}",
                $"Email: {e.Email}",
                $"Teléfono: {e.Phone ?? "—"}",
                $"Vehículo: {e.Vehicle ?? "—"}",
                $"Presupuesto: {e.Budget ?? "—"}",
                e.Delivery is null ? null : $"Entrega en: {e.Delivery}",
                e.VehicleYear is null ? null : $"Año: {e.VehicleYear}",
                e.Mileage is null ? null : $"Kilometraje aproximado: {e.Mileage}",
                e.Timeframe is null ? null : $"Para cuándo: {e.Timeframe}",
                $"Recibida: {e.CreatedAt:yyyy-MM-dd HH:mm} UTC",
                $"Referencia: {e.Id}",
                "",
                e.Message ?? "(sin mensaje)" }.Where(line => line is not null)),
            e.Email);
    }
}

/// <summary>Delivery port, implemented by the optional SMTP adapter.</summary>
public interface IEnquiryNotifier
{
    Task SendAsync(EnquiryNotification notification, CancellationToken ct);
}

/// <summary>Sends pending enquiry notifications. A failure only reschedules: the stored enquiry is never lost.</summary>
public sealed class EnquiryNotificationOutbox(GpSelectDbContext db, IEnquiryNotifier notifier, ILogger<EnquiryNotificationOutbox> logger)
{
    public async Task<int> SendDueAsync(DateTimeOffset now, CancellationToken ct, int batch = 20)
    {
        var due = await db.Enquiries.Where(x => x.NotificationStatus == EnquiryNotificationStatus.Pending && x.NotificationNextAttemptAt <= now)
            .OrderBy(x => x.CreatedAt).Take(batch).ToListAsync(ct);
        foreach (var enquiry in due)
        {
            try
            {
                await notifier.SendAsync(EnquiryNotification.For(enquiry), ct);
                enquiry.NotificationSent(now);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                enquiry.NotificationFailed(now);
                // Only the id and the exception type: provider messages can echo addresses or content.
                logger.LogWarning("Enquiry {EnquiryId} notification failed ({Error}); attempt {Attempt}, status {Status}",
                    enquiry.Id, ex.GetType().Name, enquiry.NotificationAttempts, enquiry.NotificationStatus);
            }
            await db.SaveChangesAsync(ct);
        }
        return due.Count;
    }
}

/// <summary>Idle until an IEnquiryNotifier is registered. One API instance is assumed, like the image worker.</summary>
public sealed class EnquiryNotificationWorker(IServiceScopeFactory scopes, ILogger<EnquiryNotificationWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using (var probe = scopes.CreateScope())
            if (probe.ServiceProvider.GetService<IEnquiryNotifier>() is null)
            {
                logger.LogWarning("No enquiry notifier is configured: enquiries are stored and stay Pending until one is.");
                return;
            }
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                // Not registered in DI: it needs a notifier, which may not exist yet.
                await ActivatorUtilities.CreateInstance<EnquiryNotificationOutbox>(scope.ServiceProvider).SendDueAsync(DateTimeOffset.UtcNow, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException) { logger.LogError("Enquiry notification iteration failed ({Error})", ex.GetType().Name); }
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
        }
    }
}
