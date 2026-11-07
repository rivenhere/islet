<script setup lang="ts">
// Value bound through v-model
const props = defineProps<{
  modelValue: boolean;
}>();

// Update event
const emit = defineEmits(["update:modelValue"]);

// Flip the toggle
const toggle = () => {
  emit("update:modelValue", !props.modelValue);
};
</script>

<template>
  <div class="pixel-toggle" :class="{ 'is-on': modelValue }" @click="toggle">
    <div class="toggle-thumb"></div>
  </div>
</template>

<style lang="scss" scoped>
.pixel-toggle {
  width: 46px;
  height: 26px;
  // Keep its size next to long labels (as a flex item it would otherwise shrink)
  flex-shrink: 0;
  background-color: var(--active-bg);
  border: 2px solid var(--border-hard);
  border-radius: 6px;
  box-sizing: border-box;

  display: flex;
  align-items: center;
  padding: 2px;

  cursor: pointer;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
}

.pixel-toggle.is-on {
  background-color: var(--text-main);
}

.toggle-thumb {
  width: 18px;
  height: 18px;
  background-color: var(--panel-bg);
  border: 2px solid var(--border-hard);
  border-radius: 4px;
  box-sizing: border-box;

  transition:
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color 0.3s ease,
    background-color 0.3s ease;
}

.pixel-toggle.is-on .toggle-thumb {
  transform: translateX(20px);
  border-color: var(--panel-bg);
}
</style>
