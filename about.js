/* ===========================================================
   Evy Diepenbroek — About page
   The hero (heading, bio) and the timeline (milestones) are plain
   HTML/CSS, stacked in normal flow — but they share ONE sticky photo
   card (see .eod-journey in about.css) that stays centred/pinned in
   the viewport for as long as ANY of that combined content remains
   below it, rather than each section having its own. initHeroPush()
   below pushes the hero's body text out of the card's way as it
   scrolls into view (a plain GSAP scrub, no pin — nothing here ever
   freezes); initJourneyPush() further down does the same for each
   timeline milestone's text AND owns the shared card itself — which
   image is showing, flipping from Evy's portrait into the first
   milestone's photo right as it arrives, then cross-fading normally
   between the rest.
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
        var photoEl = document.querySelector(".eod-journey__photo");
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
          var tw = gsap.fromTo(line, { x: 0, y: 0 }, {
            x: dir * push,
            // The CTA button carries its OWN entrance animation
            // elsewhere (data-eod-reveal's fade+rise, a translateY)
            // that also touches transform. Explicitly owning y here
            // (even though every OTHER line never had a y offset to
            // begin with, so this is a no-op for them) means GSAP
            // renders its OWN y:0 immediately instead of leaving the
            // reveal's pre-animation offset in place — the button
            // loses its "rise" on entrance, but never gets stuck
            // straddling both animations at once (which is what
            // happened before: the push simply not rendering ANYTHING
            // until scroll reached it, which broke every line's
            // visible starting-offset, not just the button's).
            y: 0,
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
        // Not split text, but still sits in the detail column and
        // should push along with it rather than standing still.
        animateLine(document.querySelector(".eod-about-hero__cta"), 1);

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
        var allLines = split.ledeLines.concat(split.detailLines, [document.querySelector(".eod-about-hero__cta")]);
        var photoStickyEl = document.querySelector(".eod-journey__photo-sticky");
        var stickyH = photoStickyEl ? photoStickyEl.getBoundingClientRect().height : 0;
        var bodyH = bodyBlock.getBoundingClientRect().height;
        var pushRange = bodyH - stickyH + window.innerHeight;
        // A plain "-6em" starting offset resolves against each
        // element's OWN font-size — the lede, the detail paragraphs
        // and the CTA button all sit at different sizes, so "-6em"
        // meant a different number of actual pixels for each one,
        // leaving their left edges out of step with each other for
        // as long as any of them hadn't finished pushing in yet.
        // Computing the offset once, off the ROOT font-size, gives
        // every one of them the exact same absolute distance instead.
        var rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        var startX = -6 * rootPx;
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: bodyBlock,
            start: "top bottom",
            end: "+=" + pushRange,
            scrub: true,
          },
        });
        // Explicit y:0 — see the desktop animateLine() comment above;
        // the CTA button here carries its own data-eod-reveal entrance
        // transform this would otherwise collide with.
        tl.fromTo(allLines, { x: startX, y: 0 }, { x: 0, y: 0, ease: "none", stagger: 0.05 });
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

/* ---- Timeline text-push + shared photo card ----
   Directly continues the hero's own composition and technique (see
   initHeroPush() above): the sticky photo (.eod-journey__photo-sticky
   in about.css) stays pinned in the viewport for the hero AND the
   whole timeline list combined, never itself moving — what changes is
   WHICH image is visible. Each timeline item's own year/title +
   description lines snap away from the photo's fixed position on
   contact exactly like the hero's lede/detail lines — same short
   (60px), eased "snap then hold" window, not a slow scroll-distance
   drift, so it reads as the card physically arriving and pushing that
   line out of its way.

   The card itself is owned entirely here (not split off into its own
   function) since it's ONE shared element spanning both sections'
   worth of triggers. Milestones 0–5 (all plain crossfades between
   each other) are handled by activatePhoto()/addPhotoSwap() — GSAP
   tweens the target's opacity in and every other milestone's opacity
   out, so — unlike a CSS transition — it can't fight a scroll-scrubbed
   tween touching the same property. The hero portrait is a special
   case, kept OUT of that crossfade pool entirely (see addHeroFlip()):
   it's a genuine 3D flip, not a fade, and a fade+rotate pair (two
   INDEPENDENT elements rotating over mismatched ranges, which is what
   this used to do) doesn't actually read as one rigid object turning
   over — each face needs to sweep the SAME 180° range, exactly 180°
   out of phase with the other, so they're edge-on (invisible) at
   precisely the same instant and hand off cleanly, the way a single
   rotating card's front/back faces would. Tying that directly to
   scroll position (scrub, not a one-shot eased tween) is also what
   makes it correctly reversible at any scroll speed — a duration-based
   tween can get cut short or race ahead of fast scrolling. */
(function () {
  function initJourneyPush() {
    var section = document.querySelector("[data-eod-timeline]");
    var items = document.querySelectorAll("[data-eod-timeline-item]");
    if (!section || !items.length) return;
    if (!window.gsap || !window.ScrollTrigger || !window.SplitText) return;
    if (section.dataset.eodJourneyPushInit) return;
    section.dataset.eodJourneyPushInit = "true";
    gsap.registerPlugin(ScrollTrigger, SplitText);

    // Plain crossfade between milestones 0–5 — the hero portrait is
    // deliberately excluded (see addHeroFlip()), so nothing here ever
    // touches its opacity or rotation.
    function activatePhoto(img) {
      document.querySelectorAll('.eod-journey__photo-img:not([data-slot="hero"])').forEach(function (el) {
        gsap.to(el, { opacity: el === img ? 1 : 0, duration: 0.5, ease: "power1.out", overwrite: "auto" });
      });
    }

    function addPhotoSwap(item, i, triggers) {
      var img = document.querySelector('.eod-journey__photo-img[data-index="' + i + '"]');
      if (!img) return;
      triggers.push(ScrollTrigger.create({
        trigger: item,
        start: "top center",
        end: "bottom center",
        onEnter: function () { activatePhoto(img); },
        onEnterBack: function () { activatePhoto(img); },
      }));
    }

    // The one flip — milestone 0's photo is the "back face" to the
    // hero portrait's "front face", both fixed exactly 180° apart and
    // swept together (see the file comment). Scrubbed directly to
    // scroll position over a short window centred on milestone 0's
    // own "top center" point — the same point addPhotoSwap uses for
    // every OTHER milestone's crossfade, so the two systems can never
    // visibly disagree about when milestone 0 has "arrived". opacity
    // is set once, up front, and never touched again here — visibility
    // is entirely down to rotateY + backface-visibility (see
    // .eod-journey__photo-img in about.css), which is exactly what
    // lets this coexist with activatePhoto() later fading milestone
    // 0's photo toward milestone 1 without the two fighting over the
    // same property.
    function addHeroFlip(triggers) {
      var heroImg = document.querySelector('.eod-journey__photo-img[data-slot="hero"]');
      var item0Img = document.querySelector('.eod-journey__photo-img[data-index="0"]');
      var item0 = items[0];
      if (!heroImg || !item0Img || !item0) return;
      gsap.set(heroImg, { opacity: 1, rotateY: 0 });
      gsap.set(item0Img, { opacity: 1, rotateY: -180 });
      var flipWindow = 120;
      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: item0,
          start: "top center+=" + flipWindow,
          end: "top center-=" + flipWindow,
          scrub: true,
        },
      });
      tl.fromTo(heroImg, { rotateY: 0 }, { rotateY: 180, ease: "none" }, 0)
        .fromTo(item0Img, { rotateY: -180 }, { rotateY: 0, ease: "none" }, 0);
      triggers.push(tl.scrollTrigger);
    }

    function build() {
      var journeyTriggers = [];
      addHeroFlip(journeyTriggers);

      var mm = gsap.matchMedia();

      // Desktop/tablet: year+title push LEFT, description pushes
      // RIGHT of the sticky photo — identical mechanic to the hero's
      // lede/detail columns, just repeated once per milestone.
      mm.add("(min-width: 1025px)", function () {
        var splits = [];
        var triggers = [];
        var photoEl = document.querySelector(".eod-journey__photo");
        var push = (photoEl ? photoEl.getBoundingClientRect().width : 300) / 2;
        var photoHalfH = (photoEl ? photoEl.getBoundingClientRect().height : 300) / 2;
        var snapDistance = 60;

        function animateLine(line, dir) {
          // Not every milestone has a description or a CTA button
          // (see content.js) — querySelector returns null for those,
          // so this just quietly skips rather than handing GSAP/
          // ScrollTrigger a null trigger target.
          if (!line) return;
          var tw = gsap.fromTo(line, { x: 0, y: 0 }, {
            x: dir * push,
            y: 0,
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

        items.forEach(function (item, i) {
          var titleSplit = new SplitText(item.querySelector(".eod-timeline__title"), { type: "lines" });
          splits.push(titleSplit);
          var descEl = item.querySelector(".eod-timeline__desc");
          var descSplit = descEl ? new SplitText(descEl, { type: "lines" }) : null;
          if (descSplit) splits.push(descSplit);
          // The year label and the CTA button aren't split text (a
          // year and a button aren't "lines"), but they still sit in
          // the meta/desc columns and should push with the rest of
          // their column instead of standing still while everything
          // around them moves.
          animateLine(item.querySelector(".eod-timeline__year"), -1);
          titleSplit.lines.forEach(function (line) { animateLine(line, -1); });
          if (descSplit) descSplit.lines.forEach(function (line) { animateLine(line, 1); });
          animateLine(item.querySelector(".eod-timeline__cta"), 1);
          addPhotoSwap(item, i, triggers);
        });

        return function () {
          triggers.forEach(function (t) { t.kill(); });
          splits.forEach(function (s) { s.revert(); });
        };
      });

      // Mobile/tablet: one reading column next to the left-aligned
      // sticky photo (see about.css) — every line snaps the same
      // direction, from a small offset into its resting spot, right
      // as this item's photo reaches contact.
      mm.add("(max-width: 1024px)", function () {
        var splits = [];
        var triggers = [];
        var photoStickyEl = document.querySelector(".eod-journey__photo-sticky");
        var photoHalfH = (photoStickyEl ? photoStickyEl.getBoundingClientRect().height : 300) / 2;
        var snapDistance = 60;
        // Same reasoning as the hero's mobile branch above — "-4em"
        // resolves against each LINE's own font-size, and the title
        // is much bigger than the year/desc/button, so it was starting
        // noticeably further left than everything else even though
        // they're all meant to share one left edge. One root-relative
        // pixel value keeps every line's starting offset identical.
        var rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        var startX = -4 * rootPx;

        items.forEach(function (item, i) {
          var titleSplit = new SplitText(item.querySelector(".eod-timeline__title"), { type: "lines" });
          splits.push(titleSplit);
          var descEl = item.querySelector(".eod-timeline__desc");
          var descSplit = descEl ? new SplitText(descEl, { type: "lines" }) : null;
          if (descSplit) splits.push(descSplit);
          // Same reasoning as desktop — the year label and CTA button
          // aren't split lines but should still push with everything
          // else in this one reading column. Not every milestone has a
          // description or a CTA (see content.js) — filter out the
          // nulls rather than handing GSAP an empty trigger target.
          var allLines = [item.querySelector(".eod-timeline__year")]
            .concat(titleSplit.lines, descSplit ? descSplit.lines : [], [item.querySelector(".eod-timeline__cta")])
            .filter(Boolean);

          allLines.forEach(function (line) {
            var tw = gsap.fromTo(line, { x: startX, y: 0 }, {
              x: 0,
              y: 0,
              ease: "power2.out",
              scrollTrigger: {
                trigger: line,
                start: "bottom center+=" + photoHalfH,
                end: "bottom center+=" + (photoHalfH - snapDistance),
                scrub: true,
              },
            });
            triggers.push(tw.scrollTrigger);
          });

          addPhotoSwap(item, i, triggers);
        });

        return function () {
          triggers.forEach(function (t) { t.kill(); });
          splits.forEach(function (s) { s.revert(); });
        };
      });
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(build);
    } else {
      build();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initJourneyPush);
  } else {
    initJourneyPush();
  }
})();
