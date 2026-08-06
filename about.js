/* ===========================================================
   Evy Diepenbroek — About page
   The hero (heading, bio, portrait) is plain HTML/CSS now — a real
   heading centred in the first 100svh, real paragraphs flowing below
   it, and a position: sticky photo beside them (see .eod-about-hero
   in about.css) — no JS needed to drive it. The one scroll-driven
   piece left on this page is the "My Design Journey" timeline below:
   horizontal scrub on desktop/tablet, plain vertical list on
   mobile/small-tablet.
   =========================================================== */

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
