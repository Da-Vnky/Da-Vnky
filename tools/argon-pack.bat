@echo off
rem =====================================================================
rem  argon-pack: a zip of the site's code and notes for Argon (the
rem  browser-based helper). it goes in _your-versions\argon\ and the
rem  folder opens. read tools\FOR-ARGON.md for how to hand it over.
rem  add --with-skizy for a job that touches skizy's room.
rem =====================================================================
cd /d "%~dp0.."
set "PY="
where py >nul 2>nul && set "PY=py"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY (
    echo Couldn't find Python on this computer.
    pause
    goto :eof
)
%PY% tools\argon-pack.py %*
echo.
pause
