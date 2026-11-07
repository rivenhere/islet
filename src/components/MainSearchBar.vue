<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useSettingStore } from "@/store/setting";
import { useI18n } from "vue-i18n";
import { BUILTIN_ENGINES, buildSearchUrl } from "@/config/searchEngines";
import {
  type Site,
  type SiteTarget,
  matchSites,
  resolveRoute,
  siteTargets,
  isRouteInput,
  hasTagFilter,
  displayHost,
  localize,
  contributeUrl,
} from "@/config/sites";
import { navigateTo } from "@/utils/navigate";

const { t, locale } = useI18n();
const settingStore = useSettingStore();

// All available engines = built-in + user-defined
const engines = computed(() => [
  ...BUILTIN_ENGINES,
  ...settingStore.customEngines,
]);

// Currently selected engine, falling back to the first built-in one if not found
const currentEngine = computed(
  () =>
    engines.value.find((e) => e.id === settingStore.defaultEngine) ??
    BUILTIN_ENGINES[0],
);

const keyword = ref("");
const inputRef = ref<HTMLInputElement | null>(null);

// --- Quick engine switch menu ---
const engineMenuOpen = ref(false);

const selectEngine = (id: string) => {
  settingStore.defaultEngine = id;
  engineMenuOpen.value = false;
};

// --- Dropdown: official site matches + search history suggestions ---
const MAX_SUGGESTIONS = 8;
const MAX_SITES = 5;
const isFocused = ref(false);
/**
 * Set when the page focuses the box by itself (on load / Back): keep suggestions closed until the user
 * acts (types, clicks the box or presses ↓), so recent searches don't pop up on every new tab.
 */
const quietFocus = ref(false);
const activeIndex = ref(-1);

type DropdownItem =
  | { type: "site"; id: string; site: Site }
  | { type: "history"; id: string; term: string };

const siteMatches = computed(() =>
  settingStore.enableSiteSearch ? matchSites(keyword.value, MAX_SITES) : [],
);

const historyMatches = computed(() => {
  if (!settingStore.enableSearchHistory) return [];
  // Don't show history for route or tag filter input, to avoid clutter
  if (isRouteInput(keyword.value) || hasTagFilter(keyword.value)) return [];
  const kw = keyword.value.trim().toLowerCase();
  const list = settingStore.searchHistory.filter((h) => {
    const lower = h.toLowerCase();
    return kw ? lower.includes(kw) && lower !== kw : true;
  });
  return list.slice(0, MAX_SUGGESTIONS - siteMatches.value.length);
});

const items = computed<DropdownItem[]>(() => [
  ...siteMatches.value.map((site) => ({
    type: "site" as const,
    id: `site-${site.key}`,
    site,
  })),
  ...historyMatches.value.map((term) => ({
    type: "history" as const,
    id: `history-${term}`,
    term,
  })),
]);

// Typed /xxx but it isn't listed: say it will search the web, and offer a way to contribute
const showRouteMiss = computed(
  () =>
    settingStore.enableSiteSearch &&
    isRouteInput(keyword.value) &&
    keyword.value.trim().length > 1 &&
    !resolveRoute(keyword.value, locale.value) &&
    siteMatches.value.length === 0,
);

const showDropdown = computed(
  () =>
    isFocused.value &&
    !quietFocus.value &&
    (items.value.length > 0 || showRouteMiss.value),
);

/** Focus the box without opening suggestions (used when the page focuses it by itself) */
const focusQuietly = () => {
  quietFocus.value = true;
  inputRef.value?.focus();
};

// --- Backup address chooser (opened by Alt+Enter or clicking "Backup"; main site selected by default) ---
const chooserTargets = ref<SiteTarget[]>([]);
const chooserIndex = ref(0);

const openChooser = (site: Site) => {
  chooserTargets.value = siteTargets(site, keyword.value, locale.value);
  chooserIndex.value = 0;
};

const closeChooser = () => {
  chooserTargets.value = [];
};

/** Target site for Alt+Enter: the highlighted row first, then the site matched by /key */
const chooserSite = (): Site | undefined => {
  const active = items.value[activeIndex.value];
  if (active) return active.type === "site" ? active.site : undefined;
  if (!settingStore.enableSiteSearch || !isRouteInput(keyword.value)) return;
  return (
    resolveRoute(keyword.value, locale.value)?.site ??
    (siteMatches.value.length === 1 ? siteMatches.value[0] : undefined)
  );
};

// Clear the highlight and close the chooser when the input changes, so Enter can't use a stale selection
watch(keyword, () => {
  activeIndex.value = -1;
  closeChooser();
});

/**
 * Whether this navigation opens a new tab: the setting, flipped while Ctrl/⌘ is held;
 * a middle-click always opens a new tab, like on a link.
 */
const wantsNewTab = (e?: KeyboardEvent | MouseEvent) => {
  if (e instanceof MouseEvent && e.button === 1) return true;
  return settingStore.openInNewTab !== !!(e && (e.ctrlKey || e.metaKey));
};

/** Navigate; Shift+Enter opening a new window is handled by the browser, so it isn't checked here */
const go = (url: string, e?: KeyboardEvent | MouseEvent) =>
  navigateTo(url, wantsNewTab(e));

const search = (query: string, e?: KeyboardEvent | MouseEvent) => {
  const q = query.trim();
  if (!q) return;
  settingStore.addSearchHistory(q);
  go(buildSearchUrl(currentEngine.value, q), e);
};

const openSite = (site: Site, e?: KeyboardEvent | MouseEvent) => {
  go(siteTargets(site, keyword.value, locale.value)[0].url, e);
};

const pickItem = (item: DropdownItem, e?: KeyboardEvent | MouseEvent) => {
  if (item.type === "site") {
    openSite(item.site, e);
  } else {
    keyword.value = item.term;
    search(item.term, e);
  }
};

const handleEnter = (e: KeyboardEvent) => {
  // Enter during IME composition doesn't trigger a search
  if (e.isComposing) return;

  // Chooser is open: go to the selected target
  const chosen = chooserTargets.value[chooserIndex.value];
  if (chosen) return go(chosen.url, e);

  // Alt+Enter: open the chooser if the site has backup addresses; otherwise same as plain Enter
  if (e.altKey) {
    const site = chooserSite();
    if (site?.altUrls?.length) return openChooser(site);
  }

  // 1. A row is highlighted: use it
  const active = items.value[activeIndex.value];
  if (active) return pickItem(active, e);

  const input = keyword.value;
  if (settingStore.enableSiteSearch) {
    // 2. /key?query goes straight to the site
    if (isRouteInput(input)) {
      const route = resolveRoute(input, locale.value);
      if (route) return go(route.url, e);
      // An unlisted /key with only one prefix match opens that site
      if (siteMatches.value.length === 1)
        return openSite(siteMatches.value[0], e);
    }
    // 3. Tag filter only: open the first match
    if (hasTagFilter(input) && siteMatches.value.length > 0) {
      return openSite(siteMatches.value[0], e);
    }
  }

  // 4. Everything else goes to the search engine
  search(input, e);
};

const onArrowDown = () => {
  if (chooserTargets.value.length) {
    chooserIndex.value = (chooserIndex.value + 1) % chooserTargets.value.length;
    return;
  }
  // ↓ in a quietly focused box first opens the suggestions
  if (quietFocus.value) {
    quietFocus.value = false;
    return;
  }
  if (!items.value.length || !isFocused.value) return;
  activeIndex.value = (activeIndex.value + 1) % items.value.length;
};

const onArrowUp = () => {
  if (chooserTargets.value.length) {
    chooserIndex.value =
      (chooserIndex.value - 1 + chooserTargets.value.length) %
      chooserTargets.value.length;
    return;
  }
  if (!items.value.length || !isFocused.value) return;
  activeIndex.value =
    activeIndex.value <= 0 ? items.value.length - 1 : activeIndex.value - 1;
};

const removeSuggestion = (term: string) => {
  settingStore.removeSearchHistory(term);
  activeIndex.value = -1;
};

const onEscape = () => {
  // Close the chooser first, then the dropdown; blur once both are closed
  if (chooserTargets.value.length) {
    closeChooser();
  } else if (showDropdown.value) {
    isFocused.value = false;
  } else {
    inputRef.value?.blur();
  }
};

// --- Ctrl+K / ⌘K focuses the search box ---
const onGlobalKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    quietFocus.value = false;
    inputRef.value?.focus();
    inputRef.value?.select();
  }
};
// --- Going back to this page starts with an empty search box ---
// The back-forward cache restores the page as it was left, including the typed query, so clear it
// (the keyword watcher also resets the highlighted row and the backup chooser).
const onPageShow = (e: PageTransitionEvent) => {
  if (!e.persisted) return;
  keyword.value = "";
  engineMenuOpen.value = false;
  focusQuietly();
};

onMounted(() => {
  // Start typing right away. On a new tab the browser keeps focus in its own address bar
  // (Chrome and Firefox both do this for extension new tab pages), so this mainly helps
  // the home page, reloads and the dev server; Ctrl+K / ⌘K still focuses from anywhere.
  focusQuietly();
  window.addEventListener("keydown", onGlobalKeydown);
  window.addEventListener("pageshow", onPageShow);
});
onUnmounted(() => {
  window.removeEventListener("keydown", onGlobalKeydown);
  window.removeEventListener("pageshow", onPageShow);
});
</script>

<template>
  <div class="search-wrapper">
    <div class="search-box">
      <div class="capsule" :class="{ 'is-focused': isFocused }">
        <!-- Current search engine; click to switch quickly -->
        <button
          class="engine-prefix"
          :class="{ 'is-open': engineMenuOpen }"
          :aria-label="t('MainSearchBar.switchEngine')"
          @click="engineMenuOpen = !engineMenuOpen"
          @blur="engineMenuOpen = false"
        >
          {{ currentEngine.name.toLowerCase() }}<span class="scheme">://</span>
        </button>

        <input
          ref="inputRef"
          type="text"
          autocomplete="off"
          v-model="keyword"
          :placeholder="
            settingStore.enableSiteSearch
              ? t('MainSearchBar.emptyWithSites')
              : t('MainSearchBar.empty')
          "
          class="capsule-input"
          @focus="isFocused = true"
          @blur="
            isFocused = false;
            quietFocus = false;
            closeChooser();
          "
          @input="
            isFocused = true;
            quietFocus = false;
          "
          @mousedown="quietFocus = false"
          @keydown.enter="handleEnter"
          @keydown.down.prevent="onArrowDown"
          @keydown.up.prevent="onArrowUp"
          @keydown.esc="onEscape"
        />

        <!-- Engine switch dropdown -->
        <Transition name="suggest">
          <ul v-if="engineMenuOpen" class="engine-menu">
            <li
              v-for="engine in engines"
              :key="engine.id"
              class="engine-option"
              :class="{ selected: engine.id === currentEngine.id }"
              @mousedown.left.prevent="selectEngine(engine.id)"
            >
              {{ engine.name }}
            </li>
          </ul>
        </Transition>
      </div>

      <!-- Backup address chooser; official sites + history suggestions -->
      <Transition name="suggest">
        <ul v-if="chooserTargets.length" class="suggestions">
          <li
            v-for="(target, index) in chooserTargets"
            :key="target.url"
            class="suggestion-item is-site"
            :class="{ active: index === chooserIndex }"
            @mousedown.left.prevent="go(target.url, $event)"
            @mousedown.middle.prevent="go(target.url, $event)"
            @mouseenter="chooserIndex = index"
          >
            <span class="site-badge" :class="{ 'is-alt': target.isAlt }">{{
              t(target.isAlt ? "MainSearchBar.alt" : "MainSearchBar.official")
            }}</span>
            <span class="suggestion-text">
              <span class="site-host">{{ displayHost(target.url) }}</span>
            </span>
          </li>
        </ul>

        <ul v-else-if="showDropdown" class="suggestions">
          <li
            v-for="(item, index) in items"
            :key="item.id"
            class="suggestion-item"
            :class="{
              active: index === activeIndex,
              'is-site': item.type === 'site',
            }"
            @mousedown.left.prevent="pickItem(item, $event)"
            @mousedown.middle.prevent="pickItem(item, $event)"
            @mouseenter="activeIndex = index"
          >
            <template v-if="item.type === 'site'">
              <span class="site-badge">{{ t("MainSearchBar.official") }}</span>
              <span class="suggestion-text">
                <span class="site-name">{{
                  localize(item.site.name, locale)
                }}</span>
                <span class="site-host">{{
                  displayHost(localize(item.site.url, locale))
                }}</span>
                <span v-if="item.site.desc" class="site-desc">{{
                  localize(item.site.desc, locale)
                }}</span>
              </span>
              <button
                v-if="item.site.altUrls?.length"
                class="site-badge is-alt alt-trigger"
                :title="t('MainSearchBar.altHint')"
                @mousedown.left.prevent.stop="openChooser(item.site)"
                @mousedown.middle.prevent.stop
              >
                {{ t("MainSearchBar.alt") }}
              </button>
              <span class="site-key">/{{ item.site.key }}</span>
            </template>
            <template v-else>
              <span class="suggestion-text">{{ item.term }}</span>
              <button
                class="suggestion-remove"
                :aria-label="t('MainSearchBar.removeHistory')"
                @mousedown.left.prevent.stop="removeSuggestion(item.term)"
                @mousedown.middle.prevent.stop
              >
                ×
              </button>
            </template>
          </li>

          <li v-if="showRouteMiss" class="route-miss">
            <span>{{
              t("MainSearchBar.routeMiss", { engine: currentEngine.name })
            }}</span>
            <a
              :href="contributeUrl(locale)"
              target="_blank"
              rel="noopener"
              class="contribute-link"
              @mousedown.prevent
              >{{ t("MainSearchBar.contribute") }}</a
            >
          </li>
        </ul>
      </Transition>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.search-wrapper {
  margin-top: 40px;
  width: 80%;
  max-width: 800px;
  display: flex;
  justify-content: center;
}

.search-box {
  position: relative;
  width: 100%;
}

/* Capsule container (border, shadow and focus effects are all on this layer) */
.capsule {
  display: flex;
  align-items: center;
  padding: 0 28px;
  background-color: var(--panel-bg);
  border: 1px solid var(--border-main);
  border-radius: 50px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition:
    box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
    transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
    background-color 0.3s ease,
    border-color 0.3s ease;
}

.capsule:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.capsule.is-focused {
  border-color: var(--border-hard);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

/* Engine prefix, such as google:// */
.engine-prefix {
  flex-shrink: 0;
  border: none;
  background: none;
  padding: 0;
  margin-right: 12px;
  font-size: 18px;
  color: var(--text-main);
  cursor: pointer;
  white-space: nowrap;
  font-family: "Fusion Pixel", monospace;
  -webkit-font-smoothing: none;
  font-smooth: never;
  transition:
    color 0.2s ease,
    opacity 0.2s ease;

  .scheme {
    color: var(--text-secondary);
  }

  &:hover,
  &.is-open {
    opacity: 0.7;
  }
}

.capsule-input {
  flex: 1;
  min-width: 0;
  padding: 16px 0;
  font-size: 18px;
  color: var(--text-main);
  background: transparent;
  border: none;
  outline: none;
  font-family: "Fusion Pixel", monospace;
  -webkit-font-smoothing: none;
  font-smooth: never;
  transition: color 0.3s ease;

  &::placeholder {
    color: var(--text-secondary);
    font-size: 16px;
  }
}

/* Engine switch dropdown (left-aligned with the prefix) */
.engine-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 160px;
  list-style: none;
  margin: 0;
  padding: 6px;
  box-sizing: border-box;
  background-color: var(--panel-bg);
  border: 1px solid var(--border-main);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 60;
  font-family: "Fusion Pixel", monospace;
  -webkit-font-smoothing: none;
  font-smooth: never;
}

.engine-option {
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 15px;
  color: var(--text-secondary);
  transition:
    background-color 0.15s ease,
    color 0.15s ease;

  &.selected {
    color: var(--text-main);
    background-color: var(--selected-bg);
  }

  // A subtler shade than the current engine, so the two stay distinguishable;
  // hovering the current engine keeps its own style
  &:not(.selected):hover {
    background-color: var(--menu-hover-bg);
    color: var(--text-main);
  }
}

/* --- History suggestions dropdown --- */
.suggestions {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 100%;
  list-style: none;
  margin: 0;
  padding: 6px;
  box-sizing: border-box;
  background-color: var(--panel-bg);
  border: 1px solid var(--border-main);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 50;
  font-family: "Fusion Pixel", monospace;
  -webkit-font-smoothing: none;
  font-smooth: never;
}

.suggestion-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-secondary);
  transition:
    background-color 0.15s ease,
    color 0.15s ease;

  &.active {
    background-color: var(--hover-bg);
    color: var(--text-main);
  }
}

.suggestion-text {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 15px;
  text-align: left;
}

.suggestion-remove {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  line-height: 1;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  border-radius: 6px;
  opacity: 0;
  transition:
    opacity 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;

  &:hover {
    background-color: var(--active-bg);
    color: var(--text-main);
  }
}

.suggestion-item.active .suggestion-remove {
  opacity: 1;
}

/* --- Official site rows --- */
.site-badge {
  flex-shrink: 0;
  padding: 2px 6px;
  font-size: 12px;
  line-height: 1.2;
  color: var(--panel-bg);
  background-color: var(--text-main);
  border-radius: 4px;

  /* Backup address: outlined, to contrast with the solid "Official" badge */
  &.is-alt {
    padding: 1px 5px;
    color: var(--text-main);
    background-color: transparent;
    border: 1px solid var(--border-hard);
  }
}

.alt-trigger {
  cursor: pointer;
  font-family: "Fusion Pixel", monospace;
  -webkit-font-smoothing: none;
  font-smooth: never;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: var(--active-bg);
  }
}

.suggestion-item.is-site .suggestion-text {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.site-name {
  color: var(--text-main);
  flex-shrink: 0;
}

.site-host,
.site-desc {
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
}

.site-host {
  flex-shrink: 0;
}

.site-key {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.route-miss {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: left;
}

.contribute-link {
  flex-shrink: 0;
  color: var(--text-main);
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 600px) {
  .site-desc,
  .site-key {
    display: none;
  }
}

/* Dropdown enter and leave animation */
.suggest-enter-active,
.suggest-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
  transform-origin: top;
}
.suggest-enter-from,
.suggest-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
