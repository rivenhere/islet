<script setup lang="ts">
import MainClock from "./components/MainClock.vue";
import MainSearchBar from "./components/MainSearchBar.vue";
import QuickNav from "./components/QuickNav.vue";
import SettingButton from "./components/SettingButton.vue";
import SettingPanel from "./components/SettingPanel.vue";
import HitokotoWidget from "./components/HitokotoWidget.vue";
import { useTheme } from "./composables/useTheme";

// Keep the theme mode in sync with the system theme
useTheme();
</script>

<template>
  <div class="main-container">
    <!-- Main page content -->
    <MainClock></MainClock>
    <MainSearchBar></MainSearchBar>
    <QuickNav></QuickNav>
    <HitokotoWidget></HitokotoWidget>

    <!-- Settings -->
    <SettingButton></SettingButton>
    <SettingPanel></SettingPanel>
  </div>
</template>

<style lang="scss" scoped>
.main-container {
  /* min-height grows with content: with a fixed height, overflowing centered content goes above the page top, out of scroll reach */
  min-height: 100vh;
  min-height: 100dvh;
  padding: 24px 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  /* In narrow windows the clock can reach the top-right settings button, so leave room for it when content is tall; symmetric to stay centered */
  @media (max-width: 640px) {
    padding: 72px 0;
  }
}
</style>
