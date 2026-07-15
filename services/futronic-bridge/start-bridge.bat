@echo off
title Futronic Bridge EHS
cd /d "%~dp0"

set FUTRONIC_BRIDGE_ORIGINS=http://localhost:3002,http://127.0.0.1:3002,http://10.137.174.45:3002

if not exist "bin\Debug\net8.0" mkdir "bin\Debug\net8.0"

echo ========================================
echo   Futronic Bridge - Portal EHS
echo ========================================
echo.
echo Origens CORS: %FUTRONIC_BRIDGE_ORIGINS%
echo URL local:    http://127.0.0.1:8080/health
echo.

if defined FUTRONIC_SDK_PATH (
  echo Copiando DLLs de FUTRONIC_SDK_PATH=%FUTRONIC_SDK_PATH%
  copy /Y "%FUTRONIC_SDK_PATH%\ftrScanAPI.dll" "bin\Debug\net8.0\" >nul 2>&1
  copy /Y "%FUTRONIC_SDK_PATH%\FTRAPI.dll" "bin\Debug\net8.0\" >nul 2>&1
  if exist "%FUTRONIC_SDK_PATH%\DataBase" xcopy /E /I /Y "%FUTRONIC_SDK_PATH%\DataBase" "bin\Debug\net8.0\DataBase\" >nul 2>&1
)

if not exist "bin\Debug\net8.0\ftrScanAPI.dll" (
  echo [AVISO] ftrScanAPI.dll nao encontrada em bin\Debug\net8.0\
  echo Copie do WorkedEx: ftrScanAPI.dll, FTRAPI.dll e pasta DataBase\
  echo.
)

if not exist "bin\Debug\net8.0\DataBase\Bmp" mkdir "bin\Debug\net8.0\DataBase\Bmp" >nul 2>&1

echo Mantenha esta janela aberta enquanto usar a biometria.
echo Teste captura: http://127.0.0.1:8080/scan/single
echo Para encerrar: Ctrl+C
echo.

dotnet run

if errorlevel 1 (
  echo.
  echo Nao foi possivel iniciar o bridge.
  echo - Instale .NET 8 x86
  echo - Copie DLLs do WorkedEx para bin\Debug\net8.0\
  echo.
  pause
)
