@echo off
rem Abre Astra AI y opencode (con el MCP) a la vez.
if /i "%~1"=="--dentro" goto principal
cmd /k ""%~f0" --dentro"
exit /b

:principal
setlocal
cd /d "%~dp0"
title Astra AI + opencode
set "PATH=%APPDATA%\npm;%LOCALAPPDATA%\agy\bin;%PATH%"
call "%~dp0scripts\asegurar-node.bat"
if errorlevel 1 exit /b 1
node scripts\abrir-app-y-opencode.mjs
exit /b %errorlevel%
