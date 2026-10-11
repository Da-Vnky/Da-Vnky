@echo off
rem =====================================================================
rem  an animation's frames -> one animated WebP, at any size (tools/webp.py).
rem  Clip Studio won't export an animated WebP bigger than about 2000 across,
rem  so: File > Export animation > Image sequence (PNG, the full size) into a
rem  folder, then drag that folder onto this file. it asks how fast and how
rem  good, and saves <the folder's name>.webp next to the folder.
rem  (or double-click this and pick the folder.)
rem  needs Python (python.org), and FFmpeg or Pillow (py -m pip install pillow).
rem =====================================================================
cd /d "%~dp0.."
where py >nul 2>nul
if %errorlevel%==0 (
    py tools\webp.py --open %*
    goto :done
)
where python >nul 2>nul
if %errorlevel%==0 (
    python tools\webp.py --open %*
    goto :done
)
echo.
echo  Couldn't find Python on this computer.
echo  Install it from https://www.python.org/downloads/
echo  (tick "Add python.exe to PATH" in the installer), then try again.
:done
echo.
pause
