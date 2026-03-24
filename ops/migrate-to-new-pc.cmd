@echo off
setlocal
set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%migrate-to-new-pc.ps1" %*
exit /b %ERRORLEVEL%

