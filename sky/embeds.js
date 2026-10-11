/* =====================================================================
   embeds.js — a link on a line of its own in a letter becomes the thing
   itself: a video, a song, a post, pasted onto the paper.

       some words.

       https://www.youtube.com/watch?v=dQw4w9WgXcQ

       more words.

   - the sites it knows (DavEmbed.SITES below: YouTube, Vimeo, SoundCloud,
     Spotify, Bandcamp's own embed links, Twitch, Dailymotion, Streamable, Loom,
     CodePen, Sketchfab, Instagram, TikTok, X/Twitter, the Internet Archive,
     Google Drive, Mastodon and Pleroma posts) are turned into their players
     right here, with nothing fetched first.
   - a link straight to a picture, a video or a sound file shows it / plays it.
   - any other link becomes a little card (the site's name and the address), and
     then noembed.com is asked whether it knows that site: if it has a player for
     it, the card becomes the player; if it only has a title and a picture, the
     card gets those. (noembed not answering: the card stays as it is.)
   - a link inside a sentence, or written [like this](https://…), stays a link.
   used by sky/sky.js (Sky.txtToHtml with { embeds: true }: the letters), the
   desk (desk.html) and the content manager's letters page, so all three agree.
   its look: sky/css/embeds.css
   ===================================================================== */

(function () {
    'use strict';

    var ASK = 'https://noembed.com/embed?url=';                       // (who's asked about sites it doesn't know)
    var ASK_WAIT = 6000;                                               // (how long to wait for an answer, ms)

    function esc(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function parse(u) { try { return new URL(u); } catch (e) { return null; } }
    function host(u) { return u.hostname.replace(/^(www|m|mobile)\./, '').toLowerCase(); }
    // "1h2m3s", "90", "1:30" → seconds
    function seconds(t) {
        if (!t) return 0;
        if (/^\d+$/.test(t)) return +t;
        var m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
        if (m && (m[1] || m[2] || m[3])) return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
        var c = t.split(':').map(Number);
        return c.every(function (n) { return !isNaN(n); }) ? c.reduce(function (a, n) { return a * 60 + n; }, 0) : 0;
    }
    // where the page is (Twitch insists on knowing who's showing its player)
    function parent() { return location.hostname || 'localhost'; }

    /* ---------------- the sites it knows: the link → its player ----------------
       each returns { src, ratio } (ratio: height / width, e.g. .5625 for 16:9), or { src, height } for a strip of a
       fixed height (a music player), and a name for the caption. tall: a phone-shaped video (kept narrow) */
    var SITES = [
        { name: 'YouTube', test: /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/, make: function (u) {
            var h = host(u), id = '', p = u.pathname, list = u.searchParams.get('list'), tall = false;
            if (h === 'youtu.be') id = p.slice(1).split('/')[0];
            else if (/^\/(embed|shorts|live|v)\//.test(p)) { id = p.split('/')[2]; tall = /^\/shorts\//.test(p); }
            else id = u.searchParams.get('v') || '';
            var start = seconds(u.searchParams.get('t') || u.searchParams.get('start') || (u.hash.match(/t=([^&]+)/) || [])[1]);
            if (!/^[\w-]{6,}$/.test(id)) {
                if (list) return { src: 'https://www.youtube-nocookie.com/embed/videoseries?list=' + encodeURIComponent(list), ratio: .5625 };
                return null;
            }
            return { src: 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0' + (start ? '&start=' + start : '') + (list ? '&list=' + encodeURIComponent(list) : ''),
                     ratio: tall ? 16 / 9 : .5625, tall: tall };
        } },
        { name: 'Vimeo', test: /(^|\.)vimeo\.com$/, make: function (u) {
            var m = /\/(?:video\/)?(\d+)(?:\/([0-9a-f]+))?/.exec(u.pathname);
            if (!m) return null;
            var hash = m[2] || u.searchParams.get('h');
            return { src: 'https://player.vimeo.com/video/' + m[1] + '?dnt=1' + (hash ? '&h=' + hash : ''), ratio: .5625 };
        } },
        { name: 'SoundCloud', test: /(^|\.)soundcloud\.com$/, make: function (u) {
            if (/^w\./.test(u.hostname)) return { src: u.href, height: 166 };
            if (u.pathname.split('/').filter(Boolean).length < 2) return null;
            var set = /\/sets\//.test(u.pathname);
            return { src: 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(u.href.split('?')[0]) + '&color=%239a3b1f&auto_play=false&show_comments=false&visual=' + (set ? 'true' : 'false'),
                     height: set ? 380 : 166 };
        } },
        { name: 'Spotify', test: /^open\.spotify\.com$/, make: function (u) {
            var m = /^\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/.exec(u.pathname);
            if (!m) return null;
            return { src: 'https://open.spotify.com/embed/' + m[1] + '/' + m[2], height: /^(track|episode)$/.test(m[1]) ? 152 : 352 };
        } },
        { name: 'Bandcamp', test: /^bandcamp\.com$/, make: function (u) {        // (only Bandcamp's own embed links: "Share / Embed")
            return /^\/EmbeddedPlayer\//.test(u.pathname) ? { src: u.href, height: /size=large/.test(u.pathname) ? 470 : 120 } : null;
        } },
        { name: 'Twitch', test: /(^|\.)twitch\.tv$/, make: function (u) {
            var p = u.pathname.split('/').filter(Boolean), par = '&parent=' + encodeURIComponent(parent());
            if (/^clips\./.test(u.hostname) && p[0]) return { src: 'https://clips.twitch.tv/embed?clip=' + encodeURIComponent(p[0]) + par, ratio: .5625 };
            if (p[1] === 'clip' && p[2]) return { src: 'https://clips.twitch.tv/embed?clip=' + encodeURIComponent(p[2]) + par, ratio: .5625 };
            if (p[0] === 'videos' && /^\d+$/.test(p[1])) return { src: 'https://player.twitch.tv/?video=' + p[1] + '&autoplay=false' + par, ratio: .5625 };
            if (p.length === 1 && /^\w+$/.test(p[0])) return { src: 'https://player.twitch.tv/?channel=' + p[0] + '&autoplay=false' + par, ratio: .5625 };
            return null;
        } },
        { name: 'Dailymotion', test: /(^|\.)(dailymotion\.com|dai\.ly)$/, make: function (u) {
            var m = host(u) === 'dai.ly' ? /^\/(\w+)/.exec(u.pathname) : /\/video\/(\w+)/.exec(u.pathname);
            return m ? { src: 'https://www.dailymotion.com/embed/video/' + m[1], ratio: .5625 } : null;
        } },
        { name: 'Streamable', test: /^streamable\.com$/, make: function (u) {
            var m = /^\/(?:e\/)?(\w+)/.exec(u.pathname);
            return m ? { src: 'https://streamable.com/e/' + m[1], ratio: .5625 } : null;
        } },
        { name: 'Loom', test: /(^|\.)loom\.com$/, make: function (u) {
            var m = /\/(?:share|embed)\/([0-9a-f]+)/.exec(u.pathname);
            return m ? { src: 'https://www.loom.com/embed/' + m[1], ratio: .5625 } : null;
        } },
        { name: 'CodePen', test: /^codepen\.io$/, make: function (u) {
            var m = /^\/([\w-]+)\/(?:pen|full|details|embed)\/(\w+)/.exec(u.pathname);
            return m ? { src: 'https://codepen.io/' + m[1] + '/embed/' + m[2] + '?default-tab=result', height: 420 } : null;
        } },
        { name: 'Sketchfab', test: /^sketchfab\.com$/, make: function (u) {
            var m = /\/(?:3d-models\/[\w-]*?-|models\/)([0-9a-f]{32})/.exec(u.pathname);
            return m ? { src: 'https://sketchfab.com/models/' + m[1] + '/embed', ratio: .5625 } : null;
        } },
        { name: 'Instagram', test: /(^|\.)instagram\.com$/, make: function (u) {
            var m = /^\/(?:[\w.]+\/)?(p|reel|tv)\/([\w-]+)/.exec(u.pathname);
            return m ? { src: 'https://www.instagram.com/' + (m[1] === 'tv' ? 'p' : m[1]) + '/' + m[2] + '/embed', ratio: 1.25, tall: true } : null;
        } },
        { name: 'TikTok', test: /(^|\.)tiktok\.com$/, make: function (u) {
            var m = /\/video\/(\d+)/.exec(u.pathname);
            return m ? { src: 'https://www.tiktok.com/embed/v2/' + m[1], ratio: 1.78, tall: true } : null;
        } },
        { name: 'X', test: /^(twitter\.com|x\.com|mobile\.twitter\.com)$/, make: function (u) {
            var m = /\/status(?:es)?\/(\d+)/.exec(u.pathname);
            return m ? { src: 'https://platform.twitter.com/embed/Tweet.html?dnt=true&id=' + m[1], height: 560, tall: true } : null;
        } },
        { name: 'the Internet Archive', test: /^archive\.org$/, make: function (u) {
            var m = /^\/(?:details|embed)\/([^/?#]+)/.exec(u.pathname);
            return m ? { src: 'https://archive.org/embed/' + m[1], ratio: .5625 } : null;
        } },
        { name: 'Google Drive', test: /^drive\.google\.com$/, make: function (u) {
            var m = /\/file\/d\/([\w-]+)/.exec(u.pathname);
            return m ? { src: 'https://drive.google.com/file/d/' + m[1] + '/preview', ratio: .5625 } : null;
        } }
    ];
    // the fediverse (Mastodon, Pleroma, Akkoma …): any server, so it's known by the shape of the address
    function fedi(u) {
        var m = /^\/@[\w.-]+(?:@[\w.-]+)?\/(\d+)\/?$/.exec(u.pathname);         // mastodon: /@someone/123456
        if (m) return { name: u.hostname, src: u.origin + u.pathname.replace(/\/$/, '') + '/embed', height: 420, tall: true };
        m = /^\/notice\/([\w-]+)\/?$/.exec(u.pathname);                          // pleroma / akkoma: /notice/AbC123
        if (m) return { name: u.hostname, src: u.origin + '/embed/' + m[1], height: 420, tall: true };
        return null;
    }
    var FILE = { image: /\.(png|jpe?g|gif|webp|avif|svg)$/i, video: /\.(mp4|webm|mov|m4v|ogv)$/i, audio: /\.(mp3|ogg|oga|wav|m4a|flac|opus)$/i };

    // what a link is: { kind: 'frame', src, ratio | height, name, tall } · { kind: 'image' | 'video' | 'audio', src } · { kind: 'card' }
    function find(url) {
        var u = parse(url);
        if (!u || !/^https?:$/.test(u.protocol)) return null;
        for (var k in FILE) if (FILE[k].test(u.pathname)) return { kind: k, src: u.href, name: host(u) };
        var h = host(u);
        for (var i = 0; i < SITES.length; i++) {
            if (!SITES[i].test.test(h) && !SITES[i].test.test(u.hostname)) continue;
            var got = SITES[i].make(u);
            if (got) { got.kind = 'frame'; got.name = SITES[i].name; return got; }
        }
        var f = fedi(u);
        if (f) { f.kind = 'frame'; return f; }
        return { kind: 'card', name: h };
    }

    // a paragraph that's only a link (bare, or in <angle brackets>): its address, else ''
    function lone(block) {
        var m = /^<?(https?:\/\/[^\s<>"]+?)>?$/i.exec(String(block || '').trim());
        if (!m) return '';
        return parse(m[1]) ? m[1].replace(/[.,;:!?)]+$/, function (tail) { return /\(/.test(m[1]) && tail.charAt(0) === ')' ? tail : ''; }) : '';
    }

    function frameHtml(f, sandboxed) {
        var size = f.height ? ' style="--em-h: ' + f.height + 'px"' : ' style="--em-ratio: ' + (Math.round((f.ratio || .5625) * 10000) / 100) + '%"';
        return '<div class="em-frame' + (f.height ? ' em-fixed' : '') + '"' + size + '><iframe src="' + esc(f.src) + '" title="' + esc(f.title || f.name) + '" loading="lazy" ' +
            'allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowfullscreen ' +
            'referrerpolicy="strict-origin-when-cross-origin"' + (sandboxed ? ' sandbox="allow-scripts allow-same-origin allow-popups allow-presentation allow-forms"' : '') + '></iframe></div>';
    }
    function caption(url, name) {
        return '<figcaption><a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(name) + ' · open it there ↗</a></figcaption>';
    }
    function pretty(u) {
        var p = decodeURIComponent(u.pathname.replace(/\/$/, '')).replace(/[-_]+/g, ' ');
        return (p.length > 1 ? p.slice(1).split('/').slice(-2).join(' › ') : '') || host(u);
    }

    // the html for a link on its own line
    function html(url) {
        var f = find(url);
        if (!f) return '<p><a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url) + '</a></p>';
        var open = '<figure class="embed em-' + (f.kind === 'frame' ? 'player' : f.kind) + (f.tall ? ' em-tall' : '') + '" data-url="' + esc(url) + '">';
        if (f.kind === 'frame') return open + frameHtml(f) + caption(url, f.name) + '</figure>';
        if (f.kind === 'image') return open + '<img src="' + esc(f.src) + '" alt="" loading="lazy">' + caption(url, f.name) + '</figure>';
        if (f.kind === 'video') return open + '<video src="' + esc(f.src) + '" controls preload="metadata" playsinline></video>' + caption(url, f.name) + '</figure>';
        if (f.kind === 'audio') return open + '<audio src="' + esc(f.src) + '" controls preload="none"></audio>' + caption(url, f.name) + '</figure>';
        var u = parse(url);
        return open + '<a class="em-card" href="' + esc(url) + '" target="_blank" rel="noopener"><span class="em-pic" hidden></span><span class="em-words">' +
            '<span class="em-site">' + esc(f.name) + '</span><span class="em-title">' + esc(pretty(u)) + '</span><span class="em-url">' + esc(url) + '</span></span></a></figure>';
    }

    /* ---------------- cards: ask noembed.com whether it knows the site ---------------- */
    var asked = {};
    function ask(url) {
        if (asked[url]) return asked[url];
        var stop = typeof AbortController === 'function' ? new AbortController() : null;
        var late = setTimeout(function () { if (stop) stop.abort(); }, ASK_WAIT);
        asked[url] = fetch(ASK + encodeURIComponent(url), { signal: stop ? stop.signal : undefined })
            .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
            .then(function (j) { clearTimeout(late); return j && !j.error ? j : null; });
        return asked[url];
    }
    // every card inside root that hasn't been asked about yet
    function dress(root) {
        Array.prototype.forEach.call((root || document).querySelectorAll('figure.em-card:not([data-asked])'), function (fig) {
            fig.setAttribute('data-asked', '');
            var url = fig.getAttribute('data-url');
            ask(url).then(function (j) {
                if (!j || !fig.isConnected) return;
                var src = /<iframe[^>]+src="(https:\/\/[^"]+)"/i.exec(j.html || '');
                if (src) {                                              // a player: the card becomes it
                    var w = +j.width || 0, h = +j.height || 0;
                    var f = { src: src[1].replace(/&amp;/g, '&'), name: j.provider_name || '', title: j.title || '' };
                    if (w && h && /%/.test(String(j.width)) === false && w > 0) { if (h < 260 || w > h * 4) f.height = h; else f.ratio = h / w; } else f.ratio = .5625;
                    fig.className = 'embed em-player em-from-card';
                    fig.innerHTML = frameHtml(f, true) + caption(url, j.provider_name || parse(url).hostname);
                    return;
                }
                if (j.title) fig.querySelector('.em-title').textContent = j.title;
                if (j.provider_name) fig.querySelector('.em-site').textContent = j.provider_name;
                if (j.thumbnail_url && /^https:\/\//.test(j.thumbnail_url)) {
                    var pic = fig.querySelector('.em-pic');
                    pic.innerHTML = '<img src="' + esc(j.thumbnail_url) + '" alt="" loading="lazy">';
                    pic.hidden = false;
                }
            });
        });
    }

    /* ---------------- previews (the desk, the content manager): change the words, keep the players ----------------
       a preview is drawn again at every key pressed; a player taken out of the page and put back starts over (a video
       you're watching would jump back to the start each letter you type). so the new version is laid in around the
       players already there, which never move. */
    function patch(box, html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        var olds = Array.prototype.filter.call(box.childNodes, function (n) { return n.nodeType === 1 && n.matches('figure.embed[data-url]'); });
        var cursor = box.firstChild;
        Array.prototype.slice.call(tmp.childNodes).forEach(function (n) {
            var same = n.nodeType === 1 && n.matches('figure.embed[data-url]') ? olds.filter(function (o) { return o.getAttribute('data-url') === n.getAttribute('data-url'); })[0] : null;
            if (same) {
                olds.splice(olds.indexOf(same), 1);
                while (cursor && cursor !== same) { var next = cursor.nextSibling; box.removeChild(cursor); cursor = next; }
                if (cursor === same) { cursor = same.nextSibling; return; }
            }
            box.insertBefore(n, cursor);
        });
        while (cursor) { var nx = cursor.nextSibling; box.removeChild(cursor); cursor = nx; }
        dress(box);
    }

    /* ---------------- a picture of your own, alone on its line: taped on, each at its own angle ----------------
       the tilt, a little sideways shift and each strip of tape's angle and place come from the picture's own name, so a
       letter looks the same every time it's opened, and no two pictures sit quite alike. (its look: sky/css/embeds.css) */
    function taped(img, src) {
        var h = 2166136261;
        for (var i = 0; i < src.length; i++) { h ^= src.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
        function next() { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; }
        next();
        var side = next() < 0.5 ? -1 : 1;
        var vars = '--tilt: ' + (side * (1.1 + next() * 2.6)).toFixed(2) + 'deg; ' +              // (never quite straight: 1.1° to 3.7° either way)
                   '--nudge: ' + ((next() - 0.5) * 8).toFixed(1) + '%; ' +                         // (a little off centre)
                   '--tape-l: ' + (-3 - next() * 11).toFixed(1) + 'deg; --tape-lx: ' + (2 + next() * 18).toFixed(0) + 'px; ' +
                   '--tape-r: ' + (3 + next() * 11).toFixed(1) + 'deg; --tape-rx: ' + (2 + next() * 18).toFixed(0) + 'px; ' +
                   '--tape-w: ' + (48 + next() * 26).toFixed(0) + 'px';
        return '<figure class="taped" style="' + vars + '">' + img + '</figure>';
    }

    /* ---------------- a page written by hand (sky/inkpad.js): ![handwritten](…) alone on its line ----------------
       straight on the paper, the writing's own width, no tape or tilt */
    function isHand(block) { return /^!\[handwritten[^\]]*\]\([^)\s]+\)$/i.test(block); }
    function handwritten(img) { return '<figure class="handwritten">' + img + '</figure>'; }

    window.DavEmbed = { find: find, lone: lone, html: html, dress: dress, patch: patch, taped: taped, isHand: isHand, handwritten: handwritten, SITES: SITES };
})();
