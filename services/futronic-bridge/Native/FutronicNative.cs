using System.Runtime.InteropServices;
using System.Text;

namespace FutronicBridge.Native;

/// <summary>
/// P/Invoke bindings for Futronic SDK (ftrScanAPI.dll + FTRAPI.dll).
/// Copy SDK DLLs next to FutronicBridge.exe or set FUTRONIC_SDK_PATH.
/// </summary>
internal static class FutronicNative
{
    private const int FtrScanImageSize = 256 * 292;
    private const int MaxTemplateSize = 2048;

    [DllImport("ftrScanAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern IntPtr ftrScanOpenDevice();

    [DllImport("ftrScanAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern void ftrScanCloseDevice(IntPtr handle);

    [DllImport("ftrScanAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int ftrScanGetImage2(
        IntPtr handle,
        int bufferSize,
        byte[] buffer,
        out int imageSize,
        out int frameParameters);

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int FTRInitialize();

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern void FTRTerminate();

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int FTRCreateTemplate(
        byte[] image,
        int imageSize,
        byte[] templateBuffer,
        ref int templateSize);

    [DllImport("FTRAPI.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int FTRVerifyTemplate(
        byte[] liveTemplate,
        int liveSize,
        byte[] storedTemplate,
        int storedSize,
        out int score);

    private static bool _initialized;
    private static readonly object Lock = new();

    public static bool TryConfigureSdkPath()
    {
        var sdkPath = Environment.GetEnvironmentVariable("FUTRONIC_SDK_PATH");
        if (string.IsNullOrWhiteSpace(sdkPath) || !Directory.Exists(sdkPath))
        {
            return File.Exists(Path.Combine(AppContext.BaseDirectory, "ftrScanAPI.dll"));
        }

        NativeLibrary.SetDllImportResolver(typeof(FutronicNative).Assembly, (library, _, _) =>
        {
            var candidate = Path.Combine(sdkPath, library.EndsWith(".dll", StringComparison.OrdinalIgnoreCase)
                ? library
                : library + ".dll");
            return File.Exists(candidate) ? NativeLibrary.Load(candidate) : IntPtr.Zero;
        });

        return File.Exists(Path.Combine(sdkPath, "ftrScanAPI.dll"));
    }

    public static bool EnsureInitialized(out string? error)
    {
        lock (Lock)
        {
            if (_initialized)
            {
                error = null;
                return true;
            }

            try
            {
                if (FTRInitialize() != 0)
                {
                    error = "Falha ao inicializar FTRAPI.";
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

    public static (bool Success, byte[]? Template, string? Error) CaptureTemplate(int timeoutMs)
    {
        if (!EnsureInitialized(out var initError))
        {
            return (false, null, initError);
        }

        IntPtr handle = IntPtr.Zero;
        try
        {
            handle = ftrScanOpenDevice();
            if (handle == IntPtr.Zero)
            {
                return (false, null, "Leitor Futronic não detectado.");
            }

            var image = new byte[FtrScanImageSize];
            var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMs);

            while (DateTime.UtcNow < deadline)
            {
                var rc = ftrScanGetImage2(handle, image.Length, image, out var imageSize, out _);
                if (rc == 0 && imageSize > 0)
                {
                    var template = new byte[MaxTemplateSize];
                    var templateSize = template.Length;
                    var createRc = FTRCreateTemplate(image, imageSize, template, ref templateSize);
                    if (createRc == 0 && templateSize > 0)
                    {
                        Array.Resize(ref template, templateSize);
                        return (true, template, null);
                    }

                    return (false, null, "Falha ao gerar template da digital.");
                }

                Thread.Sleep(120);
            }

            return (false, null, "Tempo esgotado aguardando digital.");
        }
        catch (Exception ex)
        {
            return (false, null, ex.Message);
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

        try
        {
            var rc = FTRVerifyTemplate(live, live.Length, stored, stored.Length, out var score);
            return (rc == 0, score, rc == 0 ? null : "Digital não confere.");
        }
        catch (Exception ex)
        {
            return (false, 0, ex.Message);
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
