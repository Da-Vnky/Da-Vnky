#!/bin/sh
# update-lists.sh — writes content/<scene>/list.txt and assets/<folder>/list.txt, naming every file in that folder,
# so the site knows what's there. Run it from the top of the site:
#     sh tools/update-lists.sh
# (the git hook in tools/hooks runs it for you on every commit)
# run from the top of the site (or from anywhere: it finds its way there)
[ -f tools/update-lists.sh ] || cd "$(dirname "$0")/.." || exit 1
# the record player's albums: every folder of songs in content/living/ (not the bottles): content/living/albums.txt
# (first, so content/living/list.txt below has it too)
if [ -d content/living ]; then
    {
        echo "# written by tools/update-lists.sh: the record player's albums (folders of songs in content/living/)."
        for dir in content/living/*/; do
            [ -d "$dir" ] || continue
            name=$(basename "$dir")
            case "$name" in bottles|.*|_*|~*) continue ;; esac
            ls "$dir" | grep -qiE '\.(mp3|ogg)$' || continue
            echo "$name"
        done
    } > content/living/albums.txt
fi

for dir in content/*/ content/*/*/; do
    [ -d "$dir" ] || continue
    list="${dir}list.txt"
    {
        echo "# written by tools/update-lists.sh: every file in this folder."
        echo "# no need to edit it; it's rewritten each commit."
        for f in "$dir"*; do
            [ -f "$f" ] || continue
            name=$(basename "$f")
            case "$name" in
                list.txt|README*|readme*|.*|_*) continue ;;
            esac
            echo "$name"
        done
    } > "$list"
done

# and the same for each art folder, assets/<folder>/list.txt, so each slot knows at once
# whether your picture is there (instead of asking the server for .svg, .gif, .webp, .png in turn)
for dir in assets/*/; do
    [ -d "$dir" ] || continue
    case "$dir" in assets/templates/) continue ;; esac
    {
        echo "# written by tools/update-lists.sh: every art file in this folder."
        echo "# no need to edit it; it's rewritten each commit."
        for f in "$dir"*; do
            [ -f "$f" ] || continue
            name=$(basename "$f")
            case "$name" in
                list.txt|README*|readme*|.*|_*) continue ;;
            esac
            echo "$name"
        done
    } > "${dir}list.txt"
done

# and every file of the resets' own (assets/resets/reset-1/ … reset-8/, and the folders inside them):
# assets/resets/index.txt, so a page knows at once which pictures a reset swaps (sky/state.js)
mkdir -p assets/resets
{
    echo "# written by tools/update-lists.sh: every file the resets have of their own."
    for f in assets/resets/reset-*/* assets/resets/reset-*/*/*; do
        [ -f "$f" ] || continue
        name=$(basename "$f")
        case "$name" in
            list.txt|README*|readme*|.*|_*) continue ;;
        esac
        echo "${f#assets/resets/}"
    done
} > assets/resets/index.txt

# and a catalogue of the whole site for sky/loader.js: every file a visitor's browser might load, with
# its size and a checksum, so on a later visit it can forget just the ones you've changed since (they're
# fetched fresh the next time they're needed): catalog.txt.
# files.txt and manifest.txt are for browsers still running an older loading screen (from before the site
# fetched pictures and sounds only as they're needed): they list just the pages and code, so those older
# screens bring themselves up to date without downloading everything first, and then they're replaced.
{
    echo "# written by tools/update-lists.sh: every file on the site a visitor loads: its size in bytes, and a checksum."
    for f in *.html sky/*.js sky/*.css assets/*/* assets/resets/*/* assets/resets/*/*/* content/*/* content/*/*/* \
             schizophyllu.me.room/* schizophyllu.me.room/*/* schizophyllu.me.room/*/*/* schizophyllu.me.room/*/*/*/*; do
        [ -f "$f" ] || continue
        name=$(basename "$f")
        case "$name" in
            template.html|README*|readme*|.*|_*) continue ;;
        esac
        case "$f" in
            assets/templates/*) continue ;;
        esac
        set -- $(cksum < "$f")
        echo "$f $2 $1"
    done
} > catalog.txt
{
    echo "# written by tools/update-lists.sh: the pages and code (for older loading screens: see catalog.txt)."
    grep -v '^#' catalog.txt | grep -Ei '\.(html|js|css|json|txt) [0-9]+ [0-9]+$'
} > files.txt
{
    echo "# written by tools/update-lists.sh: the pages and code, and their sizes in bytes (for older loading screens)."
    grep -v '^#' files.txt | sed 's/ [0-9]*$//'
} > manifest.txt
