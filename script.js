const yearNode = document.getElementById("year");
const topbar = document.querySelector("[data-topbar]");
const cursorGlow = document.querySelector(".cursor-glow");

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
    },
    { passive: true }
  );
}

const revealNodes = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.16,
  }
);

revealNodes.forEach((node) => observer.observe(node));
