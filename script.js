const yearNode = document.getElementById("year");
const topbar = document.querySelector("[data-topbar]");
const cursorGlow = document.querySelector(".cursor-glow");
const lightGlowSurfaceSelector = [
  ".product-section",
  ".usecase-section",
  ".workflow-section",
  ".contact-section",
  ".product-card",
  ".usecase-card",
  ".workflow-step",
  ".pilot-card:not(.pilot-card-primary)",
  ".contact-card",
].join(", ");

if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

const handleTopbarState = () => {
  if (!topbar) {
    return;
  }

  topbar.classList.toggle("is-scrolled", window.scrollY > 16);
};

handleTopbarState();
window.addEventListener("scroll", handleTopbarState, { passive: true });

if (cursorGlow && window.matchMedia("(pointer: fine)").matches) {
  window.addEventListener(
    "pointermove",
    (event) => {
      cursorGlow.style.left = `${event.clientX}px`;
      cursorGlow.style.top = `${event.clientY}px`;

      const hoveredNode = document.elementFromPoint(event.clientX, event.clientY);
      const isLightSurface = hoveredNode?.closest(lightGlowSurfaceSelector);
      document.body.classList.toggle("cursor-glow-on-light", Boolean(isLightSurface));
    },
    { passive: true }
  );
}

const revealNodes = document.querySelectorAll(".reveal");

const revealNode = (node) => {
  node.classList.add("is-visible");
};

if (!("IntersectionObserver" in window)) {
  revealNodes.forEach(revealNode);
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          revealNode(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.01,
      rootMargin: "0px 0px 12% 0px",
    }
  );

  const initialRevealBoundary = window.innerHeight * 1.12;

  revealNodes.forEach((node) => {
    if (node.getBoundingClientRect().top <= initialRevealBoundary) {
      revealNode(node);
      return;
    }

    observer.observe(node);
  });
}
