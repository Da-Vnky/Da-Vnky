@echo off
rem =====================================================================
rem  publish: double-click this (it's in the tools folder) to put your
rem  changes on the live site. it
rem    1. fetches anything new from Forgejo (songs you uploaded there too)
rem    2. rewrites every list.txt, so new files appear and deleted ones go
rem    3. asks what you changed, commits, and pushes
rem  preview first with preview.bat if you like.
rem  (the content manager runs it with a message, e.g. publish.bat "content push":
rem   then it doesn't ask, and closes itself when it's done)
rem =====================================================================
cd /d "%~dp0.."
set "GITSH="
if exist "%ProgramFiles%\Git\bin\sh.exe" set "GITSH=%ProgramFiles%\Git\bin\sh.exe"
if not defined GITSH if exist "%ProgramFiles(x86)%\Git\bin\sh.exe" set "GITSH=%ProgramFiles(x86)%\Git\bin\sh.exe"
if not defined GITSH if exist "%LocalAppData%\Programs\Git\bin\sh.exe" set "GITSH=%LocalAppData%\Programs\Git\bin\sh.exe"
if not defined GITSH (
    echo Couldn't find Git's sh.exe. Is Git for Windows installed?
    pause
    goto :eof
)

echo.
echo  1. getting anything new from Forgejo...
git pull --rebase --autostash
if errorlevel 1 (
    echo.
    echo  The pull didn't go through. Copy what it says above and ask for help.
    pause
    goto :eof
)

echo.
echo  2. updating the file lists...
"%GITSH%" -c "tr -d '\r' < tools/update-lists.sh | sh"

echo.
git status --short
echo.
set "MSG=%~1"
if defined PUBLISH_MSG set "MSG=%PUBLISH_MSG%"
if not defined MSG set /p "MSG=  3. what did you change? (a few words, then Enter): "
if not defined MSG set "MSG=update"
git add -A
git commit -m "%MSG%" --no-verify
git push
if errorlevel 1 (
    echo.
    echo  The push didn't go through. Copy what it says above and ask for help.
    pause
    goto :eof
)
echo.
echo  Done. The live site updates in a minute or two.
if not "%~1%PUBLISH_MSG%"=="" (
    timeout /t 6
    goto :eof
)
pause
