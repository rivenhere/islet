<script setup lang="ts">
import { computed } from "vue";
import type { Shortcut } from "@/config/shortcuts";
import { colorForName, initialForName, SHORTCUT_FG } from "@/config/shortcuts";
import PixelIcon from "./PixelIcon.vue";

const props = defineProps<{
  /** A full shortcut, or a draft with only name/iconPath/color (for the editor preview) */
  shortcut: Pick<Shortcut, "name" | "iconPath" | "color">;
  /** Tile side length in px */
  size?: number;
}>();

const size = computed(() => props.size ?? 48);
const bg = computed(
  () => props.shortcut.color || colorForName(props.shortcut.name),
);
const initial = computed(() => initialForName(props.shortcut.name));
/** Icon size is about half the tile */
const iconSize = computed(() => Math.round(size.value * 0.5));
/** Letter size is about 0.42 of the tile */
const letterSize = computed(() => Math.round(size.value * 0.42));
</script>

<template>
  <span
    class="shortcut-icon"
    :style="{
      width: size + 'px',
      height: size + 'px',
      backgroundColor: bg,
      color: SHORTCUT_FG,
      borderRadius: Math.round(size * 0.25) + 'px',
    }"
  >
    <PixelIcon
      v-if="shortcut.iconPath"
      :path="shortcut.iconPath"
      :size="iconSize"
    />
    <span v-else class="letter" :style="{ fontSize: letterSize + 'px' }">{{
      initial
    }}</span>
  </span>
</template>

<style lang="scss" scoped>
.shortcut-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  transition: background-color 0.2s ease;
}

.letter {
  font-family: "Fusion Pixel", monospace;
  -webkit-font-smoothing: none;
  font-smooth: never;
  line-height: 1;
}
</style>
