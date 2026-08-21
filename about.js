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
        var triggers = [];

        // Invisible twin of .eod-journey__photo — same class, so it
        // tracks the exact same width clamp()/aspect-ratio formula on
        // resize, but sits off-screen and is never touched by the
        // shape-morph tween below. photoHalfH()/push() read THIS
        // element's size, not the real photoEl's: the shape-morph
        // tween animates photoEl's actual width/height/border-radius
        // (a genuine shape change, not just a clip-path mask), and
        // those two functions are only re-invoked on
        // ScrollTrigger.refresh() (page load/resize), not per scroll
        // frame — reading the real, animated photoEl would permanently
        // bake in whatever tiny size the card happens to be at on the
        // next refresh, under-pushing the lede/detail text once the
        // real card visibly grows past that. This ref never changes
        // size for any reason other than a genuine resize, so it's
        // always safe to measure.
        var photoSizeRef = document.createElement("div");
        photoSizeRef.className = "eod-journey__photo";
        photoSizeRef.setAttribute("aria-hidden", "true");
        photoSizeRef.style.cssText = "position:absolute; top:0; left:-9999px; visibility:hidden; pointer-events:none;";
        document.body.appendChild(photoSizeRef);

        // Measured live (a function, not a value captured once here)
        // — build() runs right after document.fonts.ready, which
        // resolves before the page's layout has necessarily fully
        // settled. A ONE-TIME measurement at that point genuinely
        // returned a smaller box than the photo's real, final size
        // (confirmed: ~137px half-height baked into the trigger maths
        // below vs. ~175px once things had actually settled) — every
        // line's contact point was calculated against a card that was
        // never really that size, so the "fixed" snap window still
        // landed short of true contact. Functions get re-invoked on
        // every ScrollTrigger.refresh() (which GSAP itself fires
        // automatically on window load, once fonts/images have
        // genuinely finished), so this self-corrects instead of
        // staying wrong for the page's whole lifetime — and stays
        // correct across a real window resize too, for free.
        function photoHalfH() {
          return (photoSizeRef ? photoSizeRef.getBoundingClientRect().height : 300) / 2;
        }
        function push() {
          return (photoSizeRef ? photoSizeRef.getBoundingClientRect().width : 300) / 2;
        }

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
            x: function () { return dir * push(); },
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
              // Ends exactly when the line's bottom edge reaches the
              // card's own bottom edge (genuine vertical contact) —
              // NOT starts there. Starting the window AT the contact
              // point (an earlier version of this) meant the line was
              // still sitting completely unpushed, x:0, at the exact
              // moment it was already close enough to vertically
              // overlap the card. Shifting the whole window
              // snapDistance EARLIER means the push has fully finished
              // by the time the line is anywhere near the card's
              // vertical range, so there's nothing left to overlap
              // once contact is even possible.
              // Anchored to the line's TOP, not its bottom: the line
              // has real height of its own, so its top edge enters the
              // card's vertical span well BEFORE its bottom edge does
              // — measured, a genuine overlap that a bottom-anchored
              // window (however early it starts) can never rule out,
              // since the top's own crossing point isn't part of that
              // maths at all. Ending the window when the TOP reaches
              // the card's bottom edge guarantees no part of the line
              // is inside the card's vertical range until the push has
              // already fully finished.
              start: function () { return "top center+=" + (photoHalfH() + snapDistance); },
              end: function () { return "top center+=" + photoHalfH(); },
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

        // Sticky photo starts as a small circle centred over the
        // heading — Evy felt the full card blocked the intro text, and
        // wanted it small + round there instead, staying centred
        // (deliberately still overlapping the heading, just much less
        // of it) — then genuinely MORPHS into its normal rounded-
        // rectangle card shape as the page scrolls from the title
        // block into the body text, finishing well before the lede/
        // detail text arrives. An earlier version used clip-path (a
        // circle mask growing its own radius) — Evy flagged that as
        // reading like "a window opening", not an actual shape
        // changing, and asked for a real morph with her face staying
        // visible in the small circle. This animates photoEl's actual
        // width/height/border-radius directly instead — square (equal
        // width/height, so border-radius: 50% is a true circle, not an
        // ellipse) growing into the card's real aspect ratio, radius
        // easing from fully round down to the card's own --eod-radius.
        // object-position on .eod-journey__photo-img (about.css) is
        // what keeps her face framed through that — object-fit: cover
        // centres by default, which would crop toward her chest once
        // the box is square instead of the taller 4:5 card.
        //
        // Widths/heights are FUNCTIONS reading photoSizeRef (see its
        // own comment above), not photoEl itself, specifically because
        // this tween now touches photoEl's real box size — reading the
        // live, currently-animating element here would be circular.
        // border-radius is captured ONCE, synchronously, before this
        // tween's inline styles ever touch photoEl: unlike width/
        // height, border-radius doesn't depend on layout settling
        // (fonts/images loading) — it's a fixed design constant
        // (--eod-radius) resolved straight from the CSS cascade, so a
        // one-time read here carries none of the staleness risk that
        // photoHalfH()/push() above specifically guard against.
        var titleBlockEl = document.querySelector(".eod-about-hero__title-block");
        if (titleBlockEl) {
          var fullRadius = getComputedStyle(photoEl).borderRadius;
          var shapeTw = gsap.fromTo(photoEl,
            { width: 120, height: 120, borderRadius: 60 },
            {
              width: function () { return photoSizeRef.getBoundingClientRect().width; },
              height: function () { return photoSizeRef.getBoundingClientRect().height; },
              borderRadius: function () { return parseFloat(fullRadius) || 16; },
              ease: "none",
              scrollTrigger: {
                trigger: titleBlockEl,
                start: "top top",
                end: "bottom top",
                scrub: true,
              },
            }
          );
          triggers.push(shapeTw.scrollTrigger);

          // Evy: the small circle should be zoomed in a bit more on
          // her face, not just whatever plain object-fit: cover
          // happens to centre on the square crop. Scales the actual
          // <img> up (not the box — that's the tween above) and back
          // down to 1 over the exact same trigger, so the zoom finishes
          // in lockstep with the shape morph. transform-origin biased
          // up from dead-centre (50% 35%, not 50% 50%): the portrait's
          // face sits in the upper third of the frame, not the middle
          // (there's a lot of hair/shoulder below it) — scaling from
          // the true centre would zoom toward her collarbone instead.
          var heroImgEl = document.querySelector('.eod-journey__photo-img[data-slot="hero"]');
          if (heroImgEl) {
            heroImgEl.style.transformOrigin = "50% 35%";
            var zoomTw = gsap.fromTo(heroImgEl,
              { scale: 1.4 },
              {
                scale: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: titleBlockEl,
                  start: "top top",
                  end: "bottom top",
                  scrub: true,
                },
              }
            );
            triggers.push(zoomTw.scrollTrigger);
          }
        }

        return function () {
          triggers.forEach(function (t) { t.kill(); });
          split.revert();
          photoSizeRef.remove();
          // Without this, switching to mobile mid-session (a resize
          // crossing the 1025px breakpoint, not just a page load) left
          // the last scrubbed width/height/border-radius stuck on
          // photoEl as inline styles — the mobile layout sizes the
          // photo via its own CSS rule (about.css), which inline
          // styles would otherwise keep overriding.
          gsap.set(photoEl, { clearProps: "width,height,borderRadius" });
          if (heroImgEl) gsap.set(heroImgEl, { clearProps: "scale,transformOrigin" });
        };
      });

      // Mobile/tablet: it's really one reading column (lede above
      // detail, see about.css) — every line pushes the SAME direction,
      // starting shifted left toward centre and easing right into its
      // resting, left-aligned-text position next to the sticky photo
      // on the left. Used to be ONE shared timeline (trigger: bodyBlock)
      // with a flat per-line `stagger` faking each line's own timing —
      // but a stagger is just a fixed TIME offset, blind to where any
      // given line actually sits on the page relative to the fixed
      // photo, so nothing guaranteed a line's push had finished before
      // it was close enough to genuinely overlap the photo (measured: a
      // real ~64px overlap on some lines). Per-line contact triggers,
      // the same mechanic desktop and the Timeline both already use,
      // fixes that at the source — see the desktop animateLine() above
      // for the full reasoning (live-measured photo size, anchored to
      // each line's own TOP edge, completing snapDistance before
      // genuine contact).
      mm.add("(max-width: 1024px)", function () {
        var split = splitAll();
        var allLines = split.ledeLines.concat(split.detailLines, [document.querySelector(".eod-about-hero__cta")]);
        var photoStickyEl = document.querySelector(".eod-journey__photo-sticky");
        function photoHalfH() {
          return (photoStickyEl ? photoStickyEl.getBoundingClientRect().height : 300) / 2;
        }
        var snapDistance = 60;
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
        var triggers = [];

        allLines.forEach(function (line) {
          if (!line) return;
          var tw = gsap.fromTo(line, { x: startX, y: 0 }, {
            x: 0,
            // Explicit y:0 — see the desktop animateLine() comment
            // above; the CTA button here carries its own
            // data-eod-reveal entrance transform this would otherwise
            // collide with.
            y: 0,
            ease: "power2.out",
            scrollTrigger: {
              trigger: line,
              start: function () { return "top center+=" + (photoHalfH() + snapDistance); },
              end: function () { return "top center+=" + photoHalfH(); },
              scrub: true,
            },
          });
          triggers.push(tw.scrollTrigger);
        });

        return function () {
          triggers.forEach(function (t) { t.kill(); });
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

    // Belt-and-braces on top of the live-measured start/end/x functions
    // above: forces at least one ScrollTrigger.refresh() shortly after
    // everything's up, so even if fonts.ready resolved before the
    // page's layout had genuinely finished settling, the very next
    // recalculation picks up the real, final numbers rather than
    // whatever was measurable at that first, possibly-too-early
    // moment. GSAP already does this on the window "load" event by
    // itself — this only matters as a fallback for the case where
    // "load" had already fired before this script got a chance to
    // attach the listener.
    setTimeout(function () {
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }, 300);
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
        // Measured live — see the hero's own animateLine() above for
        // why a one-time measurement here read the card's box smaller
        // than its real, settled size.
        function photoHalfH() {
          return (photoEl ? photoEl.getBoundingClientRect().height : 300) / 2;
        }
        function push() {
          return (photoEl ? photoEl.getBoundingClientRect().width : 300) / 2;
        }
        var snapDistance = 60;

        function animateLine(line, dir) {
          // Not every milestone has a description or a CTA button
          // (see content.js) — querySelector returns null for those,
          // so this just quietly skips rather than handing GSAP/
          // ScrollTrigger a null trigger target.
          if (!line) return;
          var tw = gsap.fromTo(line, { x: 0, y: 0 }, {
            x: function () { return dir * push(); },
            y: 0,
            ease: "power2.out",
            scrollTrigger: {
              trigger: line,
              // See the hero's own animateLine() above for why this
              // shifted snapDistance earlier instead of straddling the
              // contact point — completing the push exactly AT contact
              // rather than continuing 60px past it. Anchored to the
              // line's TOP, not its bottom — see the hero's own
              // animateLine() above for why bottom-anchoring can't
              // actually rule out overlap once the line's own height
              // is accounted for.
              start: function () { return "top center+=" + (photoHalfH() + snapDistance); },
              end: function () { return "top center+=" + photoHalfH(); },
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
        // Measured live — see the hero's own animateLine() above for
        // why a one-time measurement here read the card's box smaller
        // than its real, settled size.
        function photoHalfH() {
          return (photoStickyEl ? photoStickyEl.getBoundingClientRect().height : 300) / 2;
        }
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
                // See the hero's own animateLine() above for why this
                // shifted snapDistance earlier instead of straddling
                // the contact point, and why it's anchored to the
                // line's TOP rather than its bottom.
                start: function () { return "top center+=" + (photoHalfH() + snapDistance); },
                end: function () { return "top center+=" + photoHalfH(); },
                scrub: true,
              },
            });
            triggers.push(tw.scrollTrigger);
          });

          addPhotoSwap(item, i, triggers);
        });

        // The card should stay put for as long as there's still text
        // arriving, then end bottom-aligned with the very last line —
        // not float on, centred, for hundreds more pixels after the
        // text is already done (confirmed: it used to sit frozen for
        // ~500px after the last line had already scrolled past it).
        // Native CSS sticky release is the wrong tool for this: it
        // fires once the WHOLE .eod-journey__stack runs out of room,
        // which has no relationship to when THIS particular line
        // finishes. Instead, this measures the exact scroll position
        // at which the card's own (fixed, while stuck) centred bottom
        // edge would naturally coincide with the last line's bottom
        // edge — both card and text positions are simple, predictable
        // functions of scroll once you're past the push, so that
        // crossing point is knowable in advance.
        //
        // An earlier version of this kept sliding the card 1:1 with
        // scroll (matching normal document flow) all the way until it
        // had fully scrolled off the top of the viewport, staying
        // perfectly aligned with the text the whole way — correct, but
        // it meant .eod-timeline needed ~700–900px of genuine trailing
        // space underneath for that slide to have room to play out in,
        // which read as a big empty gap of the section's own black
        // background before Awards began. A short fade-out instead —
        // the card holds its aligned position for one brief window
        // and dissolves rather than travelling anywhere — needs only
        // as much trailing space as that one short window, not an
        // entire card-height's worth of scroll distance.
        var lastItem = items[items.length - 1];
        var lastLineEl = lastItem && (
          lastItem.querySelector(".eod-timeline__cta") ||
          lastItem.querySelector(".eod-timeline__desc") ||
          lastItem.querySelector(".eod-timeline__title")
        );
        if (lastLineEl && photoStickyEl) {
          var photoCenteredBottom = photoStickyEl.getBoundingClientRect().bottom;
          var lastElAbsoluteBottom = lastLineEl.getBoundingClientRect().bottom + window.scrollY;
          var alignScrollY = lastElAbsoluteBottom - photoCenteredBottom;
          // Still tracks 1:1 with scroll (ease:"none") for this short
          // stretch, so the card keeps riding exactly on the text's own
          // (still-moving) bottom edge right up until it's gone, rather
          // than freezing in place the instant the fade starts.
          var settleWindow = 200;
          var endTw = gsap.fromTo(photoStickyEl, { y: 0, opacity: 1 }, {
            y: -settleWindow,
            opacity: 0,
            ease: "none",
            scrollTrigger: {
              trigger: document.body,
              start: alignScrollY,
              end: alignScrollY + settleWindow,
              scrub: true,
            },
          });
          triggers.push(endTw.scrollTrigger);
        }

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

    // See initHeroPush()'s own version of this comment above — same
    // fallback refresh, same reasoning.
    setTimeout(function () {
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }, 300);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initJourneyPush);
  } else {
    initJourneyPush();
  }
})();
