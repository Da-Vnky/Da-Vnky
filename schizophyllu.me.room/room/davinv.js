// DaV-nky — the visitor's hotbar, in here too. written by Claude for DaV-nky, not part of the room itself.
// the room isn't one of DaV-nky's pages, so it doesn't load DaV-nky's engine (sky/sky.js). this sets up the few
// things DaV-nky's hotbar needs (../sky/inventory.js, and ../sky/loot.js for the pictures of the things found on
// DaV-nky), then loads them: the same bag the visitor carries on the other side of the street (it's kept for the
// visit: sessionStorage "inventory"). room.js waits for window.davInventory (a promise) before using it.
// the pill bottle from the bathroom cabinet is a thing you carry too ("pills").
(function () {
  if (new URLSearchParams(location.search).has('peek')) { window.davInventory = Promise.resolve(null); return; }
  var ROOT = new URL('../', location.href).href;
  var lists = {};
  function list(folder) {
    if (!lists[folder]) lists[folder] = fetch(ROOT + folder + 'list.txt', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) { return /<html/i.test(t) ? [] : t.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(function (s) { return s && s.charAt(0) !== '#'; }); })
      .catch(function () { return []; });
    return lists[folder];
  }
  // a slot: DaV-nky's picture for it, if there is one (its folder's list.txt says)
  function findAsset(slot, cb) {
    var names = String(slot).split('|');
    (function next(i) {
      if (i >= names.length) { cb(null); return; }
      var m = /^(.*\/)([^\/]+?)(\.[a-z0-9]+)?$/i.exec(names[i]);
      if (!m) { next(i + 1); return; }
      list(m[1]).then(function (files) {
        var hit = m[3] ? (files.indexOf(m[2] + m[3]) !== -1 ? m[2] + m[3] : null)
          : ['svg', 'gif', 'webp', 'png', 'jpg', 'jpeg'].map(function (e) { return m[2] + '.' + e; }).filter(function (f) { return files.indexOf(f) !== -1; })[0];
        if (hit) cb(ROOT + m[1] + hit); else next(i + 1);
      });
    })(0);
  }
  function fillAssets(scope) {
    (scope || document).querySelectorAll('[data-asset]').forEach(function (el) {
      if (el.dataset.assetDone) return;
      el.dataset.assetDone = '1';
      findAsset(el.dataset.asset, function (u) {
        if (!u) return;
        var ph = el.querySelector('.placeholder'), img = new Image();
        img.src = u; img.alt = ''; img.className = 'art';
        if (ph) ph.replaceWith(img); else el.appendChild(img);
      });
    });
  }
  window.Sky = window.Sky || {};
  var Sky = window.Sky;
  Sky.css = Sky.css || function (t) { var s = document.createElement('style'); s.textContent = t; document.head.appendChild(s); };
  Sky.findAsset = Sky.findAsset || findAsset;
  Sky.fillAssets = Sky.fillAssets || fillAssets;
  Sky.listFolder = Sky.listFolder || function (folder, exts, cb) { list(folder).then(function (f) { cb(f.map(function (n) { return { name: n, url: ROOT + folder + n }; })); }); };

  function load(src) {
    return new Promise(function (ok) {
      var s = document.createElement('script');
      s.src = ROOT + src;
      s.onload = s.onerror = function () { ok(); };
      document.head.appendChild(s);
    });
  }
  // their looks are CSS files now (sky/css/): linked first, where the scripts used to add them
  function sheet(href) {
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = ROOT + href;
    document.head.appendChild(l);
  }
  sheet('sky/css/inventory.css'); sheet('sky/css/loot.css'); sheet('sky/css/skizy-inventory.css');
  window.davInventory = load('sky/inventory.js').then(function () { return load('sky/loot.js'); }).then(function () {
    // (the pill bottle is sky/inventory.js's own; in here its hint says to give it to her. the bag's look in the room:
    // sky/css/skizy-inventory.css)
    return Sky.inventory || null;
  });
})();
