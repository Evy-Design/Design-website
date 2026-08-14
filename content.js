/* ===========================================================
   Evy Diepenbroek — Shared page content

   Single source of truth for text that's meant to be IDENTICAL on
   every page that shows it (Awards, the "I am a [ ] Design" CTA).
   Edit the data below once — every page loading this file (Home,
   About, …) re-renders from it, so there's no separate copy to
   remember to update elsewhere.

   Runs synchronously, no DOMContentLoaded wait: this script tag
   must be placed AFTER the markup for .eod-awards__list /
   .eod-cta__word / .eod-cta__badge / .eod-cta__suffix / .eod-cta__body
   (i.e. after </main>), and BEFORE script.js — so by the time
   script.js's own DOMContentLoaded-gated inits (award toggles,
   reveal-in, word/badge cyclers) run, the content below has
   already been rendered into the page.
   =========================================================== */
window.EOD_CONTENT = {
  awards: [
    {
      year: "2022",
      title: "The Penguin Cover Design Award",
      body: "My book design cover was shortlisted for the 2022 Fiction category, Girl, Woman, Other by Bernardine Evaristo with Penguin Random House UK. Everything was incredible. I've learned alot and met some amazing and inspirational people. I'm grateful and honoured to have been selected for this."
    },
    {
      year: "2024",
      title: "Motion Graphic Honorable Mention Prize – Your Craft DOOH‑design challenge",
      body: "In this challenge, I won the Motion Design Honorable Mention Prize. The goal was to celebrate authenticity and unique craftsmanship, using the Netherlands as a canvas. Global and RA*W launched the 2024 Digital Out-of-Home challenge, showcasing work on over 2650 digital screens nationwide. The focus was on evoking emotions and inspiring passersby with creativity. I'm honored to be recognized for my contribution."
    }
  ],
  // The About page's "Time line" section — add a new milestone by
  // adding a new object here, nowhere else. Order here is DOM order
  // (top-to-bottom as you scroll), so put new entries wherever they
  // belong chronologically rather than always at an end. `body` and
  // the `cta` pair are both OPTIONAL — omit either on a milestone that
  // doesn't have one (see renderTimeline() below, which only renders
  // what's actually provided).
  timeline: [
    {
      year: "2026 – Now",
      title: "Creative / UX&UI designer at Kool Collective",
      image: "assets/timeline/Kool Collective.jpg",
      alt: "Evy's work at Kool Collective",
      ctaLabel: "Go to website",
      ctaHref: "https://koolcollective.nl"
    },
    {
      year: "2022 – 2025",
      title: "Brand Designer at NOSUCH",
      image: "assets/timeline/Nosuch_Evy.jpg",
      alt: "Evy's brand design work at NOSUCH",
      body: "As a designer at NOSUCH, I create and maintain comprehensive visual identities, covering logo design, typography, UX design, motion graphics, and all other aspects of visual identity. Within the agency, I collaborate closely with various creative professionals, designing for major companies like Microsoft and Shell, as well as startups and smaller companies.",
      ctaLabel: "Go to website",
      ctaHref: "https://nosuch.nl"
    },
    {
      year: "2024",
      title: "Global DOOH-Motion Design Challenge Honorable Mention Prize",
      image: "assets/timeline/Global DOOH-Motion Design Challenge  Honorable Mention Prize.jpeg",
      alt: "Evy's Digital Out-of-Home motion design entry",
      body: "In this challenge, I won the Motion Design Honorable Mention Prize. The goal was to celebrate authenticity and unique craftsmanship, using the Netherlands as a canvas. Global and RA*W launched the 2024 Digital Out-of-Home challenge, showcasing work on over 2650 digital screens nationwide. The focus was on evoking emotions and inspiring passersby with creativity. I'm honored to be recognized for my contribution."
    },
    {
      year: "2022",
      title: "Bachelor Of Arts In Graphic Communication",
      image: "assets/timeline/Bachelor Of Arts In Graphic Communication.jpg",
      alt: "Evy's graduation work in Graphic Communication",
      body: "In 2021 I got the opportunity to move to the United Kingdom and get my bachelor's degree in Graphic Communication from The University of Northampton. I did this not only for the amazing travel experience but also expand my range in design and to increase my level at the same time.",
      // TODO: swap in the real LinkedIn profile URL when it's ready —
      // matches the same "#" placeholder the nav's own LinkedIn link
      // currently uses.
      ctaLabel: "View my LinkedIn",
      ctaHref: "#"
    },
    {
      year: "2022",
      title: "The Penguin Cover Design Award",
      image: "assets/timeline/The Penguin Cover Design Award.webp",
      alt: "The Girl, Woman, Other Penguin book cover design",
      body: "My book design cover was shortlisted for the 2022 Fiction category, Girl, Woman, Other by Bernardine Evaristo with Penguin Random House UK. Everything was incredible. I've learned alot and met some amazing and inspirational people. I'm grateful and honoured to have been selected for this.",
      // TODO: point at the real case-study/project page once one
      // exists — falling back to the general work page for now.
      ctaLabel: "View this project",
      ctaHref: "/projects"
    },
    {
      year: "2021 – 2018",
      title: "MBO Media & Corporate Design",
      image: "assets/timeline/MBO Media & Corporate Design.webp",
      alt: "Evy's MBO Media & Corporate Design coursework",
      body: "in 2021 I graduated as a graphic designer at Grafisch Lyceum Rotterdam. After studying for 3 years, I could then officially call myself a graphic designer."
    },
    {
      year: "2018",
      title: "Masterclass",
      image: "assets/timeline/Masterclass.webp",
      alt: "Evy's Masterclass coursework",
      body: "I am a dedicated worker who thrives on new challenges. And as they say, working hard pays off. So, after the first year of my study, I was accepted into the Masterclass of my college. Every year a select number of people are allowed to enter this class. This class is for students with a higher level of design and who wants an extra challenge. In this class you get more assignments and you work together with the class for external companies."
    }
  ],
  cta: {
    // Each role's word and badge image cycle together in lockstep
    // (script.js's initCyclers steps every data-eod-cycle="cta-role"
    // wrapper on one shared interval) — index i here becomes the i-th
    // word AND the i-th badge image, so they can never drift apart.
    roles: [
      { word: "Motion", image: "https://images.unsplash.com/photo-1523294587484-bae6cc870010?w=500&h=700&fit=crop" },
      { word: "Brand", image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=500&h=700&fit=crop" },
      { word: "UI/UX", image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=500&h=700&fit=crop" },
      { word: "Graphic", image: "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?w=500&h=700&fit=crop" }
    ],
    suffix: "Design",
    body: "Lets have a coffee and talk about what I can be for you, text here longer need"
  }
};

(function () {
  function renderAwards() {
    const list = document.querySelector(".eod-awards__list");
    if (!list) return;
    list.innerHTML = window.EOD_CONTENT.awards.map(function (award, i) {
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
    const cta = window.EOD_CONTENT.cta;
    const wordWrap = document.querySelector(".eod-cta__word[data-eod-cycle='cta-role']");
    const badgeWrap = document.querySelector(".eod-cta__badge[data-eod-cycle='cta-role']");
    const suffixEl = document.querySelector(".eod-cta__suffix");
    const bodyEl = document.querySelector(".eod-cta__body");
    if (!wordWrap && !badgeWrap && !suffixEl && !bodyEl) return;

    if (wordWrap) {
      wordWrap.innerHTML = cta.roles.map(function (role, i) {
        return '<span class="eod-cta__word-item eod-cta__accent' + (i === 0 ? " is-active" : "") + '">' + role.word + "</span>";
      }).join("");
    }
    if (badgeWrap) {
      badgeWrap.innerHTML = cta.roles.map(function (role, i) {
        return '<img class="eod-cta__badge-item' + (i === 0 ? " is-active" : "") + '" src="' + role.image + '" alt="" />';
      }).join("");
    }
    if (suffixEl) suffixEl.textContent = cta.suffix;
    if (bodyEl) bodyEl.textContent = cta.body;
  }

  function renderTimeline() {
    const list = document.querySelector(".eod-timeline__list");
    const photo = document.querySelector("[data-eod-journey-photo]");
    if (!list) return;
    const items = window.EOD_CONTENT.timeline;

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
                  '<a href="' + item.ctaHref + '" class="eod-btn eod-btn--light"' + (isExternal ? ' target="_blank" rel="noopener noreferrer"' : "") + '>' +
                    '<span class="eod-btn__label">' + item.ctaLabel + "</span>" +
                    '<span class="eod-btn__circle eod-btn__circle--accent" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="M24 20L24 6.66667L10.6667 6.66667M24 6.66667L6.66667 24" stroke-width="2" stroke-miterlimit="10"/></svg></span>' +
                    '<span class="eod-btn__circle eod-btn__circle--white" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="M24 20L24 6.66667L10.6667 6.66667M24 6.66667L6.66667 24" stroke-width="2" stroke-miterlimit="10"/></svg></span>' +
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
        return '<img class="eod-journey__photo-img" data-index="' + i + '" src="' + item.image + '" alt="' + item.alt + '" />';
      }).join(""));
    }
  }

  renderAwards();
  renderCta();
  renderTimeline();
})();
