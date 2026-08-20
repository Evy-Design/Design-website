/* ===========================================================
   Evy Diepenbroek — Contact page
   Two independent pieces: word-by-word reveal-in for the intro
   paragraph, and the hover-triggered "page turns blue, a huge
   banner slides up with the actual contact detail" effect on the
   Emailing/Instagram/LinkedIn links.
   =========================================================== */

/* ---- Word-by-word reveal ----
   Splits each [data-eod-word-reveal] paragraph's text into one
   .eod-word span per word (a .eod-contact__link stays intact as ONE
   word, rather than being split apart, since it's a single clickable
   unit) and staggers them in via IntersectionObserver, mirroring the
   fade+rise language [data-eod-reveal] already uses elsewhere in
   this project — just per word instead of per block. */
(function () {
  function wrapWords(container) {
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    var textNodes = [];
    var node;
    while ((node = walker.nextNode())) textNodes.push(node);

    textNodes.forEach(function (textNode) {
      var parts = textNode.textContent.split(/(\s+)/); // keep whitespace as its own parts
      var frag = document.createDocumentFragment();
      parts.forEach(function (part) {
        if (part === "") return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
        } else {
          var span = document.createElement("span");
          span.className = "eod-word";
          span.textContent = part;
          frag.appendChild(span);
        }
      });
      textNode.parentNode.replaceChild(frag, textNode);
    });

    // A .eod-contact__link's own text just got split into word-spans
    // too (the walker doesn't distinguish it from plain text) — undo
    // that specifically for links, so the whole link is one word.
    // Wrapped in its OWN new <span class="eod-word"> rather than
    // putting that class directly on the <a> (an earlier version did
    // this): the reveal's opacity+transform were landing on the
    // anchor itself, which also carries text-decoration: underline —
    // that combination (an inline <a> forced to display:inline-block,
    // transformed, AND underlined) is exactly the case where some
    // browsers stop keeping the underline glued to the letters as
    // they translate, so the link visibly read as "not fading in
    // smoothly" like the plain words around it. Moving the transform
    // to a plain wrapper span, with the untouched <a> just riding
    // along inside it as ordinary content, sidesteps that combination
    // entirely instead of fighting the browser's rendering of it.
    container.querySelectorAll(".eod-contact__link").forEach(function (link) {
      link.querySelectorAll(".eod-word").forEach(function (inner) {
        inner.replaceWith(inner.textContent);
      });
      var wrap = document.createElement("span");
      wrap.className = "eod-word";
      link.parentNode.insertBefore(wrap, link);
      wrap.appendChild(link);
    });
  }

  function initWordReveal() {
    var containers = document.querySelectorAll("[data-eod-word-reveal]");
    containers.forEach(function (container) {
      if (container.dataset.eodWordRevealInit) return;
      container.dataset.eodWordRevealInit = "true";

      wrapWords(container);

      var words = container.querySelectorAll(".eod-word");
      words.forEach(function (word, i) {
        word.style.setProperty("--i", i);
      });

      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            words.forEach(function (word) { word.classList.add("is-inview"); });
            io.unobserve(entry.target);
          });
        },
        { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
      );
      io.observe(container);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWordReveal);
  } else {
    initWordReveal();
  }
})();

/* ---- Hover reveal: page turns blue, a huge banner slides up ----
   (hover: hover) and (pointer: fine) — real mouse hover, not a
   viewport-width breakpoint: some tablets have desktop-width
   viewports but are still touch-only, and this effect has no
   sensible touch equivalent (there's no "hover state" to tap into),
   so it's simply never wired up there — the links still work as
   plain links either way. */
(function () {
  function initContactHoverReveal() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var section = document.querySelector("[data-eod-contact]");
    var banner = document.querySelector("[data-eod-contact-banner]");
    var bannerText = document.querySelector("[data-eod-contact-banner-text]");
    var links = document.querySelectorAll(".eod-contact__link");
    if (!section || !banner || !bannerText || !links.length) return;

    links.forEach(function (link) {
      link.addEventListener("mouseenter", function () {
        bannerText.textContent = link.dataset.eodRevealText || link.textContent;
        section.classList.add("is-active");
        banner.classList.add("is-active");
      });
      link.addEventListener("mouseleave", function () {
        section.classList.remove("is-active");
        banner.classList.remove("is-active");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initContactHoverReveal);
  } else {
    initContactHoverReveal();
  }
})();
