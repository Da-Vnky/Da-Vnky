@echo off
rem =====================================================================
rem  bake: lighter copies of the big pictures, for visitors (tools/bake.py).
rem  your originals stay exactly as they are; the copies go in baked/.
rem  publishing does this for you every time: double-click this only to see
rem  what it makes (then preview with ?baked on the end of the address,
rem  e.g. http://localhost:8001/index.html?baked).
rem  needs Python and Pillow (python -m pip install pillow).
rem =====================================================================
cd /d "%~dp0.."
set "PY="
where py >/dev/null 2>/dev/null && set "PY=py"
if not defined PY where python >/dev/null 2>/dev/null && set "PY=python"
if not defined PY (
    echo Couldn't find Python on this computer.
    pause
    goto :eof
)
%PY% tools\bake.py %*
echo.
pause
