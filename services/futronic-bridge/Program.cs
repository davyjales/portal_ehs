using System.Text.Json;
using System.Text.Json.Serialization;
using FutronicBridge.Native;
using FutronicBridge.Services;

var demoMode = args.Contains("--demo") ||
               string.Equals(Environment.GetEnvironmentVariable("FUTRONIC_BRIDGE_DEMO"), "1", StringComparison.Ordinal);

var port = int.TryParse(Environment.GetEnvironmentVariable("FUTRONIC_BRIDGE_PORT"), out var parsedPort)
    ? parsedPort
    : 8080;

var allowedOrigins = (Environment.GetEnvironmentVariable("FUTRONIC_BRIDGE_ORIGINS") ?? "http://localhost:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

IFingerprintService fingerprintService = demoMode
    ? new DemoFingerprintService()
    : new FutronicFingerprintService();

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls($"http://127.0.0.1:{port}");

builder.Services.AddSingleton<SessionKeepAliveService>();
builder.Services.AddHostedService(provider => provider.GetRequiredService<SessionKeepAliveService>());

var app = builder.Build();

var jsonOptions = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    PropertyNameCaseInsensitive = true,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
};

app.Use(async (context, next) =>
{
    var origin = context.Request.Headers.Origin.ToString();
    if (!string.IsNullOrEmpty(origin) && allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
    {
        context.Response.Headers.AccessControlAllowOrigin = origin;
        context.Response.Headers.AccessControlAllowMethods = "GET, POST, OPTIONS";
        context.Response.Headers.AccessControlAllowHeaders = "Content-Type";
    }

    if (HttpMethods.IsOptions(context.Request.Method))
    {
        context.Response.StatusCode = StatusCodes.Status204NoContent;
        return;
    }

    await next();
});

app.MapGet("/health", () =>
{
    return Results.Json(new
    {
        ok = true,
        demoMode = fingerprintService.IsDemoMode,
        deviceConnected = fingerprintService.IsDeviceConnected,
    }, jsonOptions);
});

app.MapGet("/keepalive/status", (SessionKeepAliveService keepAlive) =>
{
    return Results.Json(new
    {
        enabled = keepAlive.IsEnabled,
        intervalSeconds = keepAlive.IntervalSeconds,
        lastPulseAt = keepAlive.LastPulseAt,
        pulseCount = keepAlive.PulseCount,
        purpose = "Evita bloqueio de sessão Windows (Win+L) por inatividade no totem",
    }, jsonOptions);
});

app.MapPost("/keepalive/pulse", (SessionKeepAliveService keepAlive) =>
{
    if (!keepAlive.IsEnabled)
    {
        return Results.Json(new { ok = false, message = "Keepalive desabilitado." }, jsonOptions);
    }

    keepAlive.PulseOnce();
    return Results.Json(new
    {
        ok = true,
        lastPulseAt = keepAlive.LastPulseAt,
        pulseCount = keepAlive.PulseCount,
    }, jsonOptions);
});

app.MapPost("/touch-keyboard/show", () =>
{
    var shown = WindowsTouchKeyboard.Show();
    return Results.Json(new
    {
        ok = shown,
        message = shown ? "Teclado touch acionado." : "Não foi possível abrir o teclado touch.",
    }, jsonOptions);
});

app.MapGet("/scan/single", async (HttpContext context) =>
{
    // Captura pode levar até ~60s aguardando o dedo.
    context.RequestAborted.Register(() => { });
    using var cts = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted);
    cts.CancelAfter(TimeSpan.FromMinutes(2));

    var timeoutMs = int.TryParse(context.Request.Query["timeoutMs"], out var timeout) ? timeout : 60000;
    // Default enroll (~3 toques) para teste direto; use ?mode=verify para 1 toque.
    var modeRaw = context.Request.Query["mode"].ToString();
    var mode = string.Equals(modeRaw, "verify", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(modeRaw, "login", StringComparison.OrdinalIgnoreCase)
        ? ScanMode.Verify
        : ScanMode.Enroll;

    try
    {
        if (fingerprintService is DemoFingerprintService demo &&
            int.TryParse(context.Request.Query["profile"], out var profile))
        {
            var result = demo.ScanSingleForProfile(profile);
            return Results.Json(new
            {
                success = result.Success,
                templateBase64 = result.TemplateBase64,
                imageBase64 = result.ImageBase64,
                message = result.Message,
                mode = mode.ToString().ToLowerInvariant(),
                demoProfile = profile,
            }, jsonOptions);
        }

        var scan = await Task.Run(() => fingerprintService.ScanSingle(timeoutMs, mode), cts.Token);
        return Results.Json(new
        {
            success = scan.Success,
            templateBase64 = scan.TemplateBase64,
            imageBase64 = scan.ImageBase64,
            message = scan.Message,
            mode = mode.ToString().ToLowerInvariant(),
        }, jsonOptions);
    }
    catch (OperationCanceledException)
    {
        return Results.Json(new
        {
            success = false,
            message = "Tempo esgotado aguardando digital no leitor.",
        }, jsonOptions);
    }
    catch (Exception ex)
    {
        return Results.Json(new
        {
            success = false,
            message = $"Falha na captura: {ex.Message}",
        }, jsonOptions);
    }
});

app.MapPost("/verify", async (HttpRequest request) =>
{
    var body = await JsonSerializer.DeserializeAsync<VerifyRequest>(request.Body, jsonOptions);
    if (body?.StoredTemplateBase64 == null)
    {
        return Results.Json(new { success = false, verified = false, message = "Template armazenado obrigatório." }, jsonOptions);
    }

    // Confirmação com 1 toque: só storedTemplate → FTRVerify ao vivo.
    MatchResult result;
    if (string.IsNullOrWhiteSpace(body.TemplateBase64))
    {
        result = fingerprintService.LiveVerify(body.StoredTemplateBase64, body.TimeoutMs ?? 60000);
    }
    else
    {
        result = fingerprintService.Verify(body.TemplateBase64, body.StoredTemplateBase64);
    }

    return Results.Json(new
    {
        success = result.Success,
        verified = result.Matched,
        score = result.Score,
        message = result.Message,
    }, jsonOptions);
});

app.MapPost("/identify", async (HttpRequest request) =>
{
    var body = await JsonSerializer.DeserializeAsync<IdentifyRequest>(request.Body, jsonOptions);
    if (body?.Templates == null || body.Templates.Count == 0)
    {
        return Results.Json(new { success = false, matched = false, message = "Nenhum template informado." }, jsonOptions);
    }

    var templates = body.Templates
        .Where(t => !string.IsNullOrWhiteSpace(t.UserId) && !string.IsNullOrWhiteSpace(t.TemplateBase64))
        .Select(t => (t.UserId!, t.TemplateBase64!));

    // Sem liveTemplate: FTRVerify (1 galeria) ou captura IDENTIFY + FTRIdentify (várias).
    var result = fingerprintService.Identify(
        templates,
        body.LiveTemplateBase64,
        body.TimeoutMs ?? 60000);
    return Results.Json(new
    {
        success = result.Success,
        matched = result.Matched,
        userId = result.UserId,
        score = result.Score,
        message = result.Message,
    }, jsonOptions);
});

Console.WriteLine($"Futronic Bridge listening on http://127.0.0.1:{port} (demoMode={demoMode})");
app.Run();

internal sealed class VerifyRequest
{
    public string? TemplateBase64 { get; set; }
    public string? StoredTemplateBase64 { get; set; }
    public int? TimeoutMs { get; set; }
}

internal sealed class IdentifyRequest
{
    public string? LiveTemplateBase64 { get; set; }
    public int? TimeoutMs { get; set; }
    public List<TemplateEntry> Templates { get; set; } = [];
}

internal sealed class TemplateEntry
{
    public string? UserId { get; set; }
    public string? TemplateBase64 { get; set; }
}
