<script setup lang="ts">
/**
 * P2PSessionList
 *
 * List of active signing sessions.
 */
const props = defineProps<{
  /** Active sessions */
  sessions: Array<{
    id: string
    type: string
    participants: Array<{ peerId: string; nickname?: string }>
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    createdAt: number
    amount?: string | bigint
  }> | Map<string, any>
}>()

const emit = defineEmits<{
  view: [session: any]
  abort: [sessionId: string]
}>()

const { formatXPI } = useAmount()
const { timeAgo } = useTime()

// Convert Map to array if needed
const sessionList = computed(() => {
  if (props.sessions instanceof Map) {
    return Array.from(props.sessions.values())
  }
  return props.sessions
})

// Status configuration with typed colors for UBadge
function getStatusConfig(status: string): { color: 'warning' | 'primary' | 'success' | 'error' | 'neutral'; label: string } {
  const configs: Record<string, { color: 'warning' | 'primary' | 'success' | 'error' | 'neutral'; label: string }> = {
    pending: { color: 'warning', label: 'Pending' },
    in_progress: { color: 'primary', label: 'In Progress' },
    completed: { color: 'success', label: 'Completed' },
    failed: { color: 'error', label: 'Failed' },
  }
  return configs[status] || { color: 'neutral', label: status }
}
</script>

<template>
  <UiAppCard title="Active Sessions" icon="i-lucide-layers">
    <template #header-badge>
      <UBadge v-if="sessionList.length" color="primary" variant="subtle" size="sm">
        {{ sessionList.length }}
      </UBadge>
    </template>

    <!-- Sessions -->
    <div v-if="sessionList.length" class="divide-y divide-default -mx-4">
      <div v-for="session in sessionList" :key="session.id"
        class="px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors" @click="emit('view', session)">
        <div class="flex items-start gap-3">
          <!-- Icon -->
          <div
            class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <UIcon name="i-lucide-layers" class="w-5 h-5 text-primary" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <p class="font-medium">{{ session.type }} Session</p>
              <UBadge :color="getStatusConfig(session.status).color" variant="subtle" size="xs">
                {{ getStatusConfig(session.status).label }}
              </UBadge>
            </div>
            <p class="text-sm text-muted">
              {{ session.participants.length }} participants
              <span v-if="session.amount">
                • {{ formatXPI(session.amount) }}
              </span>
            </p>
          </div>

          <!-- Time & Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-xs text-muted">{{ timeAgo(session.createdAt) }}</span>
            <UButton v-if="session.status === 'pending' || session.status === 'in_progress'" color="error"
              variant="ghost" size="xs" icon="i-lucide-x" @click.stop="emit('abort', session.id)" />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <UiAppEmptyState v-else icon="i-lucide-layers" title="No active sessions"
      description="Start a signing session by requesting a signature from a signer" />
  </UiAppCard>
</template>
