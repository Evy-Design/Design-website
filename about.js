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
          var tw = gsap.fromTo(line, { x: 0 }, {
            x: dir * push,
            ease: "power2.out",
            // The CTA button (and, in the timeline, the year label)
            // both carry their OWN entrance animation elsewhere
            // (data-eod-reveal's fade+rise) that also touches
            // transform — without this, fromTo's default immediate
            // render would capture that animation's PRE-reveal
            // transform (still mid fade-in) as its baseline the
            // moment the page loads, permanently baking in a stale
            // offset and blocking the reveal's own CSS transition
            // (inline styles always win). Deferring the render until
            // the tween actually starts means it reads the transform
            // once the reveal has long since finished instead.
            immediateRender: false,
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
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: bodyBlock,
            start: "top bottom",
            end: "+=" + pushRange,
            scrub: true,
          },
        });
        // immediateRender:false — see the desktop animateLine() comment
        // above; the CTA button here carries its own data-eod-reveal
        // entrance transform that this would otherwise stomp on.
        tl.fromTo(allLines, { x: "-6em" }, { x: 0, ease: "none", stagger: 0.05, immediateRender: false });
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
   worth of triggers. Every image (the hero portrait plus one per
   milestone, all stacked in .eod-journey__photo, see about.html/
   content.js) is swapped via activatePhoto(): GSAP tweens its opacity
   in and every other image's opacity out, so — unlike a CSS
   transition — it can't fight a scroll-scrubbed tween touching the
   same property. For the ONE special pair (the hero portrait and the
   first milestone's photo, each carrying its own data-rotate-hidden
   angle) that same tween ALSO carries rotateY, turning a plain
   crossfade into a literal 3D flip; every other image has no such
   attribute so its rotateY term is just a no-op 0. Scrolling back up
   past the first milestone needs its own explicit handling (onLeaveBack
   re-activating the hero portrait) since, unlike every other boundary
   here, there's no "previous item" already registered to cover it. */
(function () {
  function initJourneyPush() {
    var section = document.querySelector("[data-eod-timeline]");
    var items = document.querySelectorAll("[data-eod-timeline-item]");
    if (!section || !items.length) return;
    if (!window.gsap || !window.ScrollTrigger || !window.SplitText) return;
    if (section.dataset.eodJourneyPushInit) return;
    section.dataset.eodJourneyPushInit = "true";
    gsap.registerPlugin(ScrollTrigger, SplitText);

    // Plain crossfade — every boundary EXCEPT hero↔milestone-0 uses
    // only this, so nothing but opacity ever moves for them.
    function activatePhoto(img) {
      document.querySelectorAll(".eod-journey__photo-img").forEach(function (el) {
        gsap.to(el, { opacity: el === img ? 1 : 0, duration: 0.5, ease: "power1.out", overwrite: "auto" });
      });
    }

    // The one flip: rotates ONLY the two images actually involved
    // (their own data-rotate-hidden angle), on top of the same
    // crossfade — never touches any other image's rotation, so it
    // can't leak into the plain item-to-item crossfades below.
    function flipPhoto(fromImg, toImg) {
      activatePhoto(toImg);
      gsap.to(fromImg, { rotateY: Number(fromImg.dataset.rotateHidden) || 0, duration: 0.5, ease: "power1.out", overwrite: "auto" });
      gsap.to(toImg, { rotateY: 0, duration: 0.5, ease: "power1.out", overwrite: "auto" });
    }

    function addPhotoSwap(item, i, triggers) {
      var img = document.querySelector('.eod-journey__photo-img[data-index="' + i + '"]');
      if (!img) return;
      var config = {
        trigger: item,
        start: "top center",
        end: "bottom center",
        onEnterBack: function () { activatePhoto(img); },
      };
      // Milestone 0 is the only boundary with no "previous item" of
      // its own already covering the upward direction — every other
      // boundary is handled by the NEXT item's onEnter (down) plus
      // THIS item's onEnterBack (up) alone, see the file comment. Its
      // onEnter (arriving from the hero above) and onLeaveBack
      // (leaving back toward the hero) are the ONLY two moments that
      // should ever rotate anything — every other item's onEnter is
      // registered by ITS OWN addPhotoSwap call as a plain crossfade.
      if (i === 0) {
        var heroImg = document.querySelector('.eod-journey__photo-img[data-slot="hero"]');
        config.onEnter = function () { flipPhoto(heroImg, img); };
        if (heroImg) {
          config.onLeaveBack = function () { flipPhoto(img, heroImg); };
        }
      } else {
        config.onEnter = function () { activatePhoto(img); };
      }
      triggers.push(ScrollTrigger.create(config));
    }

    function build() {
      // Any image whose data-rotate-hidden marks it as the flip pair
      // needs to actually START at that angle — otherwise its very
      // first activation has nothing to rotate FROM and just pops in
      // flat instead of turning.
      document.querySelectorAll(".eod-journey__photo-img").forEach(function (el) {
        var hidden = Number(el.dataset.rotateHidden) || 0;
        if (hidden && !el.classList.contains("is-active")) {
          gsap.set(el, { rotateY: hidden });
        }
      });

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
          var tw = gsap.fromTo(line, { x: 0 }, {
            x: dir * push,
            ease: "power2.out",
            // The CTA button (and, in the timeline, the year label)
            // both carry their OWN entrance animation elsewhere
            // (data-eod-reveal's fade+rise) that also touches
            // transform — without this, fromTo's default immediate
            // render would capture that animation's PRE-reveal
            // transform (still mid fade-in) as its baseline the
            // moment the page loads, permanently baking in a stale
            // offset and blocking the reveal's own CSS transition
            // (inline styles always win). Deferring the render until
            // the tween actually starts means it reads the transform
            // once the reveal has long since finished instead.
            immediateRender: false,
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
          var descSplit = new SplitText(item.querySelector(".eod-timeline__desc"), { type: "lines" });
          splits.push(titleSplit, descSplit);
          // The year label and the CTA button aren't split text (a
          // year and a button aren't "lines"), but they still sit in
          // the meta/desc columns and should push with the rest of
          // their column instead of standing still while everything
          // around them moves.
          animateLine(item.querySelector(".eod-timeline__year"), -1);
          titleSplit.lines.forEach(function (line) { animateLine(line, -1); });
          descSplit.lines.forEach(function (line) { animateLine(line, 1); });
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

        items.forEach(function (item, i) {
          var titleSplit = new SplitText(item.querySelector(".eod-timeline__title"), { type: "lines" });
          var descSplit = new SplitText(item.querySelector(".eod-timeline__desc"), { type: "lines" });
          splits.push(titleSplit, descSplit);
          // Same reasoning as desktop — the year label and CTA button
          // aren't split lines but should still push with everything
          // else in this one reading column.
          var allLines = [item.querySelector(".eod-timeline__year")]
            .concat(titleSplit.lines, descSplit.lines, [item.querySelector(".eod-timeline__cta")]);

          allLines.forEach(function (line) {
            var tw = gsap.fromTo(line, { x: "-4em" }, {
              x: 0,
              ease: "power2.out",
              immediateRender: false,
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
