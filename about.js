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
      // RIGHT — two columns spreading apart from their small (3em) rest
      // gap, photo sits centred in the gap between them. The push
      // amount is derived from the PHOTO's own rendered width (not a
      // flat "5em" guess): the rest gap is 3em, so each column's inner
      // edge starts 1.5em out from centre already — pushing it out by
      // exactly half the photo's width lands that edge at
      // photoWidth/2 + 1.5em from centre, i.e. exactly 1.5em clear of
      // the photo's own edge, whatever width it resolves to.
      //
      // Each LINE gets its own ScrollTrigger, tied to that specific
      // line's own position crossing the viewport's centre — not one
      // shared trigger on bodyBlock with an artificial stagger. The
      // card is sticky and centred in the viewport the whole time, so
      // a shared, bodyBlock-sized range only ever approximates "when
      // is this line near the card" — a stagger value has no idea
      // where any given line actually is on screen, it's just a fixed
      // time offset, which is exactly why it kept reading as reacting
      // to an arbitrary scroll amount instead of to the card itself
      // ("too late"/disconnected). Per-line triggers fix that at the
      // source: each line starts pushing once ITS OWN bottom edge
      // nears the centre (where the card sits) and finishes once its
      // top edge has cleared it — genuinely reacting to that one
      // line's real passage past the fixed card, nothing else.
      mm.add("(min-width: 1025px)", function () {
        var split = splitAll();
        var photoEl = document.querySelector(".eod-about-hero__photo");
        var push = (photoEl ? photoEl.getBoundingClientRect().width : 300) / 2;
        var photoHalfH = (photoEl ? photoEl.getBoundingClientRect().height : 300) / 2;
        var triggers = [];

        // A wide, symmetric window (card's full height, eased linearly
        // the whole way through) made the push read as a slow drift
        // tied to proximity, not a reaction to actual contact — by the
        // time you could see why it was happening, it was already half
        // done. Real contact is a much SHORTER, more sudden event: the
        // line snaps out of the way right as the card's leading (top)
        // edge reaches it, over just a small scroll distance, then
        // holds — it doesn't keep gradually easing for the entire time
        // the card is anywhere near it.
        var snapDistance = 60;

        function animateLine(line, dir) {
          var tw = gsap.fromTo(line, { x: 0 }, {
            x: dir * push,
            ease: "power2.out",
            scrollTrigger: {
              trigger: line,
              start: "bottom center+=" + photoHalfH,
              end: "bottom center+=" + (photoHalfH - snapDistance),
              scrub: true,
            },
          });
          triggers.push(tw.scrollTrigger);
        }

        split.ledeLines.forEach(function (line) { animateLine(line, -1); });
        split.detailLines.forEach(function (line) { animateLine(line, 1); });

        return function () {
          triggers.forEach(function (t) { t.kill(); });
          split.revert();
        };
      });

      // Mobile/tablet: it's really one reading column (lede above
      // detail, see about.css) — every line pushes the SAME direction,
      // starting shifted left toward centre and easing right into its
      // resting, left-aligned-text position next to the photo on the
      // left. Same "one combined array, one shared stagger" fix as
      // desktop. The range spans nearly the WHOLE body-block rather
      // than just one viewport's worth — mobile stacks lede + both
      // detail paragraphs into a single, often multi-screen-tall
      // column, so a range sized for a one-viewport-tall block finished
      // the push almost as soon as it started (the "paragraphs move a
      // bit too early" report). It stops exactly at the sticky photo's
      // OWN release point (bodyBlock's height, minus how tall the now-
      // content-sized sticky wrapper is, plus one viewport for the
      // lead-in) rather than at the block's true bottom — going any
      // further would mean the text is still easing into place after
      // the card has already scrolled away and released, which looks
      // broken (text animating with nothing to "arrive" for).
      mm.add("(max-width: 1024px)", function () {
        var split = splitAll();
        var allLines = split.ledeLines.concat(split.detailLines);
        var photoStickyEl = document.querySelector(".eod-about-hero__photo-sticky");
        var stickyH = photoStickyEl ? photoStickyEl.getBoundingClientRect().height : 0;
        var bodyH = bodyBlock.getBoundingClientRect().height;
        var pushRange = bodyH - stickyH + window.innerHeight;
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: bodyBlock,
            start: "top bottom",
            end: "+=" + pushRange,
            scrub: true,
          },
        });
        tl.fromTo(allLines, { x: "-6em" }, { x: 0, ease: "none", stagger: 0.05 });
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
