using System.Runtime.InteropServices;

namespace FutronicBridge.Native;

/// <summary>
/// Bindings for Futronic WorkedEx SDK (ftrScanAPI.dll + FTRAPI.dll, x86).
/// Constants and callback match FTRAPI.h / SDK Worked Example.
/// </summary>
internal static class FtrConstants
{
    public const int RetcodeOk = 0;
    public const int RetcodeCanceledByUser = 8;

    // FTR_PARAM_* (enum starts at 1)
    public const int ParamImageWidth = 1;
    public const int ParamImageHeight = 2;
    public const int ParamImageSize = 3;
    public const int ParamCbFrameSource = 4;
    public const int ParamCbControl = 5;
    public const int ParamMaxTemplateSize = 6;
    public const int ParamMaxModels = 7;
    public const int ParamMaxFarRequested = 10;

    // Frame sources
    public const int FrameSourceUndefined = 0;
    public const int FrameSourceFutronicUsb = 1;

    // Purpose (FTRAPI.h) — FTR_PURPOSE_ENROLL is 3, not 1.
    // Passing 1 returns FTR_RETCODE_INVALID_PURPOSE (= 3).
    public const int PurposeVerify = 1;
    public const int PurposeIdentify = 2;
    public const int PurposeEnroll = 3;

    public const int RetcodeInvalidPurpose = 3;

    // Responses written to *pResponse in FTR_CB_STATE_CONTROL
    public const int Continue = 1;
    public const int Cancel = 2;

    public const int DefaultFarRequested = 107374182; // ~0.05 FAR
}

[StructLayout(LayoutKind.Sequential)]
internal struct FtrData
{
    public int DwSize;
    public IntPtr PData;
}

/// <summary>
/// FTR_CB_STATE_CONTROL — must return void and write FTR_CONTINUE/CANCEL to *pResponse.
/// </summary>
[UnmanagedFunctionPointer(CallingConvention.StdCall)]
internal delegate void FtrStateCallback(
    IntPtr context,
    int stateMask,
    IntPtr response,
    int signal,
    IntPtr bitmap);

internal static class FutronicNative
{
    private const int DefaultTemplateSize = 8192;

    private static readonly object Sync = new();
    private static bool _initialized;
    private static FtrStateCallback? _stateCallback;

    // Visíveis para a thread nativa do callback (Task.Run + FTRAPI).
    private static int _captureActive; // 0 = idle, 1 = capturando
    private static long _captureDeadlineMs;

    [DllImport("ftrScanAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern IntPtr ftrScanOpenDevice();

    [DllImport("ftrScanAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern void ftrScanCloseDevice(IntPtr handle);

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int FTRInitialize();

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern void FTRTerminate();

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int FTRSetParam(int param, IntPtr value);

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int FTRGetParam(int param, out int value);

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int FTREnroll(IntPtr context, int purpose, ref FtrData template);

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int FTRMatchingTemplate(ref FtrData template1, ref FtrData template2, out int matched);

    static FutronicNative()
    {
        TryConfigureSdkPath();
        // Keep delegate alive for native callback lifetime.
        _stateCallback = OnStateControl;
    }

    public static bool TryConfigureSdkPath()
    {
        var sdkPath = Environment.GetEnvironmentVariable("FUTRONIC_SDK_PATH");
        if (string.IsNullOrWhiteSpace(sdkPath) || !Directory.Exists(sdkPath))
        {
            EnsureDataBaseFolder(AppContext.BaseDirectory);
            return File.Exists(Path.Combine(AppContext.BaseDirectory, "ftrScanAPI.dll"))
                   && File.Exists(Path.Combine(AppContext.BaseDirectory, "FTRAPI.dll"));
        }

        NativeLibrary.SetDllImportResolver(typeof(FutronicNative).Assembly, (libraryName, _, _) =>
        {
            var fileName = libraryName.EndsWith(".dll", StringComparison.OrdinalIgnoreCase)
                ? libraryName
                : libraryName + ".dll";
            var candidate = Path.Combine(sdkPath, fileName);
            return File.Exists(candidate) ? NativeLibrary.Load(candidate) : IntPtr.Zero;
        });

        EnsureDataBaseFolder(sdkPath);
        EnsureDataBaseFolder(AppContext.BaseDirectory);
        return File.Exists(Path.Combine(sdkPath, "ftrScanAPI.dll"))
               && File.Exists(Path.Combine(sdkPath, "FTRAPI.dll"));
    }

    private static void EnsureDataBaseFolder(string root)
    {
        try
        {
            Directory.CreateDirectory(Path.Combine(root, "DataBase", "Bmp"));
        }
        catch
        {
            // Optional WorkedEx folder; ignore if not writable.
        }
    }

    private static void OnStateControl(
        IntPtr context,
        int stateMask,
        IntPtr response,
        int signal,
        IntPtr bitmap)
    {
        _ = context;
        _ = stateMask;
        _ = signal;
        _ = bitmap;

        if (response == IntPtr.Zero)
        {
            return;
        }

        // Nunca cancelar por deadline=0 (race): se não há captura ativa, continue.
        // Só cancela quando a captura está ativa E o timeout realmente esgotou.
        var active = Interlocked.CompareExchange(ref _captureActive, 0, 0) == 1;
        var deadline = Interlocked.Read(ref _captureDeadlineMs);
        var timedOut = active && deadline > 0 && Environment.TickCount64 > deadline;
        var code = timedOut ? FtrConstants.Cancel : FtrConstants.Continue;
        Marshal.WriteInt32(response, code);
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
                if (_stateCallback == null)
                {
                    error = "Callback de controle não inicializado.";
                    return false;
                }

                var initRc = FTRInitialize();
                if (initRc != FtrConstants.RetcodeOk)
                {
                    error = $"Falha ao inicializar FTRAPI (código {initRc}).";
                    return false;
                }

                var frameRc = FTRSetParam(
                    FtrConstants.ParamCbFrameSource,
                    new IntPtr(FtrConstants.FrameSourceFutronicUsb));
                if (frameRc != FtrConstants.RetcodeOk)
                {
                    error = $"Falha ao configurar leitor USB (código {frameRc}).";
                    return false;
                }

                FTRSetParam(FtrConstants.ParamMaxModels, new IntPtr(3));

                var callbackPtr = Marshal.GetFunctionPointerForDelegate(_stateCallback);
                var cbRc = FTRSetParam(FtrConstants.ParamCbControl, callbackPtr);
                if (cbRc != FtrConstants.RetcodeOk)
                {
                    error = $"Falha ao registrar callback de captura (código {cbRc}).";
                    return false;
                }

                _initialized = true;
                error = null;
                return true;
            }
            catch (DllNotFoundException ex)
            {
                error = $"DLL Futronic não encontrada. Copie ftrScanAPI.dll e FTRAPI.dll do WorkedEx para bin\\Debug\\net8.0\\. Detalhe: {ex.Message}";
                return false;
            }
            catch (BadImageFormatException)
            {
                error = "DLL Futronic incompatível (precisa ser 32-bit / x86). Use PlatformTarget=x86 e as DLLs do WorkedEx.";
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
        if (timeoutMs <= 0)
        {
            timeoutMs = 60000;
        }

        lock (Sync)
        {
            if (!EnsureInitialized(out var initError))
            {
                return (false, null, initError);
            }

            try
            {
                return EnrollTemplate(timeoutMs);
            }
            catch (Exception ex)
            {
                return (false, null, ex.Message);
            }
        }
    }

    private static (bool Success, byte[]? Template, string? Error) EnrollTemplate(int timeoutMs)
    {
        var templateSize = GetMaxTemplateSize();
        var buffer = Marshal.AllocHGlobal(templateSize);
        var deadline = Environment.TickCount64 + timeoutMs;
        Interlocked.Exchange(ref _captureDeadlineMs, deadline);
        // Ativar só depois do deadline — evita race "active=true + deadline=0".
        Interlocked.Exchange(ref _captureActive, 1);

        try
        {
            var template = new FtrData
            {
                DwSize = templateSize,
                PData = buffer,
            };

            var rc = FTREnroll(IntPtr.Zero, FtrConstants.PurposeEnroll, ref template);
            var timedOut = Environment.TickCount64 > Interlocked.Read(ref _captureDeadlineMs);

            if (rc == FtrConstants.RetcodeCanceledByUser || timedOut)
            {
                return (false, null,
                    timedOut
                        ? "Tempo esgotado aguardando digital no leitor. Mantenha o dedo no sensor e tente de novo."
                        : "Captura cancelada. Coloque o dedo no leitor e tente novamente.");
            }

            if (rc != FtrConstants.RetcodeOk)
            {
                return (false, null, DescribeEnrollError(rc));
            }

            if (template.DwSize <= 0 || template.PData == IntPtr.Zero)
            {
                return (false, null, "Captura concluída sem template válido.");
            }

            var bytes = new byte[template.DwSize];
            Marshal.Copy(template.PData, bytes, 0, template.DwSize);
            return (true, bytes, null);
        }
        finally
        {
            Interlocked.Exchange(ref _captureActive, 0);
            Interlocked.Exchange(ref _captureDeadlineMs, 0);
            Marshal.FreeHGlobal(buffer);
        }
    }

    private static int GetMaxTemplateSize()
    {
        FTRSetParam(FtrConstants.ParamMaxModels, new IntPtr(3));

        if (FTRGetParam(FtrConstants.ParamMaxTemplateSize, out var templateSize) == FtrConstants.RetcodeOk &&
            templateSize > 64 &&
            templateSize <= 65536)
        {
            return templateSize;
        }

        return DefaultTemplateSize;
    }

    private static string DescribeEnrollError(int rc) => rc switch
    {
        1 => "Parâmetro inválido no SDK Futronic (código 1).",
        2 => "FTRAPI já está em uso por outro processo (código 2). Feche o WorkedEx e tente de novo.",
        3 => "Propósito de cadastro inválido / rejeitado pelo SDK (código 3).",
        4 => "Origem do frame não configurada (código 4). Reinicie o bridge.",
        5 => "Operação cancelada (código 5).",
        6 => "Erro interno do SDK Futronic (código 6).",
        7 => "Leitor não conectado (código 7). Verifique o USB.",
        8 => "Falha no leitor / operação cancelada (código 8).",
        _ => $"Coloque o dedo no leitor e tente novamente (código {rc}).",
    };

    public static (bool Matched, int Score, string? Error) MatchTemplates(byte[] live, byte[] stored)
    {
        lock (Sync)
        {
            if (!EnsureInitialized(out var initError))
            {
                return (false, 0, initError);
            }

            FTRSetParam(FtrConstants.ParamMaxFarRequested, new IntPtr(FtrConstants.DefaultFarRequested));

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
                return (false, 0,
                    "FTRMatchingTemplate não encontrada no FTRAPI.dll. Use a DLL completa do WorkedEx.");
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
    }

    public static bool IsDeviceAvailable()
    {
        try
        {
            // Prefer ftrScanOpenDevice before FTRAPI claims the sensor.
            if (!_initialized)
            {
                var handle = ftrScanOpenDevice();
                if (handle == IntPtr.Zero)
                {
                    return false;
                }

                ftrScanCloseDevice(handle);
                return true;
            }

            if (!EnsureInitialized(out _))
            {
                return false;
            }

            return FTRGetParam(FtrConstants.ParamImageWidth, out var width) == FtrConstants.RetcodeOk
                   && width > 0;
        }
        catch
        {
            return false;
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
