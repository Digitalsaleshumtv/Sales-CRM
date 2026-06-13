@echo off
title HUM TV Sales Platform

echo Starting HUM TV Sales Platform...
echo.

:: Start Backend
start "Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: Wait 2 seconds then start Frontend
timeout /t 2 /nobreak > nul
start "Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Wait 3 seconds then open browser
timeout /t 3 /nobreak > nul
start http://localhost:5173

echo.
echo Both servers are starting...
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001
echo.
echo You can close this window.
