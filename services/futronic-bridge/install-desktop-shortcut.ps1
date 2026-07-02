$bridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$batPath = Join-Path $bridgeDir "start-bridge.bat"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Futronic Bridge EHS.lnk"

if (-not (Test-Path $batPath)) {
  Write-Error "Arquivo nao encontrado: $batPath"
  exit 1
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $batPath
$shortcut.WorkingDirectory = $bridgeDir
$shortcut.Description = "Inicia o servico local de biometria Futronic para o Portal EHS"
$shortcut.Save()

Write-Host ""
Write-Host "Atalho criado na area de trabalho:"
Write-Host "  $shortcutPath"
Write-Host ""
