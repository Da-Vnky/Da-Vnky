@echo off
rem =====================================================================
rem  publish: double-click this (it's in the tools folder) to put your
rem  changes on the live site. it
rem    1. fetches anything new from Forgejo (skizy's changes, songs you
rem       uploaded there): tools/pull.sh, the same as pull.bat
rem    2. brings in what you changed at the desk (desk.html, on the live
rem       site) since the last publish: tools/desk.py
rem    3. rewrites every list.txt, so new files appear and deleted ones go
rem    4. commits and pushes. the message: the lines waiting in CHANGES.txt
rem       ("not published yet"), which then move down into its log; if
rem       there aren't any, it asks what you changed
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
echo  1. getting anything new from Forgejo (skizy's changes, songs you uploaded there)...
"%GITSH%" -c "tr -d '\r' < tools/pull.sh | sh -s -- --quiet"
if errorlevel 1 (
    echo.
    echo  So nothing's been published. Your changes are still here, just as they were.
    pause
    goto :eof
)

set "PY="
where py >nul 2>nul && set "PY=py"
if not defined PY where python >nul 2>nul && set "PY=python"

echo.
echo  2. bringing in what you changed at the desk...
if defined PY (
    %PY% tools\desk.py file
) else (
    echo    ^(no python: the desk's changes wait for the next publish^)
)

echo.
echo  3. updating the file lists...
rem (tools\bake.py --quiet would make lighter copies of the big pictures here: off until the site is nearly done)
"%GITSH%" -c "tr -d '\r' < tools/update-lists.sh | sh"

echo.
git status --short
echo.
rem  4. the message: what's waiting in CHANGES.txt (tools/changes.py), or else what you type
set "MSG=%~1"
if defined PUBLISH_MSG set "MSG=%PUBLISH_MSG%"
set "HAVE="
if defined PY %PY% tools\changes.py waiting >nul 2>nul && set "HAVE=1"
if not defined HAVE if not defined MSG set /p "MSG=  4. what did you change? (a few words, then Enter): "
if not defined MSG set "MSG=update"
set "USEFILE="
if defined PY %PY% tools\changes.py take --also "%MSG%" && set "USEFILE=1"
git add -A
if defined USEFILE (
    git commit -F .git\PUBLISH_MSG --no-verify
) else (
    git commit -m "%MSG%" --no-verify
)
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
