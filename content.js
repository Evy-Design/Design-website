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
      year: "2024",
      title: "Motion Graphic Honorable Mention Prize – Your Craft DOOH‑design challenge",
      body: "Recognised for a motion graphic entry in the Your Craft DOOH‑design challenge."
    },
    {
      year: "2024",
      title: "Motion Graphic Honorable Mention Prize – Your Craft DOOH‑design challenge",
      body: "Recognised for a motion graphic entry in the Your Craft DOOH‑design challenge."
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

  renderAwards();
  renderCta();
})();
