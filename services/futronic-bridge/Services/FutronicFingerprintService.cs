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

    public MatchResult Identify(
        IEnumerable<(string UserId, string TemplateBase64)> templates,
        string? liveTemplateBase64 = null,
        int timeoutMs = 60000)
    {
        try
        {
            var gallery = templates
                .Where(t => !string.IsNullOrWhiteSpace(t.UserId) && !string.IsNullOrWhiteSpace(t.TemplateBase64))
                .Select(t => (UserId: t.UserId!, TemplateBase64: t.TemplateBase64!))
                .ToList();

            if (gallery.Count == 0)
            {
                return new MatchResult(true, false, null, 0, "Nenhuma biometria cadastrada.");
            }

            // 1 usuário: mesmo caminho da confirmação de cadastro (FTRVerify) — confiável.
            if (gallery.Count == 1 && string.IsNullOrWhiteSpace(liveTemplateBase64))
            {
                var one = LiveVerify(gallery[0].TemplateBase64, timeoutMs);
                if (!one.Success)
                {
                    return one;
                }

                return new MatchResult(
                    true,
                    one.Matched,
                    one.Matched ? gallery[0].UserId : null,
                    one.Score,
                    one.Matched ? "Usuário identificado." : (one.Message ?? "Digital não reconhecida."));
            }

            byte[] probe;
            if (!string.IsNullOrWhiteSpace(liveTemplateBase64))
            {
                probe = FutronicNative.DecodeTemplate(liveTemplateBase64);
            }
            else
            {
                var scan = ScanSingle(timeoutMs, ScanMode.Verify);
                if (!scan.Success || scan.TemplateBase64 == null)
                {
                    return new MatchResult(false, false, null, 0, scan.Message ?? "Falha na captura.");
                }

                probe = FutronicNative.DecodeTemplate(scan.TemplateBase64);
            }

            var enrollBytes = gallery
                .Select(g => FutronicNative.DecodeTemplate(g.TemplateBase64))
                .ToList();

            var (ok, matchIndex, error) = FutronicNative.IdentifyAgainstGallery(probe, enrollBytes);
            if (!ok)
            {
                // Fallback legado (costuma falhar IDENTIFY vs ENROLL) — útil só em DLLs incompletas.
                Console.WriteLine($"[Futronic] IdentifyAgainstGallery falhou: {error}. Tentando MatchingTemplate.");
                return IdentifyViaMatchingTemplate(probe, gallery);
            }

            if (matchIndex < 0)
            {
                return new MatchResult(true, false, null, 0, "Digital não reconhecida.");
            }

            return new MatchResult(true, true, gallery[matchIndex].UserId, 100, "Usuário identificado.");
        }
        catch (Exception ex)
        {
            return new MatchResult(false, false, null, 0, ex.Message);
        }
    }

    private static MatchResult IdentifyViaMatchingTemplate(
        byte[] probe,
        List<(string UserId, string TemplateBase64)> gallery)
    {
        string? bestUserId = null;
        var bestScore = 0;

        foreach (var (userId, templateBase64) in gallery)
        {
            var stored = FutronicNative.DecodeTemplate(templateBase64);
            var (matched, score, _) = FutronicNative.MatchTemplates(probe, stored);
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

        return new MatchResult(true, false, null, 0,
            "Digital não reconhecida. Se persistir, use prontuário e confirme com a digital.");
    }
}
