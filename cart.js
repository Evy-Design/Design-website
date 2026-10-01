/* ===========================================================
   Evy Diepenbroek — Store cart

   Evy: "make sure this is a block so if i change this layout
   somehwere it changes everywhere... I dont like there being a card
   icon at the top so only if you add something to your cart there
   will be a card icont at the right whit a one and a check out side
   over page... this can be very simple it will open the same as the
   navigation so from the side but then you see your card item en a
   check out button and a crose to close it."

   State lives in localStorage (survives a reload/new tab, same-origin
   only — separate per domain, so staging and production each have
   their own) as a plain array of {slug, title, price, image, qty}.
   One source of truth loaded/saved here; every page's own chrome.js-
   injected cart icon + panel reads and writes through this file, not
   anything page-specific, since the icon/panel are the SAME markup on
   every page (chrome.js's nav()).

   No checkout INTEGRATION yet — Evy's own "buy it" needs a real
   payment processor (Gumroad/Lemon Squeezy, her choice), which she
   has to set up herself (an account, not something this can do for
   her). The Check out button below is wired and ready; give it a real
   href per-cart (or swap it for the provider's own JS overlay call)
   once that account exists — see the checkout() function's own
   comment for exactly where.
   =========================================================== */
window.EOD_CART = (function () {
  var STORAGE_KEY = "eod-cart";

  function readCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function writeCart(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      // Private browsing / storage disabled — the cart just won't
      // persist across a reload, nothing here needs to hard-fail for
      // that.
    }
    render();
  }

  function addItem(product) {
    var items = readCart();
    var existing = items.find(function (i) { return i.slug === product.slug; });
    if (existing) {
      existing.qty += 1;
    } else {
      items.push({
        slug: product.slug,
        title: product.title,
        price: product.price,
        image: product.image,
        qty: 1,
      });
    }
    writeCart(items);
    openPanel();
  }

  function removeItem(slug) {
    writeCart(readCart().filter(function (i) { return i.slug !== slug; }));
  }

  function cartTotal(items) {
    return items.reduce(function (sum, i) { return sum + i.price * i.qty; }, 0);
  }

  function formatPrice(n) {
    return "€" + (Math.round(n * 100) / 100).toString().replace(".", ",");
  }

  // Cart "unfold" — Evy: "de card mag uitklappen net zoals de
  // navigation". Built the same way test-navigation.js builds the nav
  // menu's own timeline (enter segment, addPause(), then an appended
  // exit segment played forward instead of a separate reverse
  // timeline) — see that file's initFixedUnderlayNavigation() for the
  // original this is modeled on. Reuses the SAME custom "energy" ease
  // test-navigation.js registers (it always runs first, see cart.js's
  // own header), just applied to the cart's own overlay + floating
  // panel (see cart.css) instead of pushing the page like the nav
  // does — a checkout panel shouldn't shove the rest of the page
  // sideways regardless of scroll position. No border/corner accent
  // frame here (that was built for a flush edge-to-edge reveal, which
  // stopped applying once the panel became an inset floating card —
  // Evy: "de layout... zoals... met een padding tussen alle kanten").
  var cartTl = null;
  var cartEnterEndTime = 0;
  var cartIsOpen = false;

  function buildCartTimeline() {
    var panel = document.querySelector("[data-eod-cart-panel]");
    var overlay = document.querySelector("[data-eod-cart-overlay]");
    if (!panel || !overlay || typeof gsap === "undefined") return null;

    // Panel no longer sits flush against the viewport edge (it has
    // its own `right` inset now, see cart.css) — offsetWidth alone
    // would only push it flush with the edge, not past it, so this
    // adds that inset back plus a safety buffer.
    var getPanelOffset = function () {
      return panel.offsetWidth + (parseFloat(getComputedStyle(panel).right) || 0) + 40;
    };
    var hasEnergyEase = typeof CustomEase !== "undefined" && CustomEase.get("energy");

    gsap.set(overlay, { visibility: "hidden", pointerEvents: "none", opacity: 0 });
    gsap.set(panel, { x: getPanelOffset });

    var tl = gsap.timeline({
      paused: true,
      defaults: { ease: hasEnergyEase ? "energy" : "power3.inOut" },
    });

    tl.set(overlay, { visibility: "visible", pointerEvents: "auto" }, 0)
      .to(overlay, { opacity: 1, duration: 0.5 }, 0)
      .to(panel, { x: 0, duration: 0.7 }, 0);

    cartEnterEndTime = tl.duration();
    tl.addPause();

    tl.to(panel, { x: getPanelOffset, duration: 0.6 }, "<")
      .to(overlay, { opacity: 0, duration: 0.35, ease: "power2.inOut" }, "<")
      .set(overlay, { visibility: "hidden", pointerEvents: "none" });

    return tl;
  }

  // Staggers in whatever .eod-cart__item rows are currently in the
  // list — called after render() rebuilds that list's innerHTML
  // while the panel is open (both right after opening, and when an
  // item is added/removed while it's already open), so line items
  // never just flash into place.
  function revealItems() {
    if (typeof gsap === "undefined") return;
    var items = document.querySelectorAll(".eod-cart__item");
    if (!items.length) return;
    gsap.fromTo(
      items,
      { autoAlpha: 0, xPercent: 12 },
      { autoAlpha: 1, xPercent: 0, duration: 0.5, stagger: 0.06, ease: "power3.out" }
    );
  }

  function openPanel() {
    var panel = document.querySelector("[data-eod-cart-panel]");
    if (!panel) return;
    if (!cartTl) cartTl = buildCartTimeline();
    cartIsOpen = true;
    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("eod-cart-is-open");
    if (cartTl) {
      cartTl.invalidate();
      if (cartTl.time() >= cartEnterEndTime) cartTl.timeScale(1).restart();
      else cartTl.timeScale(1).play();
    } else {
      panel.style.transform = "translateX(0)";
    }
    revealItems();
  }

  function closePanel() {
    var panel = document.querySelector("[data-eod-cart-panel]");
    if (!panel) return;
    cartIsOpen = false;
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("eod-cart-is-open");
    if (cartTl) {
      if (cartTl.time() < cartEnterEndTime) cartTl.timeScale(1).reverse();
      else cartTl.timeScale(1).play();
    } else {
      panel.style.transform = "translateX(100%)";
    }
  }

  function render() {
    var items = readCart();
    var count = items.reduce(function (sum, i) { return sum + i.qty; }, 0);

    // Toggle button itself: Evy specifically doesn't want this visible
    // at all until something is actually in the cart (see file header).
    var toggle = document.querySelector("[data-eod-cart-toggle]");
    var countEl = document.querySelector("[data-eod-cart-count]");
    if (toggle) toggle.hidden = count === 0;
    if (countEl) countEl.textContent = count;

    var list = document.querySelector("[data-eod-cart-items]");
    var emptyEl = document.querySelector("[data-eod-cart-empty]");
    if (list) {
      list.innerHTML = items.map(function (item) {
        return (
          '<li class="eod-cart__item">' +
            (item.image ? '<img class="eod-cart__item-image" src="' + item.image + '" alt="" />' : "") +
            '<span class="eod-cart__item-info">' +
              '<span class="eod-cart__item-title">' + item.title + (item.qty > 1 ? " × " + item.qty : "") + "</span>" +
              '<span class="eod-cart__item-price">' + formatPrice(item.price * item.qty) + "</span>" +
            "</span>" +
            '<button class="eod-cart__item-remove" data-eod-cart-remove="' + item.slug + '" aria-label="Remove ' + item.title + '">' +
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M8 8L24 24M24 8L8 24" stroke-width="2" stroke-linecap="round"/></svg>' +
            "</button>" +
          "</li>"
        );
      }).join("");
      list.hidden = items.length === 0;
    }
    if (emptyEl) emptyEl.hidden = items.length > 0;

    var totalEl = document.querySelector("[data-eod-cart-total]");
    if (totalEl) totalEl.textContent = formatPrice(cartTotal(items));

    var checkoutBtn = document.querySelector("[data-eod-cart-checkout]");
    if (checkoutBtn) checkoutBtn.setAttribute("aria-disabled", items.length === 0 ? "true" : "false");

    // Adding an item while the panel is already open (e.g. from a
    // product page) rebuilds this list too — reveal it the same way
    // openPanel() does, instead of the new row just appearing flat.
    if (cartIsOpen) revealItems();
  }

  function checkout() {
    // No payment processor wired up yet (Evy chose Gumroad/Lemon
    // Squeezy but hasn't set up an account) — once she has, this is
    // the one place to change: build that provider's checkout URL
    // (or call its JS SDK's overlay open, e.g. Lemon.Url.Open(...))
    // from the current cart's items here, instead of this alert.
    window.alert(
      "Checkout is nog niet gekoppeld aan een betaalprovider (Gumroad/Lemon Squeezy) — " +
      "zodra dat account er is, koppelen we deze knop daaraan."
    );
  }

  function init() {
    render();

    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-eod-cart-toggle]")) {
        e.preventDefault();
        openPanel();
        return;
      }
      if (e.target.closest("[data-eod-cart-close]")) {
        e.preventDefault();
        closePanel();
        return;
      }
      if (e.target.closest("[data-eod-cart-overlay]")) {
        closePanel();
        return;
      }
      var removeBtn = e.target.closest("[data-eod-cart-remove]");
      if (removeBtn) {
        e.preventDefault();
        var slug = removeBtn.getAttribute("data-eod-cart-remove");
        var row = removeBtn.closest(".eod-cart__item");
        // Animate the row out before the list re-renders, so removing
        // an item is obviously working (Evy: "Ook moet je items
        // kunnen verwijderen") instead of an instant, easy-to-miss
        // DOM swap.
        if (row && typeof gsap !== "undefined") {
          removeBtn.disabled = true;
          gsap.to(row, {
            autoAlpha: 0,
            height: 0,
            marginBottom: 0,
            paddingTop: 0,
            paddingBottom: 0,
            duration: 0.3,
            ease: "power2.inOut",
            onComplete: function () { removeItem(slug); },
          });
        } else {
          removeItem(slug);
        }
        return;
      }
      if (e.target.closest("[data-eod-cart-checkout]")) {
        e.preventDefault();
        if (readCart().length) checkout();
        return;
      }
      var addBtn = e.target.closest("[data-eod-add-to-cart]");
      if (addBtn) {
        e.preventDefault();
        addItem({
          slug: addBtn.getAttribute("data-slug"),
          title: addBtn.getAttribute("data-title"),
          price: parseFloat(addBtn.getAttribute("data-price")) || 0,
          image: addBtn.getAttribute("data-image") || "",
        });
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePanel();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {addItem: addItem, removeItem: removeItem, getItems: readCart};
})();
