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
    xhr.open('GET', 'content.json', false); // same-origin, sync — see file header
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
  };
})();
