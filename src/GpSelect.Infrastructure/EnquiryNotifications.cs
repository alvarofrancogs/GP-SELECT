using GpSelect.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GpSelect.Infrastructure;

/// <summary>The email for one enquiry. Subject and body are plain text; the recipient comes from Enquiries:NotificationEmail.</summary>
public sealed record EnquiryNotification(Guid EnquiryId, string Subject, string Body, string ReplyTo)
{
    public static EnquiryNotification For(Enquiry e) => new(e.Id,
        // Name is one line (validated), so it is safe in a subject.
        $"GP SELECT · {(e.Intent == EnquiryIntent.Vehicle ? "Consulta sobre un vehículo" : "Búsqueda de vehículo")} · {e.Name}",
        string.Join('\n',
            $"Tipo: {(e.Intent == EnquiryIntent.Vehicle ? "vehículo concreto" : "ayúdame a encontrarlo")}",
            $"Nombre: {e.Name}",
            $"Email: {e.Email}",
            $"Teléfono: {e.Phone ?? "—"}",
            $"Vehículo: {e.Vehicle ?? "—"}",
            $"Recibida: {e.CreatedAt:yyyy-MM-dd HH:mm} UTC",
            $"Referencia: {e.Id}",
            "",
            e.Message),
        e.Email);
}

/// <summary>Delivery port. No provider is chosen yet: an adapter (SMTP or an HTTP API) implements this once one is decided.</summary>
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
