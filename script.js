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
  const scroller = document.querySelector("#playing .overflow-x-auto");
  if (!scroller) return;

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
    // wrap when reaching the end
    if (
      scroller.scrollLeft >=
      scroller.scrollWidth - scroller.clientWidth - 1
    ) {
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

// Scroll-driven horizontal auto-scroll: when you scroll the page (wheel/touch/scroll),
// the "Currently Playing" scroller will move quickly in the same vertical direction.
(function () {
  const scroller = document.querySelector("#playing .overflow-x-auto");
  if (!scroller) return;
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;

  let rafId = null;
  let velocity = 0; // px per frame
  const decay = 0.92; // smoothing / decay per frame
  const MAX = 120; // clamp max velocity
  let lastScrollY = window.scrollY || 0;
  let lastWheelTs = 0;

  function startLoop() {
    if (rafId) return;
    rafId = requestAnimationFrame(tick);
  }
  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function tick() {
    // apply velocity
    scroller.scrollLeft += velocity;
    // wrap-around
    if (
      scroller.scrollLeft >=
      scroller.scrollWidth - scroller.clientWidth - 1
    ) {
      scroller.scrollLeft = 0;
    } else if (scroller.scrollLeft <= 0 && velocity < 0) {
      scroller.scrollLeft =
        scroller.scrollWidth - scroller.clientWidth - 2;
    }

    // decay velocity smoothly
    velocity *= decay;

    // stop loop when velocity very small
    if (Math.abs(velocity) < 0.2) {
      velocity = 0;
      stopLoop();
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  // Map vertical wheel to horizontal velocity
  window.addEventListener(
    "wheel",
    (e) => {
      // only respond to significant vertical scrolls
      if (Math.abs(e.deltaY) < 2) return;
      lastWheelTs = performance.now();
      // amplify and clamp
      velocity += e.deltaY * 0.8;
      velocity = Math.max(-MAX, Math.min(MAX, velocity));
      startLoop();
    },
    { passive: true }
  );

  // Touch: use touchmove dy to drive velocity
  let touchY = null;
  window.addEventListener(
    "touchstart",
    (e) => {
      touchY = e.touches[0]?.clientY ?? null;
    },
    { passive: true }
  );
  window.addEventListener(
    "touchmove",
    (e) => {
      if (touchY === null) touchY = e.touches[0]?.clientY ?? null;
      const y = e.touches[0]?.clientY ?? touchY;
      const dy = touchY - y;
      touchY = y;
      if (Math.abs(dy) < 1) return;
      velocity += dy * 1.2;
      velocity = Math.max(-MAX, Math.min(MAX, velocity));
      startLoop();
    },
    { passive: true }
  );
  window.addEventListener("touchend", () => (touchY = null), {
    passive: true,
  });

  // Page scroll (keyboard, trackpad flicks) also drives it
  window.addEventListener(
    "scroll",
    () => {
      const cur = window.scrollY || 0;
      const dy = cur - lastScrollY;
      lastScrollY = cur;
      if (Math.abs(dy) < 1) return;
      velocity += dy * 0.6;
      velocity = Math.max(-MAX, Math.min(MAX, velocity));
      startLoop();
    },
    { passive: true }
  );

  // Pause auto-scroll when user interacts directly with the scroller
  scroller.addEventListener("mouseenter", () => (velocity = 0));
  scroller.addEventListener("touchstart", () => (velocity = 0), {
    passive: true,
  });

  // Optional: small keyboard control for testing
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      velocity = 40;
      startLoop();
    }
    if (e.key === "ArrowLeft") {
      velocity = -40;
      startLoop();
    }
  });
})();

// Smooth scroll-driven parallax for blobs using lerp + RAF
(function () {
  const blobs = Array.from(document.querySelectorAll(".bg-blobs .blob"));
  if (!blobs.length) return;

  // per-blob state
  const state = blobs.map((b) => ({
    el: b,
    // sensible speed default, not enormous
    speed: Math.max(0.12, parseFloat(b.dataset.speed) || 0.18),
    tx: parseFloat(getComputedStyle(b).getPropertyValue("--tx")) || 40,
    ty: parseFloat(getComputedStyle(b).getPropertyValue("--ty")) || -30,
    // current smoothed offsets
    curX: 0,
    curY: 0,
    targetX: 0,
    targetY: 0,
  }));

  let lastScroll = window.scrollY || window.pageYOffset;
  let ticking = false;

  function computeTargets() {
    const scroll = window.scrollY || window.pageYOffset;
    const h = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0
    );
    const t = Math.max(-1, Math.min(1, scroll / Math.max(h, 1) - 0.5)); // -1..1 safe range

    state.forEach((s, i) => {
      // smaller multipliers produce smooth, natural parallax
      const baseX = s.tx * 0.7;
      const baseY = s.ty * 0.7;
      s.targetX = t * baseX * s.speed;
      s.targetY = t * baseY * s.speed;
    });
  }

  // simple lerp
  function lerp(a, b, n) {
    return a + (b - a) * n;
  }

  function rafStep() {
    // smoothing factor 0.12 => gentle follow; increase for snappier
    const smooth = 0.12;
    state.forEach((s) => {
      s.curX = lerp(s.curX, s.targetX, smooth);
      s.curY = lerp(s.curY, s.targetY, smooth);
      s.el.style.setProperty("--scrollX", `${s.curX.toFixed(2)}px`);
      s.el.style.setProperty("--scrollY", `${s.curY.toFixed(2)}px`);
    });
    requestAnimationFrame(rafStep);
  }

  // update targets on scroll/resize
  function onScroll() {
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    computeTargets();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  computeTargets();
  requestAnimationFrame(rafStep);
})();
