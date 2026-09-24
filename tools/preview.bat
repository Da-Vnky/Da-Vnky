@echo off
rem =====================================================================
rem  preview the site on your own computer before you push it.
rem  double-click this file (it's in the tools folder). a window opens and
rem  your browser goes to http://localhost:8000 . close the window to stop.
rem  needs Python (python.org, tick "Add python.exe to PATH") or Node.js.
rem =====================================================================
cd /d "%~dp0.."
where py >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8000/
    py tools\serve.py 8000
    goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8000/
    python tools\serve.py 8000
    goto :eof
)
where npx >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8000/
    npx --yes http-server -p 8000 -c-1 .
    goto :eof
)
echo.
echo  Couldn't find Python or Node.js on this computer.
echo  Install Python from https://www.python.org/downloads/
echo  (tick "Add python.exe to PATH" in the installer), then try again.
echo.
pause
