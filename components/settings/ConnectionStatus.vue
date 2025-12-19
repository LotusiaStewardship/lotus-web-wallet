<script setup lang="ts">
/**
 * SettingsConnectionStatus
 *
 * Display network connection status.
 */
const props = defineProps<{
  /** Whether connected */
  connected: boolean
  /** Block height */
  blockHeight: number
  /** Endpoint URL */
  endpoint: string
}>()
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-muted">Status</span>
      <UBadge :color="connected ? 'success' : 'error'" variant="subtle">
        {{ connected ? 'Connected' : 'Disconnected' }}
      </UBadge>
    </div>

    <div class="flex items-center justify-between">
      <span class="text-muted">Block Height</span>
      <span class="font-mono">{{ blockHeight.toLocaleString() }}</span>
    </div>

    <div class="flex items-center justify-between">
      <span class="text-muted">Endpoint</span>
      <span class="text-sm font-mono truncate max-w-[200px]" :title="endpoint">
        {{ endpoint }}
      </span>
    </div>
  </div>
</template>
