# Futronic Bridge

Serviço local Windows que conecta o leitor Futronic ao portal EHS via HTTP em `localhost`.

## Requisitos

- Windows 10/11 x64
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- Driver Futronic instalado (Fingerprint Scanner 2.0)
- SDK Futronic Windows 4.2 ([download](https://www.futronic-tech.com/pro-detail.php?pro_id=1555))

## Modo demo (sem leitor)

```powershell
cd services/futronic-bridge
dotnet run -- --demo
```

No modo demo, use `?profile=1` a `?profile=5` em `/scan/single` para simular digitais diferentes.

## Modo produção (com leitor)

1. Copie do **WorkedEx** do SDK Futronic para `bin\Debug\net8.0\` (ou defina `FUTRONIC_SDK_PATH`):

   - `ftrScanAPI.dll`
   - `FTRAPI.dll`
   - pasta `DataBase\` (com subpasta `Bmp\`)

   Não é necessário `ftrAnsiSdk.dll` — o bridge usa `FTREnroll` do `FTRAPI.dll`, igual ao WorkedEx.

```cmd
set FUTRONIC_SDK_PATH=C:\caminho\para\WorkedEx
```

2. Inicie o bridge:

```powershell
cd services/futronic-bridge
dotnet run
```

**Atalho na area de trabalho (Windows):**

```cmd
cd services\futronic-bridge
install-desktop-shortcut.bat
```

Isso cria o atalho **Futronic Bridge EHS** que executa `start-bridge.bat` com as origens CORS do portal ja configuradas.

3. (Opcional) Configure porta e origens CORS:

```powershell
$env:FUTRONIC_BRIDGE_PORT = "8080"
$env:FUTRONIC_BRIDGE_ORIGINS = "http://localhost:3000,https://portal.suaempresa.com.br"
```

4. **Keepalive de sessão (anti Win+L):** ativo por padrão. O bridge envia um pulso discreto a cada 3 minutos para evitar que o Windows bloqueie a sessão por inatividade no totem do informativo.

```powershell
# Desabilitar (se necessário)
$env:FUTRONIC_SESSION_KEEPALIVE = "0"

# Intervalo em segundos (padrão: 180 = 3 min; deve ser menor que o timeout de bloqueio do Windows)
$env:FUTRONIC_KEEPALIVE_INTERVAL_SEC = "120"
```

**Importante:** o navegador sozinho não consegue impedir o bloqueio Win+L. O totem deve manter o bridge rodando (`start-bridge.bat` ou Agendador de Tarefas).

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status do serviço e leitor |
| GET | `/keepalive/status` | Status do anti-bloqueio Win+L |
| POST | `/keepalive/pulse` | Pulso manual de atividade |
| POST | `/touch-keyboard/show` | Abre o teclado touch do Windows (TabTip) |
| GET | `/scan/single` | Captura uma digital |
| POST | `/verify` | Compara live vs template armazenado |
| POST | `/identify` | Identifica usuário (1:N) |

## Bloqueio Win+L ainda ocorre?

Se o Windows continuar bloqueando mesmo com o bridge ativo, ajuste no PC do totem (requer admin):

1. **Configurações → Contas → Opções de entrada:** em "Se a Windows exigir entrada novamente", selecione **Nunca**.
2. **Configurações → Personalização → Tela de bloqueio → Configurações de proteção de tela:** desative a proteção de tela ou remova "Ao retomar, exibir a tela de logon".
3. **Política de grupo (se aplicável):** desative "Limite de inatividade da máquina para logon interativo" ou aumente o tempo.

O keepalive do bridge complementa essas configurações — não substitui políticas corporativas muito restritivas.

## Inicialização automática

Para quiosque, registre no Agendador de Tarefas do Windows:

- Programa: `dotnet`
- Argumentos: `run --project C:\caminho\portal_ehs\services\futronic-bridge\FutronicBridge.csproj`
- Disparo: ao fazer logon
- Executar com privilégios elevados se o driver exigir

Ou publique como executável:

```powershell
dotnet publish -c Release -r win-x64 --self-contained
```

## Firewall

O bridge escuta apenas em `127.0.0.1`. Não é necessário abrir porta externa.
