@echo off
rem =====================================================================
rem  the content manager: double-click this (it's in the tools folder) to
rem  manage everything on your site in your browser: your letters, your
rem  paintings, window scenes and records, and visitors' bottles and art.
rem  close this window to stop it.
rem  needs Python (python.org, tick "Add python.exe to PATH").
rem =====================================================================
cd /d "%~dp0.."
where py >nul 2>nul
if %errorlevel%==0 (
    py tools\content.py
    goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
    python tools\content.py
    goto :eof
)
echo.
echo  Couldn't find Python on this computer.
echo  Install it from https://www.python.org/downloads/
echo  (tick "Add python.exe to PATH" in the installer), then try again.
echo.
pause
