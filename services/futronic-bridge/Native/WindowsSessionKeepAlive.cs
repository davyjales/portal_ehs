using System.Runtime.InteropServices;

namespace FutronicBridge.Native;

/// <summary>
/// Evita bloqueio de sessão (Win+L por inatividade) no Windows.
/// O navegador não consegue fazer isso — é necessário código nativo no PC do totem.
/// </summary>
internal static class WindowsSessionKeepAlive
{
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern uint SetThreadExecutionState(ExecutionState esFlags);

    [DllImport("user32.dll")]
    private static extern bool GetCursorPos(out Point point);

    [DllImport("user32.dll")]
    private static extern bool SetCursorPos(int x, int y);

    [Flags]
    private enum ExecutionState : uint
    {
        EsContinuous = 0x80000000,
        EsDisplayRequired = 0x00000002,
        EsSystemRequired = 0x00000001,
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct Point
    {
        public int X;
        public int Y;
    }

    /// <summary>
    /// Pulso discreto: impede suspensão e move o cursor 1px e volta (reseta timer de inatividade).
    /// </summary>
    public static void Pulse()
    {
        SetThreadExecutionState(
            ExecutionState.EsContinuous
            | ExecutionState.EsDisplayRequired
            | ExecutionState.EsSystemRequired);

        if (!GetCursorPos(out var point))
        {
            return;
        }

        SetCursorPos(point.X + 1, point.Y);
        SetCursorPos(point.X, point.Y);
    }
}
