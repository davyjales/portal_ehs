using System.Diagnostics;
using System.Runtime.InteropServices;

namespace FutronicBridge.Native;

/// <summary>
/// Abre o teclado touch do Windows (TabTip) via COM — necessário em quiosques
/// onde o navegador não dispara o teclado automaticamente.
/// </summary>
internal static class WindowsTouchKeyboard
{
    private const string TabTipExe = "TabTip.exe";
    private const string TabTipRelativePath = "microsoft shared\\ink\\TabTip.exe";

    [DllImport("user32.dll")]
    private static extern IntPtr GetDesktopWindow();

    [ComImport, Guid("4ce576fa-83dc-4F88-951c-9d0782b4e376")]
    private class UIHostNoLaunch;

    [ComImport, Guid("37c994e7-432b-4834-a2f7-dce1f13b834b")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface ITipInvocation
    {
        void Toggle(IntPtr hwnd);
    }

    public static bool Show()
    {
        var tabTipPath = ResolveTabTipPath();
        var tabTipRunning = Process.GetProcessesByName("TabTip").Length > 0;

        if (!tabTipRunning)
        {
            if (tabTipPath == null)
            {
                Console.WriteLine("Touch keyboard: TabTip.exe não encontrado nos caminhos conhecidos.");
                return TryOskFallback();
            }

            try
            {
                Process.Start(new ProcessStartInfo(tabTipPath) { UseShellExecute = true });
                Thread.Sleep(250);
                tabTipRunning = Process.GetProcessesByName("TabTip").Length > 0;
                if (tabTipRunning)
                {
                    Console.WriteLine($"Touch keyboard: TabTip iniciado em {tabTipPath}");
                    return true;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Touch keyboard: falha ao iniciar TabTip ({tabTipPath}): {ex.Message}");
            }
        }

        if (TryToggleViaCom())
        {
            Console.WriteLine("Touch keyboard: acionado via COM.");
            return true;
        }

        if (tabTipPath != null && TryLaunchTabTip(tabTipPath))
        {
            return true;
        }

        Console.WriteLine("Touch keyboard: TabTip/COM indisponíveis, tentando OSK.");
        return TryOskFallback();
    }

    private static string? ResolveTabTipPath()
    {
        var candidates = new[]
        {
            Path.Combine(Environment.GetEnvironmentVariable("CommonProgramW6432") ?? "", TabTipRelativePath),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonProgramFiles), TabTipRelativePath),
            Path.Combine(Environment.GetEnvironmentVariable("ProgramW6432") ?? "", "Common Files", TabTipRelativePath),
            @"C:\Program Files\Common Files\microsoft shared\ink\TabTip.exe",
        };

        foreach (var candidate in candidates.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(candidate))
            {
                continue;
            }

            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        Console.WriteLine("Touch keyboard: caminhos verificados:");
        foreach (var candidate in candidates.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (!string.IsNullOrWhiteSpace(candidate))
            {
                Console.WriteLine($"  - {candidate}");
            }
        }

        return null;
    }

    private static bool TryLaunchTabTip(string tabTipPath)
    {
        try
        {
            Process.Start(new ProcessStartInfo(tabTipPath) { UseShellExecute = true });
            Thread.Sleep(250);
            return Process.GetProcessesByName("TabTip").Length > 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Touch keyboard: relançamento do TabTip falhou: {ex.Message}");
            return false;
        }
    }

    private static bool TryToggleViaCom()
    {
        try
        {
            var uiHost = new UIHostNoLaunch();
            ((ITipInvocation)uiHost).Toggle(GetDesktopWindow());
            Marshal.ReleaseComObject(uiHost);
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Touch keyboard: COM Toggle falhou: {ex.Message}");
            return false;
        }
    }

    private static bool TryOskFallback()
    {
        var oskPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "osk.exe");
        if (!File.Exists(oskPath))
        {
            Console.WriteLine("Touch keyboard: osk.exe também não encontrado.");
            return false;
        }

        try
        {
            Process.Start(new ProcessStartInfo(oskPath) { UseShellExecute = true });
            Console.WriteLine("Touch keyboard: OSK aberto como fallback.");
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Touch keyboard: falha ao abrir OSK: {ex.Message}");
            return false;
        }
    }
}
