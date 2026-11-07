<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useSettingStore } from "@/store/setting";
import { useI18n } from "vue-i18n";

const settingStore = useSettingStore();
const { locale } = useI18n();

// Current time (reactive source updated every second)
const now = ref(new Date());
let timer: ReturnType<typeof setTimeout>;

const updateTime = () => {
  now.value = new Date();
  // Align to the next second to avoid accumulated drift
  timer = setTimeout(updateTime, 1000 - now.value.getMilliseconds());
};

// i18n language tag -> BCP 47 tag with region, for Intl-localized date and weekday
const INTL_LOCALES: Record<string, string> = {
  "zh-Hans": "zh-Hans-CN",
  en: "en-US",
  ja: "ja-JP",
};
const localeTag = computed(() => INTL_LOCALES[locale.value] ?? "en-US");

// AM/PM in 12-hour format, empty in 24-hour format
const meridiem = computed(() => {
  if (settingStore.hourFormat !== "12") return "";
  return now.value.getHours() < 12 ? "AM" : "PM";
});

// Main time text HH:MM(:SS)
const timeText = computed(() => {
  const d = now.value;
  let hour = d.getHours();
  if (settingStore.hourFormat === "12") hour = hour % 12 || 12;

  const hh = String(hour).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (!settingStore.showSeconds) return `${hh}:${mm}`;

  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
});

// Date and weekday (localized to the current language), joined according to the toggles
const dateText = computed(() => {
  const parts: string[] = [];
  if (settingStore.showWeekday) {
    parts.push(
      new Intl.DateTimeFormat(localeTag.value, { weekday: "long" }).format(
        now.value,
      ),
    );
  }
  if (settingStore.showDate) {
    parts.push(
      new Intl.DateTimeFormat(localeTag.value, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(now.value),
    );
  }
  return parts.join("　");
});

onMounted(() => {
  updateTime();
});

onUnmounted(() => {
  clearTimeout(timer);
});
</script>

<template>
  <div class="clock" :class="`size-${settingStore.clockSize}`">
    <div class="time-part">
      {{ timeText }}<span v-if="meridiem" class="meridiem">{{ meridiem }}</span>
    </div>
    <div v-if="dateText" class="date-part">{{ dateText }}</div>
  </div>
</template>

<style lang="scss" scoped>
.clock {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time-part {
  font-variant-numeric: tabular-nums;
  font-family: "Fusion Pixel";
  color: var(--text-main);
  text-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  -webkit-font-smoothing: none;
  font-smooth: never;
  line-height: 1.1;
  transition: color 0.3s ease;
}

.meridiem {
  margin-left: 0.3em;
  font-size: 0.4em;
  color: var(--text-secondary);
  vertical-align: baseline;
}

.date-part {
  margin-top: 8px;
  color: var(--text-secondary);
  font-family: "Fusion Pixel", monospace;
  -webkit-font-smoothing: none;
  font-smooth: never;
  transition: color 0.3s ease;
}

/* Size options; the longest text, HH:MM:SS AM, is about 4.5em wide, so capping at 20vw makes it fit narrow windows */
.size-small .time-part {
  font-size: min(56px, 20vw);
}
.size-medium .time-part {
  font-size: min(80px, 20vw);
}
.size-large .time-part {
  font-size: min(112px, 20vw);
}

.size-small .date-part {
  font-size: 14px;
}
.size-medium .date-part {
  font-size: 18px;
}
.size-large .date-part {
  font-size: 22px;
}
</style>
