namespace FutronicBridge.Services;

public record ScanResult(bool Success, string? TemplateBase64, string? ImageBase64, string? Message);

public record MatchResult(bool Success, bool Matched, string? UserId, int Score, string? Message);

/// <summary>
/// enroll = cadastro (~3 toques); verify = login/confirmação (1 toque).
/// </summary>
public enum ScanMode
{
    Enroll,
    Verify,
}

public interface IFingerprintService
{
    bool IsDemoMode { get; }
    bool IsDeviceConnected { get; }
    ScanResult ScanSingle(int timeoutMs = 15000, ScanMode mode = ScanMode.Enroll);
    MatchResult Verify(string liveTemplateBase64, string storedTemplateBase64);
    /// <summary>Confirmação com 1 toque no leitor contra template já capturado.</summary>
    MatchResult LiveVerify(string storedTemplateBase64, int timeoutMs = 60000);
    /// <summary>
    /// Identificação 1:N. Sem liveTemplate: 1 toque ao vivo (FTRVerify se N=1, senão IDENTIFY+FTRIdentify).
    /// </summary>
    MatchResult Identify(
        IEnumerable<(string UserId, string TemplateBase64)> templates,
        string? liveTemplateBase64 = null,
        int timeoutMs = 60000);
}
