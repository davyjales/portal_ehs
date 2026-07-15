using FutronicBridge.Native;

namespace FutronicBridge.Services;

public sealed class FutronicFingerprintService : IFingerprintService
{
    static FutronicFingerprintService()
    {
        FutronicNative.TryConfigureSdkPath();
    }

    public bool IsDemoMode => false;
    public bool IsDeviceConnected => FutronicNative.IsDeviceAvailable();

    public ScanResult ScanSingle(int timeoutMs = 15000, ScanMode mode = ScanMode.Enroll)
    {
        var captureMode = mode == ScanMode.Verify ? CaptureMode.Verify : CaptureMode.Enroll;
        var (success, template, error) = FutronicNative.CaptureTemplate(timeoutMs, captureMode);
        if (!success || template == null)
        {
            return new ScanResult(false, null, null, error ?? "Falha na captura.");
        }

        var message = mode == ScanMode.Verify
            ? "Captura (1 toque) concluída."
            : "Cadastro (3 amostras) concluído.";

        return new ScanResult(true, FutronicNative.EncodeTemplate(template), null, message);
    }

    public MatchResult Verify(string liveTemplateBase64, string storedTemplateBase64)
    {
        try
        {
            var live = FutronicNative.DecodeTemplate(liveTemplateBase64);
            var stored = FutronicNative.DecodeTemplate(storedTemplateBase64);
            var (matched, score, error) = FutronicNative.MatchTemplates(live, stored);
            return new MatchResult(true, matched, null, score, error ?? (matched ? "Verificado." : "Digital não confere."));
        }
        catch (Exception ex)
        {
            return new MatchResult(false, false, null, 0, ex.Message);
        }
    }

    public MatchResult LiveVerify(string storedTemplateBase64, int timeoutMs = 60000)
    {
        try
        {
            var stored = FutronicNative.DecodeTemplate(storedTemplateBase64);
            var (success, matched, error) = FutronicNative.LiveVerify(stored, timeoutMs);
            if (!success)
            {
                return new MatchResult(false, false, null, 0, error ?? "Falha na verificação ao vivo.");
            }

            return new MatchResult(true, matched, null, matched ? 100 : 0,
                matched ? "Verificado." : (error ?? "Digital não confere."));
        }
        catch (Exception ex)
        {
            return new MatchResult(false, false, null, 0, ex.Message);
        }
    }

    public MatchResult Identify(string liveTemplateBase64, IEnumerable<(string UserId, string TemplateBase64)> templates)
    {
        try
        {
            var live = FutronicNative.DecodeTemplate(liveTemplateBase64);
            string? bestUserId = null;
            var bestScore = 0;

            foreach (var (userId, templateBase64) in templates)
            {
                var stored = FutronicNative.DecodeTemplate(templateBase64);
                var (matched, score, _) = FutronicNative.MatchTemplates(live, stored);
                if (matched && score >= bestScore)
                {
                    bestScore = score;
                    bestUserId = userId;
                }
            }

            if (bestUserId != null)
            {
                return new MatchResult(true, true, bestUserId, bestScore, "Usuário identificado.");
            }

            return new MatchResult(true, false, null, 0, "Digital não reconhecida.");
        }
        catch (Exception ex)
        {
            return new MatchResult(false, false, null, 0, ex.Message);
        }
    }
}
