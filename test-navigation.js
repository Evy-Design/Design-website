(function () {
  function init() {
    var navEl = document.querySelector('.underlay-nav');
    if (!navEl) return;

    var mainEl = null;
    var bodyChildren = document.body.children;
    for (var i = 0; i < bodyChildren.length; i++) {
      var child = bodyChildren[i];
      if (child !== navEl &&
        child.tagName !== 'SCRIPT' &&
        child.tagName !== 'STYLE' &&
        child.tagName !== 'LINK' &&
        !child.classList.contains('underlay-nav')) {
        mainEl = child;
        break;
      }
    }

    if (!mainEl) return;

    mainEl.setAttribute('data-main', '');
    mainEl.style.position = 'relative';
    mainEl.style.zIndex = '2';
    mainEl.style.backgroundColor = 'inherit';

    document.body.insertBefore(navEl, document.body.firstChild);
    navEl.style.display = '';

    highlightCurrentPage();
    initBackgroundDetection();
    initFixedUnderlayNavigation(mainEl);
  }

  function highlightCurrentPage() {
    var path = window.location.pathname.replace(/\/$/, '') || '/';
    var links = document.querySelectorAll('.underlay-nav__link-large');
    links.forEach(function (link) {
      var hrefAttr = link.getAttribute('href');
      if (!hrefAttr) return; // disabled/"coming soon" items (e.g. Projects) aren't real links
      var href = hrefAttr.replace(/\/$/, '') || '/';
      link.classList.remove('w--current');
      if (href === path) {
        link.classList.add('w--current');
      }
    });
  }

  function initBackgroundDetection() {
    var header = document.querySelector('.underlay-nav__header');
    if (!header) return;

    function checkBackground() {
      var logoEl = document.querySelector('.underlay-nav__logo');
      var toggleEl = document.querySelector('.underlay-nav__toggle');
      if (!logoEl || !toggleEl) return;

      var points = [
        logoEl.getBoundingClientRect(),
        toggleEl.getBoundingClientRect()
      ];

      var isDark = false;
      for (var i = 0; i < points.length; i++) {
        var rect = points[i];
        var x = rect.left + rect.width / 2;
        var y = rect.top + rect.height / 2;

        header.style.pointerEvents = 'none';
        header.style.visibility = 'hidden';
        var el = document.elementFromPoint(x, y);
        header.style.visibility = '';
        header.style.pointerEvents = '';

        if (el) {
          var bg = getEffectiveBackground(el);
          if (bg && isLightColor(bg)) {
            isDark = true;
            break;
          }
        }
      }

      if (isDark) {
        header.classList.add('is--dark');
      } else {
        header.classList.remove('is--dark');
      }
    }

    function getEffectiveBackground(el) {
      var current = el;
      while (current && current !== document.documentElement) {
        var bg = getComputedStyle(current).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          return bg;
        }
        current = current.parentElement;
      }
      return null;
    }

    function isLightColor(color) {
      var match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return false;
      var r = parseInt(match[1]);
      var g = parseInt(match[2]);
      var b = parseInt(match[3]);
      var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.6;
    }

    checkBackground();
    window.addEventListener('scroll', function () {
      requestAnimationFrame(checkBackground);
    });
    window.addEventListener('resize', function () {
      requestAnimationFrame(checkBackground);
    });
  }

  function initFixedUnderlayNavigation(mainEl) {
    CustomEase.create("energy", "M0,0 C0.32,0.72 0,1 1,1");

    var toggleBtn = document.querySelector("[data-underlay-nav-toggle]");
    var toggleLabels = document.querySelectorAll(".underlay-nav__toggle-label");
    var toggleBars = document.querySelectorAll(".underlay-nav__toggle-bar");
    var menuEl = document.querySelector("[data-underlay-nav-menu]");
    var largeItems = document.querySelectorAll("[data-reveal-l]");
    var smallItems = document.querySelectorAll("[data-reveal-s]");
    var menuBorder = document.querySelector(".underlay-nav__bottom-border");
    var overlayEl = document.querySelector("[data-underlay-nav-overlay]");
    var darkEl = document.querySelector(".underlay-nav__dark");
    var corners = document.querySelectorAll(".underlay-nav__corner");
    var overlayBorders = document.querySelectorAll(".underlay-nav__border-row");

    if (!toggleBtn || !menuEl || !mainEl || !overlayEl) return;

    var header = document.querySelector('.underlay-nav__header');
    var openColor = getComputedStyle(menuEl).color;

    function getClosedColor() {
      return header && header.classList.contains('is--dark') ? '#1a1a1a' : '#fff';
    }

    var isOpen = false;
    var tl;
    var enterEndTime = 0;

    var getMenuOffset = function () { return -menuEl.offsetWidth; };

    gsap.set(overlayEl, { visibility: "hidden", pointerEvents: "none" });
    gsap.set(darkEl, { autoAlpha: 0 });
    gsap.set(mainEl, { x: 0 });
    gsap.set(toggleLabels, { yPercent: 0 });
    gsap.set(toggleBars, { y: 0, rotation: 0 });
    gsap.set(menuBorder, { scaleX: 0 });
    gsap.set(overlayBorders[0], { yPercent: -100 });
    gsap.set(overlayBorders[1], { yPercent: 100 });
    gsap.set(corners, { scale: 0 });

    function buildTimeline() {
      tl = gsap.timeline({
        paused: true,
        defaults: {
          ease: "energy",
          easeReverse: "power2.inOut"
        }
      });

      tl.set(overlayEl, { visibility: "visible", pointerEvents: "auto" }, 0);

      tl.to([mainEl, overlayEl], {
          x: getMenuOffset,
          duration: 0.7,
        }, 0)

        .to(darkEl, {
          autoAlpha: 1,
          duration: 0.5,
        }, 0)

        .to(corners, {
          scale: 1,
          duration: 0.5,
        }, 0)

        .to(overlayBorders, {
          yPercent: 0,
          duration: 0.5,
        }, 0)

        .to(toggleLabels, {
          yPercent: -100,
          duration: 0.4,
        }, 0)

        .to(toggleBtn, {
          color: openColor,
          duration: 0.4,
        }, 0)

        .to(toggleBars[0], {
          y: "0.25em",
          rotation: 45,
          duration: 0.35,
          ease: "back.out(1.4)",
          easeReverse: "power3.out",
        }, 0.05)

        .to(toggleBars[1], {
          y: "-0.25em",
          rotation: -45,
          duration: 0.35,
          ease: "back.out(1.4)",
          easeReverse: "power3.out",
        }, 0.05)

        .fromTo(largeItems, { autoAlpha: 0, xPercent: 25 },
          {
            autoAlpha: 1,
            xPercent: 0,
            duration: 0.7,
            stagger: 0.05,
          },
          0
        )

        .fromTo(smallItems, { autoAlpha: 0, yPercent: 100 },
          {
            autoAlpha: 1,
            yPercent: 0,
            duration: 0.5,
            stagger: 0.03,
            ease: "power3.out"
          },
          0.3
        )

        .to(menuBorder, {
          scaleX: 1,
          duration: 0.5,
        }, "<");

      enterEndTime = tl.duration();

      tl.addPause();

      tl.to([largeItems, smallItems], {
          autoAlpha: 0,
          duration: 0.3,
        }, "<")

        .to([mainEl, overlayEl], {
          x: 0,
          duration: 0.6,
        }, "<")

        .to(darkEl, {
          autoAlpha: 0,
          duration: 0.35,
          ease: "power2.inOut",
        }, "<")

        .to(corners, {
          scale: 0,
          duration: 0.5,
        }, "<")

        .to(overlayBorders[0], {
          yPercent: -100,
          duration: 0.5,
        }, "<")

        .to(overlayBorders[1], {
          yPercent: 100,
          duration: 0.5,
        }, "<")

        .to(toggleBtn, {
          color: getClosedColor,
          duration: 0.25,
        }, "<+=0.1")

        .to(toggleLabels, {
          yPercent: 0,
          duration: 0.25,
          ease: "power3.in",
        }, "<")

        .to(toggleBars, {
          y: 0,
          rotation: 0,
          duration: 0.25,
          ease: "power3.in",
        }, "<")

        .set(overlayEl, {
          visibility: "hidden",
          pointerEvents: "none"
        })

        .set(toggleBtn, { clearProps: "color" });
    }

    function toggle() {
      isOpen = !isOpen;
      toggleBtn.setAttribute("aria-expanded", String(isOpen));
      toggleBtn.setAttribute("aria-label", isOpen ? "close menu" : "open menu");
      document.body.setAttribute("data-menu-status", isOpen ? "open" : "");

      if (isOpen) {
        tl.invalidate();
        if (tl.time() >= enterEndTime) tl.timeScale(1).restart();
        else tl.timeScale(1).play();
      } else {
        if (tl.time() < enterEndTime) tl.timeScale(1).reverse();
        else tl.timeScale(1).play();
      }
    }

    buildTimeline();

    toggleBtn.addEventListener("click", toggle);

    overlayEl.addEventListener("click", function () {
      if (isOpen) toggle();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) {
        toggle();
        toggleBtn.focus();
      }
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (isOpen) {
          gsap.set([mainEl, overlayEl], { x: getMenuOffset() });
        } else {
          tl.invalidate();
        }
      }, 150);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
