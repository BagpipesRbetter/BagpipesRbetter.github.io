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
