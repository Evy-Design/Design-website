/* ===========================================================
   Evy Diepenbroek — 3D device mockups (iMac / iPhone) with a video
   playing on the screen.

   A "3D mockup" gallery block (Studio > a project/product > Gallery
   > "3D device mockup") renders as
   <div class="eod-mockup3d" data-eod-mockup3d="imac|iphone" data-video="...">
   (content.js's renderGalleryBlocks); this file turns each of those
   into a three.js scene. Adapted from Evy's Slater/Webflow version
   (3D mockup/slater-3d-mockup.js): same scroll-driven rotation (starts
   slightly turned, ends dead-on as the block scrolls into view), same
   "any mesh that isn't the frame is the screen" trick for the iMac
   model — but:
     - three.js is loaded lazily, only once a mockup is near the
       viewport (pages without one never download it),
     - the model is self-hosted (assets/3d/imac-mockup.glb) so there's
       no GitHub/jsDelivr dependency,
     - the render loop only runs while the block is on screen,
     - the video is cover-fitted to the screen (no stretching), so a
       video of any aspect ratio works,
     - the iPhone has no model file: it's built in code (rounded
       titanium body, screen, Dynamic Island, camera plate).
   Needs the "three" import map in the page <head> (project.html /
   store-item.html).
   =========================================================== */
(function () {
  var IMAC_GLB = "assets/3d/imac-mockup.glb";
  var NON_SCREEN = ["Frame_n3d", "Stand_n3d", "Monitor_n3d"];
  var threeP = null;

  function loadThree() {
    if (!threeP) {
      threeP = Promise.all([
        import("three"),
        import("three/addons/loaders/GLTFLoader.js"),
        import("three/addons/environments/RoomEnvironment.js"),
      ]).then(function (m) {
        return { THREE: m[0], GLTFLoader: m[1].GLTFLoader, RoomEnvironment: m[2].RoomEnvironment };
      });
    }
    return threeP;
  }

  // Video aspect vs. screen aspect -> "cover" via texture repeat/offset.
  function coverFit(tex, videoEl, screenAspect) {
    function apply() {
      if (!videoEl.videoWidth) return;
      var va = videoEl.videoWidth / videoEl.videoHeight;
      tex.repeat.set(1, 1);
      tex.offset.set(0, 0);
      if (va > screenAspect) {
        tex.repeat.x = screenAspect / va;
        tex.offset.x = (1 - tex.repeat.x) / 2;
      } else {
        tex.repeat.y = va / screenAspect;
        tex.offset.y = (1 - tex.repeat.y) / 2;
      }
      tex.needsUpdate = true;
    }
    if (videoEl.readyState >= 1) apply();
    else videoEl.addEventListener("loadedmetadata", apply, { once: true });
  }

  // ---- iPhone, built in code (units ~ 1 = 1cm) ----------------------
  function roundedRect(THREE, w, h, r) {
    var s = new THREE.Shape();
    var x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x + w, y + h - r);
    s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
    s.lineTo(x + r, y + h);
    s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x, y + r);
    s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }

  function buildIphone(THREE, videoTexture) {
    var W = 7.15, H = 14.76, D = 0.78, R = 1.05;
    var g = new THREE.Group();

    var bodyGeo = new THREE.ExtrudeGeometry(roundedRect(THREE, W, H, R), {
      depth: D - 0.2, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 6, curveSegments: 24,
    });
    bodyGeo.translate(0, 0, -(D - 0.2) / 2);
    var titanium = new THREE.MeshStandardMaterial({ color: 0x3a3a3f, metalness: 0.92, roughness: 0.28 });
    g.add(new THREE.Mesh(bodyGeo, titanium));

    // Screen: same shape inset by the bezel, UVs normalised 0..1 so the
    // video texture maps straight onto it.
    var bezel = 0.16, sw = W - bezel * 2, sh = H - bezel * 2;
    var screenGeo = new THREE.ShapeGeometry(roundedRect(THREE, sw, sh, R - bezel), 24);
    var pos = screenGeo.attributes.position, uv = screenGeo.attributes.uv;
    for (var i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + sw / 2) / sw, (pos.getY(i) + sh / 2) / sh);
    var screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: videoTexture }));
    screen.position.z = D / 2 + 0.005;
    g.add(screen);

    // Dynamic Island
    var island = new THREE.Mesh(
      new THREE.ShapeGeometry(roundedRect(THREE, 2.5, 0.73, 0.365), 16),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    island.position.set(0, sh / 2 - 0.62, D / 2 + 0.012);
    g.add(island);

    // Back camera plate + 3 lenses
    var plate = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedRect(THREE, 3.3, 3.3, 0.8), { depth: 0.04, bevelEnabled: false, curveSegments: 16 }),
      new THREE.MeshStandardMaterial({ color: 0x4a4a50, metalness: 0.6, roughness: 0.35 })
    );
    plate.rotation.y = Math.PI;
    plate.position.set(W / 2 - 2.05, H / 2 - 2.05, -D / 2 - 0.02);
    g.add(plate);
    var lensMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, metalness: 0.4, roughness: 0.12 });
    var ringMat = new THREE.MeshStandardMaterial({ color: 0x8b8b90, metalness: 0.95, roughness: 0.25 });
    [[-0.78, 0.78], [0.78, 0.78], [0, -0.78]].forEach(function (p) {
      var ring = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 40), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(plate.position.x - p[0], plate.position.y + p[1], -D / 2 - 0.12);
      g.add(ring);
      var lens = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.18, 40), lensMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(ring.position.x, ring.position.y, -D / 2 - 0.13);
      g.add(lens);
    });

    // Side buttons
    var btn = new THREE.MeshStandardMaterial({ color: 0x4a4a50, metalness: 0.9, roughness: 0.3 });
    [[-W / 2 - 0.03, 3.4, 0.5], [-W / 2 - 0.03, 1.6, 1.0], [-W / 2 - 0.03, 0.2, 1.0], [W / 2 + 0.03, 2.4, 1.6]].forEach(function (b) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(0.1, b[2], 0.16), btn);
      m.position.set(b[0], b[1], 0);
      g.add(m);
    });

    return { object: g, screenAspect: sw / sh };
  }

  function initMockup(wrap) {
    var kind = wrap.getAttribute("data-eod-mockup3d");
    var videoSrc = wrap.getAttribute("data-video");
    if (!videoSrc) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var started = false;
    var io = new IntersectionObserver(function (entries) {
      if (!started && entries[0].isIntersecting) {
        started = true;
        io.disconnect();
        start();
      }
    }, { rootMargin: "600px 0px" });
    io.observe(wrap);

    function start() {
      loadThree().then(function (lib) {
        var THREE = lib.THREE;

        var canvas = document.createElement("canvas");
        canvas.className = "eod-mockup3d__canvas";
        wrap.appendChild(canvas);

        var video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.preload = "auto";
        video.src = videoSrc;
        video.style.display = "none";
        wrap.appendChild(video);

        var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        var key = new THREE.DirectionalLight(0xffffff, 1.1);
        key.position.set(2, 3, 4);
        scene.add(key);
        var pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new lib.RoomEnvironment(), 0.04).texture;

        var tex = new THREE.VideoTexture(video);
        tex.colorSpace = THREE.SRGBColorSpace;

        var model = null;
        var visible = true;
        var progress = reduce ? 1 : 0;
        var startRot = kind === "iphone" ? { x: -0.1, y: -Math.PI * 0.32 } : { x: -0.15, y: Math.PI * 0.25 };

        function resize() {
          var w = wrap.clientWidth, h = wrap.clientHeight;
          if (!w || !h) return;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          frame();
        }
        function frame() {
          if (!model) return;
          model.rotation.set(0, 0, 0);
          var box = new THREE.Box3().setFromObject(model);
          var size = box.getSize(new THREE.Vector3());
          var c = box.getCenter(new THREE.Vector3());
          var vfov = camera.fov * Math.PI / 180;
          var hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
          // fit the model inside the view on whichever axis is tighter
          var dist = Math.max(size.y / 2 / Math.tan(vfov / 2), size.x / 2 / Math.tan(hfov / 2)) * 1.35 + size.z / 2;
          camera.position.set(c.x, c.y, c.z + dist);
          camera.near = dist / 100;
          camera.far = dist * 100;
          camera.lookAt(c);
          camera.updateProjectionMatrix();
          setRot();
        }
        function setRot() {
          if (!model) return;
          model.rotation.x = startRot.x * (1 - progress);
          model.rotation.y = startRot.y * (1 - progress);
        }

        function ready(obj, screenAspect) {
          model = obj;
          scene.add(model);
          coverFit(tex, video, screenAspect);
          resize();
          wrap.classList.add("is-ready");
          renderer.render(scene, camera);
        }

        if (kind === "iphone") {
          var built = buildIphone(THREE, tex);
          ready(built.object, built.screenAspect);
        } else {
          new lib.GLTFLoader().load(IMAC_GLB, function (gltf) {
            var display = gltf.scene;
            var screenAspect = 16 / 9;
            display.traverse(function (o) {
              if (o.isMesh && NON_SCREEN.indexOf(o.name) === -1) {
                // The model's own UVs don't span the full 0..1 range, so
                // rebuild them from the screen's outline (front-facing
                // plane, x/y) — otherwise the video only covers part of it.
                o.geometry.computeBoundingBox();
                var bb = o.geometry.boundingBox, s = bb.getSize(new THREE.Vector3());
                var gp = o.geometry.attributes.position;
                var uvs = new Float32Array(gp.count * 2);
                for (var i = 0; i < gp.count; i++) {
                  uvs[i * 2] = (gp.getX(i) - bb.min.x) / s.x;
                  uvs[i * 2 + 1] = (gp.getY(i) - bb.min.y) / s.y;
                }
                o.geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
                if (s.y) screenAspect = s.x / s.y;
                o.material = new THREE.MeshBasicMaterial({ map: tex });
              }
            });
            ready(display, screenAspect);
          }, undefined, function (err) { console.error("3D mockup: could not load model", err); });
        }

        if (!reduce && window.gsap && window.ScrollTrigger) {
          window.gsap.registerPlugin(window.ScrollTrigger);
          window.ScrollTrigger.create({
            trigger: wrap,
            start: "top bottom",
            end: "top 15%",
            scrub: true,
            onUpdate: function (self) { progress = self.progress; setRot(); },
          });
        }

        // Only spend GPU/CPU (and play the video) while it's on screen.
        var vio = new IntersectionObserver(function (e) {
          visible = e[0].isIntersecting;
          if (visible) video.play().catch(function () {});
          else video.pause();
        });
        vio.observe(wrap);

        (function loop() {
          requestAnimationFrame(loop);
          if (!visible || !model) return;
          tex.needsUpdate = true;
          renderer.render(scene, camera);
        })();

        window.addEventListener("resize", resize);
        video.play().catch(function () {});
      }).catch(function (err) { console.error("3D mockup: three.js failed to load", err); });
    }
  }

  function init() {
    document.querySelectorAll("[data-eod-mockup3d]").forEach(initMockup);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
