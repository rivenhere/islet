<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import { useSettingStore } from "@/store/setting";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const settingStore = useSettingStore();

// Quote text and its source
const hitokotoText = ref(t("HitokotoWidget.padding"));
const hitokotoFrom = ref("");

// Loading state prevents repeat refresh clicks; copied state briefly shows "Copied"
const loading = ref(false);
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

// Aborts any in-flight request when the component unmounts
const controller = new AbortController();

// Fetch a quote from the Hitokoto API
const fetchHitokoto = async () => {
  if (loading.value) return;
  loading.value = true;
  try {
    const res = await fetch("https://v1.hitokoto.cn", {
      signal: controller.signal,
    });
    const data = await res.json();
    hitokotoText.value = data.hitokoto;
    hitokotoFrom.value = data.from;
  } catch (error) {
    // A deliberate abort isn't an error, so don't show the fallback text
    if (controller.signal.aborted) return;
    hitokotoText.value = t("HitokotoWidget.empty.title");
    hitokotoFrom.value = t("HitokotoWidget.empty.from");
  } finally {
    loading.value = false;
  }
};

// Copy the current quote, including its source
const copyHitokoto = async () => {
  const text = hitokotoFrom.value
    ? `${hitokotoText.value} —— ${hitokotoFrom.value}`
    : hitokotoText.value;
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => (copied.value = false), 1500);
  } catch (error) {
    // Fail silently if the clipboard is unavailable
  }
};

// Only use the network when turned on: no requests while off; fetch one once on (including first paint)
watch(
  () => settingStore.showHitokoto,
  (show) => {
    if (show) fetchHitokoto();
  },
  { immediate: true },
);

onUnmounted(() => {
  controller.abort();
  clearTimeout(copiedTimer);
});
</script>

<template>
  <Transition name="fade">
    <div v-if="settingStore.showHitokoto" class="hitokoto-wrapper">
      <div class="hitokoto-content">
        <!-- Traditional corner quotation marks, for a literary feel -->
        <span class="quote-mark">「</span>
        <span class="text">{{ hitokotoText }}</span>
        <span class="quote-mark">」</span>
      </div>
      <!-- Source -->
      <div v-if="hitokotoFrom" class="hitokoto-from">—— {{ hitokotoFrom }}</div>

      <!-- Action buttons: refresh / copy -->
      <div class="hitokoto-actions">
        <button
          class="action-btn"
          :class="{ loading }"
          :disabled="loading"
          :aria-label="t('HitokotoWidget.refresh')"
          :title="t('HitokotoWidget.refresh')"
          @click="fetchHitokoto"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path
              d="M13 20H9V18H13V20ZM19 16H21V18H19V20H17V18H15V16H17V8H19V16ZM9 18H7V16H9V18ZM7 6H9V8H7V16H5V8H3V6H5V4H7V6ZM15 16H13V14H15V16ZM23 16H21V14H23V16ZM3 10H1V8H3V10ZM11 10H9V8H11V10ZM17 8H15V6H17V8ZM15 6H11V4H15V6Z"
            />
          </svg>
        </button>
        <button
          class="action-btn"
          :aria-label="t('HitokotoWidget.copy')"
          :title="
            copied ? t('HitokotoWidget.copied') : t('HitokotoWidget.copy')
          "
          @click="copyHitokoto"
        >
          <svg
            v-if="!copied"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="currentColor"
          >
            <path
              d="M18 22h-8v-2h8v2Zm-8-2H8v-2H6v-2h2V8h2v12Zm10 0h-2V8h2v12ZM6 16H4V4h2v12ZM16 6h2v2h-8V6h4V4h2v2Zm-2-2H6V2h8v2Z"
            />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="currentColor"
          >
            <path
              d="M10 18H8v-2h2v2Zm-2-2H6v-2h2v2Zm4-2v2h-2v-2h2Zm-6 0H4v-2h2v2Zm8 0h-2v-2h2v2Zm2-2h-2v-2h2v2Zm2-2h-2V8h2v2Zm2-2h-2V6h2v2Z"
            />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.hitokoto-wrapper {
  margin-top: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 80%;
  text-align: center;

  font-family: "Fusion Pixel", monospace;
  -webkit-font-smoothing: none;
  font-smooth: never;
}

.hitokoto-content {
  /* 1. Main text uses the primary color */
  color: var(--text-main);
  font-size: 16px;
  line-height: 1.8;
  display: flex;
  align-items: flex-start;
  gap: 4px;
  /* Smooth color transition */
  transition: color 0.3s ease;
}

.quote-mark {
  /* 2. Quotation marks use the secondary color */
  color: var(--text-secondary);
  font-size: 14px;
  transition: color 0.3s ease;
}

.text {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.hitokoto-from {
  margin-top: 12px;
  font-size: 14px;
  /* 3. Source uses the secondary color */
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

/* Action buttons: faded out by default, shown on hover or focus */
.hitokoto-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.hitokoto-wrapper:hover .hitokoto-actions,
.hitokoto-actions:focus-within {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: none;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;

  &:hover {
    background-color: var(--hover-bg);
    color: var(--text-main);
  }

  &:disabled {
    cursor: default;
  }

  &.loading svg {
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
