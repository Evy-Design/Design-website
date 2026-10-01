/* ===========================================================
   Evy Diepenbroek — Shared page content

   Single source of truth for text/photos that's meant to be
   IDENTICAL on every page that shows it (Awards, the "I am a [ ]
   Design" CTA, the Timeline, and each Project). This used to be a
   hardcoded object here — it's now fetched from Sanity
   (sanity-client.js, loaded right before this file) so all of it is
   editable from the Studio instead of by hand-editing this file.
   Edit the content in Sanity — every page loading this file (Home,
   About, Projects, …) re-renders from it.

   Runs synchronously, no DOMContentLoaded wait: this script tag
   must be placed AFTER the markup for .eod-awards__list /
   .eod-cta__word / .eod-cta__badge / .eod-cta__suffix / .eod-cta__body
   (i.e. after </main>), and BEFORE script.js — so by the time
   script.js's own DOMContentLoaded-gated inits (award toggles,
   reveal-in, word/badge cyclers) run, the content below has
   already been rendered into the page. The Sanity fetch itself is a
   synchronous XHR (see sanity-client.js) specifically so this timing
   guarantee still holds with no other files needing to change.
   =========================================================== */
window.EOD_CONTENT = (function () {
  var settings = {};
  var projects = [];
  var products = [];
  var pages = {};
  try {
    settings = window.EOD_SANITY.getSiteSettings() || {};
  } catch (err) {
    console.error("Failed to load site settings from Sanity", err);
  }
  try {
    projects = window.EOD_SANITY.getProjects() || [];
  } catch (err) {
    console.error("Failed to load projects from Sanity", err);
  }
  try {
    products = window.EOD_SANITY.getProducts() || [];
  } catch (err) {
    console.error("Failed to load products from Sanity", err);
  }
  try {
    pages = window.EOD_SANITY.getPages() || {};
  } catch (err) {
    console.error("Failed to load page block order from Sanity", err);
  }
  return {settings: settings, projects: projects, products: products, pages: pages};
})();

(function () {
  function renderAwards() {
    const list = document.querySelector(".eod-awards__list");
    if (!list) return;
    const awards = window.EOD_CONTENT.settings.awards || [];
    list.innerHTML = awards.map(function (award, i) {
      return (
        '<li class="eod-awards__item" data-eod-reveal data-eod-reveal-delay="' + (i + 1) + '">' +
          '<button class="eod-awards__item-header" data-eod-award-toggle aria-expanded="false">' +
            '<span class="eod-awards__item-title">' + award.title + "</span>" +
            '<span class="eod-awards__item-year">' + award.year + "</span>" +
            // Same glyph as the site's own arrow buttons (e.g. "Go
            // back" — M26 16H6M26 16L14 8M6 16L14 24), just the two
            // diagonal strokes rotated to point down instead of left,
            // with the horizontal shaft dropped (Evy: "take the same
            // arrow that i use in the button but then only the top so
            // not the horizontal line in the middle") — a plain
            // chevron/caret instead of the ⌄ character this replaced.
            '<span class="eod-awards__item-chevron" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="M8 12L16 20L24 12" stroke-width="2" stroke-miterlimit="10"/></svg></span>' +
          "</button>" +
          '<div class="eod-awards__item-body"><p>' + award.body + "</p></div>" +
        "</li>"
      );
    }).join("");
  }

  function renderCta() {
    const cta = window.EOD_CONTENT.settings.cta || {};
    const roles = cta.roles || [];
    const wordWrap = document.querySelector(".eod-cta__word[data-eod-cycle='cta-role']");
    const badgeWrap = document.querySelector(".eod-cta__badge[data-eod-cycle='cta-role']");
    const suffixEl = document.querySelector(".eod-cta__suffix");
    const bodyEl = document.querySelector(".eod-cta__body");
    if (!wordWrap && !badgeWrap && !suffixEl && !bodyEl) return;

    if (wordWrap) {
      wordWrap.innerHTML = roles.map(function (role, i) {
        return '<span class="eod-cta__word-item eod-cta__accent' + (i === 0 ? " is-active" : "") + '">' + role.word + "</span>";
      }).join("");
    }
    if (badgeWrap) {
      badgeWrap.innerHTML = roles.map(function (role, i) {
        return '<img class="eod-cta__badge-item' + (i === 0 ? " is-active" : "") + '" src="' + role.image + '" alt="" />';
      }).join("");
    }
    if (suffixEl) suffixEl.textContent = cta.suffix || "";
    if (bodyEl) bodyEl.textContent = cta.body || "";
  }

  function renderTimeline() {
    const list = document.querySelector(".eod-timeline__list");
    const photo = document.querySelector("[data-eod-journey-photo]");
    if (!list) return;
    const items = window.EOD_CONTENT.settings.timeline || [];

    list.innerHTML = items.map(function (item, i) {
      const hasCta = item.ctaLabel && item.ctaHref;
      const isExternal = hasCta && /^https?:\/\//.test(item.ctaHref);
      // Diagonal corner-arrow (external link, opens elsewhere) vs the
      // same straight shaft-arrow "Go back"/the slider's own prev-
      // next controls use (internal, same site) — Evy: "als het een
      // link naar een andere web pagina is dat die dan schuin omhoog
      // staat... als het gewoon naar een andere pagina is op deze
      // website dat het dan een recht horizontale arrow is".
      const straightArrowSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="M6 16H26M26 16L18 8M26 16L18 24" stroke-width="2" stroke-miterlimit="10"/></svg>';
      // Trail (resting, visible) icon varies by link type — lead (only
      // revealed on hover, mid-slide) is always the straight arrow,
      // never the diagonal one, even for an external link (Evy: "de
      // arrow die tevoorschijn komt als je er overheen hovert mag
      // altijd horizontaal recht zijn").
      const trailArrowSvg = isExternal
        ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="M24 20L24 6.66667L10.6667 6.66667M24 6.66667L6.66667 24" stroke-width="2" stroke-miterlimit="10"/></svg>'
        : straightArrowSvg;
      return (
        '<li class="eod-timeline__item" data-eod-timeline-item data-index="' + i + '">' +
          '<div class="eod-timeline__row">' +
            '<div class="eod-timeline__col eod-timeline__col--meta" data-eod-timeline-col="meta">' +
              '<span class="eod-timeline__year">' + item.year + "</span>" +
              '<h3 class="eod-timeline__title">' + item.title + "</h3>" +
            "</div>" +
            '<div class="eod-timeline__col eod-timeline__col--desc" data-eod-timeline-col="desc">' +
              (item.body ? '<p class="eod-timeline__desc">' + item.body + "</p>" : "") +
              (hasCta ?
                '<div class="eod-timeline__cta">' +
                  '<a href="' + item.ctaHref + '" class="eod-btn eod-btn--secondary"' + (isExternal ? ' target="_blank" rel="noopener noreferrer"' : "") + '>' +
                    '<span class="eod-btn__secondary-viewport">' +
                      '<span class="eod-btn__secondary-track">' +
                        '<span class="eod-btn__arrow-slot eod-btn__arrow-slot--lead" aria-hidden="true">' + straightArrowSvg + "</span>" +
                        '<span class="eod-btn__label">' + item.ctaLabel + "</span>" +
                        '<span class="eod-btn__arrow-slot eod-btn__arrow-slot--trail" aria-hidden="true">' + trailArrowSvg + "</span>" +
                      "</span>" +
                    "</span>" +
                  "</a>" +
                "</div>"
              : "") +
            "</div>" +
          "</div>" +
        "</li>"
      );
    }).join("");

    // Appended AFTER the hero portrait already sitting in the figure
    // (see about.html) — not a replace — since that portrait is the
    // shared card's starting image; about.js flips into image[0] and
    // cross-fades through the rest from there.
    if (photo) {
      photo.insertAdjacentHTML("beforeend", items.map(function (item, i) {
        return '<img class="eod-journey__photo-img" data-index="' + i + '" src="' + item.image + '" alt="' + (item.alt || "") + '" />';
      }).join(""));
    }
  }

  // Projects grid (projects.html, "My work") — each card is its own
  // fixed-frame link, title shown on the photo itself in white. This
  // used to also carry a "glass water" hover effect (cursor-tracked
  // blur/glint overlay, expanding masked rings, an SVG pixel-warp
  // filter on the photo) — removed at Evy's request ("you can delete
  // this hover effect because i dont like it anyways") after it also
  // turned out to be causing real paint-corruption glitches on the
  // grid (cards rendering blank until a reload). Replaced with a
  // deliberately simple hover (Evy: "de hover over bij werk mag best
  // wel simpel zijn... een donker blure glas gevoel over de image"):
  // a plain dark blur revealed together with the title on :hover, all
  // in CSS (projects.css) — no JS driving any of it this time, since
  // this same photo also animates into the next page on click (the
  // view-transition to the case study). The title stays always
  // visible on touch devices (no :hover to reveal it there). aria-
  // label still carries the accessible name since the visible title
  // text stays aria-hidden.
  // Small disclaimer above the work grid (Evy: "voornamelijk bij
  // agency heb gewerkt en daarom helaas voor een groot deel van mijn
  // werk... niet kan laten zien") — hidden entirely (not just an
  // empty paragraph) when there's no text in Sanity, same
  // don't-show-empty-fields convention as everything else here.
  function renderProjectsIntro() {
    const wrap = document.querySelector(".eod-projects__intro");
    if (!wrap) return;
    const text = window.EOD_CONTENT.settings.projectsIntro;
    wrap.hidden = !text;
    if (text) wrap.querySelector(".eod-projects__intro-text").textContent = text;
  }

  function renderProjectsGrid() {
    const grid = document.querySelector(".eod-projects__grid");
    if (!grid) return;
    const items = window.EOD_CONTENT.projects;

    grid.innerHTML = items.map(function (item, i) {
      return (
        '<a href="project?slug=' + item.slug + '" class="eod-projects__card" aria-label="' + item.title + '" data-eod-reveal data-eod-reveal-delay="' + (i % 4) + '">' +
          '<span class="eod-projects__photo-wrap">' +
            // view-transition-name ties this photo to the matching
            // one in .eod-project__hero-img on the destination page
            // (see renderProjectDetail below) — the browser morphs
            // this element's own position/size into the hero's spot
            // across the full-page navigation instead of a plain
            // reload (Evy: "als je op een case klikt gaat de
            // afbeelding mee... de rest verdwijnt"). Needs "navigation:
            // auto" opted into on both pages (shared.css) to fire at
            // all — otherwise this is just an inert style property.
            '<img class="eod-projects__photo" src="' + item.cover + '" alt="' + (item.alt || "") + '" style="view-transition-name: eod-hero-' + item.slug + '" />' +
            // aria-hidden because the <a>'s own aria-label already
            // carries this for assistive tech. Keeps its own
            // view-transition-name (index-based, capped — projects.css
            // only defines staggered exit delays up to index 11) so it
            // still leaves the page in its own little cascade rather
            // than one flat crossfade (Evy: "de overige elementen...
            // ook 1 voor 1 uit laten animeren").
            '<span class="eod-projects__hover-title" aria-hidden="true" style="view-transition-name: eod-out-card-' + Math.min(i, 11) + '">' + item.title + "</span>" +
          "</span>" +
        "</a>"
      );
    }).join("");
  }

  // Project detail (project.html) — one shared template for every
  // case study, picking which project via ?slug= in the URL rather
  // than being a separate HTML file per project (same reasoning as
  // the Timeline/Awards being data-driven instead of hand-duplicated
  // markup: adding project #5 means adding a document in Sanity, not
  // a new page). gallery/deliverables are each only rendered if the
  // project actually provides them — see Cense above for a project
  // that currently has neither (a placeholder awaiting real content
  // from Evy).
  // Gallery/process media items come from Sanity as either a plain
  // image or a video sitting in the same "images" array slot (Evy:
  // "deze videos mogen ook gewoon lopen en automatisch afspelen
  // zonder afspeel balk er bij" — pair/full/process blocks all reuse
  // this one field, so it doubles as the video field too). Handles a
  // plain URL string too, for a content.json fetched before this
  // shape existed.
  function mediaSrc(item) {
    return typeof item === "string" ? {url: item, isVideo: false} : item;
  }
  function mediaTag(item, className) {
    const m = mediaSrc(item);
    const cls = className ? ' class="' + className + '"' : "";
    return m.isVideo
      ? '<video' + cls + ' src="' + m.url + '" autoplay muted loop playsinline></video>'
      : '<img' + cls + ' src="' + m.url + '" alt="" />';
  }

  // Shared by both a project's AND a product's "view more" gallery —
  // Evy: "use the same layout block that i use in the cases as a view
  // more... make sure this is a block so if i change this layout
  // somehwere it changes everywhere." One function, one set of CSS
  // classes (.eod-project__gallery-row etc., defined in projects.css)
  // used by both project.html and store-item.html — a class name
  // change or new block type here applies to both automatically,
  // nothing to keep in sync by hand. See renderProjectDetail's own
  // gallery-rendering comment (now here) for what each block type is.
  //
  // Each gallery entry is { type: "full", src: [one] },
  // { type: "pair", src: [two] }, { type: "text", heading, body },
  // or { type: "video", video: one } — see Sanity's `galleryBlock`
  // schema for why (the source design flows full/pair/pair/full/…,
  // not a uniform grid). A "pair" just renders its 2 images as
  // siblings inside one row div; CSS (projects.css) handles the
  // 50/50 split. "sectionText" and "introText" are both a left-
  // heading/right-body two-column block (same markup, same
  // heading/body fields in Sanity) but styled differently:
  // sectionText is a standalone block with even spacing above and
  // below; introText leads straight into the media block right
  // after it, so its own bottom spacing is deliberately tighter —
  // see projects.css's .eod-project__gallery-row--intro-text (Evy's
  // new Figma layout: "i sometimes put text in between to explain
  // the photos that come after it, thats why the padding onder te
  // text is shorter"). A "video" row is sized/rounded exactly like
  // a "full" image but with a black backdrop and the video
  // centred/contained inside it, not cropped — for a
  // portrait/vertical recording that object-fit: cover would
  // otherwise crop awkwardly.
  // Fills in the real per-project/per-product title/description/cover
  // on top of the generic static defaults already in the HTML (see
  // project.html/store-item.html's own <head> — those exist for
  // crawlers that don't run JS; this is for the ones that do, Google
  // and Bing included, so an individual project/product page gets its
  // own real search-result snippet and link-preview image instead of
  // every one sharing the same generic one). document.title is set by
  // the caller already, not here.
  function updatePageMeta(title, description, image, url) {
    const desc = (description || "").replace(/\s+/g, " ").trim().slice(0, 160);
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl && desc) descEl.setAttribute("content", desc);
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    if (canonicalEl && url) canonicalEl.setAttribute("href", url);
    [
      ['meta[property="og:title"]', "content", title],
      ['meta[property="og:description"]', "content", desc],
      ['meta[property="og:url"]', "content", url],
      ['meta[property="og:image"]', "content", image],
      ['meta[name="twitter:title"]', "content", title],
      ['meta[name="twitter:description"]', "content", desc],
      ['meta[name="twitter:image"]', "content", image],
    ].forEach(function (entry) {
      const el = document.querySelector(entry[0]);
      if (el && entry[2]) el.setAttribute(entry[1], entry[2]);
    });
  }

  function renderGalleryBlocks(blocks) {
    return (blocks || []).map(function (block) {
      if (block.type === "sectionText" || block.type === "introText") {
        const rowModifier = block.type === "introText" ? "intro-text" : "text";
        return '<div class="eod-project__gallery-row eod-project__gallery-row--' + rowModifier + '">' +
          (block.heading ? '<h2 class="eod-project__gallery-text-heading">' + block.heading + "</h2>" : "") +
          (block.body ? '<p class="eod-project__gallery-text-body">' + block.body + "</p>" : "") +
        "</div>";
      }
      if (block.type === "mockup3d") {
        // 3D iMac / iPhone with the video on its screen — turned into a
        // three.js scene by mockup3d.js.
        if (!block.video) return "";
        return '<div class="eod-project__gallery-row eod-project__gallery-row--mockup3d">' +
          '<div class="eod-mockup3d" data-eod-mockup3d="' + (block.device === "iphone" ? "iphone" : "imac") + '" data-video="' + block.video + '"></div>' +
        "</div>";
      }
      if (block.type === "video") {
        // Fills the frame and autoplays with no controls, like any
        // other gallery media (Evy: "video altijd het hele vlak
        // vullen en automatisch afspelen, dus geen control bar") —
        // muted (autoplay requires it) + loop, since there's no
        // control bar left to replay it with. initGalleryVideoPlay()
        // further down only actually plays it while it's on screen.
        return '<div class="eod-project__gallery-row eod-project__gallery-row--video">' +
          '<div class="eod-project__gallery-video">' +
            '<video src="' + block.video + '" muted loop playsinline data-eod-gallery-video></video>' +
          "</div>" +
        "</div>";
      }
      if (block.type === "process") {
        // Evy's new Figma layout (node …6871): a bordered card,
        // badge + heading + body on the left, whatever media goes
        // with it (images OR a video — Sanity's own galleryBlock
        // schema keeps these mutually exclusive for this type) on
        // the right. Media is optional; the card still works
        // text-only if a project's process has none.
        const images = block.src || [];
        let media = "";
        let mediaModifier = "";
        if (block.video) {
          media = '<video src="' + block.video + '" autoplay muted loop playsinline></video>';
        } else if (images.length > 1) {
          // More than 1 photo: stack them instead of showing just
          // the first, and the text column goes sticky (CSS) so it
          // stays in view while you scroll through the stack rather
          // than scrolling away after the first photo's height
          // (Evy: "als ze meer dan 1 foto toevoegen... dat de tekst
          // links sticky is").
          mediaModifier = " is--stacked";
          media = images.map(function (item) {
            return mediaTag(item);
          }).join("");
        } else if (images[0]) {
          media = mediaTag(images[0]);
        }
        return '<div class="eod-project__process">' +
          '<div class="eod-project__process-text">' +
            (block.badgeLabel ? '<span class="eod-project__process-badge">' + block.badgeLabel + '</span>' : "") +
            (block.heading ? '<h2 class="eod-project__process-heading">' + block.heading + '</h2>' : "") +
            (block.body ? '<p class="eod-project__process-body">' + block.body + '</p>' : "") +
          '</div>' +
          (media ? '<div class="eod-project__process-media' + mediaModifier + '">' + media + '</div>' : '') +
        '</div>';
      }
      const imgs = (block.src || []).map(function (item) {
        return mediaTag(item, "eod-project__gallery-img");
      }).join("");
      return '<div class="eod-project__gallery-row eod-project__gallery-row--' + block.type + '">' + imgs + "</div>";
    }).join("");
  }

  function renderProjectDetail() {
    const root = document.querySelector("[data-eod-project-detail]");
    if (!root) return;
    const slug = new URLSearchParams(window.location.search).get("slug");
    const items = window.EOD_CONTENT.projects;
    const item = items.find(function (p) { return p.slug === slug; }) || items[0];
    if (!item) return;

    // A hero video, when set in Sanity, plays instead of the hero
    // image (Evy: "graag zou ik ook in de hero image een video willen
    // kunnen plaatsen in sanity").
    const heroImgEl = document.querySelector(".eod-project__hero-img");
    const heroVideoEl = document.querySelector(".eod-project__hero-video");
    const hasHeroVideo = !!item.heroVideo;
    if (heroImgEl) {
      heroImgEl.hidden = hasHeroVideo;
      heroImgEl.src = item.hero || item.cover;
    }
    if (heroVideoEl) {
      heroVideoEl.hidden = !hasHeroVideo;
      heroVideoEl.src = hasHeroVideo ? item.heroVideo : "";
    }

    // Shared-element page transition from the projects grid (Evy: "als
    // je op een case klikt gaat de afbeelding mee... verplaatst naar
    // zijn nieuwe plek, wat de hero-afbeelding van de case wordt").
    // Same view-transition-name as this project's card image in
    // renderProjectsGrid() above — the browser morphs one into the
    // other across the navigation instead of a plain reload. Video
    // heroes sit this out (a video can't morph from a static photo).
    if (heroImgEl && !hasHeroVideo) {
      heroImgEl.style.viewTransitionName = "eod-hero-" + item.slug;
      // Lands at roughly the grid card's own size/ratio first (Evy:
      // "de afbeelding dezelfde maat blijft"), then grows to the full
      // hero size on the first scroll (Evy: "vanaf het moment dat je
      // gaat scrollen wordt die volledig weergegeven") — see the
      // .is--compact rule in projects.css for the actual sizing.
      heroImgEl.classList.add("is--compact");
      const expandHero = function () {
        // .is--expanding carries the transition (projects.css) — has
        // to land in its own frame BEFORE .is--compact comes off, or
        // the browser has nothing to transition FROM yet and just
        // snaps straight to the full size instead of easing into it.
        heroImgEl.classList.add("is--expanding");
        requestAnimationFrame(function () {
          heroImgEl.classList.remove("is--compact");
        });
        window.removeEventListener("scroll", expandHero);
      };
      if (window.scrollY > 0) {
        expandHero();
      } else {
        window.addEventListener("scroll", expandHero, {passive: true});
      }
    }

    // Big title at the top of the hero, ahead of the image (Evy's new
    // Figma layout) — separate from .eod-project__title further down,
    // which stays as the smaller recap heading next to the
    // description.
    const heroTitleEl = document.querySelector(".eod-project__hero-title");
    if (heroTitleEl) heroTitleEl.textContent = item.title;

    const websiteBtn = document.querySelector(".eod-project__website-btn");
    if (websiteBtn) {
      const hasWebsite = !!item.websiteUrl;
      websiteBtn.hidden = !hasWebsite;
      if (hasWebsite) websiteBtn.href = item.websiteUrl;
    }

    // See renderGalleryBlocks (above renderProjectDetail) for what
    // each block type renders — shared with the store's product page.
    const gallery = document.querySelector(".eod-project__gallery");
    if (gallery) {
      gallery.innerHTML = renderGalleryBlocks(item.gallery);
      gallery.hidden = !item.gallery || !item.gallery.length;
    }

    const titleEl = document.querySelector(".eod-project__title");
    if (titleEl) titleEl.textContent = item.title;
    document.title = "Evy Diepenbroek — " + item.title;
    updatePageMeta(
      "Evy Diepenbroek — " + item.title,
      item.description,
      item.cover,
      "https://evydiepenbroek.nl/project?slug=" + item.slug
    );

    const descEl = document.querySelector(".eod-project__description");
    if (descEl) descEl.textContent = item.description || "";

    const deliverablesEl = document.querySelector(".eod-project__deliverables");
    if (deliverablesEl) {
      const has = item.deliverables && item.deliverables.length;
      deliverablesEl.hidden = !has;
      if (has) {
        deliverablesEl.innerHTML = (
          '<h2 class="eod-project__caption">What I delivered:</h2>' +
          '<ul class="eod-project__tags">' +
            item.deliverables.map(function (d) { return "<li>" + d + "</li>"; }).join("") +
          "</ul>"
        );
      }
    }

    // "Look at other projects" itself (the card carousel) is built by
    // project-slider.js, not here — it needs the DOM fully settled
    // (clones, a drag proxy) before the slider math can run, which
    // doesn't fit this function's plain render-and-done shape.
  }

  // Store grid (store.html) — Evy: "I also want to add a store items
  // on my website, I like the store of the-brandidentity.com/store."
  // Simpler card than a project's own (no hover-reveal glass, no
  // shared-element transition into the detail page) — image, then
  // title/price plainly below it, always visible, matching that
  // reference. data-category on each card is what initStoreFilters()
  // (below) shows/hides against.
  function renderStoreGrid() {
    const grid = document.querySelector(".eod-store__grid");
    if (!grid) return;
    const items = window.EOD_CONTENT.products;

    grid.innerHTML = items.map(function (item, i) {
      return (
        '<li>' +
          '<a href="store-item?slug=' + item.slug + '" class="eod-store__card" data-eod-store-category="' + item.category + '" data-eod-reveal data-eod-reveal-delay="' + (i % 4) + '">' +
            '<span class="eod-projects__photo-wrap">' +
              '<img class="eod-projects__photo" src="' + item.cover + '" alt="' + (item.alt || "") + '" style="view-transition-name: eod-hero-' + item.slug + '" />' +
            "</span>" +
            '<span class="eod-store__info" style="view-transition-name: eod-out-card-' + Math.min(i, 11) + '">' +
              '<span>' +
                '<span class="eod-store__title">' + item.title + "</span>" +
                '<span class="eod-store__category">' + item.category + "</span>" +
              "</span>" +
              '<span class="eod-store__price">€' + item.price + "</span>" +
            "</span>" +
          "</a>" +
        "</li>"
      );
    }).join("");
  }

  // Category filter row (store.html) — every card already lives in
  // the DOM (renderStoreGrid above); this just toggles [hidden] on
  // whichever ones don't match the active filter rather than
  // re-fetching or re-rendering anything.
  function initStoreFilters() {
    const filtersEl = document.querySelector("[data-eod-store-filters]");
    if (!filtersEl) return;
    filtersEl.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-eod-store-filter]");
      if (!btn) return;
      const filter = btn.getAttribute("data-eod-store-filter");
      filtersEl.querySelectorAll("[data-eod-store-filter]").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      document.querySelectorAll("[data-eod-store-category]").forEach(function (card) {
        const li = card.closest("li");
        const show = filter === "all" || card.getAttribute("data-eod-store-category") === filter;
        if (li) li.hidden = !show;
      });
    });
  }

  // Product detail (store-item.html) — one shared template for every
  // product, exact same pattern as renderProjectDetail() above,
  // reusing the same .eod-project__hero/.eod-project__body markup
  // (projects.css) and the same renderGalleryBlocks() for its
  // gallery. No shared-element view-transition morph from the grid
  // here (see store-item.html's own comment) — just price + an Add
  // to cart button wired to cart.js via data attributes.
  function renderStoreDetail() {
    const root = document.querySelector("[data-eod-store-item-detail]");
    if (!root) return;
    const slug = new URLSearchParams(window.location.search).get("slug");
    const items = window.EOD_CONTENT.products;
    const item = items.find(function (p) { return p.slug === slug; }) || items[0];
    if (!item) return;

    const heroImgEl = document.querySelector(".eod-store-item__image");
    if (heroImgEl) {
      heroImgEl.src = item.cover;
      heroImgEl.alt = item.alt || item.title;
      // Same shared-element morph as projects.html -> project.html
      // (Evy: "Zie je hoe deze overgang is van de projects overview
      // image tot naar de individuele project pagina. Dat wil ik ook"):
      // same name scheme as renderStoreGrid()'s card image, same
      // shared.css timing. Lands at card size (.is--compact) and
      // grows to full height on the first scroll, like a case hero.
      heroImgEl.style.viewTransitionName = "eod-hero-" + item.slug;
      heroImgEl.classList.add("is--compact");
      const expandStoreHero = function () {
        heroImgEl.classList.add("is--expanding");
        requestAnimationFrame(function () {
          heroImgEl.classList.remove("is--compact");
        });
        window.removeEventListener("scroll", expandStoreHero);
      };
      if (window.scrollY > 0) expandStoreHero();
      else window.addEventListener("scroll", expandStoreHero, {passive: true});
    }

    // Gallery renders INSIDE the left media column, stacked right
    // after the cover photo, same width as it — not a separate
    // full-width section below like a project's own gallery (Evy:
    // "het is eigenlijk links een gallery of fotos 1 voor 1 wanneer
    // je scrolt en rechts blijft de tekst op zijn plek"). Still the
    // same renderGalleryBlocks() function/markup as a project's "view
    // more" — store.css just re-lays out the same
    // .eod-project__gallery-row/-img classes into one column at this
    // narrower width instead of redeclaring them.
    const gallery = document.querySelector(".eod-store-item__gallery");
    if (gallery) gallery.innerHTML = renderGalleryBlocks(item.gallery);

    const titleEl = document.querySelector(".eod-store-item__title");
    if (titleEl) titleEl.textContent = item.title;
    document.title = "Evy Diepenbroek — " + item.title;
    updatePageMeta(
      "Evy Diepenbroek — " + item.title,
      item.shortDescription,
      item.cover,
      "https://evydiepenbroek.nl/store-item?slug=" + item.slug
    );

    const descEl = document.querySelector(".eod-store-item__description");
    if (descEl) descEl.textContent = item.shortDescription || "";

    const priceEl = document.querySelector(".eod-store-item__price");
    if (priceEl) priceEl.textContent = "€" + item.price;

    const addBtn = document.querySelector("[data-eod-add-to-cart]");
    if (addBtn) {
      addBtn.setAttribute("data-slug", item.slug);
      addBtn.setAttribute("data-title", item.title);
      addBtn.setAttribute("data-price", item.price);
      addBtn.setAttribute("data-image", item.cover);
      // Whether item.buyUrl is set yet (it isn't, pending the
      // Gumroad/Lemon Squeezy account) doesn't matter here — adding
      // to the cart always works, that only becomes relevant at
      // actual checkout time (cart.js).
    }
  }

  // Static per-page copy (home hero, about hero, contact intro) that
  // isn't a repeatable list like awards/timeline/projects — see
  // renderStaticText() below for the elements it fills.
  function renderStaticText() {
    const s = window.EOD_CONTENT.settings;

    const homeTitle = document.querySelector("[data-eod-text='homeHeroTitle']");
    if (homeTitle && s.homeHeroTitle) {
      homeTitle.innerHTML = s.homeHeroTitle
        .split("\n")
        .map(function (line) { return line; })
        .join("<br />");
    }
    const homeBody = document.querySelector("[data-eod-text='homeHeroBody']");
    if (homeBody && s.homeHeroBody) homeBody.textContent = s.homeHeroBody;

    const aboutHeading = document.querySelector("[data-eod-text='aboutHeroHeading']");
    if (aboutHeading && s.aboutHeroHeading) aboutHeading.textContent = s.aboutHeroHeading;
    const aboutLede = document.querySelector("[data-eod-text='aboutHeroLede']");
    if (aboutLede && s.aboutHeroLede) aboutLede.textContent = s.aboutHeroLede;
    const aboutDetail1 = document.querySelector("[data-eod-text='aboutHeroDetail1']");
    if (aboutDetail1 && s.aboutHeroDetail1) aboutDetail1.textContent = s.aboutHeroDetail1;
    const aboutDetail2 = document.querySelector("[data-eod-text='aboutHeroDetail2']");
    if (aboutDetail2 && s.aboutHeroDetail2) aboutDetail2.textContent = s.aboutHeroDetail2;

    const portraitImg = document.querySelector("[data-eod-journey-photo] img[data-slot='hero']");
    if (portraitImg && s.aboutPortrait) portraitImg.src = s.aboutPortrait;

    const contactIntro = document.querySelector("[data-eod-text='contactIntro']");
    if (contactIntro && s.contactIntro) {
      contactIntro.firstChild.textContent = s.contactIntro + " ";
    }
    const instaLink = document.querySelector("[data-eod-text='instagramUrl']");
    if (instaLink && s.instagramUrl) instaLink.setAttribute("href", s.instagramUrl);
    const linkedinLink = document.querySelector("[data-eod-text='linkedinUrl']");
    if (linkedinLink && s.linkedinUrl) linkedinLink.setAttribute("href", s.linkedinUrl);

    const emailLinks = document.querySelectorAll("[data-eod-text='email']");
    emailLinks.forEach(function (el) {
      if (!s.email) return;
      el.setAttribute("href", "mailto:" + s.email);
      el.textContent = s.email;
    });
    const socialLinks = document.querySelectorAll("[data-eod-text='instagramUrl-nav']");
    socialLinks.forEach(function (el) { if (s.instagramUrl) el.setAttribute("href", s.instagramUrl); });
    const socialLinksLi = document.querySelectorAll("[data-eod-text='linkedinUrl-nav']");
    socialLinksLi.forEach(function (el) { if (s.linkedinUrl) el.setAttribute("href", s.linkedinUrl); });

    // Favicon (Evy: "Ik kan nog steeds geen favorite icon of web icon
    // toevoegen") — there's no <link rel="icon"> in any page's own
    // <head> to begin with, since this site has no per-request
    // server render to point one at a URL that doesn't exist until
    // Sanity is fetched. Setting it here instead, same pattern as
    // every other piece of Sanity-driven content on this site. Any
    // existing <link rel="icon"> (none currently, but harmless if one
    // gets added later) is reused rather than duplicated.
    if (s.favicon) {
      var iconLink = document.querySelector("link[rel='icon']");
      if (!iconLink) {
        iconLink = document.createElement("link");
        iconLink.rel = "icon";
        document.head.appendChild(iconLink);
      }
      iconLink.href = s.favicon;
    }
  }

  // Logo section (about.html) — a Sanity block now (Studio > Blocks >
  // Logo section); the 8 logos hardcoded in the HTML are only what
  // shows if that block has no logos yet.
  function renderLogos() {
    const grid = document.querySelector(".eod-logos__grid");
    const logos = window.EOD_CONTENT.settings.logos || [];
    if (!grid || !logos.length) return;
    grid.innerHTML = logos.map(function (logo, i) {
      return '<li class="eod-logos__tile" data-eod-reveal' + (i % 4 ? ' data-eod-reveal-delay="' + (i % 4) + '"' : "") + '><img src="' + logo.src + '" alt="' + (logo.alt || "") + '" /></li>';
    }).join("");
  }

  // Block order per page (Studio > Pages > [page] > Blocks): every
  // top-level section is tagged data-eod-block="<sanity block type>"
  // in the HTML; this re-orders them to match the page's list and
  // hides any block that's been removed from it. Runs before
  // script.js measures anything. A page with no list yet is left as
  // its HTML has it. (about hero + timeline share ONE wrapper — they
  // sit together at the position of whichever is listed first.)
  function applyBlockOrder() {
    const name = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index";
    const key = { index: "home", about: "about", contact: "contact" }[name];
    const order = key && window.EOD_CONTENT.pages[key];
    if (!order || !order.length) return;
    const els = Array.prototype.slice.call(document.querySelectorAll("main [data-eod-block]"));
    if (!els.length) return;
    const typesOf = function (el) { return el.getAttribute("data-eod-block").split(" "); };
    const sorted = [];
    order.forEach(function (type) {
      const el = els.find(function (e) { return typesOf(e).indexOf(type) !== -1; });
      if (el && sorted.indexOf(el) === -1) sorted.push(el);
    });
    els.forEach(function (el) {
      if (sorted.indexOf(el) === -1) el.style.display = "none";
    });
    const anchor = document.createComment("blocks");
    els[0].parentNode.insertBefore(anchor, els[0]);
    sorted.forEach(function (el) { anchor.parentNode.insertBefore(el, anchor); });
    anchor.remove();
  }

  // Gallery "video" blocks (renderGalleryBlocks above) only actually
  // play while on screen — several autoplaying/looping videos running
  // at once further down a long case study would be wasted CPU/
  // bandwidth for nothing visible. Plain play()/pause(), not
  // mockup3d.js's heavier machinery (no three.js/canvas here).
  function initGalleryVideoPlay() {
    const videos = document.querySelectorAll("[data-eod-gallery-video]");
    if (!videos.length) return;
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.play().catch(function () {});
        else entry.target.pause();
      });
    }, { rootMargin: "200px 0px" });
    videos.forEach(function (v) { io.observe(v); });
  }

  applyBlockOrder();
  renderStaticText();
  renderLogos();
  renderAwards();
  renderCta();
  renderTimeline();
  renderProjectsIntro();
  renderProjectsGrid();
  renderProjectDetail();
  renderStoreGrid();
  initStoreFilters();
  renderStoreDetail();
  initGalleryVideoPlay();
})();
