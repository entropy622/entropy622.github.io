@echo off
setlocal

rem Always run from the Astro project directory, even when launched by double-click.
cd /d "%~dp0"

where bun >nul 2>&1
if errorlevel 1 (
  echo [Error] Bun was not found. Install Bun first: https://bun.sh/
  pause
  exit /b 1
)

if not exist "node_modules\astro" (
  echo Installing dependencies...
  bun install
  if errorlevel 1 (
    echo [Error] Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Starting Astro development server at http://localhost:4321/
bun run dev --host 127.0.0.1

if errorlevel 1 (
  echo.
  echo [Error] The development server stopped unexpectedly.
  pause
)

endlocal
