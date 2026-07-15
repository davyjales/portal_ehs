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
    MatchResult Identify(string liveTemplateBase64, IEnumerable<(string UserId, string TemplateBase64)> templates);
}
