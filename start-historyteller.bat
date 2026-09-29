@echo off
chcp 65001 >nul
title HistoryTeller
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [x] Node.js not found - install Node 20+ from https://nodejs.org then run this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [1/3] npm install ... ^(first run only, takes a few minutes^)
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [x] npm install failed - see the messages above.
    pause
    exit /b 1
  )
)

if not exist .env (
  echo [2/3] creating .env from .env.example - put OPENROUTER_API_KEY in it for TTS / AI images
  copy /y .env.example .env >nul
)

echo [3/3] starting HistoryTeller at http://127.0.0.1:4700  ^(close this window to stop^)
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://127.0.0.1:4700"
node app\server.mjs
pause
