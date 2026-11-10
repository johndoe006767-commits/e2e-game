@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install Node.js 22.12 or newer from https://nodejs.org
  echo Then double-click this file again.
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 18 ? 0 : 1)"
if errorlevel 1 (
  echo Please update Node.js to version 22.12 or newer from https://nodejs.org
  pause
  exit /b 1
)
node "%~dp0scripts\local-game.mjs" start
if errorlevel 1 (
  pause
  exit /b 1
)
