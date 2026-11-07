<script setup lang="ts">
import { computed } from "vue";
import { NAV_ICONS } from "@/config/navIcons";

const props = defineProps<{
  /** The path `d` data directly (takes priority) */
  path?: string;
  /** Or a built-in UI icon name (looked up in NAV_ICONS) */
  name?: string;
  /** Size in px, default 24 */
  size?: number | string;
}>();

const d = computed(
  () => props.path ?? (props.name ? NAV_ICONS[props.name] : "") ?? "",
);
const dim = computed(() => props.size ?? 24);
</script>

<template>
  <svg
    v-if="d"
    :width="dim"
    :height="dim"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path :d="d" />
  </svg>
</template>

<style scoped>
/* As a flex item, avoid the icon shifting from the inline baseline gap */
svg {
  display: block;
  flex-shrink: 0;
}
</style>
