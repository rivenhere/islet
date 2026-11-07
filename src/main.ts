import { createApp } from "vue";
import { createPinia } from "pinia";
import { useSettingStore } from "./store/setting";
import persist from "pinia-plugin-persistedstate";
import App from "./App.vue";
import { i18n, setupI18n, normalizeLocale, FALLBACK_LOCALE } from "./i18n";
import { reopenForFocus } from "./utils/newTabFocus";
import "./style.css";

const pinia = createPinia().use(persist);
const app = createApp(App);

app.use(pinia);
app.use(i18n);

const settingStore = useSettingStore();
// Migrate old persisted language values (such as "zh") to BCP 47 tags; fall back to English if unrecognized
settingStore.language =
  normalizeLocale(settingStore.language) ?? FALLBACK_LOCALE;
setupI18n(settingStore.language);

// Experimental setting: reopen a new tab once so the search box can take focus from the address bar
if (!(settingStore.focusOnNewTab && reopenForFocus())) app.mount("#app");
