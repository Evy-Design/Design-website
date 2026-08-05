/* ===========================================================
   Evy Diepenbroek — About page
   Three scroll-driven pieces: the hero's "text scrolls past a fixed
   photo" (plain CSS, position: sticky — see about.css, no JS), the
   bio's paragraph push (below — this IS JS, a per-paragraph scrub),
   and the "My Design Journey" timeline (horizontal scrub on desktop/
   tablet, plain vertical list on mobile/small-tablet).
   =========================================================== */

/* ---- Bio paragraph push ----
   The other half of gionatannese.com/about's hero: once past the
   heading, each paragraph that arrives doesn't just scroll past the
   sticky photo — it gets shoved sideways, out toward its column's own
   edge (data-eod-bio-push="left"/"right" on the markup — lede left,
   both detail paragraphs right, matching the two-column layout), as
   it nears the photo's fixed position, clearing a path so the photo
   ends up sitting alone in a clean centre once the text's gone by.
   Genuinely SEQUENTIAL, one paragraph at a time — not because they're
   stacked in a single column (they're back to the two-column layout,
   about.css), but because .eod-about-hero__bio-detail carries its own
   margin-top offset, staggering when the right column's paragraphs
   arrive well after the lede has already passed. Each paragraph still
   gets its OWN independent ScrollTrigger, scrubbing the push only
   while that paragraph's own vertical centre is within reach of the
   photo's fixed 50vh point, and simply holding at full push once
   scrolled past — same "no separate stop needed" pattern as
   everywhere else on this page: the scrub has nothing left to drive
   once its own end point is reached. Desktop/tablet only (matches
   about.css's 1024px breakpoint, where the bio itself stacks to a
   single column and side-to-side pushing stops making sense). */
(function () {
  function initBioPush() {
    var paragraphs = document.querySelectorAll("[data-eod-bio-para]");
    if (!paragraphs.length) return;
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    var triggers = [];

    function teardown() {
      triggers.forEach(function (t) { t.scrollTrigger.kill(); });
      triggers = [];
      gsap.set(paragraphs, { clearProps: "transform" });
    }

    function pushOut(el, distance) {
      return gsap.timeline({
        scrollTrigger: {
          trigger: el,
          // "top center" → "bottom center", not the other way round:
          // as the page scrolls, a below-viewport element's TOP edge
          // reaches any fixed screen line (the viewport's centre here
          // — where the photo sticks, top: 50vh in about.css) at a
          // SMALLER scrollY than its BOTTOM edge does (top is always
          // the closer edge). Writing it the intuitive-sounding way
          // round ("bottom center" as start, "top center" as end)
          // puts end BEFORE start in actual scroll order, which
          // GSAP can't resolve into a real range — confirmed: that
          // collapsed both to ~the same value, a ~0-length scrub, no
          // matter the element's height. This order self-scales to
          // any paragraph length, spanning exactly its own height:
          // starts the instant its top edge reaches the viewport's
          // centre, ends the instant its bottom edge does.
          start: "top center",
          end: "bottom center",
          scrub: true,
        },
        defaults: { ease: "none" },
      }).to(el, { x: distance });
    }

    function build() {
      teardown();
      if (window.matchMedia("(max-width: 1024px)").matches) return;

      triggers = Array.prototype.map.call(paragraphs, function (p) {
        var dir = p.dataset.eodBioPush === "right" ? 1 : -1;
        return pushOut(p, dir * 260);
      });
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
    document.addEventListener("DOMContentLoaded", initBioPush);
  } else {
    initBioPush();
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
          // See the matching comment in initAboutHero above — same
          // transformed-<main>-ancestor landmine applies here too.
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
