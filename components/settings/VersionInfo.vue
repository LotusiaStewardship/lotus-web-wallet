<script setup lang="ts">
/**
 * SettingsVersionInfo
 *
 * Display app version and network info.
 */
const props = defineProps<{
  /** App version */
  version: string
  /** Current network */
  network: string
}>()
</script>

<template>
  <div class="text-center text-sm text-muted space-y-1">
    <p>Lotus Web Wallet v{{ version }}</p>
    <p>Network: {{ network }}</p>
  </div>
</template>
