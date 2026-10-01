/* ===========================================================
   Evy Diepenbroek — Content loading

   This site has no build step for its markup/CSS/JS (deliberately —
   see chrome.js), but its TEXT and PHOTOS now live in Sanity instead
   of hardcoded in content.js, so there needs to be a way to get that
   data into the page before content.js's render functions run —
   synchronously, so script.js's own DOMContentLoaded-gated inits
   (award toggles, reveal-in, word/badge cyclers) still see fully
   rendered markup, exactly like when content.js used a hardcoded
   object.

   A cross-origin *synchronous* XHR straight to Sanity can't do that
   — browsers disallow synchronous cross-origin requests outright,
   regardless of CORS config. So content.json (same origin, sync XHR
   fully supported) is generated ahead of time by
   scripts/build-content.mjs from the actual Sanity content, and this
   file just reads that local file synchronously. Run
   `npm run build-content` after editing content in the Studio, then
   redeploy, to pick up the changes.
   =========================================================== */
window.EOD_SANITY = (function () {
  var cache = null;

  function load() {
    if (cache) return cache;
    var xhr = new XMLHttpRequest();
    // GitHub Pages' CDN caches content.json for 10 minutes (Cache-
    // Control: max-age=600, no way to override that on GH Pages) — a
    // plain "content.json" URL can keep serving what was live BEFORE
    // an edit for up to 10 minutes after it, both at the CDN and in
    // the visitor's own browser cache (Evy: "Ik zie het niet staan"
    // right after publishing in Sanity). Busting the URL with a
    // coarse (2-minute) time bucket forces a fresh fetch periodically
    // without defeating caching entirely on every single page load.
    var cacheBust = Math.floor(Date.now() / 120000);
    xhr.open('GET', 'content.json?t=' + cacheBust, false); // same-origin, sync — see file header
    xhr.send(null);
    if (xhr.status < 200 || xhr.status >= 300) {
      throw new Error('Failed to load content.json (' + xhr.status + ')');
    }
    cache = JSON.parse(xhr.responseText);
    return cache;
  }

  return {
    getSiteSettings: function () {
      return load().settings || {};
    },
    getProjects: function () {
      return load().projects || [];
    },
    getProducts: function () {
      return load().products || [];
    },
    getPages: function () {
      return load().pages || {};
    },
    getNav: function () {
      return load().nav || [];
    },
  };
})();
