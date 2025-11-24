const darkModeToggle = document.getElementById("dark-mode-toggle");
const html = document.documentElement;

// Check for saved dark mode preference
const darkMode = localStorage.getItem("darkMode");

if (darkMode !== "disabled") {
  html.classList.add("dark-mode");
}

darkModeToggle.addEventListener("click", () => {
  if (html.classList.contains("dark-mode")) {
    html.classList.remove("dark-mode");
    localStorage.setItem("darkMode", "disabled");
  } else {
    html.classList.add("dark-mode");
    localStorage.setItem("darkMode", "enabled");
  }
});

// Lazy-load Steam widget iframes when visible (improves performance & mobile)
(function () {
  const selector = "#playing iframe[data-src]";
  const elList = Array.from(document.querySelectorAll(selector));
  if (!elList.length) return;

  // load function
  const loadIframe = (iframe) => {
    if (iframe.src) return;
    iframe.src = iframe.dataset.src;
  };

  // IntersectionObserver to lazy-load when card is visible
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadIframe(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "200px", threshold: 0.05 }
    );
    elList.forEach((el) => io.observe(el));
  } else {
    // fallback: load after short delay
    setTimeout(() => elList.forEach(loadIframe), 600);
  }

  // optional: warm-load first visible iframe immediately
  if (elList.length) loadIframe(elList[0]);
})();

// Auto-scroll the horizontal "Currently Playing" widgets.
// - Respects prefers-reduced-motion
// - Pauses on hover, touch, wheel or user interaction
// - Loops back to start when reaching the end
(function () {
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  const scroller = document.querySelector("#playing .playing-viewport"); // Changed to playing-viewport
  const track = scroller.querySelector(".playing-track");

  // Duplicate track content for seamless loop
  track.innerHTML += track.innerHTML;

  let running = true;
  let lastTs = null;
  const speed = 0.03; // px per ms => ~30px/s

  function step(ts) {
    if (!running) {
      lastTs = ts;
      requestAnimationFrame(step);
      return;
    }
    if (lastTs === null) lastTs = ts;
    const delta = ts - lastTs;
    lastTs = ts;
    scroller.scrollLeft += delta * speed;

    // Reset scroll position when it reaches the end of the first track
    if (scroller.scrollLeft >= track.scrollWidth / 2) {
      scroller.scrollLeft = 0;
    }
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);

  // Pause / resume helpers
  const pause = () => (running = false);
  const resume = () => {
    running = true;
    lastTs = null;
  };

  // Pause on hover, resume on leave
  scroller.addEventListener("mouseenter", pause);
  scroller.addEventListener("mouseleave", resume);

  // Touch: pause during touch, resume shortly after
  scroller.addEventListener("touchstart", pause, { passive: true });
  scroller.addEventListener("touchend", () => setTimeout(resume, 1200));

  // If user scrolls with wheel or touchpad, pause and resume after inactivity
  let wheelTimeout;
  scroller.addEventListener(
    "wheel",
    (e) => {
      pause();
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(resume, 1500);
    },
    { passive: true }
  );

  // If user manually scrolls (drag/scrollbar), pause and resume after inactivity
  let scrollTimeout;
  scroller.addEventListener(
    "scroll",
    () => {
      // ignore programmatic scrolls while running
      if (!running) {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(resume, 1500);
      }
    },
    { passive: true }
  );
})();