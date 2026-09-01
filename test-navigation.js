(function () {
  function init() {
    var navEl = document.querySelector('.underlay-nav');
    if (!navEl) return;

    var mainEl = null;
    var bodyChildren = document.body.children;
    for (var i = 0; i < bodyChildren.length; i++) {
      var child = bodyChildren[i];
      if (child !== navEl &&
        child.tagName !== 'SCRIPT' &&
        child.tagName !== 'STYLE' &&
        child.tagName !== 'LINK' &&
        !child.classList.contains('underlay-nav')) {
        mainEl = child;
        break;
      }
    }

    if (!mainEl) return;

    mainEl.setAttribute('data-main', '');
    mainEl.style.position = 'relative';
    mainEl.style.zIndex = '2';
    mainEl.style.backgroundColor = 'inherit';

    document.body.insertBefore(navEl, document.body.firstChild);
    navEl.style.display = '';

    highlightCurrentPage();
    initBackgroundDetection();
    initFixedUnderlayNavigation(mainEl);
    initAutoHideNav();
  }

  // Well-known pattern (Evy: "als je naar onder scrolt dat het logo
  // naar boven verdwijnt... dit is best een bekende interactie
  // animation") — hide the fixed header on scroll DOWN, bring it
  // back on scroll UP, site-wide (every page loads this file). Own
  // rAF-throttled scroll listener, same pattern as
  // initBackgroundDetection's above, rather than piggybacking on that
  // one — the two are unrelated concerns (colour sampling vs a scroll
  // direction compare) and each is already cheap enough alone.
  function initAutoHideNav() {
    var header = document.querySelector('.underlay-nav__header');
    if (!header) return;

    // Sub-pixel/momentum-scroll noise on mobile fires many tiny scroll
    // events in one gesture — without a minimum delta the header would
    // flicker on every one of them instead of reading as one clean
    // hide/reveal per real scroll gesture.
    var DELTA_THRESHOLD = 8;
    // Never hidden this close to the top — hiding it on the very
    // first nudge down the page, before you've gone anywhere, would
    // just read as the header randomly vanishing.
    var TOP_REVEAL_PX = 80;

    var lastY = window.scrollY;
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY;
      var delta = y - lastY;

      // Also covers the slide-out menu's own open animation, which
      // moves <main> (not the page) via transform and doesn't change
      // window.scrollY — but skipping while it's open means the
      // header can't slide away out from under someone navigating it.
      if (document.body.getAttribute('data-menu-status') === 'open') {
        lastY = y;
        return;
      }

      if (y <= TOP_REVEAL_PX) {
        header.classList.remove('is--nav-hidden');
      } else if (delta > DELTA_THRESHOLD) {
        header.classList.add('is--nav-hidden');
      } else if (delta < -DELTA_THRESHOLD) {
        header.classList.remove('is--nav-hidden');
      }
      lastY = y;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
  }

  function highlightCurrentPage() {
    // Compare filenames, not full paths — links are page-relative
    // (e.g. "about.html") so they work regardless of whether the site
    // sits at a domain root or a GitHub Pages project subpath; the
    // pathname's last segment is what actually identifies the page.
    var pathname = window.location.pathname;
    var currentFile = pathname.substring(pathname.lastIndexOf('/') + 1) || 'index.html';
    var links = document.querySelectorAll('.underlay-nav__link-large');
    links.forEach(function (link) {
      var hrefAttr = link.getAttribute('href');
      if (!hrefAttr) return; // disabled/"coming soon" items (e.g. Projects) aren't real links
      var linkFile = hrefAttr.substring(hrefAttr.lastIndexOf('/') + 1) || 'index.html';
      link.classList.remove('w--current');
      if (linkFile === currentFile) {
        link.classList.add('w--current');
      }
    });
  }

  function initBackgroundDetection() {
    var header = document.querySelector('.underlay-nav__header');
    if (!header) return;

    function checkBackground() {
      var logoEl = document.querySelector('.underlay-nav__logo');
      var toggleEl = document.querySelector('.underlay-nav__toggle');
      if (!logoEl || !toggleEl) return;

      var points = [
        logoEl.getBoundingClientRect(),
        toggleEl.getBoundingClientRect()
      ];

      // Weighted majority across BOTH sample points, not "any single
      // light patch wins" — the logo and toggle sit over different
      // parts of a busy hero photo (e.g. the blockchain project's
      // thumbnail-grid mockup), so one of them alone can land on a
      // light patch even while the header as a whole clearly reads
      // as dark. Media samples contribute their full per-pixel vote
      // (more signal, since they're grids); a plain background-color
      // match contributes one vote at full confidence.
      var lightWeight = 0;
      var totalWeight = 0;
      for (var i = 0; i < points.length; i++) {
        var rect = points[i];
        var x = rect.left + rect.width / 2;
        var y = rect.top + rect.height / 2;

        header.style.pointerEvents = 'none';
        header.style.visibility = 'hidden';
        var el = document.elementFromPoint(x, y);
        header.style.visibility = '';
        header.style.pointerEvents = '';

        if (el) {
          var mediaEl = findMediaElement(el);
          var mediaStats = mediaEl ? sampleLightStats(mediaEl, rect) : null;
          if (mediaStats) {
            lightWeight += mediaStats.lightCount;
            totalWeight += mediaStats.total;
          } else {
            var bg = getEffectiveBackground(el);
            if (bg) {
              lightWeight += isLightColor(bg) ? 1 : 0;
              totalWeight += 1;
            }
          }
        }
      }

      var isDark = totalWeight > 0 && lightWeight / totalWeight > 0.5;

      if (isDark) {
        header.classList.add('is--dark');
      } else {
        header.classList.remove('is--dark');
      }
    }

    function getEffectiveBackground(el) {
      var current = el;
      while (current && current !== document.documentElement) {
        var bg = getComputedStyle(current).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          return bg;
        }
        current = current.parentElement;
      }
      return null;
    }

    // A CSS background-color is invisible to photos/videos — a dark
    // hero photo sitting on a section with a plain white
    // background-color (e.g. .eod-project__hero) reads as "light" to
    // getEffectiveBackground even though the pixels under the nav are
    // actually dark. So: if the sampled point lands on (or inside) an
    // <img>/<video>, read the real pixel color straight off its
    // decoded frame instead of trusting an ancestor's declared
    // background-color.
    function findMediaElement(el) {
      var current = el;
      var depth = 0;
      while (current && depth < 3) {
        if (current.tagName === 'IMG' || current.tagName === 'VIDEO') return current;
        current = current.parentElement;
        depth++;
      }
      return null;
    }

    // A single pixel is too easy to get unlucky on — the blockchain
    // hero photo, for instance, is mostly black but has light
    // magazine-page thumbnails scattered across it, so one exact
    // sample point can land on a light thumbnail edge and read the
    // whole thing as "light". Counting light vs dark across the
    // element's full box instead reflects the overall tone a reader
    // perceives there, instead of one lucky/unlucky pixel.
    //
    // Drawn 1:1 (no drawImage scaling) — letting drawImage itself
    // downscale straight to a small canvas turned out to be
    // non-deterministic here: the exact same region, sampled
    // repeatedly with nothing on the page changing, returned a
    // different light/dark split on every call (seen swinging from
    // 0% to 65% light for the same patch), presumably GPU-dependent
    // minification behaviour. Copying the region byte-for-byte and
    // then doing our own strided read in JS below is slower per call
    // but actually deterministic.
    var pixelSampleCanvas = null;
    // Nav elements (logo, menu toggle) are small — this cap only
    // guards the pathological case of a huge rect, it never fires
    // for the actual nav hit areas, so drawImage stays a plain 1:1
    // copy in practice (no minification, no non-determinism).
    var MAX_COPY_AREA = 200000;
    var TARGET_SAMPLES = 400;
    function sampleLightStats(el, targetRect) {
      try {
        var isVideo = el.tagName === 'VIDEO';
        var naturalW = isVideo ? el.videoWidth : el.naturalWidth;
        var naturalH = isVideo ? el.videoHeight : el.naturalHeight;
        if (!naturalW || !naturalH) return null;
        if (isVideo && el.readyState < 2) return null;

        var rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;

        var fx0 = (targetRect.left - rect.left) / rect.width;
        var fy0 = (targetRect.top - rect.top) / rect.height;
        var fx1 = (targetRect.right - rect.left) / rect.width;
        var fy1 = (targetRect.bottom - rect.top) / rect.height;
        fx0 = Math.min(1, Math.max(0, fx0));
        fy0 = Math.min(1, Math.max(0, fy0));
        fx1 = Math.min(1, Math.max(0, fx1));
        fy1 = Math.min(1, Math.max(0, fy1));
        if (fx1 <= fx0 || fy1 <= fy0) return null;

        // object-fit: cover mapping (the only object-fit this site's
        // hero/gallery media uses) from box-space back to the
        // decoded frame's own pixel coordinates.
        var elementRatio = rect.width / rect.height;
        var naturalRatio = naturalW / naturalH;
        var coverW, coverH, coverX, coverY;
        if (naturalRatio > elementRatio) {
          coverH = naturalH;
          coverW = naturalH * elementRatio;
          coverX = (naturalW - coverW) / 2;
          coverY = 0;
        } else {
          coverW = naturalW;
          coverH = naturalW / elementRatio;
          coverX = 0;
          coverY = (naturalH - coverH) / 2;
        }

        var srcX = coverX + fx0 * coverW;
        var srcY = coverY + fy0 * coverH;
        var srcW = (fx1 - fx0) * coverW;
        var srcH = (fy1 - fy0) * coverH;

        // Copy at 1:1 scale — only shrinks if the region's area
        // exceeds MAX_COPY_AREA, which the actual nav hit areas never
        // do (keeps getImageData bounded in the pathological case
        // without asking drawImage to blend/minify in the normal one).
        var area = srcW * srcH;
        var copyScale = area > MAX_COPY_AREA ? Math.sqrt(MAX_COPY_AREA / area) : 1;
        var copyW = Math.max(1, Math.round(srcW * copyScale));
        var copyH = Math.max(1, Math.round(srcH * copyScale));

        if (!pixelSampleCanvas) pixelSampleCanvas = document.createElement('canvas');
        pixelSampleCanvas.width = copyW;
        pixelSampleCanvas.height = copyH;
        var ctx = pixelSampleCanvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, copyW, copyH);
        ctx.drawImage(el, srcX, srcY, srcW, srcH, 0, 0, copyW, copyH);
        var data = ctx.getImageData(0, 0, copyW, copyH).data;
        var pixelCount = copyW * copyH;
        var stride = Math.max(1, Math.floor(pixelCount / TARGET_SAMPLES));
        var lightCount = 0, total = 0;
        for (var p = 0; p < pixelCount; p += stride) {
          var offset = p * 4;
          var luminance = (0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]) / 255;
          if (luminance > 0.6) lightCount++;
          total++;
        }
        if (!total) return null;
        return { lightCount: lightCount, total: total };
      } catch (e) {
        // Cross-origin or not-yet-decoded — fall back to the
        // background-color walk in the caller.
        return null;
      }
    }

    function isLightColor(color) {
      var match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return false;
      var r = parseInt(match[1]);
      var g = parseInt(match[2]);
      var b = parseInt(match[3]);
      var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.6;
    }

    checkBackground();
    window.addEventListener('scroll', function () {
      requestAnimationFrame(checkBackground);
    });
    window.addEventListener('resize', function () {
      requestAnimationFrame(checkBackground);
    });
    // The very first checkBackground() call above runs at
    // DOMContentLoaded — content.js has set real src attributes on
    // hero images/videos by then (it's a blocking script that runs
    // earlier in document order), but the browser hasn't necessarily
    // finished DOWNLOADING/decoding those pixels yet. sampleLightStats
    // silently fails on a not-yet-loaded image (falls back to an
    // ancestor's plain background-color, which is often just the
    // page's own white), and nothing re-checked afterward — so the
    // nav could get stuck reading a section as "light" (logo stays
    // white per the header's own default) even once a genuinely dark
    // photo had actually finished loading right underneath it (Evy:
    // "soms staat het logo op wit terwijl de achtergrond licht is").
    // 'load'/'loadeddata' don't bubble, so this has to listen on the
    // capture phase to catch them site-wide instead of wiring a
    // listener to every individual hero image/video by hand.
    document.addEventListener('load', function (e) {
      var tag = e.target && e.target.tagName;
      if (tag === 'IMG' || tag === 'VIDEO') requestAnimationFrame(checkBackground);
    }, true);
    document.addEventListener('loadeddata', function (e) {
      requestAnimationFrame(checkBackground);
    }, true);
  }

  function initFixedUnderlayNavigation(mainEl) {
    CustomEase.create("energy", "M0,0 C0.32,0.72 0,1 1,1");

    var toggleBtn = document.querySelector("[data-underlay-nav-toggle]");
    var logoLink = document.querySelector(".underlay-nav__logo");
    var toggleLabels = document.querySelectorAll(".underlay-nav__toggle-label");
    var toggleBars = document.querySelectorAll(".underlay-nav__toggle-bar");
    var menuEl = document.querySelector("[data-underlay-nav-menu]");
    var largeItems = document.querySelectorAll("[data-reveal-l]");
    var smallItems = document.querySelectorAll("[data-reveal-s]");
    var menuBorder = document.querySelector(".underlay-nav__bottom-border");
    var overlayEl = document.querySelector("[data-underlay-nav-overlay]");
    var darkEl = document.querySelector(".underlay-nav__dark");
    var corners = document.querySelectorAll(".underlay-nav__corner");
    var overlayBorders = document.querySelectorAll(".underlay-nav__border-row");

    if (!toggleBtn || !menuEl || !mainEl || !overlayEl) return;

    var header = document.querySelector('.underlay-nav__header');
    var openColor = getComputedStyle(menuEl).color;

    function getClosedColor() {
      return header && header.classList.contains('is--dark') ? '#1a1a1a' : '#fff';
    }

    var isOpen = false;
    var tl;
    var enterEndTime = 0;

    var getMenuOffset = function () { return -menuEl.offsetWidth; };

    gsap.set(overlayEl, { visibility: "hidden", pointerEvents: "none" });
    gsap.set(darkEl, { autoAlpha: 0 });
    gsap.set(mainEl, { x: 0 });
    gsap.set(toggleLabels, { yPercent: 0 });
    gsap.set(toggleBars, { y: 0, rotation: 0 });
    gsap.set(menuBorder, { scaleX: 0 });
    gsap.set(overlayBorders[0], { yPercent: -100 });
    gsap.set(overlayBorders[1], { yPercent: 100 });
    gsap.set(corners, { scale: 0 });

    function buildTimeline() {
      tl = gsap.timeline({
        paused: true,
        defaults: {
          ease: "energy",
          easeReverse: "power2.inOut"
        }
      });

      tl.set(overlayEl, { visibility: "visible", pointerEvents: "auto" }, 0);

      tl.to([mainEl, overlayEl], {
          x: getMenuOffset,
          duration: 0.7,
        }, 0)

        .to(darkEl, {
          autoAlpha: 1,
          duration: 0.5,
        }, 0)

        .to(corners, {
          scale: 1,
          duration: 0.5,
        }, 0)

        .to(overlayBorders, {
          yPercent: 0,
          duration: 0.5,
        }, 0)

        .to(toggleLabels, {
          yPercent: -100,
          duration: 0.4,
        }, 0)

        .to(logoLink ? [toggleBtn, logoLink] : toggleBtn, {
          color: openColor,
          duration: 0.4,
        }, 0)

        .to(toggleBars[0], {
          y: "0.25em",
          rotation: 45,
          duration: 0.35,
          ease: "back.out(1.4)",
          easeReverse: "power3.out",
        }, 0.05)

        .to(toggleBars[1], {
          y: "-0.25em",
          rotation: -45,
          duration: 0.35,
          ease: "back.out(1.4)",
          easeReverse: "power3.out",
        }, 0.05)

        .fromTo(largeItems, { autoAlpha: 0, xPercent: 25 },
          {
            autoAlpha: 1,
            xPercent: 0,
            duration: 0.7,
            stagger: 0.05,
          },
          0
        )

        .fromTo(smallItems, { autoAlpha: 0, yPercent: 100 },
          {
            autoAlpha: 1,
            yPercent: 0,
            duration: 0.5,
            stagger: 0.03,
            ease: "power3.out"
          },
          0.3
        )

        .to(menuBorder, {
          scaleX: 1,
          duration: 0.5,
        }, "<");

      enterEndTime = tl.duration();

      tl.addPause();

      tl.to([largeItems, smallItems], {
          autoAlpha: 0,
          duration: 0.3,
        }, "<")

        .to([mainEl, overlayEl], {
          x: 0,
          duration: 0.6,
        }, "<")

        .to(darkEl, {
          autoAlpha: 0,
          duration: 0.35,
          ease: "power2.inOut",
        }, "<")

        .to(corners, {
          scale: 0,
          duration: 0.5,
        }, "<")

        .to(overlayBorders[0], {
          yPercent: -100,
          duration: 0.5,
        }, "<")

        .to(overlayBorders[1], {
          yPercent: 100,
          duration: 0.5,
        }, "<")

        .to(logoLink ? [toggleBtn, logoLink] : toggleBtn, {
          color: getClosedColor,
          duration: 0.25,
        }, "<+=0.1")

        .to(toggleLabels, {
          yPercent: 0,
          duration: 0.25,
          ease: "power3.in",
        }, "<")

        .to(toggleBars, {
          y: 0,
          rotation: 0,
          duration: 0.25,
          ease: "power3.in",
        }, "<")

        .set(overlayEl, {
          visibility: "hidden",
          pointerEvents: "none"
        })

        .set(logoLink ? [toggleBtn, logoLink] : toggleBtn, { clearProps: "color" });
    }

    function toggle() {
      isOpen = !isOpen;
      toggleBtn.setAttribute("aria-expanded", String(isOpen));
      toggleBtn.setAttribute("aria-label", isOpen ? "close menu" : "open menu");
      document.body.setAttribute("data-menu-status", isOpen ? "open" : "");

      if (isOpen) {
        tl.invalidate();
        if (tl.time() >= enterEndTime) tl.timeScale(1).restart();
        else tl.timeScale(1).play();
      } else {
        if (tl.time() < enterEndTime) tl.timeScale(1).reverse();
        else tl.timeScale(1).play();
      }
    }

    buildTimeline();

    toggleBtn.addEventListener("click", toggle);

    overlayEl.addEventListener("click", function () {
      if (isOpen) toggle();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) {
        toggle();
        toggleBtn.focus();
      }
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (isOpen) {
          gsap.set([mainEl, overlayEl], { x: getMenuOffset() });
        } else {
          tl.invalidate();
        }
      }, 150);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
