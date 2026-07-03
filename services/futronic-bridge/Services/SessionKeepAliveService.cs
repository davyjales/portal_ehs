using FutronicBridge.Native;

namespace FutronicBridge.Services;

/// <summary>
/// Serviço em segundo plano que evita o bloqueio automático de sessão (Win+L) no totem.
/// Ativo por padrão quando o bridge está rodando. Desative com FUTRONIC_SESSION_KEEPALIVE=0.
/// </summary>
public sealed class SessionKeepAliveService : BackgroundService
{
    private readonly ILogger<SessionKeepAliveService> _logger;
    private readonly bool _enabled;
    private readonly int _intervalSeconds;

    public SessionKeepAliveService(ILogger<SessionKeepAliveService> logger)
    {
        _logger = logger;
        _enabled = !string.Equals(
            Environment.GetEnvironmentVariable("FUTRONIC_SESSION_KEEPALIVE"),
            "0",
            StringComparison.Ordinal);
        _intervalSeconds = int.TryParse(
            Environment.GetEnvironmentVariable("FUTRONIC_KEEPALIVE_INTERVAL_SEC"),
            out var seconds) && seconds >= 30
            ? seconds
            : 180;
    }

    public bool IsEnabled => _enabled;
    public int IntervalSeconds => _intervalSeconds;
    public DateTime? LastPulseAt { get; private set; }
    public long PulseCount { get; private set; }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_enabled)
        {
            _logger.LogInformation(
                "Keepalive de sessão desabilitado (FUTRONIC_SESSION_KEEPALIVE=0).");
            return;
        }

        _logger.LogInformation(
            "Keepalive de sessão ativo — pulso a cada {Interval}s para evitar bloqueio Win+L.",
            _intervalSeconds);

        PulseOnce();

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(_intervalSeconds));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                PulseOnce();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha no pulso de keepalive de sessão.");
            }
        }
    }

    public void PulseOnce()
    {
        WindowsSessionKeepAlive.Pulse();
        LastPulseAt = DateTime.UtcNow;
        PulseCount++;
    }
}
