using System.Runtime.InteropServices;

namespace FutronicBridge.Native;

/// <summary>
/// Constants from Futronic FTRAPI.h (WorkedEx SDK).
/// </summary>
internal static class FtrConstants
{
    public const int RetcodeOk = 0;

    public const int ParamImageWidth = 1;
    public const int ParamImageHeight = 2;
    public const int ParamImageSize = 3;
    public const int ParamMaxTemplateSize = 4;
    public const int ParamMaxModels = 5;
    public const int ParamMaxFarRequested = 7;
    public const int ParamCbControl = 8;
    public const int ParamCbFrameSource = 10;

    public const int FrameSourceFutronicUsb = 2;

    public const int PurposeEnroll = 1;

    public const int DefaultFarRequested = 107374182; // FAR ~ 0.05
}

[StructLayout(LayoutKind.Sequential)]
internal struct FtrData
{
    public int DwSize;
    public IntPtr PData;
}

[UnmanagedFunctionPointer(CallingConvention.StdCall)]
internal delegate int FtrStateCallback(IntPtr context, int state, IntPtr response, IntPtr userParam);

internal static class FutronicNative
{
    private const int DefaultTemplateSize = 8192;
    private const int FingerPollMs = 100;

    private static readonly object Sync = new();
    private static bool _initialized;
    private static FtrStateCallback? _stateCallback;

    [DllImport("ftrScanAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern IntPtr ftrScanOpenDevice();

    [DllImport("ftrScanAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern void ftrScanCloseDevice(IntPtr handle);

    [DllImport("ftrScanAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern bool ftrScanIsFingerPresent(IntPtr handle, IntPtr frameParameters);

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int FTRInitialize();

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern void FTRTerminate();

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall, EntryPoint = "FTRSetParam")]
    private static extern int FTRSetParamInt(int param, int value);

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall, EntryPoint = "FTRSetParam")]
    private static extern int FTRSetParamCallback(int param, FtrStateCallback callback);

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int FTRGetParam(int param, out int value);

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int FTREnroll(int context, int purpose, ref FtrData template);

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int FTRMatchingTemplate(ref FtrData template1, ref FtrData template2, out int matched);

    static FutronicNative()
    {
        TryConfigureSdkPath();
        _stateCallback = OnStateControl;
    }

    public static bool TryConfigureSdkPath()
    {
        var sdkPath = Environment.GetEnvironmentVariable("FUTRONIC_SDK_PATH");
        if (string.IsNullOrWhiteSpace(sdkPath) || !Directory.Exists(sdkPath))
        {
            return File.Exists(Path.Combine(AppContext.BaseDirectory, "ftrScanAPI.dll"));
        }

        NativeLibrary.SetDllImportResolver(typeof(FutronicNative).Assembly, (_, libraryName, __, ___) =>
        {
            var candidate = Path.Combine(sdkPath, libraryName.EndsWith(".dll", StringComparison.OrdinalIgnoreCase)
                ? libraryName
                : libraryName + ".dll");
            return File.Exists(candidate) ? NativeLibrary.Load(candidate) : IntPtr.Zero;
        });

        return File.Exists(Path.Combine(sdkPath, "ftrScanAPI.dll"));
    }

    private static int OnStateControl(IntPtr context, int state, IntPtr response, IntPtr userParam)
    {
        _ = context;
        _ = state;
        _ = response;
        _ = userParam;
        return FtrConstants.RetcodeOk;
    }

    public static bool EnsureInitialized(out string? error)
    {
        lock (Sync)
        {
            if (_initialized)
            {
                error = null;
                return true;
            }

            try
            {
                if (FTRInitialize() != FtrConstants.RetcodeOk)
                {
                    error = "Falha ao inicializar FTRAPI.";
                    return false;
                }

                if (FTRSetParamInt(FtrConstants.ParamCbFrameSource, FtrConstants.FrameSourceFutronicUsb) !=
                    FtrConstants.RetcodeOk)
                {
                    error = "Falha ao configurar leitor USB (FSD_FUTRONIC_USB).";
                    return false;
                }

                FTRSetParamInt(FtrConstants.ParamMaxModels, 3);

                if (_stateCallback == null)
                {
                    error = "Callback de controle não inicializado.";
                    return false;
                }

                if (FTRSetParamCallback(FtrConstants.ParamCbControl, _stateCallback) != FtrConstants.RetcodeOk)
                {
                    error = "Falha ao registrar callback de captura.";
                    return false;
                }

                _initialized = true;
                error = null;
                return true;
            }
            catch (DllNotFoundException ex)
            {
                error = $"DLL Futronic não encontrada: {ex.Message}";
                return false;
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }
        }
    }

    public static (bool Success, byte[]? Template, string? Error) CaptureTemplate(int timeoutMs = 60000)
    {
        if (!EnsureInitialized(out var initError))
        {
            return (false, null, initError);
        }

        try
        {
            var enroll = EnrollTemplate();
            if (enroll.Success)
            {
                return enroll;
            }

            return CaptureTemplateFromScan(timeoutMs);
        }
        catch (Exception ex)
        {
            return (false, null, ex.Message);
        }
    }

    private static (bool Success, byte[]? Template, string? Error) EnrollTemplate()
    {
        var templateSize = GetMaxTemplateSize();
        var buffer = Marshal.AllocHGlobal(templateSize);

        try
        {
            var template = new FtrData
            {
                DwSize = templateSize,
                PData = buffer,
            };

            var rc = FTREnroll(0, FtrConstants.PurposeEnroll, ref template);
            if (rc == FtrConstants.RetcodeOk && template.DwSize > 0)
            {
                var bytes = new byte[template.DwSize];
                Marshal.Copy(template.PData, bytes, 0, template.DwSize);
                return (true, bytes, null);
            }

            return (false, null, $"FTREnroll falhou (código {rc}).");
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }
    }

    private static int GetMaxTemplateSize()
    {
        if (FTRGetParam(FtrConstants.ParamMaxTemplateSize, out var templateSize) == FtrConstants.RetcodeOk &&
            templateSize > 0)
        {
            return templateSize;
        }

        return DefaultTemplateSize;
    }

    private static (bool Success, byte[]? Template, string? Error) CaptureTemplateFromScan(int timeoutMs)
    {
        IntPtr handle = IntPtr.Zero;

        try
        {
            handle = ftrScanOpenDevice();
            if (handle == IntPtr.Zero)
            {
                return (false, null, "Não foi possível abrir o leitor Futronic.");
            }

            var deadline = Environment.TickCount64 + timeoutMs;

            while (Environment.TickCount64 < deadline)
            {
                if (!ftrScanIsFingerPresent(handle, IntPtr.Zero))
                {
                    Thread.Sleep(FingerPollMs);
                    continue;
                }

                var enroll = EnrollTemplate();
                if (enroll.Success)
                {
                    return enroll;
                }

                return (false, null, enroll.Error ?? "Falha ao gerar template após detectar o dedo.");
            }

            return (false, null, "Tempo esgotado aguardando digital no leitor.");
        }
        finally
        {
            if (handle != IntPtr.Zero)
            {
                ftrScanCloseDevice(handle);
            }
        }
    }

    public static (bool Matched, int Score, string? Error) MatchTemplates(byte[] live, byte[] stored)
    {
        if (!EnsureInitialized(out var initError))
        {
            return (false, 0, initError);
        }

        FTRSetParamInt(FtrConstants.ParamMaxFarRequested, FtrConstants.DefaultFarRequested);

        var livePtr = Marshal.AllocHGlobal(live.Length);
        var storedPtr = Marshal.AllocHGlobal(stored.Length);

        try
        {
            Marshal.Copy(live, 0, livePtr, live.Length);
            Marshal.Copy(stored, 0, storedPtr, stored.Length);

            var liveData = new FtrData { DwSize = live.Length, PData = livePtr };
            var storedData = new FtrData { DwSize = stored.Length, PData = storedPtr };

            var rc = FTRMatchingTemplate(ref liveData, ref storedData, out var matched);
            if (rc != FtrConstants.RetcodeOk)
            {
                return (false, 0, $"Comparação de templates falhou (código {rc}).");
            }

            var isMatch = matched != 0;
            return (isMatch, isMatch ? 100 : 0, isMatch ? null : "Digital não confere.");
        }
        catch (EntryPointNotFoundException)
        {
            return (false, 0, "FTRMatchingTemplate não está disponível no FTRAPI.dll.");
        }
        catch (Exception ex)
        {
            return (false, 0, ex.Message);
        }
        finally
        {
            Marshal.FreeHGlobal(livePtr);
            Marshal.FreeHGlobal(storedPtr);
        }
    }

    public static bool IsDeviceAvailable()
    {
        if (!EnsureInitialized(out _))
        {
            return false;
        }

        IntPtr handle = IntPtr.Zero;
        try
        {
            handle = ftrScanOpenDevice();
            return handle != IntPtr.Zero;
        }
        catch
        {
            return false;
        }
        finally
        {
            if (handle != IntPtr.Zero)
            {
                ftrScanCloseDevice(handle);
            }
        }
    }

    public static byte[] DecodeTemplate(string templateBase64)
    {
        return Convert.FromBase64String(templateBase64.Trim());
    }

    public static string EncodeTemplate(byte[] template)
    {
        return Convert.ToBase64String(template);
    }
}
