using System.Runtime.InteropServices;

namespace FutronicBridge.Native;

/// <summary>
/// Bindings for Futronic WorkedEx SDK (ftrScanAPI.dll + FTRAPI.dll, x86).
/// Constants and callback match FTRAPI.h / SDK Worked Example.
/// </summary>
internal static class FtrConstants
{
    public const int RetcodeOk = 0;
    // Algumas builds retornam 5 ou 8 para cancelamento pelo callback.
    public const int RetcodeCanceledByUser = 5;
    public const int RetcodeCanceledByUserAlt = 8;

    // FTR_PARAM_* — ordem do enum FTRAPI.h (1-based).
    // Antes FAR/MODELS estavam trocados: FAR ia para o slot de MODELS e o limiar
    // de match ficava no default frouxo (~0.05) → dedos da mesma mão podiam passar.
    public const int ParamImageWidth = 1;
    public const int ParamImageHeight = 2;
    public const int ParamImageSize = 3;
    public const int ParamCbFrameSource = 4;
    public const int ParamCbControl = 5;
    public const int ParamMaxTemplateSize = 6;
    public const int ParamMaxModels = 7;
    public const int ParamMaxFarRequested = 8;
    public const int ParamMaxFarnRequested = 9;
    public const int ParamSysErrorCode = 10;
    public const int ParamFakeDetect = 11;
    public const int ParamFfdControl = 12;
    public const int ParamMiotControl = 13;

    // Frame sources
    public const int FrameSourceUndefined = 0;
    public const int FrameSourceFutronicUsb = 1;

    // FTREnroll só aceita ENROLL (e às vezes IDENTIFY). PURPOSE_VERIFY (=1) → código 3.
    public const int PurposeVerify = 1; // uso em FTRVerify, não em FTREnroll
    public const int PurposeIdentify = 2; // probe 1 toque para matching/login
    public const int PurposeEnroll = 3; // cadastro multi-amostra

    public const int RetcodeInvalidPurpose = 3;

    // FTR_RESPONSE (FTRAPI.h / WorkedEx): CANCEL=1, CONTINUE=2
    // Valores invertidos fazem o leitor piscar 1x e abortar a captura.
    public const int Cancel = 1;
    public const int Continue = 2;

    // FAR = valor / (2^31-1). Maior = mais permissivo.
    // 0.05 (107374182) = demo frouxo. 1:1 usa ~0.0001; 1:N um pouco menos apertado (~0.001).
    public const int StrictFarRequested = 214748;      // ~0.0001 — FTRVerify
    public const int IdentifyFarRequested = 2147483;   // ~0.001 — FTRIdentify
    public const int DefaultFarRequested = StrictFarRequested;
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

internal enum CaptureMode
{
    /// <summary>Cadastro: FTR_PURPOSE_ENROLL + MAX_MODELS (~3 toques).</summary>
    Enroll,
    /// <summary>
    /// Login 1:N (1 toque): FTR_PURPOSE_IDENTIFY → FTRSetBaseTemplate + FTRIdentify.
    /// SDK exige mínimo 3 em MAX_MODELS para ENROLL; probe IDENTIFY é o caminho correto de 1 toque.
    /// </summary>
    Identify,
}

internal static class FutronicNative
{
    private const int DefaultTemplateSize = 8192;
    private const int EnrollModels = 3;

    private static readonly object Sync = new();
    private static bool _initialized;
    private static FtrStateCallback? _stateCallback;

    // Visíveis para a thread nativa do callback (Task.Run + FTRAPI).
    private static int _captureActive; // 0 = idle, 1 = capturando
    private static int _forceCancel; // 1 = pedir cancelamento após timeout real
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
    private static extern int FTRVerify(
        IntPtr context,
        ref FtrData template,
        [MarshalAs(UnmanagedType.Bool)] out bool isVerified,
        IntPtr reserved);

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int FTRMatchingTemplate(
        ref FtrData template1,
        ref FtrData template2,
        [MarshalAs(UnmanagedType.Bool)] out bool matched);

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int FTRSetBaseTemplate(ref FtrData template);

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int FTRIdentify(ref FtrIdentifyArray pAIdent, ref int pdwMatchCnt, ref FtrMatchedArray pAMatch);

    private const int DataKeyLength = 10;

    // Layout FTRAPI.h: KeyValue[10] + PFTRDATA (pack 4 → PData em offset 12).
    [StructLayout(LayoutKind.Sequential, Pack = 4)]
    private unsafe struct FtrIdentifyRecord
    {
        public fixed byte KeyValue[DataKeyLength];
        public IntPtr PData;
    }

    [StructLayout(LayoutKind.Sequential, Pack = 4)]
    private struct FtrIdentifyArray
    {
        public int TotalNumber;
        public IntPtr PMembers;
    }

    [StructLayout(LayoutKind.Sequential, Pack = 4)]
    private unsafe struct FtrMatchedRecord
    {
        public fixed byte KeyValue[DataKeyLength];
        public int FarAttained;
    }

    [StructLayout(LayoutKind.Sequential, Pack = 4)]
    private struct FtrMatchedArray
    {
        public int TotalNumber;
        public IntPtr PMembers;
    }

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

        // Comportamento WorkedEx: continuar em todo frame (LED pisca várias vezes)
        // até capturar, a menos que o watchdog peça cancelamento.
        var forceCancel = Interlocked.CompareExchange(ref _forceCancel, 0, 0) == 1;
        var code = forceCancel ? FtrConstants.Cancel : FtrConstants.Continue;
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

                ApplyMaxModels(EnrollModels);
                EnableMiotProtection();
                ApplyMatchSecurity();

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

    public static (bool Success, byte[]? Template, string? Error) CaptureTemplate(
        int timeoutMs = 60000,
        CaptureMode mode = CaptureMode.Enroll)
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
                return EnrollTemplate(timeoutMs, mode);
            }
            catch (Exception ex)
            {
                return (false, null, ex.Message);
            }
        }
    }

    public static CaptureMode ParseCaptureMode(string? mode)
    {
        if (string.Equals(mode, "identify", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(mode, "verify", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(mode, "login", StringComparison.OrdinalIgnoreCase))
        {
            return CaptureMode.Identify;
        }

        return CaptureMode.Enroll;
    }

    private static void ApplyMaxModels(int models)
    {
        var rc = FTRSetParam(FtrConstants.ParamMaxModels, new IntPtr(models));
        FTRGetParam(FtrConstants.ParamMaxModels, out var current);
        Console.WriteLine($"[Futronic] MAX_MODELS set={models} rc={rc} readback={current}");
    }

    /// <summary>
    /// Impede misturar dedos diferentes no mesmo template durante o enroll.
    /// </summary>
    private static void EnableMiotProtection()
    {
        var rc = FTRSetParam(FtrConstants.ParamMiotControl, new IntPtr(1));
        FTRGetParam(FtrConstants.ParamMiotControl, out var current);
        Console.WriteLine($"[Futronic] MIOT_CONTROL set=1 rc={rc} readback={current}");
    }

    /// <summary>
    /// FAR para match. 1:1 bem estrito; 1:N um pouco menos apertado (ainda seguro).
    /// </summary>
    private static void ApplyMatchSecurity(bool forIdentify = false)
    {
        var far = forIdentify ? FtrConstants.IdentifyFarRequested : FtrConstants.StrictFarRequested;
        var rc = FTRSetParam(FtrConstants.ParamMaxFarRequested, new IntPtr(far));
        FTRGetParam(FtrConstants.ParamMaxFarRequested, out var current);
        var label = forIdentify ? "~0.001" : "~0.0001";
        Console.WriteLine($"[Futronic] MAX_FAR set={far} ({label}) rc={rc} readback={current}");
    }

    private static (bool Success, byte[]? Template, string? Error) EnrollTemplate(int timeoutMs, CaptureMode mode)
    {
        // Cadastro: PURPOSE_ENROLL. Login 1:N: PURPOSE_IDENTIFY (1 toque) → FTRIdentify.
        // Nunca PURPOSE_VERIFY no FTREnroll (código 3). MAX_MODELS mínimo do SDK = 3.
        var purpose = mode == CaptureMode.Identify
            ? FtrConstants.PurposeIdentify
            : FtrConstants.PurposeEnroll;
        ApplyMaxModels(EnrollModels);
        var templateSize = GetMaxTemplateSize();
        var buffer = Marshal.AllocHGlobal(templateSize);
        var deadline = Environment.TickCount64 + timeoutMs;
        Interlocked.Exchange(ref _captureDeadlineMs, deadline);
        Interlocked.Exchange(ref _forceCancel, 0);
        Interlocked.Exchange(ref _captureActive, 1);

        using var timeoutCts = new CancellationTokenSource();
        var watchdog = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(timeoutMs, timeoutCts.Token);
                Interlocked.Exchange(ref _forceCancel, 1);
            }
            catch (OperationCanceledException)
            {
            }
        }, timeoutCts.Token);

        try
        {
            var template = new FtrData
            {
                DwSize = templateSize,
                PData = buffer,
            };

            var hint = mode == CaptureMode.Enroll
                ? $"Coloque e tire o dedo ~{EnrollModels} vezes"
                : "Coloque o dedo uma vez (identificação 1:N)";
            Console.WriteLine(
                $"[Futronic] FTREnroll mode={mode} purpose={purpose} timeout={timeoutMs}ms. {hint}.");

            var rc = FTREnroll(IntPtr.Zero, purpose, ref template);
            var forced = Interlocked.CompareExchange(ref _forceCancel, 0, 0) == 1;
            Console.WriteLine($"[Futronic] FTREnroll retornou código {rc}, size={template.DwSize}, forcedCancel={forced}");

            if (forced || rc == FtrConstants.RetcodeCanceledByUser || rc == FtrConstants.RetcodeCanceledByUserAlt)
            {
                if (forced || Environment.TickCount64 > Interlocked.Read(ref _captureDeadlineMs))
                {
                    return (false, null,
                        mode == CaptureMode.Enroll
                            ? "Tempo esgotado. Coloque e tire o dedo no sensor cerca de 3 vezes até concluir."
                            : "Tempo esgotado. Coloque o dedo uma vez no sensor e tente de novo.");
                }

                return (false, null,
                    $"Captura cancelada pelo SDK (código {rc}). Feche o WorkedEx e tente novamente.");
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
            timeoutCts.Cancel();
            try { watchdog.Wait(500); } catch { /* ignore */ }
            Interlocked.Exchange(ref _captureActive, 0);
            Interlocked.Exchange(ref _forceCancel, 0);
            Interlocked.Exchange(ref _captureDeadlineMs, 0);
            Marshal.FreeHGlobal(buffer);
        }
    }

    /// <summary>
    /// Confirmação com 1 toque: FTRVerify ao vivo contra template já cadastrado.
    /// </summary>
    public static (bool Success, bool Matched, string? Error) LiveVerify(byte[] storedTemplate, int timeoutMs = 60000)
    {
        if (timeoutMs <= 0)
        {
            timeoutMs = 60000;
        }

        lock (Sync)
        {
            if (!EnsureInitialized(out var initError))
            {
                return (false, false, initError);
            }

            ApplyMatchSecurity();

            var storedPtr = Marshal.AllocHGlobal(storedTemplate.Length);
            var deadline = Environment.TickCount64 + timeoutMs;
            Interlocked.Exchange(ref _captureDeadlineMs, deadline);
            Interlocked.Exchange(ref _forceCancel, 0);
            Interlocked.Exchange(ref _captureActive, 1);

            using var timeoutCts = new CancellationTokenSource();
            var watchdog = Task.Run(async () =>
            {
                try
                {
                    await Task.Delay(timeoutMs, timeoutCts.Token);
                    Interlocked.Exchange(ref _forceCancel, 1);
                }
                catch (OperationCanceledException)
                {
                }
            }, timeoutCts.Token);

            try
            {
                Marshal.Copy(storedTemplate, 0, storedPtr, storedTemplate.Length);
                var stored = new FtrData { DwSize = storedTemplate.Length, PData = storedPtr };

                Console.WriteLine("[Futronic] FTRVerify ao vivo — coloque o dedo uma vez.");
                var isVerified = false;
                var rc = FTRVerify(IntPtr.Zero, ref stored, out isVerified, IntPtr.Zero);
                var forced = Interlocked.CompareExchange(ref _forceCancel, 0, 0) == 1;
                Console.WriteLine($"[Futronic] FTRVerify rc={rc} verified={isVerified} forced={forced}");

                if (forced || rc == FtrConstants.RetcodeCanceledByUser || rc == FtrConstants.RetcodeCanceledByUserAlt)
                {
                    return (false, false, "Tempo esgotado na confirmação. Coloque o dedo uma vez e tente de novo.");
                }

                if (rc != FtrConstants.RetcodeOk)
                {
                    return (false, false, DescribeEnrollError(rc));
                }

                // Exige true explícito — nunca tratar "só ok do SDK" como match.
                return (true, isVerified, isVerified ? null : "Digital não confere.");
            }
            catch (EntryPointNotFoundException)
            {
                return (false, false, "FTRVerify não encontrada no FTRAPI.dll.");
            }
            catch (Exception ex)
            {
                return (false, false, ex.Message);
            }
            finally
            {
                timeoutCts.Cancel();
                try { watchdog.Wait(500); } catch { /* ignore */ }
                Interlocked.Exchange(ref _captureActive, 0);
                Interlocked.Exchange(ref _forceCancel, 0);
                Interlocked.Exchange(ref _captureDeadlineMs, 0);
                Marshal.FreeHGlobal(storedPtr);
            }
        }
    }

    private static int GetMaxTemplateSize()
    {
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

            ApplyMatchSecurity();

            var livePtr = Marshal.AllocHGlobal(live.Length);
            var storedPtr = Marshal.AllocHGlobal(stored.Length);

            try
            {
                Marshal.Copy(live, 0, livePtr, live.Length);
                Marshal.Copy(stored, 0, storedPtr, stored.Length);

                var liveData = new FtrData { DwSize = live.Length, PData = livePtr };
                var storedData = new FtrData { DwSize = stored.Length, PData = storedPtr };

                var matched = false;
                var rc = FTRMatchingTemplate(ref liveData, ref storedData, out matched);
                if (rc != FtrConstants.RetcodeOk)
                {
                    return (false, 0, $"Comparação de templates falhou (código {rc}).");
                }

                return (matched, matched ? 100 : 0, matched ? null : "Digital não confere.");
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

    /// <summary>
    /// 1:N: probe PURPOSE_IDENTIFY + FTRSetBaseTemplate + FTRIdentify contra templates ENROLL.
    /// </summary>
    public static unsafe (bool Success, int MatchIndex, string? Error) IdentifyAgainstGallery(
        byte[] identifyProbe,
        IReadOnlyList<byte[]> enrollTemplates)
    {
        if (identifyProbe.Length == 0 || enrollTemplates.Count == 0)
        {
            return (false, -1, "Templates inválidos para identificação.");
        }

        lock (Sync)
        {
            if (!EnsureInitialized(out var initError))
            {
                return (false, -1, initError);
            }

            ApplyMatchSecurity(forIdentify: true);

            var probePtr = Marshal.AllocHGlobal(identifyProbe.Length);
            var galleryPtrs = new IntPtr[enrollTemplates.Count];
            var ftrDataPtrs = new IntPtr[enrollTemplates.Count];
            var recordsPtr = IntPtr.Zero;
            var matchedPtr = IntPtr.Zero;

            try
            {
                Marshal.Copy(identifyProbe, 0, probePtr, identifyProbe.Length);
                var probe = new FtrData { DwSize = identifyProbe.Length, PData = probePtr };

                Console.WriteLine(
                    $"[Futronic] FTRSetBaseTemplate size={identifyProbe.Length} recordSize={sizeof(FtrIdentifyRecord)}");
                var baseRc = FTRSetBaseTemplate(ref probe);
                Console.WriteLine($"[Futronic] FTRSetBaseTemplate rc={baseRc}");
                if (baseRc != FtrConstants.RetcodeOk)
                {
                    return (false, -1,
                        baseRc == FtrConstants.RetcodeInvalidPurpose
                            ? "Probe inválido (PURPOSE_IDENTIFY). Use prontuário e confirme com a digital."
                            : $"FTRSetBaseTemplate falhou (código {baseRc}). Use prontuário e confirme com a digital.");
                }

                var recordSize = sizeof(FtrIdentifyRecord);
                recordsPtr = Marshal.AllocHGlobal(recordSize * enrollTemplates.Count);

                for (var i = 0; i < enrollTemplates.Count; i++)
                {
                    var tpl = enrollTemplates[i];
                    galleryPtrs[i] = Marshal.AllocHGlobal(tpl.Length);
                    Marshal.Copy(tpl, 0, galleryPtrs[i], tpl.Length);

                    ftrDataPtrs[i] = Marshal.AllocHGlobal(Marshal.SizeOf<FtrData>());
                    var data = new FtrData { DwSize = tpl.Length, PData = galleryPtrs[i] };
                    Marshal.StructureToPtr(data, ftrDataPtrs[i], false);

                    var record = new FtrIdentifyRecord { PData = ftrDataPtrs[i] };
                    // KeyValue = índice da galeria (lido de volta no match).
                    var idxBytes = BitConverter.GetBytes(i);
                    for (var k = 0; k < DataKeyLength; k++)
                    {
                        record.KeyValue[k] = k < idxBytes.Length ? idxBytes[k] : (byte)0;
                    }

                    var dest = (FtrIdentifyRecord*)(recordsPtr + (i * recordSize));
                    *dest = record;
                }

                var source = new FtrIdentifyArray
                {
                    TotalNumber = enrollTemplates.Count,
                    PMembers = recordsPtr,
                };

                const int maxMatches = 5;
                var matchedSize = sizeof(FtrMatchedRecord);
                matchedPtr = Marshal.AllocHGlobal(matchedSize * maxMatches);
                NativeMemory.Clear((void*)matchedPtr, (nuint)(matchedSize * maxMatches));

                var matchArray = new FtrMatchedArray
                {
                    TotalNumber = maxMatches,
                    PMembers = matchedPtr,
                };

                var matchCnt = 0;
                Console.WriteLine($"[Futronic] FTRIdentify gallery={enrollTemplates.Count}");
                var idRc = FTRIdentify(ref source, ref matchCnt, ref matchArray);
                Console.WriteLine($"[Futronic] FTRIdentify rc={idRc} matchCnt={matchCnt}");

                if (idRc != FtrConstants.RetcodeOk)
                {
                    return (false, -1,
                        $"Identificação 1:N falhou (código {idRc}). Use prontuário e confirme com a digital.");
                }

                if (matchCnt <= 0)
                {
                    return (true, -1, null);
                }

                var best = *(FtrMatchedRecord*)matchedPtr;
                var index = best.KeyValue[0]
                            | (best.KeyValue[1] << 8)
                            | (best.KeyValue[2] << 16)
                            | (best.KeyValue[3] << 24);
                if (index < 0 || index >= enrollTemplates.Count)
                {
                    return (false, -1, "Índice de match inválido. Use prontuário e confirme com a digital.");
                }

                Console.WriteLine($"[Futronic] FTRIdentify match index={index} far={best.FarAttained}");
                return (true, index, null);
            }
            catch (EntryPointNotFoundException)
            {
                return (false, -1,
                    "FTRIdentify não encontrada no FTRAPI.dll. Use prontuário e confirme com a digital.");
            }
            catch (Exception ex)
            {
                return (false, -1, ex.Message);
            }
            finally
            {
                if (matchedPtr != IntPtr.Zero) Marshal.FreeHGlobal(matchedPtr);
                if (recordsPtr != IntPtr.Zero) Marshal.FreeHGlobal(recordsPtr);
                for (var i = 0; i < ftrDataPtrs.Length; i++)
                {
                    if (ftrDataPtrs[i] != IntPtr.Zero) Marshal.FreeHGlobal(ftrDataPtrs[i]);
                }

                for (var i = 0; i < galleryPtrs.Length; i++)
                {
                    if (galleryPtrs[i] != IntPtr.Zero) Marshal.FreeHGlobal(galleryPtrs[i]);
                }

                Marshal.FreeHGlobal(probePtr);
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
