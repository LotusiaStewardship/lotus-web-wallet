<script setup lang="ts">
/**
 * P2PPeerGrid
 *
 * Grid showing online peers.
 */
const props = defineProps<{
  /** Online peers */
  peers: Array<{
    peerId: string
    nickname?: string
    address?: string
  }>
  /** Maximum peers to display */
  maxDisplay?: number
}>()

const emit = defineEmits<{
  viewAll: []
}>()

const displayPeers = computed(() =>
  props.peers.slice(0, props.maxDisplay || 8),
)

const hiddenCount = computed(() =>
  Math.max(0, props.peers.length - (props.maxDisplay || 8)),
)

// Generate color from peer ID
function getPeerColor(peerId: string): string {
  const colors = [
    'bg-primary-100 text-primary-700',
    'bg-success-100 text-success-700',
    'bg-warning-100 text-warning-700',
    'bg-error-100 text-error-700',
    'bg-info-100 text-info-700',
  ]
  const hash = peerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

// Get initials from nickname or peer ID
function getInitials(peer: { peerId: string; nickname?: string }): string {
  if (peer.nickname) {
    const parts = peer.nickname.split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return peer.nickname.slice(0, 2).toUpperCase()
  }
  return peer.peerId.slice(0, 2).toUpperCase()
}
</script>

<template>
  <UiAppCard title="Online Peers" icon="i-lucide-users">
    <template #header-badge>
      <UBadge color="success" variant="subtle" size="sm">
        {{ peers.length }}
      </UBadge>
    </template>

    <template v-if="peers.length" #header-action>
      <UButton v-if="hiddenCount > 0" color="neutral" variant="ghost" size="xs" @click="emit('viewAll')">
        View All
      </UButton>
    </template>

    <!-- Peer Grid -->
    <div v-if="displayPeers.length" class="flex flex-wrap gap-2">
      <div v-for="peer in displayPeers" :key="peer.peerId" :class="[
        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium cursor-default',
        getPeerColor(peer.peerId),
      ]" :title="peer.nickname || peer.peerId">
        {{ getInitials(peer) }}
      </div>

      <!-- More indicator -->
      <div v-if="hiddenCount > 0"
        class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted cursor-pointer hover:bg-muted/80"
        @click="emit('viewAll')">
        +{{ hiddenCount }}
      </div>
    </div>

    <!-- Empty -->
    <p v-else class="text-sm text-muted text-center py-4">
      No peers connected
    </p>
  </UiAppCard>
</template>
