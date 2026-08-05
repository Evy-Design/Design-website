/* ===========================================================
   Evy Diepenbroek — About page
   Two independent scroll-driven pieces: the hero (photo starts
   overlapping the title, goes sticky, pushes title/body apart,
   stops the instant they're clear) and the "My Design Journey"
   timeline (horizontal scrub on desktop/tablet, plain vertical
   list on mobile/small-tablet — see about.css's own breakpoint).
   Both use GSAP ScrollTrigger, already loaded by this page.
   =========================================================== */

/* ---- Hero ----
   Same family of trick as the Home hero's tornado card (eject →
   sticky → settle in script.js): a tall section provides the scroll
   DISTANCE, a single-viewport inner element gets pinned for that
   whole distance, and the actual motion is just a scrubbed timeline
   tied 1:1 to scroll position. Simpler here than the tornado version
   since there's no orbit/flip to hand off from — the photo is
   already in its start position in the markup. Ending the pin at
   the section's own bottom edge is what makes the separation stop
   immediately once it's done: the scrub has nothing left to drive
   past that point, and the section releases back into normal flow. */
(function () {
  function initAboutHero() {
    var section = document.querySelector("[data-eod-about-hero]");
    var pin = document.querySelector("[data-eod-about-hero-pin]");
    var title = document.querySelector("[data-eod-about-hero-title]");
    var photo = document.querySelector("[data-eod-about-hero-photo]");
    var body = document.querySelector("[data-eod-about-hero-body]");
    if (!section || !pin || !title || !photo || !body) return;
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    gsap.set(body, { autoAlpha: 0, yPercent: 35 });
    gsap.set(photo, { scale: 1.08 });

    gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        pin: pin,
        pinSpacing: false,
        // "transform" not the default "fixed": test-navigation.js
        // applies a GSAP transform to <main> (needed for the slide-
        // menu-open animation), and .eod-about-hero is a descendant
        // of it — a position:fixed pin would compute against THAT
        // transformed ancestor instead of the true viewport (same
        // landmine already hit/fixed for the contact page's banner).
        // Transform-based pinning sidesteps it entirely: it just
        // translates the element by the right amount instead of
        // relying on fixed-positioning semantics.
        pinType: "transform",
      },
      defaults: { ease: "none" },
    })
      .to(title, { yPercent: -62, autoAlpha: 0.35 }, 0)
      .to(photo, { scale: 1 }, 0)
      .to(body, { autoAlpha: 1, yPercent: 0 }, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAboutHero);
  } else {
    initAboutHero();
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
