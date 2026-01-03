<script setup lang="ts">
/**
 * Skip Links Component
 *
 * Provides keyboard-accessible skip links for screen reader users
 * to bypass navigation and jump to main content.
 */
</script>

<template>
  <div class="sr-only focus-within:not-sr-only">
    <a href="#main-content"
      class="fixed top-4 left-4 z-[100] px-4 py-2 bg-primary text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
      Skip to main content
    </a>
  </div>
</template>
