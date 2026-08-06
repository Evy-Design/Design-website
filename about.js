/* ===========================================================
   Evy Diepenbroek — About page
   The hero (heading, bio, portrait) is plain HTML/CSS — two stacked
   100svh blocks (title, body text), each centred within itself, and a
   position: sticky photo overlaid on top of them (see .eod-about-hero
   in about.css) that stays centred/pinned in the viewport the whole
   time it's in range. The only bit of JS the hero needs is
   initHeroPush() below: a plain GSAP scrub (no pin — nothing here
   ever freezes) that pushes the body text out of the photo's way as
   it scrolls into view. The other scroll-driven piece on this page is
   the "My Design Journey" timeline further down: horizontal scrub on
   desktop/tablet, plain vertical list on mobile/small-tablet.
   =========================================================== */

/* ---- Hero text push ----
   The photo itself never moves horizontally — it's simply sticky and
   centred (desktop) or sticky and left-aligned (mobile), the whole
   composition is built so that position alone reads as "beside/behind
   the text". What moves is the body text — and per the brief, PER
   LINE, not as one monolithic paragraph block: SplitText breaks the
   lede and both detail paragraphs into their own per-line spans (this
   is what the old WebGL build did natively by drawing one mesh per
   wrapped line — SplitText is the plain-DOM equivalent, and same as
   that build, it re-splits on resize so a line's own push timing
   never gets baked to a width it was tuned at). Each line starts at
   its natural rest position (x:0, desktop's small 3em-gap spacing /
   mobile's shifted-toward-centre spacing) and eases out to its final
   pushed position as .eod-about-hero__body-block scrolls up into the
   position where the sticky photo now sits over/beside it — staggered
   in reading order (lede's lines, then the detail paragraphs' lines)
   via GSAP's own stagger, same cascade the old build had.
   gsap.matchMedia() swaps between the two compositions at the same
   1024px breakpoint about.css uses, cleanly reverting the old split
   instead of layering both. */
(function () {
  function initHeroPush() {
    var bodyBlock = document.querySelector("[data-eod-hero-body-block]");
    var ledeEl = document.querySelector(".eod-about-hero__lede");
    var detailEls = document.querySelectorAll(".eod-about-hero__detail");
    if (!bodyBlock || !ledeEl || !detailEls.length) return;
    if (!window.gsap || !window.ScrollTrigger || !window.SplitText) return;
    // Guards against this running twice (observed in some environments
    // when the DOMContentLoaded listener path is taken) — without it,
    // a second run's fresh gsap.matchMedia() instance conflicts with
    // the first's still-pending media query evaluation, and BOTH end
    // up tweening stale/duplicate targets instead of the real ones.
    if (bodyBlock.dataset.eodHeroPushInit) return;
    bodyBlock.dataset.eodHeroPushInit = "true";
    gsap.registerPlugin(ScrollTrigger, SplitText);

    function splitAll() {
      var ledeSplit = new SplitText(ledeEl, { type: "lines" });
      var detailSplits = Array.prototype.map.call(detailEls, function (el) {
        return new SplitText(el, { type: "lines" });
      });
      var detailLines = [];
      detailSplits.forEach(function (s) { detailLines = detailLines.concat(s.lines); });
      return {
        ledeLines: ledeSplit.lines,
        detailLines: detailLines,
        revert: function () {
          ledeSplit.revert();
          detailSplits.forEach(function (s) { s.revert(); });
        },
      };
    }

    function build() {
      var mm = gsap.matchMedia();

      // Desktop/tablet: lede's lines push LEFT, detail's lines push
      // RIGHT — two columns spreading apart from their small rest gap,
      // photo sits centred in the gap between them.
      mm.add("(min-width: 1025px)", function () {
        var split = splitAll();
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: bodyBlock,
            start: "top bottom",
            end: "top top",
            scrub: true,
          },
        });
        tl.fromTo(split.ledeLines, { x: 0 }, { x: "-5em", ease: "none", stagger: 0.08 })
          .fromTo(split.detailLines, { x: 0 }, { x: "5em", ease: "none", stagger: 0.05 });
        return function () {
          tl.scrollTrigger.kill();
          tl.kill();
          split.revert();
        };
      });

      // Mobile/tablet: it's really one reading column (lede above
      // detail, see about.css) — every line pushes the SAME direction,
      // starting shifted left toward centre and easing right into its
      // resting, right-aligned position next to the photo on the left.
      mm.add("(max-width: 1024px)", function () {
        var split = splitAll();
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: bodyBlock,
            start: "top bottom",
            end: "top top",
            scrub: true,
          },
        });
        tl.fromTo(split.ledeLines, { x: "-6em" }, { x: 0, ease: "none", stagger: 0.08 })
          .fromTo(split.detailLines, { x: "-6em" }, { x: 0, ease: "none", stagger: 0.05 });
        return function () {
          tl.scrollTrigger.kill();
          tl.kill();
          split.revert();
        };
      });
    }

    // SplitText measures rendered line breaks, so it needs the real
    // webfont metrics in place first — same document.fonts.ready gate
    // the old WebGL build used before it trusted any text measurement.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(build);
    } else {
      build();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeroPush);
  } else {
    initHeroPush();
  }
})();

/* ---- Timeline ----
   Desktop/tablet: pins the section and translates the card list
   sideways by exactly its own overflow (scrollWidth − visible
   width), while the progress line fills in lockstep — both driven
   by the same scrubbed timeline so they can't drift apart. Rebuilt
   on resize (debounced) rather than just re-measured, since crossing
   about.css's own 1024px breakpoint swaps the whole layout to a
   plain vertical list — the horizontal pin/scrub needs to be torn
   down entirely below that width, not just resized. */
(function () {
  function initTimeline() {
    var section = document.querySelector("[data-eod-timeline]");
    var track = document.querySelector("[data-eod-timeline-track]");
    var list = document.querySelector("[data-eod-timeline-list]");
    var progress = document.querySelector("[data-eod-timeline-progress]");
    if (!section || !track || !list || !progress) return;
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    var current = null;

    function teardown() {
      if (!current) return;
      current.kill();
      current = null;
      gsap.set(list, { clearProps: "transform" });
      gsap.set(progress, { width: 0 });
    }

    function build() {
      teardown();
      if (window.matchMedia("(max-width: 1024px)").matches) return;

      var distance = list.scrollWidth - track.clientWidth;
      if (distance <= 0) return;

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=" + (distance + window.innerHeight * 0.4),
          scrub: true,
          pin: true,
          // pinType "transform" (rather than the default position:fixed)
          // avoids a landmine where a CSS transform on an ancestor
          // (e.g. a hover/reveal effect elsewhere on the page) would
          // otherwise re-anchor position:fixed's containing block and
          // make the pin jump to the wrong place.
          pinType: "transform",
        },
        defaults: { ease: "none" },
      })
        .to(list, { x: -distance }, 0)
        .to(progress, { width: "100%" }, 0);

      current = tl.scrollTrigger;
    }

    build();

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        build();
        ScrollTrigger.refresh();
      }, 200);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTimeline);
  } else {
    initTimeline();
  }
})();
