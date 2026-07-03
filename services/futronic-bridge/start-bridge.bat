@echo off
title Futronic Bridge EHS
cd /d "%~dp0"

set FUTRONIC_BRIDGE_ORIGINS=http://localhost:3002,http://127.0.0.1:3002,http://10.137.174.45:3002

echo ========================================
echo   Futronic Bridge - Portal EHS
echo ========================================
echo.
echo Origens CORS: %FUTRONIC_BRIDGE_ORIGINS%
echo URL local:    http://127.0.0.1:8080/health
echo.
echo Mantenha esta janela aberta no totem.
echo O keepalive de sessao evita bloqueio Win+L por inatividade.
echo Para encerrar, feche a janela ou pressione Ctrl+C.
echo.

dotnet run

if errorlevel 1 (
  echo.
  echo Nao foi possivel iniciar o bridge.
  echo Verifique se o .NET 8 x86 esta instalado e se as DLLs Futronic
  echo estao na pasta bin\Debug\net8.0\
  echo.
  pause
)
