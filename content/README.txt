DaV-nky · CONTENT
=================

Each place has its own folder. Put a file in, and it shows up on the site.
Take a file out, and it's gone. That's the whole job.

  content/sea/        LETTERS (message in a bottle)
                      .html or .txt, one letter per file.
                      Name them with the date first:  2026-09-24-hello.txt
                      A letter the visitor hasn't seen before arrives corked in
                      a bottle, and is read right there over the sea (the time of
                      day stays put). Once read, it goes onto the letters board on
                      the dock, where every letter can be read, newest first (the
                      "letters" button in the top left corner opens it too).
                      A date in the future stays hidden until that day.
                      THE EASY WAY: double-click tools\content.bat. The content
                      manager opens in your browser: write new letters, edit or
                      delete old ones, add pictures, see each one on the site's
                      paper as you type, and publish, without touching the files.

                      .txt letters: first line = title, blank line = new paragraph,
                        *italic*  **bold**  [a link](https://…)  ![a picture](content/sea/pic.jpg)
                        ---      on its own = a drawn line
                        ~ bye    on its own = a sign-off (right-aligned)
                      .html letters: anything that goes inside a letter
                        (<h2>, <p>, <p class="lede">, <img>, <p class="signoff"> …)

  THE CONTENT MANAGER: double-click tools\content.bat and everything below can be
  done in your browser: your letters; your easel paintings, city windows and
  records (add, caption, sleeves, delete); visitors' bottles and art (keep, pin,
  hang in the living space's frames, delete). Then "publish to the live site".

  content/living/frames.json
                      WHAT HANGS IN THE LIVING SPACE'S PICTURE FRAMES, frame by
                      number: { "1": "a-visitor-picture.png", "2": "", "3": "" }.
                      A name alone is from content/workshop/visitors/; a path works
                      too (content/workshop/cat.png). Set it with the "hang in"
                      buttons in the content manager.

  content/workshop/   PAINTINGS & DRAWINGS (the easel)
                      .png .jpg .jpeg .webp .gif .svg  (.mp4 .webm also work)
                      One file = one page on the easel's pad. Date-first names go
                      newest first. Caption = the file name, or a .txt with the
                      same name (first line title, the rest a note).
                      Tip: export around 2000 px on the long side.

  content/workshop/visitors/
                      ART LEFT BY VISITORS (the portfolio by the bench)
                      .png .jpg .jpeg .webp .gif .svg. One file = one piece.
                      Visitors press "leave some art", then paint something or
                      upload a picture (under 1 MB). It comes to the same inbox
                      as the bottles, attached and already named, e.g.
                        2026-09-24-a-little-boat-by-anna.png
                      Like it? Save the attachment in here and publish. The title
                      and the name are read from the file name (the part after
                      "-by-" is who made it). Don't? Delete the email.
                      One piece per visitor every 10 minutes.

  content/living/     MUSIC (the record player)
                      .mp3 (or .ogg). One file = one record in the crate.
                      SLEEVE ART: a picture with the same name, beside it:
                        01-aerie.mp3 + 01-aerie.jpg   (.png .webp .gif too; square)
                      the easy way: double-click tools\sleeve.bat, paste a song's
                      Spotify link (Share > Copy Song Link), and it saves the album
                      cover here with the right name, under 1 MB. No login needed.
                      it's the record's sleeve, and a round crop of it is the label
                      in the middle of the record as it spins. Without one, the
                      cover picture inside the mp3 is used, or a plain sleeve.
                      Title & artist come from the song's own tags if it has them,
                      otherwise the file name. Start names with 01-, 02-, … to set
                      the order. Once a record's on, it keeps playing as visitors
                      wander the site (a little player in the corner; ✕ stops it).

  content/city/       WINDOW SCENES (the telescope)
                      .png .jpg .jpeg .webp .gif .svg .mp4 .webm, or an .html bit.
                      One file = one lit window in the skyline. Landscape pictures
                      (about 4:3) fit the window best. Video plays silently on loop.
                      Caption = file name, or a same-named .txt.

  content/living/bottles/
                      MESSAGES IN BOTTLES FROM VISITORS (the crate)
                      .jpg / .png / .webp / .gif / .svg, or a .txt.
                      One file = one bottle. Bottles you approve arrive by email as
                      a .jpg; just drop that file in here. Its name, the writer's
                      name and the date are tucked inside the picture.
                      A new bottle waits in the CRATE: anyone can uncork it and read
                      it, then it goes back in. Only you move it on: to the BOARD
                      on the wall, or the PILE of letters on the shelf beneath it
                      (see "the board and the pile" below).

The files already in these folders are examples. Delete them whenever you like.


HOW THE SITE KNOWS WHAT'S IN A FOLDER
-------------------------------------
A web page can't look inside a folder on its own, so each folder also has a
list.txt naming its files. You never need to write it by hand:

  • NOT GETTING THEM? FormSubmit only forwards bottles once you've clicked
    "Activate Form" in its first email (look in spam, too). Bottles thrown
    before that are lost, so ask for them again after activating.

  • YOUR OWN POST OFFICE (Supabase: pictures and all, no daily limit)
      1. Make a free project at supabase.com.
      2. SQL Editor → New query → paste all of tools/supabase-setup.sql → Run.
      3. In sky/sky.js, near the top, fill in SUPABASE: the Project URL and the
         PUBLISHABLE key (sb_publishable_…). That key is made to be public:
         it can only send post in.
      4. In the content manager (tools\content.bat → visitors), connect with
         the Project URL and the SECRET key (sb_secret_…). It stays on your
         computer only.
      Post then goes straight to your database; the content manager collects it
      each time you open it, and deletes it from Supabase once you've kept or
      thrown it back. FormSubmit (below) just emails you "something arrived".
      A free project sleeps after a week with no activity: opening the content
      manager counts. If it ever sleeps, restore it on supabase.com.

  • ONE-TIME SETUP (FormSubmit: the email side) (on your computer, from the top of the site):
        git config core.hooksPath tools/hooks
    From then on every commit rewrites the list.txt files for you.
    (You can also run it any time:  sh tools/update-lists.sh)

  • The site also asks two other places, so it can still find files you upload
    some other way (e.g. through the Forgejo website, where the hook doesn't run):
      – the server's own folder listing, if Mel's server shows one
        (for Caddy that's "file_server browse"; nginx: "autoindex on")
      – your Forgejo repo's API, if Mel's Forgejo lets browsers ask it
        (the address is set near the top of sky/sky.js as REPO_API)
    If either is switched on, dropping in a file is truly all it takes.

Visitors' browsers remember which letters they've seen, so "new" means
new to them.


THE POST OFFICE (the "leave a message" button on the sea page)
--------------------------------------------------------------
Visitors write, draw or add a picture, roll it into a bottle and throw it.
Nothing reaches the site by itself: every bottle comes to YOU first.

  • NOT GETTING THEM? FormSubmit only forwards bottles once you've clicked
    "Activate Form" in its first email (look in spam, too). Bottles thrown
    before that are lost, so ask for them again after activating.

  • ONE-TIME SETUP
      1. Open sky/sky.js and find BOTTLE_INBOX near the top.
      2. Put  'https://formsubmit.co/YOUR-EMAIL'  in it, commit, and throw one
         test bottle from the live site.
      3. FormSubmit emails you an "activate" link. Click it.
      4. The next email shows a random address (formsubmit.co/1a2b3c…).
         Put THAT in BOTTLE_INBOX instead, so your email address isn't
         sitting in the site's code for anyone to read.
    Until BOTTLE_INBOX is filled in, the button still works and the bottle
    still gets thrown, but it tells the visitor the post office isn't open.

  • THE EASY WAY: the post office in the content manager (tools\content.bat,
      then "visitors"). It fetches new bottles and visitors' art straight
      from FormSubmit (one-time setup: an API key, explained on the page), and
      you keep or throw back each one. It also lists the bottles and art already
      on the site, to delete any. Drawn or picture bottles may only come by
      email (FormSubmit doesn't always pass pictures on); the page says so.

  • EACH BOTTLE THAT ARRIVES
      The email has the message, the name, and the note as a .jpg attached.
      Like it?  Save the .jpg into content/living/bottles/ and commit.
      Don't?    Delete the email. That's it.
      (You can also write a bottle yourself as a .txt, same rules as letters.)

  • KEEPING THE SEA CLEAN
      A hidden trap field catches most spam robots, and each visitor can
      only throw one bottle every 10 minutes.

Visitors' browsers remember which bottles they've opened, so the number on
the crate counts only the ones new to them.

  • THE BOARD AND THE PILE (only you decide)
      What's pinned and what's on the pile is kept in one small file,
      content/living/bottles/board.json, the same for every visitor.
      Change it in the content manager: tools\content.bat, "visitors",
      then pin / pile / crate on any bottle, and publish.


PREVIEW BEFORE YOU PUSH
-----------------------
See your changes on your own computer first, so nothing half-done goes live:

  • Windows: double-click tools\preview.bat. A window opens and your browser
    goes to http://localhost:8000 . Close that window to stop.
  • Mac / Linux / Git Bash:  sh tools/preview.sh , then open http://localhost:8000
  • Either needs Python (python.org; on Windows tick "Add python.exe to PATH"
    in the installer) or Node.js.

Edit, save, refresh the browser (Ctrl+F5 if it looks stale). While previewing,
"the sea" takes you to your own copy, not the live site, and new
files show up without list.txt (the preview shows folders). Happy with it?
Then commit and push as usual.
