<script setup lang="ts">
/**
 * P2PHeroCard
 *
 * Hero card showing P2P connection status.
 *
 * Note: This is intentionally a domain-specific component rather than using
 * UiAppHeroCard. The complex state (connection status, peer count, DHT status)
 * and left-aligned layout with action buttons justifies keeping it separate.
 *
 * Styling aligns with UiAppHeroCard base patterns:
 * - rounded-xl border radius
 * - p-6 padding
 * - gradient background (darker variant for status display)
 */
const props = defineProps<{
  /** Connection state */
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'dht_ready' | 'fully_operational' | 'error'
  /** Number of connected peers */
  peerCount: number
  /** Whether DHT is ready */
  dhtReady: boolean
}>()

const emit = defineEmits<{
  connect: []
  disconnect: []
}>()

const isConnected = computed(() =>
  ['connected', 'dht_ready', 'fully_operational'].includes(props.connectionState),
)

const isConnecting = computed(() => props.connectionState === 'connecting')

const isError = computed(() => props.connectionState === 'error')

const statusText = computed(() => {
  if (isError.value) return 'Connection error'
  if (isConnecting.value) return 'Connecting...'
  if (!isConnected.value) return 'Disconnected'
  if (!props.dhtReady) return 'Initializing DHT...'
  return `Connected with ${props.peerCount} peer${props.peerCount !== 1 ? 's' : ''}`
})

const statusColor = computed(() => {
  if (isError.value) return 'error'
  if (isConnecting.value) return 'warning'
  if (!isConnected.value) return 'neutral'
  return 'success'
})
</script>

<template>
  <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 p-6 text-white">
    <!-- Background Pattern -->
    <div class="absolute inset-0 opacity-10">
      <div class="absolute inset-0"
        style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 24px 24px;">
      </div>
    </div>

    <div class="relative flex items-center gap-6">
      <!-- Icon with Status Indicator -->
      <div class="relative flex-shrink-0">
        <div class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
          <UIcon name="i-lucide-globe" class="w-8 h-8" />
        </div>
        <span v-if="isConnected" class="absolute -bottom-1 -right-1 flex h-5 w-5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-5 w-5 bg-success-500 border-2 border-white"></span>
        </span>
        <span v-else-if="isConnecting" class="absolute -bottom-1 -right-1 flex h-5 w-5">
          <UIcon name="i-lucide-loader-2" class="w-5 h-5 animate-spin text-warning" />
        </span>
      </div>

      <!-- Content -->
      <div class="flex-1">
        <h2 class="text-2xl font-bold mb-1">P2P Network</h2>
        <p class="text-white/80">{{ statusText }}</p>

        <!-- DHT Status -->
        <div v-if="isConnected" class="flex items-center gap-4 mt-2 text-sm text-white/70">
          <span class="flex items-center gap-1">
            <UIcon name="i-lucide-database" class="w-4 h-4" />
            DHT: {{ dhtReady ? 'Ready' : 'Syncing...' }}
          </span>
          <span class="flex items-center gap-1">
            <UIcon name="i-lucide-users" class="w-4 h-4" />
            {{ peerCount }} peers
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex-shrink-0">
        <UButton v-if="!isConnected" color="neutral" icon="i-lucide-wifi" :loading="isConnecting"
          @click="emit('connect')">
          Connect
        </UButton>
        <div v-else class="flex items-center gap-2">
          <UBadge color="success" variant="solid" size="lg">
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-white"></span>
              Online
            </span>
          </UBadge>
          <UButton color="neutral" variant="ghost" icon="i-lucide-wifi-off" @click="emit('disconnect')" />
        </div>
      </div>
    </div>
  </div>
</template>
