DaV-nky · CONTENT
=================

Each place has its own folder. Put a file in, and it shows up on the site.
Take a file out, and it's gone. That's the whole job.

  content/sea/        LETTERS (message in a bottle)
                      .html or .txt, one letter per file.
                      Name them with the date first:  2026-09-24-hello.txt
                      A letter the visitor hasn't seen before arrives corked in
                      a bottle; the rest are already open, newest first.
                      A date in the future stays hidden until that day.

                      .txt letters: first line = title, blank line = new paragraph,
                        *italic*  **bold**  [a link](https://…)  ![a picture](content/sea/pic.jpg)
                        ---      on its own = a drawn line
                        ~ bye    on its own = a sign-off (right-aligned)
                      .html letters: anything that goes inside a letter
                        (<h2>, <p>, <p class="lede">, <img>, <p class="signoff"> …)

  content/workshop/   PAINTINGS & DRAWINGS (the easel)
                      .png .jpg .jpeg .webp .gif .svg  (.mp4 .webm also work)
                      One file = one page on the easel's pad. Date-first names go
                      newest first. Caption = the file name, or a .txt with the
                      same name (first line title, the rest a note).
                      Tip: export around 2000 px on the long side.

  content/living/     MUSIC (the record player)
                      .mp3 (or .ogg). One file = one record in the crate.
                      Title & artist come from the song's own tags if it has them,
                      otherwise the file name. Cover art in the file shows on the
                      record's label, or put a picture with the same name beside
                      it (my-song.mp3 + my-song.jpg). Start names with 01-, 02-, …
                      to set the order.

  content/city/       WINDOW SCENES (the telescope)
                      .png .jpg .jpeg .webp .gif .svg .mp4 .webm, or an .html bit.
                      One file = one lit window in the skyline. Landscape pictures
                      (about 4:3) fit the window best. Video plays silently on loop.
                      Caption = file name, or a same-named .txt.

  content/living/bottles/
                      MESSAGES IN BOTTLES FROM VISITORS (the crate)
                      .jpg / .png / .webp / .gif / .svg, or a .txt.
                      One file = one bottle in the crate. A visitor uncorks it,
                      reads it, and it gets pinned to the board on the wall.
                      Bottles you approve arrive by email as a .jpg; just drop that
                      file in here. Its name, the writer's name and the date are
                      tucked inside the picture, so there's nothing else to add.

The files already in these folders are examples. Delete them whenever you like.


HOW THE SITE KNOWS WHAT'S IN A FOLDER
-------------------------------------
A web page can't look inside a folder on its own, so each folder also has a
list.txt naming its files. You never need to write it by hand:

  • ONE-TIME SETUP (on your computer, from the top of the site):
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

  • EACH BOTTLE THAT ARRIVES
      The email has the message, the name, and the note as a .jpg attached.
      Like it?  Save the .jpg into content/living/bottles/ and commit.
      Don't?    Delete the email. That's it.
      (You can also write a bottle yourself as a .txt, same rules as letters.)

  • KEEPING THE SEA CLEAN
      A hidden trap field catches most spam robots, and each visitor can
      only throw one bottle every 10 minutes.

Visitors' browsers remember which bottles they've opened, so the crate
counts only the ones new to them, and their pinboard fills as they go.
