/* ===========================================================
   Evy Diepenbroek — Shared nav + footer, ONE source of truth

   Every page was previously carrying its OWN copy-pasted nav/footer
   markup — identical by hand-maintained discipline, not by
   construction, which is exactly the kind of thing that quietly
   drifts (Evy, twice: "de footer... moet echt overal hetzelfde
   zijn... maak hier een comp van of iets"). This file is that
   component: the nav and footer HTML exist ONCE, here, and every
   page injects them via a single inline <script> at the exact spot
   the static markup used to sit.

   Injection, not a templating build step (this site still has none,
   deliberately) — each page has:
     <script>document.currentScript.insertAdjacentHTML("beforebegin", EOD_CHROME.nav("about"));</script>
   right where <div class="underlay-nav"> used to be, and the same
   pattern with EOD_CHROME.footer() where <div class="eod-footer-wrap">
   used to be. document.currentScript.insertAdjacentHTML runs
   SYNCHRONOUSLY during initial HTML parsing — the injected markup is
   fully in the DOM before the browser even reaches test-navigation.js/
   script.js at the bottom of the page, so nothing about their own
   init timing changes. This file itself must load in <head>, before
   body content, so EOD_CHROME already exists when those inline
   scripts run.

   currentPage passed to nav() is one of "home" | "projects" | "about"
   | "contact" | null — whichever matches gets the w--current class;
   pass null (or nothing) for a page with no corresponding nav item
   (there currently isn't one, but this keeps it from silently
   mismarking something if that ever changes).
   =========================================================== */

/* ===========================================================
   Google Analytics (GA4) — production only.

   Evy got her own Measurement ID from a fresh GA4 property (not the
   old one from her previous site) specifically so evydiepenbroek.nl
   has clean numbers of its own. Loaded dynamically here rather than
   the static <script> tag Google's own setup page gives you, pasted
   into every page's <head> — this file is the ONE thing already
   shared verbatim between staging and production (chrome.js loads in
   <head>, before anything else), so gating it by hostname here means
   the exact same file ships to both domains, GA only ever actually
   loads/fires on the real domain, and it automatically survives the
   next "sync staging to production" copy instead of needing to be
   hand-reapplied to the production repo every time (same reasoning as
   STORE_COMING_SOON below). Staging/localhost never even requests
   gtag.js, let alone sends it a hit.
   =========================================================== */
(function () {
  var IS_PRODUCTION =
    typeof location !== "undefined" &&
    /(^|\.)evydiepenbroek\.nl$/.test(location.hostname);
  if (!IS_PRODUCTION) return;

  var GA_MEASUREMENT_ID = "G-GFGR2QJJ6X";
  var OPT_OUT_KEY = "eod-ga-opt-out";

  // Evy: "can you make sure that my computer doesnt count" — a GA4
  // "internal traffic" IP filter was the other option, but that
  // breaks the moment she's on a different network (phone hotspot,
  // another wifi), and has to be reconfigured in the GA4 UI itself,
  // which I can't do for her anyway. A one-time, per-browser opt-out
  // instead: visiting evydiepenbroek.nl/?no-track=1 once sets a
  // localStorage flag that permanently skips loading gtag.js on that
  // browser/device from then on (?no-track=0 reverses it, e.g. to
  // test tracking herself later). google's own documented
  // window["ga-disable-<ID>"] flag is set either way, belt-and-braces
  // in case something upstream still references the measurement ID
  // directly.
  try {
    var params = new URLSearchParams(location.search);
    if (params.has("no-track")) {
      if (params.get("no-track") === "0") localStorage.removeItem(OPT_OUT_KEY);
      else localStorage.setItem(OPT_OUT_KEY, "1");
    }
  } catch (err) {}

  var optedOut = false;
  try { optedOut = localStorage.getItem(OPT_OUT_KEY) === "1"; } catch (err) {}
  window["ga-disable-" + GA_MEASUREMENT_ID] = optedOut;
  if (optedOut) return;

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID);
})();

window.EOD_CHROME = (function () {
  var LOGO_SVG =
    '<svg class="underlay-nav__logo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1228 244" fill="none">' +
      '<path d="M0 189V14H123.5V40H30.25V86H114.25V111.5H30.25V163H125.75V189H0Z" fill="currentColor"/>' +
      '<path d="M182.92 189L129.17 56.5H160.42L197.67 158.5L234.92 56.5H266.17L212.42 189H182.92Z" fill="currentColor"/>' +
      '<path d="M282.469 241.5V218H302.969C313.469 218 316.969 214.5 319.969 206.25L323.719 195.75L267.969 56.5H299.719L338.219 162.75L374.719 56.5H406.719L345.719 215C338.219 234.25 329.469 241.5 307.219 241.5H282.469Z" fill="currentColor"/>' +
      '<path d="M472.432 189V14H540.432C589.682 14 623.182 48.75 623.182 100.5C623.182 153.25 589.682 189 540.432 189H472.432ZM538.182 163.25C571.432 163.25 591.932 139.5 591.932 100.5C591.932 62.75 571.432 39.75 538.182 39.75H502.932V163.25H538.182Z" fill="currentColor"/>' +
      '<path d="M704.863 192.25C663.863 192.25 637.363 164 637.363 123.25C637.363 79 666.613 53 702.363 53C742.613 53 766.363 81.75 765.363 127.75H665.863C667.363 152.25 681.863 169 705.113 169C722.363 169 733.363 161 738.113 146.5H764.863C758.613 174.25 735.113 192.25 704.863 192.25ZM667.363 107.25H736.613C732.863 87.25 721.363 76 702.613 76C684.863 76 671.363 88 667.363 107.25Z" fill="currentColor"/>' +
      '<path d="M837.383 192.25C800.133 192.25 778.883 177 776.633 149.25H804.383C806.383 162.25 817.383 169.5 836.383 169.5C853.133 169.5 862.883 163 862.883 151C862.883 144.25 858.383 139.5 848.383 137.5L813.383 130.25C792.133 126 779.633 114.25 779.633 95C779.633 71.25 799.633 53 830.633 53C860.633 53 881.133 69 884.383 95.75H857.633C855.633 83.75 844.633 75.75 830.633 75.75C815.633 75.75 806.883 82.75 806.883 92.5C806.883 100.25 812.133 104.5 823.133 106.75L857.633 113.75C879.883 118.25 890.133 130.25 890.133 149.25C890.133 175 868.883 192.25 837.383 192.25Z" fill="currentColor"/>' +
      '<path d="M906.557 189V56.5H936.057V189H906.557ZM921.557 39.75C910.307 39.75 901.557 30.75 901.557 19.75C901.557 8.5 910.307 0 921.557 0C932.557 0 941.057 8.5 941.057 19.75C941.057 30.75 932.557 39.75 921.557 39.75Z" fill="currentColor"/>' +
      '<path d="M1019.9 243.5C982.9 243.5 960.15 226 957.4 198.25H985.65C987.4 211 999.9 220.75 1019.65 220.75C1043.65 220.75 1055.9 206.5 1055.9 186.75V166.5C1046.4 179.75 1031.65 187.25 1012.4 187.25C977.65 187.25 953.15 160 953.15 120.75C953.15 80.75 977.65 53 1012.4 53C1031.9 53 1047.65 61.5 1056.65 75.75L1059.15 56.5H1085.15V184.25C1085.15 220.25 1061.4 243.5 1019.9 243.5ZM1018.9 163C1040.4 163 1055.4 145.5 1055.4 120C1055.4 94.75 1040.4 77.25 1018.9 77.25C997.65 77.25 982.9 94.75 982.9 120.5C982.9 145.75 997.65 163 1018.9 163Z" fill="currentColor"/>' +
      '<path d="M1109.2 189V56.5H1135.2L1137.45 77C1146.95 61.75 1162.7 53 1181.45 53C1209.45 53 1227.7 71.5 1227.7 100.25V189H1198.45V105.75C1198.45 88 1189.2 77.75 1171.7 77.75C1151.95 77.75 1138.45 92.25 1138.45 115V189H1109.2Z" fill="currentColor"/>' +
    "</svg>";

  var DEFAULT_NAV_LINKS = [
    { href: "index.html", label: "Home" },
    { href: "projects.html", label: "Projects" },
    { href: "store.html", label: "Store" },
    { href: "about.html", label: "About" },
    { href: "contact.html", label: "Contact" },
  ];

  // Menu order/labels come from Sanity (Site Settings > Navigation —
  // Evy: "een navigation tab. Waar je de volgorde van de pages kan
  // veranderen"), via the same content.json content.js reads. chrome.js
  // runs in <head> before any of that is loaded, so this is its own
  // same-origin sync XHR (cached by the browser for the later read);
  // if it fails or the list is empty the hardcoded order above is used.
  var PAGE_LABELS = { "index.html": "Home", "projects.html": "Projects", "store.html": "Store", "about.html": "About", "contact.html": "Contact" };
  var NAV_LINKS = (function () {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "content.json?t=" + Math.floor(Date.now() / 120000), false); // same cache-bust as sanity-client.js
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        var nav = (JSON.parse(xhr.responseText).nav || []).filter(function (n) { return n && PAGE_LABELS[n.page]; });
        if (nav.length) {
          return nav.map(function (n) { return { href: n.page, label: n.label || PAGE_LABELS[n.page] }; });
        }
      }
    } catch (err) {}
    return DEFAULT_NAV_LINKS;
  })();

  // Production only, not staging (Evy: "kan je hierna evydiepenbroek.nl
  // updaten en de projecten ook toevoegen, dus nog niet de store") —
  // checked by hostname rather than a hardcoded flag so this can't
  // accidentally get reverted the next time staging's chrome.js is
  // copied over to production wholesale; the same file behaves
  // correctly on both domains without needing to remember to flip
  // anything back. Projects itself used this same gate until now
  // (production had its own "Coming soon" badge while the Sanity
  // project pages were still being built) — that's lifted, Store
  // takes its place as the one section still held back on production.
  var STORE_COMING_SOON =
    typeof location !== "undefined" &&
    /(^|\.)evydiepenbroek\.nl$/.test(location.hostname);

  // No currentPage param, and no w--current here: test-navigation.js's
  // own highlightCurrentPage() already sets that dynamically from
  // window.location.pathname on every page load (it runs right after
  // this markup lands in the DOM), so hardcoding it per-page here
  // would just be a second, redundant source of truth for the exact
  // same thing.
  function nav() {
    var links = NAV_LINKS.map(function (link) {
      if (STORE_COMING_SOON && link.href === "store.html") {
        return (
          '<li data-reveal-l><span class="underlay-nav__link-large is--soon" aria-disabled="true"><span class="underlay-nav__link-label">' +
            link.label +
          '</span><span class="underlay-nav__soon-badge">Coming soon</span></span></li>'
        );
      }
      return (
        '<li data-reveal-l><a href="' + link.href + '" class="underlay-nav__link-large"><span class="underlay-nav__link-label">' + link.label + "</span></a></li>"
      );
    }).join("");

    return (
      '<div class="underlay-nav">' +
        '<header class="underlay-nav__header">' +
          '<div class="underlay-nav__bar">' +
            '<div class="underlay-nav__container">' +
              '<a href="index.html" class="underlay-nav__logo">' + LOGO_SVG + "</a>" +
              // Grouped with the menu toggle so .underlay-nav__container's
              // justify-content: space-between still only sees TWO
              // items (logo / this group) — a bare 3rd flex child here
              // would space itself out into the middle of the bar
              // instead of sitting next to Menu.
              '<div class="underlay-nav__actions">' +
                // Hidden until cart.js's own render() sees at least
                // one item in the cart (Evy: "only if you add
                // something to your cart there will be a card icont
                // at the right whit a one" — no permanent icon
                // sitting there empty). [hidden] here is just the
                // initial/no-JS state; cart.js checks the real cart
                // on every page load, not just the moment something
                // gets added.
                '<button data-eod-cart-toggle aria-label="Open cart" class="eod-cart__toggle" hidden>' +
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="6.5 2.5 19 24.5" fill="none" aria-hidden="true"><path d="M8 10H24L22.5 26H9.5L8 10Z" stroke-width="2" stroke-linejoin="round"/><path d="M12 10V8C12 5.79086 13.7909 4 16 4C18.2091 4 20 5.79086 20 8V10" stroke-width="2"/></svg>' +
                  '<span class="eod-cart__count" data-eod-cart-count>0</span>' +
                "</button>" +
                '<button data-underlay-nav-toggle aria-expanded="false" aria-label="open menu" class="underlay-nav__toggle">' +
                  '<span class="underlay-nav__toggle-text">' +
                    '<span class="underlay-nav__toggle-label">Menu</span>' +
                    '<span class="underlay-nav__toggle-label">Close</span>' +
                  "</span>" +
                  '<span class="underlay-nav__toggle-icon">' +
                    '<span class="underlay-nav__toggle-bar"></span>' +
                    '<span class="underlay-nav__toggle-bar"></span>' +
                  "</span>" +
                "</button>" +
              "</div>" +
            "</div>" +
          "</div>" +
        "</header>" +
        '<nav data-underlay-nav-menu class="underlay-nav__menu">' +
          '<div class="underlay-nav__inner">' +
            '<ul class="underlay-nav__list">' + links + "</ul>" +
            '<div class="underlay-nav__bottom">' +
              '<div class="underlay-nav__bottom-col">' +
                '<div data-reveal-s><span class="underlay-nav__link-small is--faded">Socials</span></div>' +
                '<ul class="underlay-nav__list is--small">' +
                  '<li data-reveal-s><a href="#" class="underlay-nav__link-small" data-eod-text="instagramUrl-nav">Instagram</a></li>' +
                  '<li data-reveal-s><a href="#" class="underlay-nav__link-small" data-eod-text="linkedinUrl-nav">LinkedIn</a></li>' +
                "</ul>" +
              "</div>" +
            "</div>" +
          "</div>" +
        "</nav>" +
        '<div data-underlay-nav-overlay class="underlay-nav__overlay">' +
          '<div class="underlay-nav__dark"></div>' +
          '<div class="underlay-nav__borders">' +
            '<div class="underlay-nav__border-row">' +
              '<div class="underlay-nav__border"></div>' +
              '<div class="underlay-nav__corner"></div>' +
            "</div>" +
            '<div class="underlay-nav__border-row">' +
              '<div class="underlay-nav__corner is--bottom"></div>' +
              '<div class="underlay-nav__border"></div>' +
            "</div>" +
          "</div>" +
        "</div>" +
        // Cart side panel — a floating card inset from every edge
        // (Evy: "de layout graag willen zoals hier:
        // osmo-product-hotspot-modal.webflow.io... met een padding
        // tussen alle kanten"), no longer flush to the screen edge,
        // so the nav menu's own border/corner accent frame (which
        // only makes sense for a flush edge reveal) is gone — just a
        // plain dark backdrop behind it now. Still opens with the
        // nav's own "energy" GSAP ease (cart.js), just retargeted to
        // this card's geometry. Checkout is a plain primary button
        // now, not the circle-icon-swap .eod-btn--dark treatment
        // (Evy: "deze gewoon een primary button mag zijn"). Markup/
        // content itself (items, total) is filled in by cart.js, not
        // here.
        '<div data-eod-cart-panel class="eod-cart__panel" aria-hidden="true">' +
          '<div class="eod-cart__panel-inner">' +
            '<div class="eod-cart__panel-header">' +
              '<span class="eod-cart__panel-title">Cart</span>' +
              '<button data-eod-cart-close aria-label="Close cart" class="eod-cart__close">' +
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M8 8L24 24M24 8L8 24" stroke-width="2" stroke-linecap="round"/></svg>' +
              "</button>" +
            "</div>" +
            '<ul data-eod-cart-items class="eod-cart__items"></ul>' +
            '<p data-eod-cart-empty class="eod-cart__empty" hidden>Your cart is empty.</p>' +
            '<div class="eod-cart__footer">' +
              '<div class="eod-cart__total">' +
                '<span>Total</span>' +
                '<span data-eod-cart-total>€0</span>' +
              "</div>" +
              '<a data-eod-cart-checkout href="#" class="eod-cart__checkout">Check out</a>' +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div data-eod-cart-overlay class="eod-cart__overlay"></div>' +
      "</div>"
    );
  }

  function footer() {
    // data-eod-reveal-repeat (script.js) — Evy: "de footer blijft
    // animeren elke keer als je na een tijdje weer naar beneden
    // gaat": unlike every other [data-eod-reveal]/
    // [data-eod-letters-reveal] on the site (which reveal once and
    // stay revealed), the footer's own columns + wordmark replay
    // every time they scroll back into view.
    return (
      '<div class="eod-footer-wrap" data-eod-footer-parallax data-eod-block="footer">' +
        '<footer class="eod-footer" data-eod-footer-parallax-inner>' +
          '<div class="eod-footer__top">' +
            '<div class="eod-footer__col" data-eod-reveal data-eod-reveal-repeat>' +
              '<span class="eod-footer__label">CONTACT</span>' +
              '<a href="mailto:Evy@Diepenbroek.com" class="eod-footer__link eod-hidden" data-eod-text="email">Evy@Diepenbroek.com</a>' +
            "</div>" +
            '<div class="eod-footer__col eod-footer__col--right" data-eod-reveal data-eod-reveal-delay="1" data-eod-reveal-repeat>' +
              '<span class="eod-footer__label">SOCIAL</span>' +
              '<a href="#" class="eod-footer__link" data-eod-text="instagramUrl-nav">Instagram</a>' +
              '<a href="#" class="eod-footer__link" data-eod-text="linkedinUrl-nav">LinkedIn</a>' +
            "</div>" +
          "</div>" +
          '<svg class="eod-footer__logo" data-eod-letters-reveal data-eod-reveal-repeat xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 1228 244">' +
            '<path style="--i:0" d="M0 189V14H123.5V40H30.25V86H114.25V111.5H30.25V163H125.75V189H0Z" fill="currentColor"/>' +
            '<path style="--i:1" d="M182.92 189L129.17 56.5H160.42L197.67 158.5L234.92 56.5H266.17L212.42 189H182.92Z" fill="currentColor"/>' +
            '<path style="--i:2" d="M282.469 241.5V218H302.969C313.469 218 316.969 214.5 319.969 206.25L323.719 195.75L267.969 56.5H299.719L338.219 162.75L374.719 56.5H406.719L345.719 215C338.219 234.25 329.469 241.5 307.219 241.5H282.469Z" fill="currentColor"/>' +
            '<path style="--i:3" d="M472.432 189V14H540.432C589.682 14 623.182 48.75 623.182 100.5C623.182 153.25 589.682 189 540.432 189H472.432ZM538.182 163.25C571.432 163.25 591.932 139.5 591.932 100.5C591.932 62.75 571.432 39.75 538.182 39.75H502.932V163.25H538.182Z" fill="currentColor"/>' +
            '<path style="--i:4" d="M704.863 192.25C663.863 192.25 637.363 164 637.363 123.25C637.363 79 666.613 53 702.363 53C742.613 53 766.363 81.75 765.363 127.75H665.863C667.363 152.25 681.863 169 705.113 169C722.363 169 733.363 161 738.113 146.5H764.863C758.613 174.25 735.113 192.25 704.863 192.25ZM667.363 107.25H736.613C732.863 87.25 721.363 76 702.613 76C684.863 76 671.363 88 667.363 107.25Z" fill="currentColor"/>' +
            '<path style="--i:5" d="M837.383 192.25C800.133 192.25 778.883 177 776.633 149.25H804.383C806.383 162.25 817.383 169.5 836.383 169.5C853.133 169.5 862.883 163 862.883 151C862.883 144.25 858.383 139.5 848.383 137.5L813.383 130.25C792.133 126 779.633 114.25 779.633 95C779.633 71.25 799.633 53 830.633 53C860.633 53 881.133 69 884.383 95.75H857.633C855.633 83.75 844.633 75.75 830.633 75.75C815.633 75.75 806.883 82.75 806.883 92.5C806.883 100.25 812.133 104.5 823.133 106.75L857.633 113.75C879.883 118.25 890.133 130.25 890.133 149.25C890.133 175 868.883 192.25 837.383 192.25Z" fill="currentColor"/>' +
            '<path style="--i:6" d="M906.557 189V56.5H936.057V189H906.557ZM921.557 39.75C910.307 39.75 901.557 30.75 901.557 19.75C901.557 8.5 910.307 0 921.557 0C932.557 0 941.057 8.5 941.057 19.75C941.057 30.75 932.557 39.75 921.557 39.75Z" fill="currentColor"/>' +
            '<path style="--i:7" d="M1019.9 243.5C982.9 243.5 960.15 226 957.4 198.25H985.65C987.4 211 999.9 220.75 1019.65 220.75C1043.65 220.75 1055.9 206.5 1055.9 186.75V166.5C1046.4 179.75 1031.65 187.25 1012.4 187.25C977.65 187.25 953.15 160 953.15 120.75C953.15 80.75 977.65 53 1012.4 53C1031.9 53 1047.65 61.5 1056.65 75.75L1059.15 56.5H1085.15V184.25C1085.15 220.25 1061.4 243.5 1019.9 243.5ZM1018.9 163C1040.4 163 1055.4 145.5 1055.4 120C1055.4 94.75 1040.4 77.25 1018.9 77.25C997.65 77.25 982.9 94.75 982.9 120.5C982.9 145.75 997.65 163 1018.9 163Z" fill="currentColor"/>' +
            '<path style="--i:8" d="M1109.2 189V56.5H1135.2L1137.45 77C1146.95 61.75 1162.7 53 1181.45 53C1209.45 53 1227.7 71.5 1227.7 100.25V189H1198.45V105.75C1198.45 88 1189.2 77.75 1171.7 77.75C1151.95 77.75 1138.45 92.25 1138.45 115V189H1109.2Z" fill="currentColor"/>' +
          "</svg>" +
        "</footer>" +
        '<div class="eod-footer-wrap__dark" data-eod-footer-parallax-dark aria-hidden="true"></div>' +
      "</div>"
    );
  }

  return { nav: nav, footer: footer };
})();
