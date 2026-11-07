// First-paint flash prevention (FOUC): applies the theme background synchronously before the page paints.
//
// It must be included as an external script, not an inline <script>:
// running as an MV3 extension, the default CSP is script-src 'self', which blocks inline scripts,
// so the theme couldn't apply early, causing a white-to-black flash. External scripts from the extension itself are allowed.
//
// Exception: this is a plain script under public, so it can't import src/utils/dbHelper.ts.
// That makes it the only place in the project that reads localStorage directly (read-only, islet-setting.theme).
(function () {
  var isDark = false;
  try {
    var saved = localStorage.getItem("islet-setting");
    var theme = saved ? JSON.parse(saved).theme : "auto";
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    isDark = theme === "dark" || (theme === "auto" && systemDark);
  } catch (e) {
    /* Silently fall back to light if localStorage is unavailable or the data is corrupted */
  }
  var el = document.documentElement;
  if (isDark) el.classList.add("dark");
  // Keep in sync with --bg-main / --text-main in style.css
  el.style.backgroundColor = isDark ? "#121212" : "#ffffff";
  el.style.color = isDark ? "#e5e5e5" : "#1a1a1a";
})();
