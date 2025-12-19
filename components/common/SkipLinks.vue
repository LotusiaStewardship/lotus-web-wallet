<script setup lang="ts">
/**
 * SkipLinks - Accessibility skip navigation links
 *
 * Provides keyboard users a way to skip repetitive navigation
 * and jump directly to main content.
 */
</script>

<template>
  <!-- Phase 6: Semantic color classes -->
  <a href="#main-content"
    class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-primary focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-primary focus:outline-none">
    Skip to main content
  </a>
</template>
