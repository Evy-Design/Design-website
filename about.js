/* ===========================================================
   Evy Diepenbroek — About page
   Two scroll-driven pieces: the hero (below — a real Three.js/WebGL
   scene, matching how gionatannese.com/about actually builds theirs —
   see the comment on .eod-about-hero in about.css for how that was
   confirmed) and the "My Design Journey" timeline (horizontal scrub
   on desktop/tablet, plain vertical list on mobile/small-tablet).
   =========================================================== */

/* ---- Hero scene ----
   Every piece of hero text (heading, lede, the two detail paragraphs)
   is drawn onto a canvas, turned into a THREE.CanvasTexture, and
   mapped onto its own plane in one shared scene alongside the photo
   (also a textured plane, drawn with a rounded-rect clip + a soft
   shadow baked right into its own texture). The photo's plane always
   renders in FRONT (see PHOTO_Z below), so wherever a text plane
   overlaps it on screen, the photo visibly wins — the same
   model-over-text depth relationship the reference site has, just
   with a photo card standing in for their 3D object.

   The camera is orthographic, sized so 1 world unit = 1 CSS pixel,
   with (0,0) at the CENTRE of the canvas — this makes "put this text
   block at screen position X" arithmetic direct instead of needing a
   separate DOM-coordinate conversion step every time.

   Scroll linking is the same trick as normal page content, just done
   by hand: every text mesh has a fixed "document" Y position (as if
   this were an ordinary tall page — computed once in layout()), and
   each frame its actual on-screen Y is that document position minus
   however far the wrapper has scrolled — exactly what native scroll
   does to real DOM text. The photo's mesh position is simply never
   touched by that offset, so it stays put on screen the whole time,
   full stop — nothing extra needed to make it "sticky" inside the
   scene itself (position: sticky on the <canvas> element, about.css,
   handles pinning/releasing the whole scene at the right moments).
   Real semantic markup (the sr-only block right before the canvas in
   about.html) carries the actual content for accessibility/SEO —
   the reference's own about page does exactly the same thing. */
(function () {
  function initHeroScene() {
    var section = document.querySelector("[data-eod-about-hero]");
    var wrap = document.querySelector("[data-eod-hero-canvas-wrap]");
    var canvas = document.querySelector("[data-eod-hero-canvas]");
    if (!section || !wrap || !canvas) return;
    if (!window.THREE) return;

    var PHOTO_Z = 1; // in front
    var TEXT_Z = 0;
    var GAP_PX = 40; // photo-to-text clearance either side, at the flanking bio row

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 10);
    camera.position.z = 5;

    var group = new THREE.Group();
    scene.add(group);

    var meshes = {}; // heading, lede, detail, photo
    var portraitImg = null;
    var vw = 0, vh = 0, dpr = 1;
    var maxScrollPx = 0;
    var rafId = null;
    var ready = false;

    // ---- text measuring/drawing ----
    function wrapWords(ctx, text, font, maxWidth) {
      ctx.font = font;
      var words = String(text || "").split(/\s+/).filter(Boolean);
      var lines = [];
      var line = "";
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + " " + words[i] : words[i];
        if (!line || ctx.measureText(test).width <= maxWidth) {
          line = test;
        } else {
          lines.push(line);
          line = words[i];
        }
      }
      if (line) lines.push(line);
      return lines;
    }

    // Renders `lines` onto a right-fit canvas (only as wide as the
    // widest line, not the maxWidth they were wrapped against) and
    // returns a Three.js plane mesh sized to match in world units
    // (CSS px). `align` controls how shorter lines sit within that
    // shared width — "left"/"right"/"center".
    function makeTextMesh(lines, font, lineHeightPx, color, align) {
      var measureCanvas = document.createElement("canvas");
      var mctx = measureCanvas.getContext("2d");
      mctx.font = font;
      var widest = 0;
      for (var i = 0; i < lines.length; i++) {
        widest = Math.max(widest, mctx.measureText(lines[i]).width);
      }
      widest = Math.max(widest, 1);
      var w = Math.ceil(widest);
      var h = Math.ceil(lines.length * lineHeightPx);

      var c = document.createElement("canvas");
      c.width = Math.max(1, Math.ceil(w * dpr));
      c.height = Math.max(1, Math.ceil(h * dpr));
      var ctx = c.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textBaseline = "alphabetic";
      var ascentRatio = 0.8; // approximate cap-to-baseline offset within a line
      for (var j = 0; j < lines.length; j++) {
        var lw = ctx.measureText(lines[j]).width;
        var x = align === "right" ? w - lw : align === "center" ? (w - lw) / 2 : 0;
        var y = j * lineHeightPx + lineHeightPx * ascentRatio;
        ctx.fillText(lines[j], x, y);
      }

      var texture = new THREE.CanvasTexture(c);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      var geo = new THREE.PlaneGeometry(w, h);
      var mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false });
      var mesh = new THREE.Mesh(geo, mat);
      mesh.userData.w = w;
      mesh.userData.h = h;
      return mesh;
    }

    function roundRectPath(ctx, x, y, w, h, r) {
      var rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    }

    function makePhotoMesh(img, wPx, hPx, radiusPx) {
      var pad = 36; // room for the shadow to blur into
      var c = document.createElement("canvas");
      c.width = Math.ceil((wPx + pad * 2) * dpr);
      c.height = Math.ceil((hPx + pad * 2) * dpr);
      var ctx = c.getContext("2d");
      ctx.scale(dpr, dpr);

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.32)";
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 16;
      roundRectPath(ctx, pad, pad, wPx, hPx, radiusPx);
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.restore();

      ctx.save();
      roundRectPath(ctx, pad, pad, wPx, hPx, radiusPx);
      ctx.clip();
      // object-fit: cover
      var ir = img.naturalWidth / img.naturalHeight;
      var br = wPx / hPx;
      var dw, dh, dx, dy;
      if (ir > br) { dh = hPx; dw = hPx * ir; dx = pad - (dw - wPx) / 2; dy = pad; }
      else { dw = wPx; dh = wPx / ir; dx = pad; dy = pad - (dh - hPx) / 2; }
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();

      var texture = new THREE.CanvasTexture(c);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      var geo = new THREE.PlaneGeometry(wPx + pad * 2, hPx + pad * 2);
      var mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false });
      return new THREE.Mesh(geo, mat);
    }

    // ---- responsive sizing (mirrors the site's own clamp() formulas) ----
    function clampPx(min, vwFactor, max) {
      return Math.min(Math.max(min, vw * vwFactor), max);
    }

    function build() {
      group.clear();
      meshes = {};
      if (!portraitImg) return;

      var headingFont = Math.round(clampPx(32, 0.052, 60));
      var ledeFont = Math.round(clampPx(15, 0.0075, 19));
      var detailFont = Math.round(clampPx(13, 0.006, 16));
      var isNarrow = vw <= 1024;

      var photoW = clampPx(8 * 16, 0.2, 15 * 16);
      var photoH = photoW * 5 / 4;
      var radius = 16;

      var measureCtx = document.createElement("canvas").getContext("2d");

      // Heading — same 3-line break used throughout this build.
      var headingLines = ["Hi, I’m Evy Olivia", "Diepenbroek. Nice", "to meet you!"];
      var headingLineH = headingFont * 1.3;
      var headingFontStr = "400 " + headingFont + "px \"PP Mori\", \"Helvetica Neue\", Arial, sans-serif";
      var heading = makeTextMesh(headingLines, headingFontStr, headingLineH, "#1a1a1a", "center");
      group.add(heading);
      meshes.heading = heading;

      // Bio — lede (right-aligned, flanking the photo's LEFT) and
      // detail (left-aligned, flanking the photo's RIGHT), rendered as
      // one simultaneous flanking pair — matches the reference's own
      // leftText/rightText chapter structure (confirmed straight from
      // their JS bundle), not a sequential per-paragraph reveal.
      var colMaxW = isNarrow ? Math.min(vw * 0.86, 30 * 16) : Math.min(vw * 0.34, 26 * 16);
      var ledeFontStr = "400 " + ledeFont + "px \"PP Mori\", \"Helvetica Neue\", Arial, sans-serif";
      var detailFontStr = "300 " + detailFont + "px \"PP Mori\", \"Helvetica Neue\", Arial, sans-serif";

      var ledeLines = wrapWords(measureCtx, "I’m a Graphic Designer, always chasing what’s next. I’m driven by new challenges and staying ahead of trends, and I’m currently a nominated graphic designer with two degrees in the field and over 5 years of agency experience.", ledeFontStr, colMaxW);
      var lede = makeTextMesh(ledeLines, ledeFontStr, ledeFont * 1.5, "#1a1a1a", isNarrow ? "center" : "right");
      group.add(lede);
      meshes.lede = lede;

      var detailText = "I am a creative with two degrees in Graphic and Communication Design. I began my design journey at Grafisch Lyceum Rotterdam in the Netherlands, where I studied Corporate Design and was selected for the Masterclass as one of the top students in my first year. I then earned a Bachelor’s in Graphic Communication from The University of Northampton in the UK. I concluded my studies with a nomination for The Penguin Book Cover Design Award 2022.\n\nI have several years of agency experience as a brand designer, creating and maintaining comprehensive visual identities from logo design and typography to UX design and motion graphics. I’ve collaborated with various creative professionals on projects for major companies like Microsoft and Shell, as well as startups and smaller businesses. Today, I work at a digital agency, where my focus is mainly on digital design.";
      var detailParas = detailText.split("\n\n");
      var detailLines = [];
      for (var dp = 0; dp < detailParas.length; dp++) {
        if (dp > 0) detailLines.push("");
        detailLines = detailLines.concat(wrapWords(measureCtx, detailParas[dp], detailFontStr, colMaxW));
      }
      var detail = makeTextMesh(detailLines, detailFontStr, detailFont * 1.6, "#6b6b6b", isNarrow ? "center" : "left");
      group.add(detail);
      meshes.detail = detail;

      var photo = makePhotoMesh(portraitImg, photoW, photoH, radius);
      group.add(photo);
      meshes.photo = photo;

      // ---- layout: a fixed "document" Y per block, top-down, exactly
      // like normal page content — see the file header comment. ----
      var docY = {};
      docY.heading = vh / 2; // centred in the first screen, unscrolled
      var afterHeading = docY.heading + heading.userData.h / 2;
      var gapBig = clampPx(8 * 16, 0.22, 20 * 16);
      var bioRowH = isNarrow
        ? lede.userData.h + 24 + detail.userData.h
        : Math.max(lede.userData.h, detail.userData.h);
      docY.bio = afterHeading + gapBig + bioRowH / 2;

      var afterBio = docY.bio + bioRowH / 2;
      var bottomBuffer = clampPx(8 * 16, 0.1, 14 * 16);
      maxScrollPx = Math.max(0, afterBio + bottomBuffer - vh / 2);

      wrap.style.height = (maxScrollPx + vh) + "px";

      // Static X positions (only Y moves with scroll).
      heading.position.set(0, 0, TEXT_Z);
      photo.position.set(0, 0, PHOTO_Z);
      if (isNarrow) {
        lede.position.set(0, 0, TEXT_Z);
        detail.position.set(0, 0, TEXT_Z);
      } else {
        lede.position.set(-(photoW / 2 + GAP_PX) - lede.userData.w / 2, 0, TEXT_Z);
        detail.position.set((photoW / 2 + GAP_PX) + detail.userData.w / 2, 0, TEXT_Z);
      }

      meshes._docY = docY;
      meshes._bioRowH = bioRowH;
      meshes._isNarrow = isNarrow;

      update();
    }

    function update() {
      if (!meshes.heading) return;
      var rect = wrap.getBoundingClientRect();
      var scrollPx = Math.min(Math.max(-rect.top, 0), maxScrollPx);

      var toWorldY = function (docYVal) { return (vh / 2 - docYVal) + scrollPx; };

      meshes.heading.position.y = toWorldY(meshes._docY.heading);
      if (meshes._isNarrow) {
        var half = meshes._bioRowH / 2;
        meshes.lede.position.y = toWorldY(meshes._docY.bio) + half - meshes.lede.userData.h / 2;
        meshes.detail.position.y = toWorldY(meshes._docY.bio) - half + meshes.detail.userData.h / 2;
      } else {
        meshes.lede.position.y = toWorldY(meshes._docY.bio);
        meshes.detail.position.y = toWorldY(meshes._docY.bio);
      }
      // photo.position.y intentionally left untouched — it's what
      // makes the photo read as "staying put" while the text scrolls.

      renderer.render(scene, camera);
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      vw = Math.max(1, rect.width);
      vh = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(vw, vh, false);
      camera.left = -vw / 2;
      camera.right = vw / 2;
      camera.top = vh / 2;
      camera.bottom = -vh / 2;
      camera.updateProjectionMatrix();
      if (ready) build();
    }

    function loop() {
      update();
      rafId = requestAnimationFrame(loop);
    }

    function loadImage(src) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () { resolve(img); };
        img.onerror = reject;
        img.src = src;
      });
    }

    Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      loadImage("assets/tornado Images/back-card-image/evy-portrait.jpg"),
    ]).then(function (results) {
      portraitImg = results[1];
      ready = true;
      resize();
      loop();
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeroScene);
  } else {
    initHeroScene();
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
