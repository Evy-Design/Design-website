/* ===========================================================
   Evy Diepenbroek — Hero tornado + scroll "eject" interaction
   Engine adapted from the Osmo "3D Cards Tornado" component
   (GSAP + Observer). Paste this file's content into your
   Slater JS.

   REQUIRES, loaded BEFORE this file (head custom code):
     <script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/gsap.min.js"></script>
     <script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/Observer.min.js"></script>

   The tornado spins freely and continuously — scrolling never
   stops it. The only scroll-linked thing: whichever card is
   nearest the visual center at the moment you start scrolling
   gets pulled out of the orbit and flips over (scroll-scrubbed)
   to reveal your portrait on its back face, landing just below
   the hero. Everything else keeps spinning behind it.

   Text / what comes after the hero is a later pass — this is
   just the tornado + the scroll "eject" motion.

   To edit photos: change the DATA object below.
   =========================================================== */

(function () {
  // Declared INSIDE the IIFE (not at top level): Figma Sites renders all
  // breakpoint variants of a page in the same DOM at once and just
  // toggles visibility with CSS, so if this embed is placed on multiple
  // breakpoints, this whole file's <script> tag ends up on the page more
  // than once. A top-level `const` would throw "already declared" on the
  // second copy and abort the entire script — scoping it here means each
  // inclusion gets its own local copy instead of colliding.
  const EOD_DATA = {
    portrait: "assets/tornado Images/back-card-image/evy-portrait.jpg",
    cards: [
      { src: "https://glass-music-01613391.figma.site/_assets/v11/f4607dfef1f252d36baff380cd218bfb7296de58.png", alt: "Architecture study" },
      { src: "https://glass-music-01613391.figma.site/_assets/v11/2d8f6295f3054cb1971dfc6e7ce86f1ab150bc64.png?w=3584", alt: "Landscape sketch" },
      { src: "assets/tornado Images/1.png", alt: "Plek UX Design - Website design" },
      { src: "assets/tornado Images/2.jpg", alt: "Penguin shortlisted book cover" },
      { src: "assets/tornado Images/3.jpg", alt: "Typografic Illustrations" },
      { src: "assets/tornado Images/4.jpg", alt: "editorial design" },
      { src: "assets/tornado Images/5.jpg", alt: "design, editorial design" },
      { src: "assets/tornado Images/6.jpg", alt: "Illustration" },
      { src: "assets/tornado Images/7.gif", alt: "Studio 3D material" },
      { src: "assets/tornado Images/8-Cense.jpg", alt: "Cense website design" },
    ],
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function hexToRgb(hex) {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mixColor(hexA, hexB, t) {
    const [r1, g1, b1] = hexToRgb(hexA);
    const [r2, g2, b2] = hexToRgb(hexB);
    return `rgb(${Math.round(lerp(r1, r2, t))}, ${Math.round(lerp(g1, g2, t))}, ${Math.round(lerp(b1, b2, t))})`;
  }

  // A plain <a>, not a div + click listener — the card's own inner
  // content (.demo-card and everything in it) is pointer-events: none
  // (style.css), specifically so hit-testing always resolves to this
  // outer element regardless of which face/image is on top, so an
  // anchor here is naturally clickable across the whole card with no
  // extra plumbing. position: absolute (style.css) already forces its
  // display to block, so swapping the tag from div doesn't change
  // layout, and GSAP only ever targets it by class, never by tag.
  // (Evy: "als je op een van de cards van de tornado klickt ga je
  // naar de my work... project overview page toe".)
  //
  // Production only (same hostname check as chrome.js's own
  // PROJECTS_COMING_SOON, kept independent here rather than shared
  // since this file doesn't otherwise depend on chrome.js) — while
  // the projects page is offline there, the card becomes a plain
  // (unclickable) div instead of a link. Nothing else about the
  // tornado changes: position: absolute + GSAP targeting by class,
  // not tag, both already tolerate either element (see the comment
  // above this function).
  var PROJECTS_COMING_SOON =
    typeof location !== "undefined" &&
    /(^|\.)evydiepenbroek\.nl$/.test(location.hostname);

  function buildCardMarkup() {
    const tag = PROJECTS_COMING_SOON ? "div" : "a";
    const linkAttrs = PROJECTS_COMING_SOON ? "" : 'href="projects" ';
    return EOD_DATA.cards
      .map(
        (card) => `
      <${tag} ${linkAttrs}class="cards-tornado__item" data-3d-tornado-item aria-label="Go to my work">
        <div class="demo-card">
          <div class="demo-card__face demo-card__face--front"><img class="cover-image" src="${card.src}" alt="${card.alt}" /></div>
          <div class="demo-card__face demo-card__face--back"><img class="cover-image" src="${EOD_DATA.portrait}" alt="Evy Olivia Diepenbroek" /></div>
        </div>
      </${tag}>`
      )
      .join("");
  }

  function initHero(hero) {
    // Figma Sites keeps every breakpoint variant of a page in the DOM at
    // once (just toggling visibility with CSS), so this embed can appear
    // more than once — and since the whole file's <script> tag then also
    // ends up on the page more than once, this same function can get
    // called on the very same hero element multiple times over. Guard
    // per-element so only the first call actually wires anything up.
    if (hero.dataset.eodInit) return;
    hero.dataset.eodInit = "true";
    console.log("[EOD-DEBUG] initHero start", {
      t: Math.round(performance.now()),
      scrollY: window.scrollY,
      readyState: document.readyState,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    });

    const backdrop = hero.querySelector(".eod-backdrop");
    const tornado = hero.querySelector("[data-3d-tornado-init]");
    const list = tornado.querySelector("[data-3d-tornado-list]");
    const introRow = hero.querySelector(".eod-hero__intro");
    list.innerHTML = buildCardMarkup();

    if (typeof gsap === "undefined" || typeof Observer === "undefined") {
      console.error(
        "[eod-tornado] GSAP or the Observer plugin isn't loaded. Add the gsap.min.js and Observer.min.js " +
        "<script> tags in your site's head custom code, BEFORE this script."
      );
      return;
    }
    gsap.registerPlugin(Observer);

    // ---- Tornado engine (Osmo "3D Cards Tornado", free-spinning) ----
    const rotationAngle = 28;
    const cardYSpacing = 0.36;
    const edgeOffset = 2;
    const orbitDepth = 30;
    const autoSpeed = 0.0026;
    const scrollSpeed = 0.012;
    const dragMultiplier = 5;
    const maxSpeed = 0.2;
    const edgeScale = 0.5;
    const edgeEase = gsap.parseEase("power2.inOut");
    const minScale = 1;
    const backDarkness = 0.75;
    const backBlur = 0.5;
    const MAX_CARDS = 70;

    const originalCards = Array.from(list.querySelectorAll("[data-3d-tornado-item]")).map((c) => c.cloneNode(true));
    if (!originalCards.length) return;

    let inputObserver;
    let resizeTimer;
    let ejectedItem = null; // declared early: render() reads this on every tick
    let returningItem = null; // same reason: render() must skip it mid glide-back too
    let isLanded = false; // true once the card has settled out of the sticky flow
    let heroScrollProgress = 0; // 0 = fully at the top, untouched

    // A CACHED viewport height, not a live window.innerHeight read. On
    // real mobile browsers, the address bar collapsing/expanding as you
    // scroll fires `resize` and nudges window.innerHeight by however
    // tall the bar is — reading it live inside updateScroll() would
    // make the scroll-progress math (and where settle() snapshots the
    // landed position) shift mid-scroll, which is what left the card
    // stuck in the wrong spot on phones. This only gets refreshed once
    // things are idle (see the debounced resize handler below), so one
    // scroll gesture always measures against one stable number.
    let stableViewportHeight = window.innerHeight;

    const state = {
      amount: 0,
      progress: 0,
      velocity: autoSpeed,
      direction: 1,
      cardHeight: 0,
      cardGap: 0,
      em: 16,
      isActive: false,
      cards: [],
    };

    function getCardAmount() {
      const containerHalfHeight = tornado.offsetHeight * 0.5;
      if (!containerHalfHeight || !state.cardGap) return originalCards.length;
      const edgeOffsetDistance = state.cardHeight * edgeOffset;
      const fadeDistance = state.cardHeight * edgeScale;
      const neededDistance = containerHalfHeight + edgeOffsetDistance + fadeDistance;
      const cardsPerSide = Math.ceil(neededDistance / state.cardGap) + 1;
      const neededAmount = Math.min(cardsPerSide * 2 + 1, MAX_CARDS);
      const batchCount = Math.ceil(neededAmount / originalCards.length);
      return Math.min(originalCards.length * batchCount, MAX_CARDS);
    }

    function buildCards(reason) {
      list.innerHTML = "";
      const measureCard = originalCards[0].cloneNode(true);
      list.appendChild(measureCard);
      state.cardHeight = measureCard.offsetHeight;
      state.cardGap = state.cardHeight * cardYSpacing;
      state.em = parseFloat(getComputedStyle(measureCard).fontSize);
      state.amount = getCardAmount();
      console.log("[EOD-DEBUG] buildCards", {
        reason: reason || "?",
        t: Math.round(performance.now()),
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        tornadoOffsetWidth: tornado.offsetWidth,
        tornadoOffsetHeight: tornado.offsetHeight,
        cardHeight: state.cardHeight,
        cardGap: state.cardGap,
        em: state.em,
        amount: state.amount,
        radius: orbitDepth * state.em,
      });
      list.innerHTML = "";

      for (let i = 0; i < state.amount; i++) {
        const card = originalCards[i % originalCards.length].cloneNode(true);
        card.dataset.index = i;
        list.appendChild(card);
      }
      state.cards = Array.from(list.querySelectorAll("[data-3d-tornado-item]"));
    }

    function getEdgeScale(y) {
      const containerHalfHeight = tornado.offsetHeight * 0.5;
      const edgeOffsetDistance = state.cardHeight * edgeOffset;
      const fadeDistance = state.cardHeight * edgeScale;
      const distanceFromCenter = Math.abs(y);
      const fadeStart = containerHalfHeight + edgeOffsetDistance;
      const progress = clamp((fadeStart - distanceFromCenter) / fadeDistance, 0, 1);
      return edgeEase(progress);
    }

    function signedIndexOf(card) {
      const startIndex = parseFloat(card.dataset.index);
      const loopIndex = ((startIndex + state.progress) % state.amount + state.amount) % state.amount;
      return loopIndex > state.amount * 0.5 ? loopIndex - state.amount : loopIndex;
    }

    function render() {
      const radius = orbitDepth * state.em;

      state.cards.forEach((card) => {
        if (card === ejectedItem || card === returningItem) return; // scroll (or the glide back) owns this one right now

        const index = signedIndexOf(card);
        const angleDeg = index * rotationAngle;
        const angleRad = (angleDeg * Math.PI) / 180;
        const center = 1 - Math.min(Math.abs(index) / (state.amount * 0.5), 1);
        const y = index * state.cardGap;
        const baseScale = minScale + center * (1 - minScale);
        const scale = baseScale * getEdgeScale(y);
        const backAmount = clamp((1 - Math.cos(angleRad)) * 0.5, 0, 1);
        const brightness = 1 - backAmount * backDarkness;
        const blur = backAmount * backBlur;

        gsap.set(card, {
          xPercent: -50,
          yPercent: -50,
          x: Math.sin(angleRad) * radius,
          y,
          z: (Math.cos(angleRad) - 1) * radius,
          rotateY: angleDeg,
          scale,
          filter: `brightness(${brightness}) blur(${blur}em)`,
          autoAlpha: 1,
          zIndex: Math.round(center * 1000),
        });
      });
    }

    function tick() {
      if (!state.isActive) return;
      if (heroScrollProgress > 0) return; // paused while scrolled/ejecting — resumes once fully back at the top
      const targetVelocity = autoSpeed * state.direction;
      state.velocity = lerp(state.velocity, targetVelocity, 0.1);
      state.progress += state.velocity;
      render();
    }

    function handleInput(self) {
      if (!state.isActive) return;
      const delta =
        self.event.type === "wheel"
          ? self.deltaY
          : Math.abs(self.deltaX) > Math.abs(self.deltaY)
          ? self.deltaX * dragMultiplier
          : self.deltaY * dragMultiplier;
      if (!delta) return;
      state.direction = delta > 0 ? 1 : -1;
      state.velocity += (delta * scrollSpeed) / 100;
      state.velocity = gsap.utils.clamp(-maxSpeed, maxSpeed, state.velocity);
    }

    function setActive(isActive) {
      state.isActive = isActive;
      if (!inputObserver) return;
      if (isActive) inputObserver.enable();
      else inputObserver.disable();
    }

    function rebuild(reason) {
      buildCards(reason);
      render();
    }

    // Three separate reasons this needs to actually verify readiness
    // instead of trusting the next frame: (1) Figma Sites switches which
    // breakpoint's markup is visible by toggling CSS, and that switch
    // isn't instant; (2) style.css itself is a separate network request
    // (via Slater) that can simply arrive late on a slow connection —
    // measuring a card's size before it has ANY real styling gives a
    // near-zero card height, which makes state.amount collapse to almost
    // nothing and the orbit math degenerate into a single card endlessly
    // cycling up through the top and back in from the bottom; (3) Figma
    // Sites hydrates the page client-side after first paint, which can
    // still reflow/resize things for a moment afterwards — a card
    // measured mid-reflow locks in a plausible-looking but wrong size
    // (since cardYSpacing/orbitDepth math runs once and is never
    // revisited outside a real resize), scattering cards far apart or
    // bunching them together with no error and nothing to self-correct.
    // Checking the container's height catches (1)+(2) but not (3) — a
    // reflow mid-hydration can easily leave it non-zero throughout. The
    // only real signal that hydration has finished settling is the
    // SAME measurement coming back identical across consecutive frames.
    let lastProbeWidth = null;
    let stableFrames = 0;
    function isLayoutReady() {
      if (tornado.offsetHeight <= 0) {
        stableFrames = 0;
        return false;
      }
      const probe = originalCards[0].cloneNode(true);
      probe.style.visibility = "hidden";
      list.appendChild(probe);
      const w = probe.offsetWidth;
      const h = probe.offsetHeight;
      probe.remove();
      if (w <= 0 || h <= 0) {
        stableFrames = 0;
        return false;
      }
      if (w === lastProbeWidth) {
        stableFrames++;
      } else {
        lastProbeWidth = w;
        stableFrames = 1;
      }
      return stableFrames >= 4; // ~4 consecutive frames of no change
    }

    function waitForStableLayout(attemptsLeft, onReady) {
      if (isLayoutReady() || attemptsLeft <= 0) {
        onReady();
        return;
      }
      requestAnimationFrame(() => waitForStableLayout(attemptsLeft - 1, onReady));
    }

    // Figma Sites keeps EVERY breakpoint's copy of this hero in the DOM
    // at once and just hides the inactive ones with CSS — so at load
    // time, up to two of the three copies on the page have zero layout
    // height and may never become visible during this visit at all.
    // Blindly polling and eventually giving up (the old approach) meant
    // a hidden copy would build itself from garbage measurements after
    // ~5s of nothing changing. Worse: if the user later resized across
    // a breakpoint boundary and that stale poll was still in flight, it
    // could fire the one-time setup below a SECOND time — doubling the
    // auto-spin ticker and the wheel/touch listener. `hasStarted` makes
    // that setup provably run at most once per copy, and waiting on
    // IntersectionObserver means we simply never attempt it at all
    // until a copy actually has real layout to measure.
    let hasStarted = false;
    function ensureStarted() {
      if (hasStarted) return true;
      if (tornado.offsetHeight <= 0) return false;
      hasStarted = true;
      console.log("[EOD-DEBUG] ensureStarted firing", { t: Math.round(performance.now()), scrollY: window.scrollY });

      rebuild("initial-start");

      inputObserver = Observer.create({
        target: window,
        type: "wheel,touch,pointer",
        preventDefault: false,
        lockAxis: true,
        onChange: handleInput,
        onPress: () => { tornado.style.cursor = "grabbing"; },
        onRelease: () => { tornado.style.cursor = "grab"; },
      });

      const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0 });
      io.observe(tornado);

      gsap.ticker.add(tick);
      return true;
    }

    const bootObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          waitForStableLayout(60, ensureStarted);
        }
      },
      { threshold: 0 }
    );
    bootObserver.observe(tornado);
    // Also try immediately, for the common case where this copy is the
    // active breakpoint and already visible right now — no reason to
    // wait for the observer's first (slightly async) callback.
    if (tornado.offsetHeight > 0) waitForStableLayout(60, ensureStarted);
    // Safety net: browsers differ in exactly when they first fire
    // IntersectionObserver, and this copy might already be visible by
    // the time this line runs without offsetHeight having settled yet
    // above. If neither of the two attempts above has started things
    // within a second, force one more real attempt regardless.
    setTimeout(() => {
      if (!hasStarted) waitForStableLayout(60, ensureStarted);
    }, 1000);

    // The ejected/landed card's width/height are locked to a fixed pixel
    // size the moment it's picked (see beginEject) — the rest of the
    // page reflows on resize, but that one card never did. Resize it
    // down to a browser window a lot narrower than it was ejected at,
    // and it stays frozen at its old (now much too large) pixel size —
    // showing the portrait, blown up, since a landed card is always
    // fully flipped. Re-measure and refresh just its size on resize;
    // its position (sticky, or its fixed centre-anchor once landed)
    // doesn't need to change, only how big it renders around that point.
    function resyncEjectedCardSize() {
      if (!ejectedItem) return;
      const probe = originalCards[0].cloneNode(true);
      probe.style.visibility = "hidden";
      list.appendChild(probe);
      const w = probe.offsetWidth;
      const h = probe.offsetHeight;
      probe.remove();
      console.log("[EOD-DEBUG] resyncEjectedCardSize", {
        t: Math.round(performance.now()),
        w, h,
        prevWidth: ejectedItem.style.width,
        prevHeight: ejectedItem.style.height,
      });
      if (w > 0 && h > 0) {
        ejectedItem.style.width = w + "px";
        ejectedItem.style.height = h + "px";
      }
    }

    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      console.log("[EOD-DEBUG] resize event", {
        t: Math.round(performance.now()),
        hasStarted, ejected: !!ejectedItem, heroScrollProgress,
        innerWidth: window.innerWidth, innerHeight: window.innerHeight,
      });
      // Not started yet (still hidden on this breakpoint, or the
      // bootObserver/eager check haven't caught up) — bootObserver will
      // call ensureStarted() itself once this copy actually becomes
      // visible. Calling plain rebuild() here without going through
      // ensureStarted() first would rebuild cards with no ticker/
      // Observer/IntersectionObserver ever registered to drive them.
      if (!hasStarted) return;
      if (ejectedItem) {
        resizeTimer = setTimeout(() => waitForStableLayout(60, resyncEjectedCardSize), 150);
        return;
      }
      // On mobile, the address bar collapsing/expanding as you scroll
      // fires a real `resize` event even though the svh-based layout
      // hasn't actually changed — rebuilding mid-eject would reset the
      // orbit's card indices under a card the user is mid-interaction
      // with. Skip it while anything is scroll-linked; a real rotation
      // or resize will naturally trigger rebuild again once idle.
      if (heroScrollProgress > 0) return;
      // Only refreshed here — fully idle, nothing scroll-linked in
      // progress — so a mobile address-bar flicker mid-scroll never
      // gets picked up as the new "stable" number; only a real,
      // settled resize (rotation, actual window resize) does.
      stableViewportHeight = window.innerHeight;
      resizeTimer = setTimeout(() => waitForStableLayout(60, () => rebuild("resize")), 150);
    });

    // ---- Scroll: background colour + the "hand-off" interaction ----
    // The tornado keeps spinning untouched the whole time — nothing
    // about it changes, so there's nothing to see coming. Only right
    // before you cross into the next section, whichever real card
    // currently happens to be front-and-center is pulled out of the
    // orbit itself (not a copy) and animated flipping + travelling
    // down to meet you there, while the rest of the tornado is left
    // spinning exactly as it was.
    const EJECT_TURNS = 180; // a single turn — lands back-side up
    const GLIDE_MS = 600; // one-time settle animation when a card is first picked
    let ejectedFace = null;
    let glideTimer = null;
    let returnGlideTimer = null;
    // True for the GLIDE_MS window right after a card is picked — see
    // the guard on updateEject's call site below for why this exists.
    let isGliding = false;

    function pickCenterCard() {
      let best = null;
      let bestCenter = -1;
      state.cards.forEach((card) => {
        const index = signedIndexOf(card);
        const center = 1 - Math.min(Math.abs(index) / (state.amount * 0.5), 1);
        if (center > bestCenter) {
          bestCenter = center;
          best = card;
        }
      });
      return best;
    }

    function beginEject() {
      const card = pickCenterCard();
      if (!card) return;

      // In case this exact card is caught mid glide-back (a fast
      // down-up-down flick), cancel that first so it doesn't leave a
      // stray `translate` offset or transition fighting the eject.
      if (returningItem === card) {
        clearTimeout(returnGlideTimer);
        returningItem = null;
        card.style.transition = "";
        card.style.translate = "";
      }

      // Measure BEFORE moving/restyling anything — once re-parented
      // and switched to position:sticky, the outer item has no
      // explicit width of its own (only the inner demo-card does, as
      // 100% of ITS parent), so if we don't lock in a fixed pixel size
      // first, it briefly resolves to the full container width.
      const cardRect = card.getBoundingClientRect();
      const cardWidth = cardRect.width;
      const cardHeight = cardRect.height;

      ejectedItem = card;
      ejectedFace = card.querySelector(".demo-card");
      hero.appendChild(card); // escape the tornado's clipped/3D stacking context

      // position:sticky does the actual work here: `top: <anchor>` (a
      // VIEWPORT unit, not a % of the container) means "stick once
      // you'd otherwise scroll within that much of the top of the
      // screen" — combined with translate(-50%,-50%) below, that keeps
      // the card pinned at that screen height for as long as you're
      // still scrolling through .eod-hero, then it releases on its own
      // once you scroll past the bottom of that container. No manual
      // position math. Reads --eod-eject-anchor-y (style.css) rather
      // than a hardcoded 50vh so the mobile media query there can move
      // the landing point lower, off dead-center, without this needing
      // its own breakpoint check.
      card.style.position = "sticky";
      card.style.top = "var(--eod-eject-anchor-y, 50vh)";
      card.style.left = "50%";
      card.style.width = cardWidth + "px";
      card.style.height = cardHeight + "px";
      card.style.zIndex = "9999"; // above every orbiting card (they go up to ~1000)
      card.style.filter = "none";
      card.style.willChange = "transform";

      // Without this, the card would teleport: the moment position
      // becomes sticky it snaps straight to the centred anchor point,
      // instantly abandoning wherever it was orbiting a frame ago. To
      // make that first hop read as a glide instead, we render one
      // extra frame with the card still offset to its OLD screen
      // position (via transform, on top of the new sticky base), then
      // transition it to the true centred transform. Only this first
      // pop-in gets a transition — every later scroll-driven update
      // sets transform directly, so tracking stays 1:1 with scroll.
      const newRect = card.getBoundingClientRect();
      const oldCenterX = cardRect.left + cardRect.width / 2;
      const oldCenterY = cardRect.top + cardRect.height / 2;
      const newCenterX = newRect.left + newRect.width / 2;
      const newCenterY = newRect.top + newRect.height / 2;
      const dx = oldCenterX - newCenterX;
      const dy = oldCenterY - newCenterY;

      card.style.transition = "none";
      card.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`;
      void card.offsetWidth; // force reflow so the offset frame above actually commits

      card.style.transition = `transform ${GLIDE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`;
      card.style.transform = "translate(-50%, -50%) scale(1)";

      isGliding = true;
      clearTimeout(glideTimer);
      glideTimer = setTimeout(() => {
        if (ejectedItem === card) card.style.transition = "";
        isGliding = false;
      }, GLIDE_MS);
    }

    // Only the flip and the grow are still driven by hand — the actual
    // "moves down with the scroll, then stops" part is native CSS
    // sticky behaviour on the card itself now, not JS. Both are linear
    // in `progress`, so they run the whole time you're scrolling
    // through the frame, in step with the scroll — no separate phases.
    function updateEject(progress) {
      // beginEject() arms a one-time 600ms transition on `transform`
      // for the pop-in glide (old orbit position -> centred), then
      // only clears it after GLIDE_MS via glideTimer. But this runs
      // on every scroll frame during that same window, so without
      // this line every one of THOSE writes was inheriting that
      // still-armed transition too — instead of snapping straight to
      // this frame's scroll position, the transform kept easing
      // toward whatever was written a frame ago, permanently lagging
      // behind the actual scroll position for up to 600ms. That read
      // as jank right at the start of any scroll gesture (worst on
      // mobile, where touch scroll delivers bigger position deltas
      // per frame than a mouse wheel does) — exactly the "not smooth"
      // Evy flagged. Clearing it here makes every scroll-driven write
      // land instantly, matching this function's own original intent
      // (see the comment on the transition line in beginEject).
      ejectedItem.style.transition = "none";
      const landedScale = 1.2;
      const scale = lerp(1, landedScale, progress);
      ejectedItem.style.transform = `translate(-50%, -50%) scale(${scale})`;
      ejectedFace.style.transform = `rotateY(${progress * EJECT_TURNS}deg)`;
    }

    // Scrolling back to the very top drops the card back into the
    // orbit. By the time this fires (progress back down to 0) the flip
    // and grow are already back to ~identity via updateEject's own
    // linear progress mapping — so the only thing left to smooth out
    // is POSITION: it jumps from wherever it was sitting on screen to
    // wherever the 3D orbit math places it.
    function returnToOrbit() {
      if (!ejectedItem) return;
      const card = ejectedItem;
      const face = ejectedFace;
      ejectedItem = null;
      ejectedFace = null;
      clearTimeout(glideTimer);

      const oldRect = card.getBoundingClientRect();

      list.appendChild(card);
      card.style.position = "";
      card.style.left = "";
      card.style.top = "";
      card.style.width = "";
      card.style.height = "";
      card.style.zIndex = "";
      card.style.filter = "";
      card.style.willChange = "";
      card.style.transition = "";
      card.style.transform = "";
      face.style.transform = "";

      // Clean resume: forget whatever velocity piled up from scroll/wheel
      // input while the tornado was paused, so it eases back in gently.
      state.velocity = autoSpeed;
      isLanded = false; // defensive — unsettle() should already have cleared this on the way up

      // Snap the card straight to its true orbital transform right
      // away — via GSAP, same as render() would — so every future tick
      // has nothing left to correct. Then glide it in from where it
      // visually was a moment ago using the independent CSS `translate`
      // property: that composes ALONGSIDE gsap's 3D transform instead
      // of overwriting it, so the orbit depth/rotation/scale stay
      // exactly right while only the position eases into place.
      returningItem = card;
      const radius = orbitDepth * state.em;
      const index = signedIndexOf(card);
      const angleDeg = index * rotationAngle;
      const angleRad = (angleDeg * Math.PI) / 180;
      const center = 1 - Math.min(Math.abs(index) / (state.amount * 0.5), 1);
      const y = index * state.cardGap;
      const baseScale = minScale + center * (1 - minScale);
      const targetScale = baseScale * getEdgeScale(y);
      const backAmount = clamp((1 - Math.cos(angleRad)) * 0.5, 0, 1);
      const brightness = 1 - backAmount * backDarkness;
      const blur = backAmount * backBlur;

      gsap.set(card, {
        xPercent: -50,
        yPercent: -50,
        x: Math.sin(angleRad) * radius,
        y,
        z: (Math.cos(angleRad) - 1) * radius,
        rotateY: angleDeg,
        scale: targetScale,
        filter: `brightness(${brightness}) blur(${blur}em)`,
        autoAlpha: 1,
        zIndex: Math.round(center * 1000),
      });

      const newRect = card.getBoundingClientRect();
      const dx = (oldRect.left + oldRect.width / 2) - (newRect.left + newRect.width / 2);
      const dy = (oldRect.top + oldRect.height / 2) - (newRect.top + newRect.height / 2);

      card.style.transition = "none";
      card.style.translate = `${dx}px ${dy}px`;
      void card.offsetWidth; // force reflow so the offset frame above actually commits

      card.style.transition = `translate ${GLIDE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`;
      card.style.translate = "0px 0px";

      clearTimeout(returnGlideTimer);
      returnGlideTimer = setTimeout(() => {
        if (returningItem === card) {
          card.style.transition = "";
          card.style.translate = "";
          returningItem = null;
        }
      }, GLIDE_MS);
    }

    // Reserve a bit of scroll distance AFTER the fall/flip/grow finishes —
    // otherwise, since position:sticky can only ever release right at
    // .eod-hero's very last pixel (its release point is geometrically
    // tied to the container's own bottom, not to when the card is done
    // animating), the card would stay glued to screen-centre for the
    // entire remaining scroll and only pop free at the last possible
    // moment, leaving no breathing room before whatever comes next.
    // This is literally empty scroll distance (blank .eod-hero
    // background) between the card landing and Awards starting, so too
    // much reads as dead space — but too little meant the intro text
    // scrolled straight past before you'd even finished reading it
    // (Evy: "dat je misschien net wat langer op dit moment stil staat
    // zodat je niet meteen de tekst uit het frame scrolt"). Raised from
    // 8 to 14, a middle ground between those two.
    const TAIL_BUFFER_VH = 14;

    // Once landed, stop tracking the viewport (position:sticky) and pin
    // the card to the exact document spot it's already sitting at — it
    // then scrolls away normally like any other element, which is what
    // actually creates visible room below it as you keep scrolling.
    // Captured with getBoundingClientRect() at the exact instant of the
    // swap, so this never causes a jump (see the eject/return-to-orbit
    // glides above for the same measure-before-you-mutate approach).
    // .eod-hero's fixed 220svh is sized for the desktop composition;
    // on mobile the stacked, more compact intro ends far above that
    // edge, leaving a large dead gap before Awards (reads as "the
    // section isn't hugging its content"). Shrinking .eod-hero to hug
    // its real content fixes that — but doing it the instant the card
    // lands means mutating the document's height WHILE the user's
    // finger/momentum-scroll is still actively moving through it,
    // which snaps everything below (Awards onward) up underneath
    // them — that's the glitch/shake reported on mobile. Deferred
    // instead until scrolling has actually gone idle (same debounce
    // idea as the .eod-is-scrolling hover guard elsewhere in this
    // file), and animated via .eod-hero.is-landed's own CSS
    // transition (see style.css) rather than snapping, so even that
    // idle-time resize reads as a settle, not a cut.
    let hugResizeTimer = null;
    let hugRefreshTimer = null;
    function applyHugHeight() {
      if (!isLanded || !ejectedItem) return;
      // NOT skipped on mobile (a flat CSS height was tried here and
      // reverted): the card doesn't land at a fixed offset from
      // .eod-hero's own top — it lands wherever the scroll position
      // happens to be once the fall/flip/grow animation finishes,
      // which is itself derived from the 220svh scroll-track and so
      // scales with viewport HEIGHT. A hand-picked flat number was
      // measured (via a forced real landing) to undershoot by 300px+
      // — no single constant is correct across phone heights here.
      // Measuring live and subtracting heroRect.top (below) is what
      // actually makes this adapt correctly regardless of where
      // landing happens to occur.
      const title = hero.querySelector(".eod-hero__intro-title");
      const body = hero.querySelector(".eod-hero__intro-body");
      const heroRect = hero.getBoundingClientRect();
      const contentBottom = Math.max(
        ...[ejectedItem, title, body].filter(Boolean).map((el) => el.getBoundingClientRect().bottom)
      );
      const bufferPx = (TAIL_BUFFER_VH / 100) * stableViewportHeight;
      hero.style.height = contentBottom - heroRect.top + bufferPx + "px";
      // ScrollTrigger (the footer parallax, see initFooterParallax
      // below) caches each trigger's start/end pixel positions at
      // setup time and has no way to know this height change just
      // moved everything below it — without a refresh, its reveal
      // could get stuck partway even at genuine max scroll. Delayed
      // to match .eod-hero.is-landed's own CSS transition (style.css)
      // finishing, so ScrollTrigger measures the settled layout, not
      // a mid-transition frame.
      if (typeof ScrollTrigger !== "undefined") {
        clearTimeout(hugRefreshTimer);
        hugRefreshTimer = setTimeout(() => ScrollTrigger.refresh(), 480);
      }
    }
    function scheduleHugHeight() {
      clearTimeout(hugResizeTimer);
      // Fallback only — see settle()'s transitionend listener for the
      // real trigger. A fixed delay here was an earlier attempt at
      // this same problem (guessing "long enough" to clear
      // .eod-hero__intro-title/-body's own 0.7s reveal transition
      // before measuring where they landed) but kept coming up short
      // in practice — main-thread contention from the landing
      // animation itself can push the transition's actual start back
      // by a frame or more, so no fixed guess is reliably safe. Kept
      // here, generously long, purely as a safety net in case
      // transitionend never fires for some reason (it always should).
      hugResizeTimer = setTimeout(() => {
        requestAnimationFrame(() => requestAnimationFrame(applyHugHeight));
      }, 1500);
    }

    // Once landed, stop tracking the viewport (position:sticky) and pin
    // the card to the exact document spot it's already sitting at — it
    // then scrolls away normally like any other element, which is what
    // actually creates visible room below it as you keep scrolling.
    // Captured with getBoundingClientRect() at the exact instant of the
    // swap, so this never causes a jump (see the eject/return-to-orbit
    // glides above for the same measure-before-you-mutate approach).
    function settle() {
      if (isLanded || !ejectedItem) return;
      isLanded = true;
      const card = ejectedItem;
      const cardRect = card.getBoundingClientRect();
      const heroRect = hero.getBoundingClientRect();
      card.style.position = "absolute";
      card.style.left = cardRect.left + cardRect.width / 2 - heroRect.left + "px";
      card.style.top = cardRect.top + cardRect.height / 2 - heroRect.top + "px";
      // Flank the card with the intro text, anchored at the exact
      // same vertical point as the card itself (see .eod-hero__intro
      // in style.css — top + translateY(-50%) mirrors how the card
      // centres itself on its own left/top). --eod-card-h lets the
      // mobile layout (title above / body below, stacked) reserve
      // exactly the card's own height between them.
      if (introRow) {
        introRow.style.top = card.style.top;
        introRow.style.setProperty("--eod-card-h", cardRect.height + "px");
      }
      hero.classList.add("is-landed");
      // Precise trigger for the hug-height measurement: wait for
      // .eod-hero__intro-body's own reveal transition (opacity +
      // transform, 0.7s — see style.css) to ACTUALLY finish before
      // measuring where it landed, rather than guessing a fixed delay
      // is "long enough" (kept coming up short in practice — see
      // scheduleHugHeight's own comment). transitionend fires once
      // per transitioned property, so this can fire twice in a row;
      // {once:true} means only the first one (whichever property
      // happens to finish first — they share the same duration, so
      // effectively simultaneous) actually triggers the measurement.
      const introBody = hero.querySelector(".eod-hero__intro-body");
      if (introBody) {
        introBody.addEventListener(
          "transitionend",
          () => requestAnimationFrame(() => requestAnimationFrame(applyHugHeight)),
          { once: true }
        );
      }
      scheduleHugHeight();
    }

    // Scrolling back up past the point where it landed hands the card
    // back to position:sticky so it re-joins the viewport-centred glide.
    function unsettle() {
      if (!isLanded || !ejectedItem) return;
      isLanded = false;
      const card = ejectedItem;
      card.style.position = "sticky";
      card.style.top = "var(--eod-eject-anchor-y, 50vh)";
      card.style.left = "50%";
      hero.classList.remove("is-landed");
      clearTimeout(hugResizeTimer);
      clearTimeout(hugRefreshTimer);
      // Undo settle()'s height stretch, if any — back to the normal
      // CSS-driven 220svh now that the intro text is hidden again.
      hero.style.height = "";
      // Same reasoning as applyHugHeight's own refresh — this height
      // change needs to invalidate ScrollTrigger's cached positions
      // too. No transition to wait out here (unsettle isn't inside
      // .is-landed by the time this runs), so no delay needed.
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
    }

    let scrollTicking = false;
    function updateScroll() {
      scrollTicking = false;
      const rect = hero.getBoundingClientRect();
      const scrollable = rect.height - stableViewportHeight;
      const bufferPx = (TAIL_BUFFER_VH / 100) * stableViewportHeight;
      const fallScrollable = Math.max(scrollable - bufferPx, 1);
      const progress = clamp(-rect.top / fallScrollable, 0, 1);
      heroScrollProgress = progress;

      // Stays black through most of the scroll, only turning white once
      // you're nearly at the bottom of this one long frame — .eod-hero
      // itself carries this colour (not just the backdrop inside the
      // pinned stage), so the area below the stage, where the card
      // lands, is painted with the exact same value. Same element, same
      // value, every tick — there's nothing that could get out of sync.
      const colorProgress = clamp((progress - 0.65) / 0.35, 0, 1);
      const easedColor = gsap.parseEase("power2.in")(colorProgress);
      const mixedColor = mixColor("#0a0a0a", "#fafafa", easedColor);
      hero.style.backgroundColor = mixedColor;
      backdrop.style.backgroundColor = mixedColor;

      if (progress > 0 && !ejectedItem) beginEject();
      if (progress <= 0 && ejectedItem) returnToOrbit();
      // Math.min() inside updateEject already makes this safe to call
      // unconditionally, at any progress, in either scroll direction.
      // Skipped once landed — the card is position:absolute by then
      // (settle() already gave it its final transform/placement), so
      // this would just keep rewriting the exact same values on every
      // remaining scroll tick for no visible effect. ALSO skipped
      // while isGliding — beginEject() just above arms a 600ms
      // transition to glide the card in from its old orbit position;
      // updateEject writes transform directly (transition: none, by
      // design, so scroll tracking stays 1:1 later on) which used to
      // fire on this exact same tick right after beginEject and kill
      // that transition before the browser ever painted a single
      // frame of it — the card just snapped straight to centre
      // instead of gliding (Evy: "hij springt er best abrupt uit").
      // Skipping updateEject for the glide's own short window lets it
      // actually play before scroll-linked scale/rotation take over.
      if (ejectedItem && !isLanded && !isGliding) updateEject(progress);
      if (ejectedItem && progress >= 1) settle();
      if (ejectedItem && progress < 1) unsettle();
      // Re-arms the idle-debounced hug-resize (see scheduleHugHeight)
      // on every tick while landed — covers a slow/discrete scroll
      // (e.g. a trackpad or button-press scroll) that could otherwise
      // stop scrolling in the exact same tick settle() itself fires.
      if (isLanded) scheduleHugHeight();
    }
    function onScroll() {
      if (!scrollTicking) {
        window.requestAnimationFrame(updateScroll);
        scrollTicking = true;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateScroll();
  }

  function init() {
    document.querySelectorAll(".eod-hero").forEach(initHero);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ===========================================================
   Awards accordion — completely independent of the tornado IIFE
   above (own scope, no shared state), so it can't be affected by
   — or accidentally affect — anything the tornado does. Toggling
   an entry sets max-height on its body from its own real scrollHeight,
   so it works regardless of how much text ends up in there.

   Same reason as the tornado's own dataset guard: Figma Sites can
   put this whole embed's <script> tag on the page more than once
   (multiple breakpoint copies, Slater's own duplicate script tags —
   see script.js's initHero for the full explanation). Without a
   per-button guard, a second run would attach a second click
   listener to the SAME button, firing the toggle twice per click
   (looks like it does nothing, since it opens then immediately
   closes again).
   =========================================================== */
(function () {
  function initAwards() {
    document.querySelectorAll("[data-eod-award-toggle]").forEach((btn) => {
      if (btn.dataset.eodAwardInit) return;
      btn.dataset.eodAwardInit = "true";
      btn.addEventListener("click", () => {
        const item = btn.closest(".eod-awards__item");
        const body = item && item.querySelector(".eod-awards__item-body");
        if (!body) return;
        const isOpen = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!isOpen));
        body.style.maxHeight = isOpen ? "" : body.scrollHeight + "px";
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAwards);
  } else {
    initAwards();
  }
})();

/* ===========================================================
   Scroll reveal — fade + rise for any element carrying
   data-eod-reveal, the first time it enters the viewport
   (including on load, for anything already on screen — e.g. the
   hero heading). data-eod-reveal-delay="1"/"2"/… staggers
   siblings within the same group.

   Independent scope, same duplicate-script-load guard pattern as
   the tornado/Awards IIFEs above (per-element dataset flags, so a
   second copy of this script tag can't double-observe or replay
   the transition-delay setup).
   =========================================================== */
(function () {
  function initReveal() {
    const els = document.querySelectorAll("[data-eod-reveal]");
    if (!els.length) return;

    els.forEach((el) => {
      if (el.dataset.eodRevealDelaySet) return;
      el.dataset.eodRevealDelaySet = "true";
      const delay = parseFloat(el.dataset.eodRevealDelay || "0");
      if (delay) el.style.transitionDelay = delay * 0.09 + "s";
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-inview");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );

    els.forEach((el) => {
      if (el.dataset.eodRevealObserved) return;
      el.dataset.eodRevealObserved = "true";
      io.observe(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initReveal);
  } else {
    initReveal();
  }
})();

/* ===========================================================
   Footer letters reveal — each letter rises up INTO view from below
   the frame, not just a fade+nudge (Evy, after seeing the first pass:
   "de letters komen 1 voor 1 van beneden [uit het frame] naar
   boven"). That needs an actual mask, not opacity: a plain translateY
   still paints the letter the whole time, just moved — nothing
   stops you seeing it early, low in the footer, before it "arrives".
   So each <path> gets its own SVG <clipPath> sized to exactly that
   letter's own bounding box (computed via getBBox() — the paths are
   arbitrary compound shapes, not uniform grid cells, so this can't be
   hand-guessed); the path then starts translated down by its own
   height (also from getBBox(), as a CSS custom property so shared.css
   doesn't need one offset value to fit every letter), fully behind
   its clip window, and animates up through it — genuinely emerging
   from the bottom edge as it crosses into the clipped area, the same
   mechanic as a mask-reveal, not a fade standing in for one.

   Same fires-once IntersectionObserver pattern as data-eod-reveal
   above for the actual scroll trigger, kept as its own block rather
   than merged in — that one also sets up transition-delay from a
   dataset attribute, which doesn't apply here (delay comes from --i
   per path, set inline in chrome.js, not one delay per element).
   =========================================================== */
(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";

  // One-time per element: give every path inside it its own clip
  // window + starting offset. Guarded by a dataset flag same as the
  // observe step below, so a duplicate script tag can't double-run
  // this and stack duplicate <clipPath> defs.
  function setupClipMasks(svg) {
    if (svg.dataset.eodLettersSetup) return;
    svg.dataset.eodLettersSetup = "true";

    let defs = svg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS(SVG_NS, "defs");
      svg.insertBefore(defs, svg.firstChild);
    }

    svg.querySelectorAll("path").forEach((path, i) => {
      let bbox;
      try {
        bbox = path.getBBox();
      } catch (e) {
        return; // not laid out (e.g. a hidden ancestor) — leave this one alone rather than clip it into permanent invisibility
      }
      if (!bbox || !bbox.height) return;

      const clipId = "eod-letter-clip-" + i + "-" + Math.random().toString(36).slice(2, 8);
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("x", bbox.x);
      rect.setAttribute("y", bbox.y);
      rect.setAttribute("width", bbox.width);
      rect.setAttribute("height", bbox.height);

      const clipPath = document.createElementNS(SVG_NS, "clipPath");
      clipPath.setAttribute("id", clipId);
      clipPath.appendChild(rect);
      defs.appendChild(clipPath);

      path.setAttribute("clip-path", "url(#" + clipId + ")");
      // Its own height (+ a hair of margin) as the starting offset —
      // CSS px on a path inside its own (unscaled-relative-to-itself)
      // SVG coordinate space maps 1:1 to SVG user units, so this
      // lines up with the clip rect above without unit conversion.
      path.style.setProperty("--letter-offset", (bbox.height + 4) + "px");
    });
  }

  function initLettersReveal() {
    const els = document.querySelectorAll("[data-eod-letters-reveal]");
    if (!els.length) return;

    els.forEach(setupClipMasks);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-inview");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );

    els.forEach((el) => {
      if (el.dataset.eodLettersObserved) return;
      el.dataset.eodLettersObserved = "true";
      io.observe(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLettersReveal);
  } else {
    initLettersReveal();
  }
})();

/* ===========================================================
   CTA cyclers — swaps which child of a data-eod-cycle wrapper
   carries .is-active on a timer; style.css stacks every candidate
   (word or badge image) in the same CSS grid cell, so the wrapper's
   size is already set by the widest/tallest one — no reflow on swap
   — and animates opacity/translateY for whichever classes are
   present. Every wrapper sharing the SAME data-eod-cycle value (e.g.
   the CTA's word AND its badge image both use "cta-role") is stepped
   together on ONE shared interval, so they can't drift out of sync —
   the badge image changes on the exact same tick as the word.
   =========================================================== */
(function () {
  function initCyclers() {
    const groups = {};
    document.querySelectorAll("[data-eod-cycle]").forEach((wrap) => {
      const key = wrap.dataset.eodCycle;
      (groups[key] || (groups[key] = [])).push(wrap);
    });

    Object.values(groups).forEach((wraps) => {
      if (wraps.some((w) => w.dataset.eodCycleInit)) return;
      wraps.forEach((w) => { w.dataset.eodCycleInit = "true"; });

      const itemSets = wraps.map((w) => Array.from(w.children));
      const count = itemSets[0].length;
      if (count < 2) return;
      let current = itemSets[0].findIndex((el) => el.classList.contains("is-active"));
      if (current < 0) current = 0;

      // .eod-cta__word opts into width-tracking (see style.css): its
      // box is meant to track whichever candidate is actually active,
      // not stay pre-reserved to the widest one — so "Design" right
      // after it visibly shifts as the word's own width changes.
      // Each candidate's true natural width is measured once, up
      // front, via a detached clone (so the measurement isn't
      // contaminated by the live grid cell's own current size), then
      // just looked up by index on every swap.
      const widthTrackedWraps = wraps.filter((w) => w.classList.contains("eod-cta__word"));
      const wordWidths = new Map();
      // Appended into the WRAP itself (not document.body): font-size,
      // letter-spacing etc. are all inherited from .eod-cta__title's
      // own cascade, which document.body doesn't have — measuring
      // there was silently sizing every word against a plain 16px
      // fallback instead of the title's real (~100px+) font-size,
      // which would have squeezed every word into a tiny box. The
      // clone is position:absolute, so it doesn't affect the wrap's
      // own layout/size while its natural width is read.
      function measureNaturalWidth(item, wrap) {
        const clone = item.cloneNode(true);
        clone.style.position = "absolute";
        clone.style.visibility = "hidden";
        clone.style.opacity = "1";
        clone.style.transform = "none";
        clone.style.whiteSpace = "nowrap";
        clone.classList.remove("is-exit");
        clone.classList.add("is-active");
        wrap.appendChild(clone);
        const width = clone.getBoundingClientRect().width;
        clone.remove();
        return width;
      }
      function syncWordWidths() {
        widthTrackedWraps.forEach((wrap) => {
          const items = Array.from(wrap.children);
          const widths = items.map((item) => measureNaturalWidth(item, wrap));
          wordWidths.set(wrap, widths);
          const maxWidth = Math.max(...widths);
          // .eod-cta__group (style.css) is width: fit-content so it can
          // be centred as a block — but sizing it off whichever word
          // happens to be active meant every swap that changed the
          // word's own width ALSO reflowed the group's centred
          // position, dragging .eod-cta__lede and the body/button row
          // sideways with it, even though only "Design" is meant to
          // move. Pinned instead to the WIDEST candidate's width,
          // measured once here (and again on resize) — momentarily
          // sizing the word box to its widest case, reading the
          // group's natural width at that size, then restoring the
          // word box to whichever word is actually active. The
          // group's own width var only changes on resize from here on,
          // never on a plain word swap.
          const group = wrap.closest(".eod-cta__group");
          if (group) {
            wrap.style.setProperty("--eod-cta-word-width", maxWidth + "px");
            group.style.removeProperty("--eod-cta-group-width");
            const naturalGroupWidth = group.getBoundingClientRect().width;
            // Guards against the very first call landing before the
            // page's own layout has actually settled (confirmed: right
            // at script execution the hero is still mid async-height-
            // settling, and everything below it — including this
            // section — briefly measures 0 wide) — a 0 reading here
            // would otherwise get set as a REAL, permanent value
            // (unlike the unset var's own fit-content fallback) and
            // never self-correct until the next resize. Skipping it
            // just leaves the fit-content fallback in place for one
            // more tick; the initial call is also deferred a frame
            // below specifically to avoid hitting this in practice.
            if (naturalGroupWidth > 0) {
              group.style.setProperty("--eod-cta-group-width", naturalGroupWidth + "px");
            }
          }
          const idx = items.findIndex((el) => el.classList.contains("is-active"));
          wrap.style.setProperty("--eod-cta-word-width", widths[idx < 0 ? 0 : idx] + "px");
        });
      }
      if (widthTrackedWraps.length) {
        // Deferred a frame (not called synchronously): at the moment
        // this script actually executes, the page's own layout hasn't
        // fully settled yet (.eod-hero's height is still being
        // determined asynchronously — see initHero above), so an
        // immediate measurement here can read 0 for everything below
        // it. One rAF is enough in practice; the >0 guard above is the
        // real safety net if it isn't.
        requestAnimationFrame(syncWordWidths);
        let wordWidthResizeTimer = null;
        window.addEventListener("resize", () => {
          clearTimeout(wordWidthResizeTimer);
          wordWidthResizeTimer = setTimeout(syncWordWidths, 150);
        });
      }

      setInterval(() => {
        const next = (current + 1) % count;
        itemSets.forEach((items) => {
          const currentEl = items[current];
          const nextEl = items[next];
          currentEl.classList.remove("is-active");
          currentEl.classList.add("is-exit");
          nextEl.classList.add("is-active");
          setTimeout(() => currentEl.classList.remove("is-exit"), 500);
        });
        widthTrackedWraps.forEach((wrap) => {
          const widths = wordWidths.get(wrap);
          if (widths) wrap.style.setProperty("--eod-cta-word-width", widths[next] + "px");
        });
        current = next;
      }, 2600);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCyclers);
  } else {
    initCyclers();
  }
})();

/* ===========================================================
   CTA row width sync — .eod-cta__row (the body copy + Contact
   button) is pinned to a rendered width via a CSS var, instead of
   stretching to the section's full remaining width. Two variants,
   since Evy's "pin the row under Design" request was desktop-only:

   --eod-cta-row-width (desktop, used by style.css's base rule):
   .eod-cta__suffix's ("Design") own rendered width — right-anchored
   under it in CSS the same way .eod-cta__title itself is now
   anchored. Previously tracked the TITLE's full rendered width
   instead, which meant the row's width (and, since it was right-
   anchored, its left edge too) changed on every word-cycler swap,
   visibly shifting the body text/button sideways under a line
   nothing about them was supposed to react to — Evy flagged that as
   unintended movement and asked the row be pinned to "Design"
   itself, matching its position and width exactly.

   --eod-cta-row-width-mobile (used by style.css's mobile media
   query): still the TITLE's own full rendered width, i.e. the old
   desktop behavior before the above change — mobile keeps its
   original shared --eod-cta-indent left-anchor and was never part
   of this request.

   Both ResizeObservers re-measure automatically whenever their
   element's width changes for any reason — a real window resize, or
   (title only) the word cycler swapping to a differently-sized
   word — so neither needs to know about the cycler's own timing.
   =========================================================== */
(function () {
  function initCtaRowWidthSync() {
    const title = document.querySelector(".eod-cta__title");
    const suffix = document.querySelector(".eod-cta__suffix");
    const cta = document.querySelector(".eod-cta");
    if (!title || !suffix || !cta || cta.dataset.eodRowWidthSyncInit) return;
    cta.dataset.eodRowWidthSyncInit = "true";

    function syncDesktop() {
      cta.style.setProperty("--eod-cta-row-width", suffix.getBoundingClientRect().width + "px");
    }
    function syncMobile() {
      cta.style.setProperty("--eod-cta-row-width-mobile", title.getBoundingClientRect().width + "px");
    }

    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(syncDesktop).observe(suffix);
      new ResizeObserver(syncMobile).observe(title);
    } else {
      window.addEventListener("resize", syncDesktop);
      window.addEventListener("resize", syncMobile);
    }
    syncDesktop();
    syncMobile();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCtaRowWidthSync);
  } else {
    initCtaRowWidthSync();
  }
})();

/* ===========================================================
   Footer parallax — GSAP ScrollTrigger, scrubbed to the scroll
   position of .eod-footer-wrap itself: from the moment its top
   enters the bottom of the viewport ("clamp(top bottom)") to the
   moment its top reaches the viewport's own top ("clamp(top top)"),
   .eod-footer (the real content) lifts in from yPercent:-25 while
   .eod-footer-wrap__dark fades from 50% black — so as the wrap
   slides up over the sticky .eod-cta above it (see style.css), the
   footer itself reads as settling into place out of shadow, rather
   than just appearing.
   REQUIRES, loaded after gsap.min.js:
     <script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/ScrollTrigger.min.js"></script>
   =========================================================== */
(function () {
  function initFooterParallax() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll("[data-eod-footer-parallax]").forEach((wrap) => {
      if (wrap.dataset.eodFooterParallaxInit) return;
      wrap.dataset.eodFooterParallaxInit = "true";

      const inner = wrap.querySelector("[data-eod-footer-parallax-inner]");
      const dark = wrap.querySelector("[data-eod-footer-parallax-dark]");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrap,
          start: "clamp(top bottom)",
          // "top top" (the wrap's OWN top reaching the viewport top) is
          // unreachable whenever the footer's content is taller than the
          // viewport — by the time you've scrolled to the very bottom of
          // the page, the wrap's top still hasn't reached the viewport
          // top, so the timeline could never complete and the reveal got
          // stuck partway (reported on tablet, where the footer's two
          // columns + full-width logo mark push it past viewport height).
          // "bottom bottom" instead completes exactly at the page's own
          // max scroll — always reachable, at any content/viewport ratio.
          end: "clamp(bottom bottom)",
          scrub: true,
        },
      });
      if (inner) tl.from(inner, { yPercent: -25, ease: "none" }, 0);
      if (dark) tl.from(dark, { opacity: 0.5, ease: "none" }, 0);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFooterParallax);
  } else {
    initFooterParallax();
  }
})();

/* ===========================================================
   Button hover jitter guard — .eod-btn__label sliding on :hover is
   now plain CSS (a fixed-distance transform, see style.css), no JS
   needed to drive the motion itself. But several of these buttons
   sit inside elements that move under the cursor while scrolling
   (.eod-cta is position:sticky and slides on screen right up until
   it engages; .eod-hero__intro scrolls normally once landed) — a
   stationary mouse can end up crossing a button's hitbox purely
   from page motion, triggering :hover repeatedly and making the
   slide stutter/"trill". While a scroll is actively happening,
   hover is suppressed entirely (pointer-events: none via
   .eod-is-scrolling on <body>) so only a genuine, deliberate hover
   after scrolling settles can trigger it.
   =========================================================== */
(function () {
  let scrollTimer = null;
  window.addEventListener(
    "scroll",
    () => {
      document.body.classList.add("eod-is-scrolling");
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => document.body.classList.remove("eod-is-scrolling"), 150);
    },
    { passive: true }
  );
})();

/* ===========================================================
   Projects grid — mouse-reactive glass/water hover (Evy: "a cool
   glass water effect on the image when you hover over, also that it
   reacts on the mouse movements"). The actual look (highlight +
   dark tint + backdrop-filter blur) is CSS (projects.css,
   .eod-projects__glass) — this just tracks the cursor and writes its
   position as --eod-glass-x/-y on whichever card it's currently over,
   as a % of THAT card's own photo, so the highlight is correctly
   positioned regardless of where the card sits in the grid.

   Delegated on .eod-projects__grid itself, not one listener per card:
   content.js's renderProjectsGrid() replaces the grid's innerHTML
   wholesale on every render (e.g. after a Sanity content refresh), so
   per-card listeners would silently pile up as orphaned duplicates —
   this survives that because the grid element itself is never
   replaced, only what's inside it. mousemove (not mouseenter) is what
   makes it feel reactive rather than just "on/off". */
(function () {
  const grid = document.querySelector(".eod-projects__grid");
  if (!grid) return;

  grid.addEventListener("mousemove", (e) => {
    const wrap = e.target.closest(".eod-projects__photo-wrap");
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    wrap.style.setProperty("--eod-glass-x", x + "%");
    wrap.style.setProperty("--eod-glass-y", y + "%");
  });

  // The actual pixel-warp (Evy, after seeing the first pass: "more
  // glassy and watery... like your touching water but the shine of
  // glass") — a CSS gradient can only ever fake light, not genuine
  // distortion, so this drives each card's own
  // <feDisplacementMap scale> (projects.html) instead. SVG element
  // attributes don't support CSS transitions, so easing the ripple in
  // and out is a small hand-rolled rAF tween rather than a CSS one —
  // wrapPos.animId tracks the in-flight tween per wrap so a fast
  // in/out/in doesn't leave two competing loops fighting over the
  // same attribute.
  const RIPPLE_SCALE = 26;
  const RIPPLE_MS = 650;
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  function animateRippleScale(wrap, to) {
    const img = wrap.querySelector(".eod-projects__photo");
    const index = img && img.dataset.glassIndex;
    if (index == null) return;
    const map = document.querySelector("#eod-glass-water-" + index + " feDisplacementMap");
    if (!map) return;

    if (wrap._eodRippleFrame) cancelAnimationFrame(wrap._eodRippleFrame);
    const from = parseFloat(map.getAttribute("scale")) || 0;
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / RIPPLE_MS, 1);
      const value = from + (to - from) * easeOutCubic(t);
      map.setAttribute("scale", value.toFixed(2));
      if (t < 1) {
        wrap._eodRippleFrame = requestAnimationFrame(tick);
      } else {
        wrap._eodRippleFrame = null;
      }
    }
    wrap._eodRippleFrame = requestAnimationFrame(tick);
  }

  grid.addEventListener("mouseover", (e) => {
    const wrap = e.target.closest(".eod-projects__photo-wrap");
    if (!wrap || wrap.contains(e.relatedTarget)) return;
    animateRippleScale(wrap, RIPPLE_SCALE);
  });
  grid.addEventListener("mouseout", (e) => {
    const wrap = e.target.closest(".eod-projects__photo-wrap");
    if (!wrap || wrap.contains(e.relatedTarget)) return;
    animateRippleScale(wrap, 0);
  });
})();
