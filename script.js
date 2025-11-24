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

// Marquee Duplication Logic
// Duplicates the content of the marquee track to create a seamless infinite loop.
(function () {
  const track = document.querySelector(".marquee-track");
  if (!track) return;

  // Clone all children and append them to the track
  const children = Array.from(track.children);
  children.forEach((child) => {
    const clone = child.cloneNode(true);
    track.appendChild(clone);
  });
})();