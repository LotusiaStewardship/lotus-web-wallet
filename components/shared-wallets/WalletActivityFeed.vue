<script setup lang="ts">
/**
 * WalletActivityFeed
 *
 * Phase 10 R10.4.5: Activity feed for a specific shared wallet.
 * Shows signing sessions and transaction history for the wallet.
 */
import { useMuSig2Store } from '~/stores/musig2'
import type { WalletSigningSession } from '~/plugins/05.musig2.client'

const props = defineProps<{
  /** Wallet ID to show activity for */
  walletId: string
}>()

const emit = defineEmits<{
  viewSession: [session: WalletSigningSession]
  abortSession: [sessionId: string]
}>()

const musig2Store = useMuSig2Store()
const { timeAgo } = useTime()

// Get sessions for this wallet using the store getter
const walletSessions = computed(() => musig2Store.sessionsForWallet(props.walletId))

// Separate active and completed sessions
const activeSessions = computed(() =>
  walletSessions.value.filter(s =>
    s.state === 'created' ||
    s.state === 'nonce_exchange' ||
    s.state === 'signing'
  )
)

const completedSessions = computed(() =>
  walletSessions.value.filter(s =>
    s.state === 'completed' ||
    s.state === 'failed'
  )
)

// Session state display config
function getSessionStateConfig(state: string): { color: string; label: string; icon: string } {
  const configs: Record<string, { color: string; label: string; icon: string }> = {
    created: { color: 'warning', label: 'Waiting', icon: 'i-lucide-clock' },
    nonce_exchange: { color: 'primary', label: 'Exchanging', icon: 'i-lucide-refresh-cw' },
    signing: { color: 'primary', label: 'Signing', icon: 'i-lucide-pen-tool' },
    completed: { color: 'success', label: 'Completed', icon: 'i-lucide-check-circle' },
    failed: { color: 'error', label: 'Failed', icon: 'i-lucide-x-circle' },
  }
  return configs[state] || { color: 'neutral', label: state, icon: 'i-lucide-circle' }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Active Sessions -->
    <div v-if="activeSessions.length > 0">
      <h4 class="text-sm font-medium text-muted mb-2">Active Sessions</h4>
      <div class="space-y-2">
        <div v-for="session in activeSessions" :key="session.id"
          class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon :name="getSessionStateConfig(session.state).icon" class="w-4 h-4" :class="{
                'text-warning': getSessionStateConfig(session.state).color === 'warning',
                'text-primary animate-spin': getSessionStateConfig(session.state).color === 'primary',
              }" />
              <span class="font-medium text-sm">
                {{ getSessionStateConfig(session.state).label }}
              </span>
              <UBadge color="primary" variant="subtle" size="xs">
                {{ session.participants.length }} participants
              </UBadge>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted">{{ timeAgo(session.createdAt) }}</span>
              <UButton color="error" variant="ghost" size="xs" icon="i-lucide-x"
                @click="emit('abortSession', session.id)" />
            </div>
          </div>

          <!-- Progress indicator -->
          <div class="mt-2">
            <div class="flex items-center gap-1 text-xs text-muted">
              <span>Nonces: {{session.participants.filter(p => p.hasNonce).length}}/{{ session.participants.length
                }}</span>
              <span>•</span>
              <span>Signatures: {{session.participants.filter(p => p.hasPartialSig).length}}/{{
                session.participants.length }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Completed Sessions / History -->
    <div v-if="completedSessions.length > 0">
      <h4 class="text-sm font-medium text-muted mb-2">Recent Activity</h4>
      <div class="space-y-2">
        <!-- Phase 6: Semantic color classes -->
        <div v-for="session in completedSessions.slice(0, 5)" :key="session.id"
          class="p-3 bg-background rounded-lg border border-default">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon :name="getSessionStateConfig(session.state).icon" class="w-4 h-4" :class="{
                'text-success': session.state === 'completed',
                'text-error': session.state === 'failed',
              }" />
              <span class="text-sm">
                {{ session.state === 'completed' ? 'Transaction signed' : 'Session failed' }}
              </span>
            </div>
            <span class="text-xs text-muted">{{ timeAgo(session.createdAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <UiAppEmptyState v-if="walletSessions.length === 0" icon="i-lucide-activity" title="No activity yet"
      description="Signing sessions and transactions for this wallet will appear here" />
  </div>
</template>
