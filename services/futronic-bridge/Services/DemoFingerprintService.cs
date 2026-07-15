using System.Security.Cryptography;
using System.Text;

namespace FutronicBridge.Services;

/// <summary>
/// Simulates Futronic scanning for development without hardware.
/// Templates are deterministic per demo profile (1-5).
/// </summary>
public sealed class DemoFingerprintService : IFingerprintService
{
    private static readonly string[] DemoTemplates = BuildDemoTemplates();

    public bool IsDemoMode => true;
    public bool IsDeviceConnected => true;

    public ScanResult ScanSingle(int timeoutMs = 15000, ScanMode mode = ScanMode.Enroll)
    {
        _ = timeoutMs;
        _ = mode;
        // Default demo profile 1; portal can pass ?profile=N on scan requests.
        return ScanSingleForProfile(1);
    }

    public ScanResult ScanSingleForProfile(int profile)
    {
        var index = Math.Clamp(profile, 1, DemoTemplates.Length) - 1;
        var template = DemoTemplates[index];
        return new ScanResult(true, template, null, "Demo scan completed.");
    }

    public MatchResult Verify(string liveTemplateBase64, string storedTemplateBase64)
    {
        if (string.IsNullOrWhiteSpace(liveTemplateBase64) || string.IsNullOrWhiteSpace(storedTemplateBase64))
        {
            return new MatchResult(false, false, null, 0, "Templates inválidos.");
        }

        var matched = Normalize(liveTemplateBase64) == Normalize(storedTemplateBase64);
        return new MatchResult(true, matched, null, matched ? 100 : 0, matched ? "Verificado." : "Digital não confere.");
    }

    public MatchResult LiveVerify(string storedTemplateBase64, int timeoutMs = 60000)
    {
        _ = timeoutMs;
        // Em demo, confirmação ao vivo equivale a comparar com o mesmo template.
        return Verify(storedTemplateBase64, storedTemplateBase64);
    }

    public MatchResult Identify(string liveTemplateBase64, IEnumerable<(string UserId, string TemplateBase64)> templates)
    {
        foreach (var (userId, templateBase64) in templates)
        {
            var verify = Verify(liveTemplateBase64, templateBase64);
            if (verify.Success && verify.Matched)
            {
                return new MatchResult(true, true, userId, 100, "Usuário identificado.");
            }
        }

        return new MatchResult(true, false, null, 0, "Digital não reconhecida.");
    }

    private static string Normalize(string value) =>
        value.Trim().Replace("\r", "").Replace("\n", "");

    private static string[] BuildDemoTemplates()
    {
        var templates = new string[5];
        for (var i = 0; i < templates.Length; i++)
        {
            var seed = Encoding.UTF8.GetBytes($"portal-ehs-demo-profile-{i + 1}");
            var hash = SHA256.HashData(seed);
            templates[i] = Convert.ToBase64String(hash);
        }
        return templates;
    }
}
