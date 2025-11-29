<script setup lang="ts">
import type { ServiceAdvertisement } from '~/stores/p2p'

const props = defineProps<{
  service: ServiceAdvertisement
  compact?: boolean
}>()

const emit = defineEmits<{
  connect: [service: ServiceAdvertisement]
  details: [service: ServiceAdvertisement]
}>()

// Format timestamp
const formatTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

// Get service icon
const serviceIcon = computed(() => {
  switch (props.service.type) {
    case 'wallet': return 'i-lucide-wallet'
    case 'signer': return 'i-lucide-pen-tool'
    case 'relay': return 'i-lucide-radio'
    case 'exchange': return 'i-lucide-arrow-left-right'
    default: return 'i-lucide-box'
  }
})

// Get service color
const serviceColor = computed(() => {
  switch (props.service.type) {
    case 'wallet': return 'primary'
    case 'signer': return 'success'
    case 'relay': return 'info'
    case 'exchange': return 'warning'
    default: return 'neutral'
  }
})
</script>

<template>
  <UCard class="hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer" @click="emit('details', service)">
    <div :class="compact ? 'flex items-center gap-3' : 'flex items-start gap-4'">
      <!-- Service Icon -->
      <div class="rounded-lg flex items-center justify-center flex-shrink-0" :class="[
        compact ? 'w-10 h-10' : 'w-12 h-12',
        `bg-${serviceColor}-100 dark:bg-${serviceColor}-900/20`
      ]">
        <UIcon :name="serviceIcon" :class="[
          compact ? 'w-5 h-5' : 'w-6 h-6',
          `text-${serviceColor}-500`
        ]" />
      </div>

      <!-- Service Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <h3 :class="compact ? 'text-sm font-medium' : 'font-semibold'" class="truncate">
            {{ service.name }}
          </h3>
          <UBadge :color="serviceColor" variant="subtle" size="xs">
            {{ service.type }}
          </UBadge>
        </div>

        <p v-if="service.description && !compact" class="text-sm text-muted mb-2 line-clamp-2">
          {{ service.description }}
        </p>

        <!-- Capabilities -->
        <div v-if="service.capabilities?.length && !compact" class="flex flex-wrap gap-1 mb-2">
          <UBadge v-for="cap in service.capabilities.slice(0, 3)" :key="cap" color="neutral" variant="subtle" size="xs">
            {{ cap }}
          </UBadge>
          <UBadge v-if="service.capabilities.length > 3" color="neutral" variant="subtle" size="xs">
            +{{ service.capabilities.length - 3 }}
          </UBadge>
        </div>

        <!-- Meta -->
        <div class="flex items-center gap-4 text-xs text-muted">
          <span class="flex items-center gap-1">
            <UIcon name="i-lucide-clock" class="w-3 h-3" />
            {{ formatTime(service.createdAt) }}
          </span>
          <span v-if="!compact" class="flex items-center gap-1 truncate">
            <UIcon name="i-lucide-fingerprint" class="w-3 h-3" />
            {{ service.peerId.slice(0, 12) }}...
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="!compact" class="flex flex-col gap-2">
        <UButton color="primary" size="sm" icon="i-lucide-link" @click.stop="emit('connect', service)">
          Connect
        </UButton>
        <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-info" @click.stop="emit('details', service)">
          Details
        </UButton>
      </div>

      <!-- Compact action -->
      <UButton v-else color="neutral" variant="ghost" size="sm" icon="i-lucide-chevron-right"
        @click.stop="emit('details', service)" />
    </div>
  </UCard>
</template>
