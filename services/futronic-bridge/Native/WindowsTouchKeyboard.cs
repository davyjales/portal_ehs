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
        try
        {
            if (Process.GetProcessesByName("TabTip").Length == 0)
            {
                var tabTipPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.CommonProgramFiles),
                    "microsoft shared",
                    "ink",
                    TabTipExe);

                if (!File.Exists(tabTipPath))
                {
                    Console.WriteLine("Touch keyboard: TabTip.exe não encontrado.");
                    return false;
                }

                Process.Start(new ProcessStartInfo(tabTipPath) { UseShellExecute = true });
                return true;
            }

            var uiHost = new UIHostNoLaunch();
            ((ITipInvocation)uiHost).Toggle(GetDesktopWindow());
            Marshal.ReleaseComObject(uiHost);
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Touch keyboard: {ex.Message}");
            return false;
        }
    }
}
