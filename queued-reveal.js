/* Queued scroll reveal: items fade + rise one after another as they
   enter the viewport. Put data-queued-reveal-group on a container
   (plus data-queued-reveal-children to animate its direct children,
   otherwise every [data-queued-reveal-item] inside it). Used by the
   projects grid and the store grid. Needs gsap + ScrollTrigger. */
function initQueuedScrollReveal() {
  if (!window.gsap || !window.ScrollTrigger) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  gsap.registerPlugin(ScrollTrigger);

  const queue = [];
  let isRunning = false;

  document.querySelectorAll('[data-queued-reveal-group]').forEach((group) => {
    const items = group.hasAttribute('data-queued-reveal-children') ? [...group.children] : [...group.querySelectorAll('[data-queued-reveal-item]')];
    if (!items.length) return;

    items.forEach((item) => {
      if (item.getBoundingClientRect().bottom <= 0) return;

      // Set items on load
      gsap.set(item, {autoAlpha: 0, y: "4em"});

      ScrollTrigger.create({
        trigger: item,
        start: 'top 100%', // Reveal offset
        once: true,
        onEnter: () => {
          queue.push(item);
          if (queue.length > 12) reveal(queue.shift()); // Max queue length

          if (!isRunning) {
            isRunning = true;
            gsap.delayedCall(0.1, revealNext); // Delay
          }
        }
      });
    });
  });

  function reveal(item) {
    gsap.to(item, {autoAlpha: 1, duration: 1.2, ease: 'power1.out', clearProps: "opacity, visibility"});
    gsap.to(item, {y: "0em", duration: 1.2, ease: 'expo.out', clearProps: "transform"});
  }

  function revealNext() {
    const item = queue.shift();
    if (!item) {isRunning = false; return;}

    // Animate items on scroll
    reveal(item);
    gsap.delayedCall(0.075, revealNext); // Stagger
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initQueuedScrollReveal);
else initQueuedScrollReveal();
