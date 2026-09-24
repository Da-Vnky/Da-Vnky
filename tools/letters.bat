@echo off
rem =====================================================================
rem  the letters manager: double-click this (it's in the tools folder) to
rem  write, edit and delete the letters on your homepage (content/sea/)
rem  in your browser. close this window to stop it.
rem  needs Python (python.org, tick "Add python.exe to PATH").
rem =====================================================================
cd /d "%~dp0.."
where py >nul 2>nul
if %errorlevel%==0 (
    py tools\letters.py
    goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
    python tools\letters.py
    goto :eof
)
echo.
echo  Couldn't find Python on this computer.
echo  Install it from https://www.python.org/downloads/
echo  (tick "Add python.exe to PATH" in the installer), then try again.
echo.
pause
