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
  return {settings: settings, projects: projects};
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
            '<span class="eod-awards__item-chevron" aria-hidden="true">&#8964;</span>' +
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
                        '<span class="eod-btn__arrow-slot eod-btn__arrow-slot--lead" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="M24 20L24 6.66667L10.6667 6.66667M24 6.66667L6.66667 24" stroke-width="2" stroke-miterlimit="10"/></svg></span>' +
                        '<span class="eod-btn__label">' + item.ctaLabel + "</span>" +
                        '<span class="eod-btn__arrow-slot eod-btn__arrow-slot--trail" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="M24 20L24 6.66667L10.6667 6.66667M24 6.66667L6.66667 24" stroke-width="2" stroke-miterlimit="10"/></svg></span>' +
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

  // Shared by both project render functions below — the exact same
  // markup as the Timeline's own secondary-button CTAs above, just
  // factored out since it's now used in three places instead of one.
  function secondaryButtonInner(label) {
    return (
      '<span class="eod-btn__secondary-viewport">' +
        '<span class="eod-btn__secondary-track">' +
          '<span class="eod-btn__arrow-slot eod-btn__arrow-slot--lead" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="M24 20L24 6.66667L10.6667 6.66667M24 6.66667L6.66667 24" stroke-width="2" stroke-miterlimit="10"/></svg></span>' +
          '<span class="eod-btn__label">' + label + "</span>" +
          '<span class="eod-btn__arrow-slot eod-btn__arrow-slot--trail" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="M24 20L24 6.66667L10.6667 6.66667M24 6.66667L6.66667 24" stroke-width="2" stroke-miterlimit="10"/></svg></span>' +
        "</span>" +
      "</span>"
    );
  }

  // Projects grid (projects.html, "My work") — each card is its own
  // fixed-frame link: the cover photo fills it, and the title sits
  // just below the frame's bottom edge as a secondary-button-styled
  // caption (Evy: "de tekst is het zelfde als de secondary button").
  // On hover the photo slides up by exactly the caption's own height
  // (--eod-projects-caption-h, see projects.css) while the caption
  // slides up into the gap that opens up beneath it — a push, not an
  // overlay, per Evy's own description of the effect. Pure CSS
  // (:hover), nothing here drives the motion itself.
  function renderProjectsGrid() {
    const grid = document.querySelector(".eod-projects__grid");
    if (!grid) return;
    const items = window.EOD_CONTENT.projects;

    grid.innerHTML = items.map(function (item, i) {
      return (
        '<a href="project?slug=' + item.slug + '" class="eod-projects__card" data-eod-reveal data-eod-reveal-delay="' + (i % 4) + '">' +
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
          "</span>" +
          // Own view-transition-name too (index-based, capped —
          // projects.css only defines staggered exit delays up to
          // index 11), separate from the photo's own slug-based one
          // above — this is what lets every card's caption leave the
          // page in its own little cascade instead of one flat
          // crossfade (Evy: "de overige elementen... ook 1 voor 1 uit
          // laten animeren"). Exit-only: there's no matching name on
          // project.html, so the browser just fades/lifts this away
          // rather than trying to morph it into anything.
          '<span class="eod-projects__caption" style="view-transition-name: eod-out-card-' + Math.min(i, 11) + '">' +
            '<span class="eod-btn eod-btn--secondary eod-projects__caption-btn">' + secondaryButtonInner(item.title) + "</span>" +
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
    const gallery = document.querySelector(".eod-project__gallery");
    if (gallery) {
      gallery.innerHTML = (item.gallery || []).map(function (block) {
        if (block.type === "sectionText" || block.type === "introText") {
          const rowModifier = block.type === "introText" ? "intro-text" : "text";
          return '<div class="eod-project__gallery-row eod-project__gallery-row--' + rowModifier + '">' +
            '<h2 class="eod-project__gallery-text-heading">' + block.heading + "</h2>" +
            '<p class="eod-project__gallery-text-body">' + block.body + "</p>" +
          "</div>";
        }
        if (block.type === "video") {
          return '<div class="eod-project__gallery-row eod-project__gallery-row--video">' +
            '<div class="eod-project__gallery-video">' +
              '<video src="' + block.video + '" controls playsinline></video>' +
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
              '<h2 class="eod-project__process-heading">' + block.heading + '</h2>' +
              '<p class="eod-project__process-body">' + block.body + '</p>' +
            '</div>' +
            (media ? '<div class="eod-project__process-media' + mediaModifier + '">' + media + '</div>' : '') +
          '</div>';
        }
        const imgs = (block.src || []).map(function (item) {
          return mediaTag(item, "eod-project__gallery-img");
        }).join("");
        return '<div class="eod-project__gallery-row eod-project__gallery-row--' + block.type + '">' + imgs + "</div>";
      }).join("");
      gallery.hidden = !item.gallery || !item.gallery.length;
    }

    const titleEl = document.querySelector(".eod-project__title");
    if (titleEl) titleEl.textContent = item.title;
    document.title = "Evy Diepenbroek — " + item.title;

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
  }

  renderStaticText();
  renderAwards();
  renderCta();
  renderTimeline();
  renderProjectsGrid();
  renderProjectDetail();
})();
