/* ===========================================================
   Evy Diepenbroek — Project detail: "Look at other projects" slider
   A draggable 3D spatial carousel (GSAP Draggable + InertiaPlugin),
   only used here. Two parts:

   1. buildSlides() — populates [data-spatial-slider-list] with one
      .eod-projects__card per OTHER project (same component as the
      grid on projects.html itself — image + hover-push secondary-
      button caption — so this reads as an extension of the work
      overview, not a different component; Evy: "cange that so it
      looks like the work overview as well").

   2. initEodProjectSlider() — the actual spatial-positioning engine.
      Adapted from a reference build Evy supplied (readable there as
      initSpatialCardsSlider); the maths (projecting each card onto a
      circular arc in 3D, sized so the arc's own chord length matches
      the requested gap) is kept as-is — Evy asked for THIS effect,
      just restyled, not a different motion. Renamed/namespaced to
      avoid clashing with anything else on the page, and reads its
      config (curve/gap/perspective/direction) from the SAME CSS
      custom properties (projects.css), which is why none of that
      needs to be duplicated here.
   =========================================================== */
(function () {
  function buildSlides() {
    const list = document.querySelector("[data-spatial-slider-list]");
    if (!list) return false;

    const slug = new URLSearchParams(window.location.search).get("slug");
    const all = (window.EOD_CONTENT && window.EOD_CONTENT.projects) || [];
    const others = all.filter(function (p) { return p.slug !== slug; });
    if (!others.length) return false;

    const arrowSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="M24 20L24 6.66667L10.6667 6.66667M24 6.66667L6.66667 24" stroke-width="2" stroke-miterlimit="10"/></svg>';

    list.innerHTML = others.map(function (p, i) {
      return (
        '<div data-spatial-slider-item-status="' + (i === 0 ? "active" : "inview") + '" data-spatial-slider-item class="eod-project-slider__item">' +
          '<a href="project?slug=' + p.slug + '" class="eod-projects__card eod-project-slider__card">' +
            '<span class="eod-projects__photo-wrap">' +
              '<img class="eod-projects__photo" src="' + p.cover + '" alt="' + (p.alt || "") + '" />' +
            "</span>" +
            '<span class="eod-projects__caption">' +
              '<span class="eod-btn eod-btn--secondary eod-projects__caption-btn">' +
                '<span class="eod-btn__secondary-viewport">' +
                  '<span class="eod-btn__secondary-track">' +
                    '<span class="eod-btn__arrow-slot eod-btn__arrow-slot--lead" aria-hidden="true">' + arrowSvg + "</span>" +
                    '<span class="eod-btn__label">' + p.title + "</span>" +
                    '<span class="eod-btn__arrow-slot eod-btn__arrow-slot--trail" aria-hidden="true">' + arrowSvg + "</span>" +
                  "</span>" +
                "</span>" +
              "</span>" +
            "</span>" +
          "</a>" +
        "</div>"
      );
    }).join("");

    return true;
  }

  function debounceOnWidthChange(fn, ms) {
    let lastWidth = window.innerWidth;
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (window.innerWidth === lastWidth) return;
        lastWidth = window.innerWidth;
        fn.apply(this, args);
      }, ms);
    };
  }

  function initEodProjectSlider() {
    const slideDuration = 1;
    const clickEase = "eodProjectSlider";
    if (!CustomEase.get(clickEase)) CustomEase.create(clickEase, "0.25, 0.1, 0, 1");

    document.querySelectorAll("[data-spatial-slider-init]").forEach((container) => {
      if (container._spatialSliderDraggable) container._spatialSliderDraggable.kill();
      if (container._spatialSliderImageObserver) container._spatialSliderImageObserver.disconnect();
      if (container._spatialSliderProxy) {
        gsap.killTweensOf(container._spatialSliderProxy);
        container._spatialSliderProxy.remove();
      }

      const collection = container.querySelector("[data-spatial-slider-collection]");
      const track = container.querySelector("[data-spatial-slider-list]");
      if (!collection || !track) return;

      gsap.set(track, { clearProps: "transform" });
      container.querySelectorAll("[data-spatial-slider-item]").forEach((item) => {
        gsap.set(item, { clearProps: "transform" });
      });
      container.querySelectorAll("[data-spatial-slider-clone]").forEach((el) => el.remove());

      const originalItems = Array.from(track.querySelectorAll(":scope > [data-spatial-slider-item]:not([data-spatial-slider-clone])"));
      if (!originalItems.length) return;

      container.setAttribute("role", "region");
      container.setAttribute("aria-roledescription", "carousel");
      container.setAttribute("aria-label", container.getAttribute("aria-label") || "Other projects");
      track.setAttribute("role", "group");
      track.setAttribute("aria-label", "Slides");

      // Just prev/next (Evy: "de slidernavigatie hoeft alleen uit 2
      // pijlen te bestaan") — no dot generation; [data-spatial-slider-
      // control] below only ever matches those two buttons.
      const controls = Array.from(container.querySelectorAll("[data-spatial-slider-control]"));
      const totalEl = container.querySelector("[data-spatial-slider-total-slide]");
      const indicators = Array.from(container.querySelectorAll("[data-spatial-slider-active-slide]"));
      const mod = (value, total) => ((value % total) + total) % total;
      const formatNumber = (value) => (value < 10 ? "0" + value : String(value));

      if (totalEl) totalEl.textContent = formatNumber(originalItems.length);

      originalItems.forEach((item, index) => {
        item.removeAttribute("data-spatial-slider-item-status");
        item.removeAttribute("aria-hidden");
        item.setAttribute("role", "group");
        item.setAttribute("aria-label", `Slide ${index + 1} of ${originalItems.length}`);
      });

      controls.forEach((btn) => {
        const value = btn.getAttribute("data-spatial-slider-control");
        if (value === "prev") btn.setAttribute("aria-label", "Previous slide");
        if (value === "next") btn.setAttribute("aria-label", "Next slide");
        if (/^\d+$/.test(value)) {
          btn.setAttribute("aria-label", `Go to slide ${value}`);
          btn.setAttribute("aria-current", "false");
        }
      });

      const containerStyles = getComputedStyle(container);
      const trackStyles = getComputedStyle(track);
      const curve = Math.abs(parseFloat(containerStyles.getPropertyValue("--slider-curve"))) || 12;
      const directionValue = parseFloat(containerStyles.getPropertyValue("--slider-direction"));
      const direction = directionValue < 0 ? -1 : 1;
      const gap = parseFloat(trackStyles.columnGap) || 0;
      const curveRadians = (curve * Math.PI) / 180;

      const firstRect = originalItems[0].getBoundingClientRect();
      const itemWidth = firstRect.width;
      const itemHeight = firstRect.height;

      const perspectiveValue = parseFloat(getComputedStyle(track).perspective);
      const perspective = Number.isFinite(perspectiveValue) ? perspectiveValue : 1200;

      const getProjectedEdgeX = (radius, angle, side) => {
        const radians = (angle * Math.PI) / 180;
        const rotation = -direction * radians;
        const localX = (side * itemWidth) / 2;
        const centerX = Math.sin(radians) * radius;
        const centerZ = direction * radius * (1 - Math.cos(radians));
        const x = centerX + localX * Math.cos(rotation);
        const z = centerZ - localX * Math.sin(rotation);
        return (x * perspective) / (perspective - z);
      };

      let spatialRadius = itemWidth / Math.sin(curveRadians);
      for (let i = 0; i < 8; i++) {
        const nextLeft = getProjectedEdgeX(spatialRadius, curve, -1);
        const currentRight = itemWidth / 2;
        const currentGap = nextLeft - currentRight;
        const correction = gap - currentGap;
        spatialRadius += correction / Math.sin(curveRadians);
      }

      const stepDistance = Math.sin(curveRadians) * spatialRadius;
      const tangentRatio = (-direction * spatialRadius) / (perspective - direction * spatialRadius);
      const edgeAngle = (Math.acos(gsap.utils.clamp(-1, 1, tangentRatio)) * 180) / Math.PI;
      const maxSideItems = Math.ceil(edgeAngle / curve);
      const maxLoopItems = maxSideItems * 2;

      const getSpatialPosition = (offset) => {
        const angle = gsap.utils.clamp(-edgeAngle, edgeAngle, offset * curve);
        const radians = (angle * Math.PI) / 180;
        return {
          x: Math.sin(radians) * spatialRadius,
          z: direction * spatialRadius * (1 - Math.cos(radians)),
          rotationY: -direction * angle,
        };
      };

      const containerRect = container.getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();
      const originX = trackRect.left + trackRect.width / 2;
      const leftLimit = containerRect.left - originX;
      const rightLimit = containerRect.right - originX;

      const isOffsetInside = (offset) => {
        if (Math.abs(offset * curve) >= edgeAngle) return false;
        const position = getSpatialPosition(offset);
        const scale = perspective / (perspective - position.z);
        const radians = (Math.abs(position.rotationY) * Math.PI) / 180;
        const halfWidth = (Math.abs(Math.cos(radians)) * itemWidth * scale) / 2;
        const x = position.x * scale;
        return x + halfWidth >= leftLimit && x - halfWidth <= rightLimit;
      };

      const getVisibleCount = () => {
        let left = 0;
        let right = 0;
        for (let i = 1; i < maxSideItems && isOffsetInside(i); i++) right = i;
        for (let i = 1; i < maxSideItems && isOffsetInside(-i); i++) left = i;
        return Math.min(maxLoopItems, 1 + left + right + 2);
      };

      const minItemsNeeded = getVisibleCount();
      const neededItems = originalItems.length >= minItemsNeeded
        ? originalItems.length
        : Math.ceil(minItemsNeeded / originalItems.length) * originalItems.length;

      for (let i = originalItems.length; i < neededItems; i++) {
        const clone = originalItems[i % originalItems.length].cloneNode(true);
        clone.setAttribute("data-spatial-slider-clone", "");
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      }

      const items = Array.from(track.querySelectorAll(":scope > [data-spatial-slider-item]"));
      const totalItems = items.length;

      track.style.height = itemHeight + "px";
      container.setAttribute("data-spatial-slider-drag-status", "grab");
      items.forEach((item) => item.setAttribute("data-spatial-slider-item-status", "not-active"));

      const proxy = document.createElement("div");
      proxy.setAttribute("data-spatial-slider-proxy", "");
      Object.assign(proxy.style, { position: "absolute", width: "1px", height: "1px", pointerEvents: "none", opacity: "0" });
      container.appendChild(proxy);
      container._spatialSliderProxy = proxy;
      gsap.set(proxy, { x: 0 });

      const setX = items.map((item) => gsap.quickSetter(item, "x", "px"));
      const setZ = items.map((item) => gsap.quickSetter(item, "z", "px"));
      const setRotationY = items.map((item) => gsap.quickSetter(item, "rotationY", "deg"));

      const getIndex = () => -gsap.getProperty(proxy, "x") / stepDistance;

      const nearestDelta = (index, realIndex) => {
        const loop = Math.round((realIndex - index) / totalItems);
        return index - (realIndex - loop * totalItems);
      };

      const getSlideDelta = (target, realIndex) => {
        let bestDelta = 0;
        let bestDistance = Infinity;
        items.forEach((item, index) => {
          if (index % originalItems.length !== target) return;
          const delta = nearestDelta(index, realIndex);
          const distance = Math.abs(delta);
          if (distance < bestDistance) {
            bestDelta = delta;
            bestDistance = distance;
          }
        });
        return bestDelta;
      };

      let lastActiveIndex = null;
      const updateActiveUI = (activeIndex, activeSlideIndex) => {
        if (activeIndex === lastActiveIndex) return;
        items.forEach((item, index) => {
          item.setAttribute("data-spatial-slider-item-status", index === activeIndex ? "active" : "inview");
        });
        indicators.forEach((el) => (el.textContent = formatNumber(activeSlideIndex + 1)));
        controls.forEach((btn) => {
          const value = btn.getAttribute("data-spatial-slider-control");
          if (!/^\d+$/.test(value)) return;
          const isActive = parseInt(value, 10) - 1 === activeSlideIndex;
          btn.setAttribute("data-spatial-slider-control-status", isActive ? "active" : "not-active");
          btn.setAttribute("aria-current", isActive ? "true" : "false");
        });
        lastActiveIndex = activeIndex;
      };

      const render = () => {
        const realIndex = getIndex();
        const activeIndex = mod(Math.round(realIndex), totalItems);
        const activeSlideIndex = activeIndex % originalItems.length;
        items.forEach((item, index) => {
          const position = getSpatialPosition(nearestDelta(index, realIndex));
          setX[index](position.x);
          setZ[index](position.z);
          setRotationY[index](position.rotationY);
        });
        updateActiveUI(activeIndex, activeSlideIndex);
      };

      controls.forEach((btn) => {
        const value = btn.getAttribute("data-spatial-slider-control");
        btn.disabled = false;
        btn.onclick = () => {
          gsap.killTweensOf(proxy);
          const currentIndex = getIndex();
          let targetIndex;
          if (value === "next" || value === "prev") {
            targetIndex = Math.round(currentIndex) + (value === "next" ? 1 : -1);
          } else if (/^\d+$/.test(value)) {
            const targetSlide = Math.max(0, Math.min(originalItems.length - 1, parseInt(value, 10) - 1));
            targetIndex = currentIndex + getSlideDelta(targetSlide, currentIndex);
          } else {
            return;
          }
          gsap.to(proxy, { x: -targetIndex * stepDistance, duration: slideDuration, ease: clickEase, onUpdate: render });
        };
      });

      container._spatialSliderDraggable = Draggable.create(proxy, {
        type: "x",
        trigger: collection,
        inertia: true,
        throwResistance: 2000,
        dragResistance: 0.05,
        maxDuration: 1,
        minDuration: 0.5,
        edgeResistance: 0.75,
        overshootTolerance: 0,
        snap: (value) => Math.round(value / stepDistance) * stepDistance,
        onDrag: render,
        onThrowUpdate: render,
        onThrowComplete: () => {
          container.setAttribute("data-spatial-slider-drag-status", "grab");
          render();
        },
        onPress: () => container.setAttribute("data-spatial-slider-drag-status", "grabbing"),
        onDragStart: () => container.setAttribute("data-spatial-slider-drag-status", "grabbing"),
        onRelease: () => container.setAttribute("data-spatial-slider-drag-status", "grab"),
      })[0];

      render();

      // Safari lazy-load fix, same as the reference build.
      container._spatialSliderImageObserver = new IntersectionObserver(([entry], observer) => {
        if (!entry.isIntersecting) return;
        container.querySelectorAll('[data-spatial-slider-item] img[loading="lazy"]').forEach((img) => {
          img.loading = "eager";
        });
        observer.disconnect();
      });
      container._spatialSliderImageObserver.observe(container);
    });

    if (initEodProjectSlider._resize) window.removeEventListener("resize", initEodProjectSlider._resize);
    initEodProjectSlider._resize = debounceOnWidthChange(initEodProjectSlider, 200);
    window.addEventListener("resize", initEodProjectSlider._resize);
  }

  function init() {
    if (typeof gsap === "undefined" || typeof Draggable === "undefined" || typeof InertiaPlugin === "undefined" || typeof CustomEase === "undefined") return;
    gsap.registerPlugin(Draggable, InertiaPlugin, CustomEase);
    if (!buildSlides()) return;
    initEodProjectSlider();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
