@echo off
rem double-click to fetch album covers from Spotify for the record player's sleeves
cd /d "%~dp0.."
where py >nul 2>nul
if %errorlevel%==0 ( py tools\sleeve.py & pause & goto :eof )
where python >nul 2>nul
if %errorlevel%==0 ( python tools\sleeve.py & pause & goto :eof )
echo Couldn't find Python. Install it from https://www.python.org/downloads/
echo (tick "Add python.exe to PATH"), then try again.
pause
