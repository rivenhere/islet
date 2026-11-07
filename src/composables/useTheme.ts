import { watchEffect, onMounted, onUnmounted } from "vue";
import { useSettingStore } from "@/store/setting";

/**
 * Toggles the html.dark class according to the theme mode in settings (light / dark / auto).
 *
 * - light / dark: applied directly
 * - auto: follows the system, and updates when the system theme changes at runtime
 */
export const useTheme = () => {
  const settingStore = useSettingStore();
  const mql = window.matchMedia("(prefers-color-scheme: dark)");

  const applyTheme = () => {
    const theme = settingStore.theme;
    const isDark = theme === "dark" || (theme === "auto" && mql.matches);
    const el = document.documentElement;
    el.classList.toggle("dark", isDark);
    // Keep in sync with public/theme-init.js, so the html background doesn't keep the old theme color
    el.style.backgroundColor = isDark ? "#121212" : "#ffffff";
    el.style.color = isDark ? "#e5e5e5" : "#1a1a1a";
  };

  // Runs when the theme setting changes (watchEffect tracks settingStore.theme automatically)
  watchEffect(applyTheme);

  // Runs when the system theme changes (only affects auto mode, but always listening is simpler and harmless)
  onMounted(() => mql.addEventListener("change", applyTheme));
  onUnmounted(() => mql.removeEventListener("change", applyTheme));
};
