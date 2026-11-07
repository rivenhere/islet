<script setup lang="ts">
import type { LanguageTypes } from "@/types/language";
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { useSettingStore } from "@/store/setting";
import { useI18n } from "vue-i18n";
import { BUILTIN_ENGINES } from "@/config/searchEngines";
import { SITES, contributeUrl } from "@/config/sites";
import {
  downloadSettings,
  applySettingsImport,
} from "@/utils/settingsTransfer";
import PixelToggle from "./PixelToggle.vue";
import PixelSelect from "./PixelSelect.vue";
import SearchEngineManager from "./SearchEngineManager.vue";
import ShortcutManager from "./ShortcutManager.vue";

const settingStore = useSettingStore();
const { t, locale } = useI18n();

// --- Settings import / export ---
const fileInput = ref<HTMLInputElement | null>(null);
const importStatus = ref<"" | "success" | "error">("");
let importStatusTimer: ReturnType<typeof setTimeout> | undefined;

const flashImportStatus = (status: "success" | "error") => {
  importStatus.value = status;
  clearTimeout(importStatusTimer);
  importStatusTimer = setTimeout(() => (importStatus.value = ""), 2500);
};

const handleExport = () => downloadSettings(settingStore);

const triggerImport = () => fileInput.value?.click();

const handleFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const text = await file.text();
  flashImportStatus(
    applySettingsImport(settingStore, text) ? "success" : "error",
  );
  // Reset, so choosing the same file again still fires change
  input.value = "";
};

// Tabs on the left
const tabs = computed(() => [
  { id: "clock", label: t("SettingPanel.tabs.clock") },
  { id: "system", label: t("SettingPanel.tabs.system") },
  { id: "about", label: t("SettingPanel.tabs.about") },
]);

// Search engine options = built-in + user-defined (one source, to avoid duplicated hardcoding)
const engineOptions = computed(() =>
  [...BUILTIN_ENGINES, ...settingStore.customEngines].map((e) => ({
    label: e.name,
    value: e.id,
  })),
);

// Hour format options
const hourFormatOptions = computed(() => [
  { label: t("SettingPanel.clock.hour24"), value: "24" },
  { label: t("SettingPanel.clock.hour12"), value: "12" },
]);

// Clock size options
const clockSizeOptions = computed(() => [
  { label: t("SettingPanel.clock.sizeSmall"), value: "small" },
  { label: t("SettingPanel.clock.sizeMedium"), value: "medium" },
  { label: t("SettingPanel.clock.sizeLarge"), value: "large" },
]);

// Theme mode options
const themeOptions = computed(() => [
  { label: t("SettingPanel.themeOptions.auto"), value: "auto" },
  { label: t("SettingPanel.themeOptions.light"), value: "light" },
  { label: t("SettingPanel.themeOptions.dark"), value: "dark" },
]);

// Language options
const languageOptions: {
  label: string;
  value: LanguageTypes;
}[] = [
  { label: "简体中文", value: "zh-Hans" },
  { label: "English", value: "en" },
  { label: "日本語", value: "ja" },
];

// Currently selected tab, the first by default
const activeTab = ref(tabs.value[0].id);

// Close the panel
const handleClosePanel = () => {
  settingStore.isSettingOpen = false;
};

// Shortcuts: Ctrl+, toggles the settings panel, Esc closes it
const onGlobalKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === ",") {
    e.preventDefault();
    // Blur the search box when opening, to collapse its dropdown
    (document.activeElement as HTMLElement | null)?.blur();
    settingStore.isSettingOpen = !settingStore.isSettingOpen;
  } else if (e.key === "Escape" && settingStore.isSettingOpen) {
    handleClosePanel();
  }
};
onMounted(() => window.addEventListener("keydown", onGlobalKeydown));
onUnmounted(() => window.removeEventListener("keydown", onGlobalKeydown));

// React to language changes
watch(
  () => settingStore.language,
  (newLang) => {
    locale.value = newLang;
  },
);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="settingStore.isSettingOpen"
        class="setting-overlay"
        @click.self="handleClosePanel"
      >
        <div class="setting-panel">
          <div class="panel-header">
            <h2 class="title">{{ t("SettingPanel.title") }}</h2>
            <button class="close-btn" @click="handleClosePanel">
              <svg
                viewBox="0 0 16 16"
                width="20"
                height="20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 2h2v2H2V2z M12 2h2v2h-2V2z M4 4h2v2H4V4z M10 4h2v2h-2V4z M6 6h4v4H6V6z M4 10h2v2H4v-2z M10 10h2v2h-2v-2z M2 12h2v2H2v-2z M12 12h2v2h-2v-2z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          <div class="panel-body">
            <div class="sidebar">
              <div
                v-for="tab in tabs"
                :key="tab.id"
                class="tab-item"
                :class="{ active: activeTab === tab.id }"
                @click="activeTab = tab.id"
              >
                {{ tab.label }}
              </div>
            </div>

            <div class="content-area">
              <div v-show="activeTab === 'clock'" class="tab-content">
                <h3>{{ t("SettingPanel.clock.style") }}</h3>

                <div class="setting-list">
                  <div class="setting-item">
                    <span>{{ t("SettingPanel.clock.hourFormat") }}</span>
                    <PixelSelect
                      v-model="settingStore.hourFormat"
                      :options="hourFormatOptions"
                    />
                  </div>

                  <div class="setting-item">
                    <span>{{ t("SettingPanel.clock.size") }}</span>
                    <PixelSelect
                      v-model="settingStore.clockSize"
                      :options="clockSizeOptions"
                    />
                  </div>

                  <div class="setting-item">
                    <span>{{ t("SettingPanel.clock.showSec") }}</span>
                    <PixelToggle v-model="settingStore.showSeconds" />
                  </div>

                  <div class="setting-item">
                    <span>{{ t("SettingPanel.clock.showDate") }}</span>
                    <PixelToggle v-model="settingStore.showDate" />
                  </div>

                  <div class="setting-item">
                    <span>{{ t("SettingPanel.clock.showWeekday") }}</span>
                    <PixelToggle v-model="settingStore.showWeekday" />
                  </div>
                </div>
              </div>

              <div v-show="activeTab === 'system'" class="tab-content">
                <h3>{{ t("SettingPanel.system.title") }}</h3>

                <div class="setting-item">
                  <span>{{ t("SettingPanel.system.language") }}</span>
                  <PixelSelect
                    v-model="settingStore.language"
                    :options="languageOptions"
                  />
                </div>

                <div class="setting-list">
                  <div class="setting-item">
                    <span>{{ t("SettingPanel.system.defaultEngine") }}</span>
                    <PixelSelect
                      v-model="settingStore.defaultEngine"
                      :options="engineOptions"
                    />
                  </div>

                  <div class="setting-item">
                    <span>{{ t("SettingPanel.system.searchHistory") }}</span>
                    <div class="item-controls">
                      <button
                        v-if="settingStore.searchHistory.length"
                        class="text-btn"
                        @click="settingStore.clearSearchHistory()"
                      >
                        {{ t("SettingPanel.system.clearHistory") }}
                      </button>
                      <PixelToggle v-model="settingStore.enableSearchHistory" />
                    </div>
                  </div>

                  <div class="setting-item">
                    <span>{{ t("SettingPanel.system.siteSearch") }}</span>
                    <PixelToggle v-model="settingStore.enableSiteSearch" />
                  </div>

                  <div class="setting-item">
                    <span>{{ t("SettingPanel.system.openInNewTab") }}</span>
                    <PixelToggle v-model="settingStore.openInNewTab" />
                  </div>

                  <div class="setting-item">
                    <span class="item-label">
                      {{ t("SettingPanel.system.focusOnNewTab") }}
                      <small class="item-hint">{{
                        t("SettingPanel.system.focusOnNewTabHint")
                      }}</small>
                    </span>
                    <PixelToggle v-model="settingStore.focusOnNewTab" />
                  </div>

                  <div class="setting-item">
                    <span>{{ t("SettingPanel.system.appearance") }}</span>
                    <PixelSelect
                      v-model="settingStore.theme"
                      :options="themeOptions"
                    />
                  </div>

                  <div class="setting-item">
                    <span class="item-label">
                      {{ t("SettingPanel.system.showHitokoto") }}
                      <small class="item-hint">{{
                        t("SettingPanel.system.showHitokotoHint")
                      }}</small>
                    </span>
                    <PixelToggle v-model="settingStore.showHitokoto" />
                  </div>

                  <div class="setting-item">
                    <span>{{ t("SettingPanel.system.showShortcuts") }}</span>
                    <PixelToggle v-model="settingStore.showShortcuts" />
                  </div>

                  <div class="setting-item">
                    <span>{{
                      t("SettingPanel.system.autoHideSettingButton")
                    }}</span>
                    <PixelToggle v-model="settingStore.autoHideSettingButton" />
                  </div>
                </div>

                <h3 class="sub-title">
                  {{ t("SettingPanel.shortcuts.title") }}
                </h3>
                <ShortcutManager />

                <h3 class="sub-title">
                  {{ t("SettingPanel.engineManager.title") }}
                </h3>
                <SearchEngineManager />

                <h3 class="sub-title">
                  {{ t("SettingPanel.backup.title") }}
                </h3>
                <div class="backup-actions">
                  <button class="backup-btn" @click="handleExport">
                    {{ t("SettingPanel.backup.export") }}
                  </button>
                  <button class="backup-btn" @click="triggerImport">
                    {{ t("SettingPanel.backup.import") }}
                  </button>
                  <input
                    ref="fileInput"
                    type="file"
                    accept="application/json,.json"
                    class="hidden-file"
                    @change="handleFileChange"
                  />
                  <Transition name="fade">
                    <span
                      v-if="importStatus"
                      class="backup-msg"
                      :class="importStatus"
                    >
                      {{
                        importStatus === "success"
                          ? t("SettingPanel.backup.importSuccess")
                          : t("SettingPanel.backup.importError")
                      }}
                    </span>
                  </Transition>
                </div>
              </div>

              <div v-show="activeTab === 'about'" class="tab-content">
                <h3>{{ t("SettingPanel.about.title") }}</h3>
                <p style="white-space: pre-wrap">
                  {{ t("SettingPanel.about.content") }}
                </p>
                <p>
                  {{ t("SettingPanel.about.sites", { count: SITES.length }) }}
                </p>
                <p>
                  <a
                    class="about-link"
                    :href="contributeUrl(locale)"
                    target="_blank"
                    rel="noopener"
                    >{{ t("SettingPanel.about.contribute") }} →</a
                  >
                </p>
                <p class="about-keys">{{ t("SettingPanel.about.keys") }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
/* --- Overlay --- */
.setting-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  background-color: var(--panel-overlay);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.3s ease;
}

/* --- Panel --- */
.setting-panel {
  width: 760px;
  height: 520px;
  max-width: 100%;
  max-height: 100%;
  background-color: var(--panel-bg);
  border-radius: 20px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  font-family: "Fusion Pixel", monospace;
  -webkit-font-smoothing: none;
  font-smooth: never;

  transition: background-color 0.3s ease;
}

/* --- Top header --- */
.panel-header {
  height: 64px;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-main);
  transition: border-color 0.3s ease;

  .title {
    margin: 0;
    font-size: 20px;
    font-weight: normal;
    color: var(--text-main);
    transition: color 0.3s ease;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--active-bg);
      color: var(--text-main);
    }
  }
}

/* --- Main body layout --- */
.panel-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* --- Left tabs --- */
.sidebar {
  width: 180px;
  background-color: var(--hover-bg);
  border-right: 1px solid var(--border-main);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
}

.tab-item {
  padding: 12px 16px;
  font-size: 16px;
  color: var(--text-secondary);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    background-color: var(--active-bg);
    color: var(--text-main);
  }

  &.active {
    background-color: var(--panel-bg);
    color: var(--text-main);
    font-weight: normal;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
}

/* --- Right content area --- */
.content-area {
  flex: 1;
  padding: 24px 32px;
  background-color: var(--panel-bg);
  overflow-y: auto;
  transition: background-color 0.3s ease;

  /* Firefox: thin scrollbar, color follows the theme */
  scrollbar-width: thin;
  scrollbar-color: var(--active-bg) transparent;

  /* Chrome / Edge / Safari: pixel-style block scrollbar (hard edges, no rounding) */
  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--active-bg);
    /* Side gaps + background-colored border, making a thin centered block thumb */
    border: 2px solid var(--panel-bg);
    transition: background-color 0.2s ease;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: var(--text-secondary);
  }
}

.tab-content {
  h3 {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 22px;
    font-weight: normal;
    color: var(--text-main);
    transition: color 0.3s ease;
  }

  h3.sub-title {
    margin-top: 32px;
    font-size: 18px;
  }

  p {
    font-size: 16px;
    color: var(--text-secondary);
    line-height: 1.8;
    transition: color 0.3s ease;
  }
}

/* Layout for the settings list */
.setting-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--hover-bg);
  border: 1px solid var(--border-main);
  border-radius: 8px;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;

  span {
    font-size: 16px;
    color: var(--text-main);
    transition: color 0.3s ease;
  }
}

/* Several controls side by side on the right of a setting (such as a "Clear" button + toggle) */
.item-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.item-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-right: 16px;
}

.item-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.about-link {
  color: var(--text-main);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.about-keys {
  font-size: 13px;
  color: var(--text-secondary);
}

.text-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: "Fusion Pixel", monospace;
  -webkit-font-smoothing: none;
  font-smooth: never;
  transition: color 0.2s ease;

  &:hover {
    color: var(--text-main);
    text-decoration: underline;
  }
}

/* --- Settings backup --- */
.backup-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.backup-btn {
  padding: 10px 18px;
  font-size: 14px;
  color: var(--text-main);
  background-color: var(--hover-bg);
  border: 2px solid var(--border-hard);
  border-radius: 8px;
  cursor: pointer;
  font-family: "Fusion Pixel", monospace;
  -webkit-font-smoothing: none;
  font-smooth: never;
  transition:
    background-color 0.2s ease,
    color 0.3s ease,
    border-color 0.3s ease;

  &:hover {
    background-color: var(--active-bg);
  }
}

.hidden-file {
  display: none;
}

.backup-msg {
  font-size: 13px;

  &.success {
    color: var(--text-main);
  }
  &.error {
    color: #e5484d;
  }
}

/* --- Responsive: full screen when narrow, sidebar becomes horizontal tabs --- */
@media (max-width: 768px) {
  .setting-panel {
    width: 100%;
    height: 100%;
    border-radius: 0;
  }

  .panel-body {
    flex-direction: column;
  }

  .sidebar {
    width: auto;
    flex-direction: row;
    flex-shrink: 0;
    padding: 8px 12px;
    border-right: none;
    border-bottom: 1px solid var(--border-main);
  }

  .tab-item {
    flex: 1;
    padding: 8px 12px;
    text-align: center;
  }

  .content-area {
    padding: 20px;
  }
}

@media (max-width: 400px) {
  .panel-header {
    height: 52px;
    padding: 0 16px;
  }

  .content-area {
    padding: 16px 12px;
  }

  .setting-item {
    padding: 10px 12px;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* --- Vue modal transition --- */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .setting-panel {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-leave-active .setting-panel {
  transition: transform 0.3s ease;
}
.modal-enter-from .setting-panel,
.modal-leave-to .setting-panel {
  transform: scale(0.92) translateY(10px);
}
</style>
