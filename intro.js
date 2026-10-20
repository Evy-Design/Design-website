/* ===========================================================
   Loading intro (homepage only).
   1. "Hi, I'm Evy," / "Nice to meet you." slide up line by line, then out.
   2. "Have a look at all my work" appears in the middle.
   3. It splits in two and glides to where the hero heading stands
      ("Have a look" left, "at all my work" right). On phones there is no
      heading, so the halves drift apart and fade instead.
   4. The tornado and the menu fade in.
   The hero heading is hidden (CSS) until the very end, when the real text
   takes over exactly where the moving copy stopped.
   The "pending" switch is set by the script in index.html's <head>; see
   style.css for what each state hides.
   =========================================================== */
(function () {
  var root = document.documentElement;
  if (root.getAttribute("data-intro") !== "pending") return;

  var HOLD_HELLO = 1.0; // seconds "Hi, I'm Evy" stays before leaving
  var HOLD_WORK = 0.7; // seconds the phrase sits in the middle before splitting

  var intro = document.querySelector(".eod-intro");
  var hero = document.querySelector(".eod-hero");
  var spans = hero ? hero.querySelectorAll(".eod-hero__heading > span") : [];

  function done() {
    root.removeAttribute("data-intro");
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
  }

  if (!intro || spans.length < 2 || !window.gsap) {
    done();
    return;
  }

  try { sessionStorage.setItem("eod-intro-seen", "1"); } catch (e) {}

  var lines = intro.querySelectorAll(".eod-intro__line > span");
  var work = intro.querySelector(".eod-intro__work");
  var parts = work.querySelectorAll(".eod-intro__part");

  function start() {
    try {
      // The heading is display:none on phones (style.css).
      var mobile = spans[0].getBoundingClientRect().width === 0;

      // Where the halves have to end up (desktop): measured now, before
      // anything is moved.
      // The heading spans still carry their own slide-in offset (3em,
      // data-eod-reveal) until their reveal fires, so measure them with
      // that switched off.
      var moves = [];
      if (!mobile) {
        for (var i = 0; i < 2; i++) {
          var from = parts[i].getBoundingClientRect();
          var saved = [spans[i].style.transform, spans[i].style.transition];
          spans[i].style.transition = "none";
          spans[i].style.transform = "none";
          var to = spans[i].getBoundingClientRect();
          spans[i].style.transform = saved[0];
          spans[i].style.transition = saved[1];
          moves.push({ x: to.left - from.left, y: to.top - from.top });
        }
      }

      gsap.set(lines, { yPercent: 115 });
      gsap.set(intro.querySelector(".eod-intro__hello"), { visibility: "visible" });
      gsap.set(parts, { opacity: 0, y: 36 });

      var tl = gsap.timeline({ onComplete: done });

      // 1. Hello
      tl.to(lines, { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.14 }, 0.3)
        .to(lines, { yPercent: -115, duration: 0.8, ease: "power3.inOut", stagger: 0.08 }, "+=" + HOLD_HELLO);

      // 2. The phrase appears, centred — only once the greeting is gone
      tl.set(work, { visibility: "visible" }, ">+0.15")
        .to(parts, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.12 }, "<");

      // 3. It splits in two
      var split = "split";
      tl.addLabel(split, "+=" + HOLD_WORK);
      if (mobile) {
        tl.to(parts[0], { y: -90, opacity: 0, duration: 1.0, ease: "power3.inOut" }, split)
          .to(parts[1], { y: 90, opacity: 0, duration: 1.0, ease: "power3.inOut" }, split);
      } else {
        tl.to(parts[0], { x: moves[0].x, y: moves[0].y, duration: 1.3, ease: "power4.inOut" }, split)
          .to(parts[1], { x: moves[1].x, y: moves[1].y, duration: 1.3, ease: "power4.inOut" }, split);
      }

      // 4. Tornado + menu come in while the halves are still arriving
      tl.add(function () { root.setAttribute("data-intro", "reveal"); }, split + "+=" + (mobile ? 0.55 : 0.8));
    } catch (e) {
      done();
    }
  }

  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1500); })]).then(start);
})();
