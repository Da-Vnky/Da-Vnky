#!/bin/sh
# update-lists.sh — writes content/<scene>/list.txt and assets/<folder>/list.txt, naming every file in that folder,
# so the site knows what's there. Run it from the top of the site:
#     sh tools/update-lists.sh
# (the git hook in tools/hooks runs it for you on every commit)
# run from the top of the site (or from anywhere: it finds its way there)
[ -f tools/update-lists.sh ] || cd "$(dirname "$0")/.." || exit 1
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

# and a manifest of the whole site for the loading screen (sky/loader.js): every file a visitor's
# browser might load, with its size, so it can fetch them all up front and keep them for the visit
{
    echo "# written by tools/update-lists.sh: every file on the site a visitor loads, and its size in bytes."
    for f in *.html sky/*.js sky/*.css assets/*/* content/*/* content/*/*/*; do
        [ -f "$f" ] || continue
        name=$(basename "$f")
        case "$name" in
            template.html|README*|readme*|.*|_*) continue ;;
        esac
        case "$f" in
            assets/templates/*) continue ;;
        esac
        size=$(wc -c < "$f" | tr -d ' ')
        echo "$f $size"
    done
} > manifest.txt
