@echo off
rem =====================================================================
rem  github-publish: double-click this (it's in the tools folder) after
rem  approving Claude's changes on GitHub (merging its pull request), to
rem  put them on the live site. Only while the cloud-session credit lasts:
rem  your usual publish.bat is unchanged and still publishes your own work.
rem    1. gets anything new from Forgejo first (Mel's changes)
rem    2. gets the changes you approved on GitHub and puts them together
rem       with your folder (it stops, changing nothing, if a file clashes)
rem    3. publishes to Forgejo like publish.bat (lists, CHANGES.txt)
rem    4. sends the same back to GitHub, so Claude's next session starts
rem       from what's live
rem  (tools/github-publish.sh does the work)
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

"%GITSH%" -c "tr -d '\r' < tools/github-publish.sh | sh"
echo.
pause
