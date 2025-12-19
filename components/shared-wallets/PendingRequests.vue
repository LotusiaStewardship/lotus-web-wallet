<script setup lang="ts">
/**
 * PendingRequests
 *
 * Phase 10 R10.4.2: Pending signing requests for Shared Wallets page.
 * Migrated from P2P RequestList with adaptations for the unified experience.
 */
import { useContactsStore } from '~/stores/contacts'
import { useMuSig2Store } from '~/stores/musig2'
import type { WalletSigningSession } from '~/plugins/05.musig2.client'

const musig2Store = useMuSig2Store()
const contactsStore = useContactsStore()
const { formatXPI } = useAmount()
const { timeAgo } = useTime()

const emit = defineEmits<{
  accept: [request: WalletSigningSession]
  reject: [request: WalletSigningSession]
  cancel: [request: WalletSigningSession]
  viewDetails: [request: WalletSigningSession]
}>()

// Incoming requests (pending sessions where we're not the initiator)
const incomingRequests = computed(() =>
  musig2Store.pendingSessions.filter(s => !s.isInitiator)
)

// Outgoing requests (pending sessions where we are the initiator)
const outgoingRequests = computed(() =>
  musig2Store.pendingSessions.filter(s => s.isInitiator)
)

// Active tab
const activeTab = ref<'incoming' | 'outgoing'>('incoming')

// Get contact name for peer
function getContactName(peerId: string): string | undefined {
  return contactsStore.contacts.find(c => c.peerId === peerId)?.name
}

// Get display name for a session
function getDisplayName(session: WalletSigningSession, isIncoming: boolean): string {
  const peerId = isIncoming ? session.coordinatorPeerId : session.participants[0]?.peerId
  if (!peerId) return 'Unknown'
  const contactName = getContactName(peerId)
  if (contactName) return contactName
  return `${peerId.slice(0, 8)}...`
}

// Get wallet name for session
function getWalletName(session: WalletSigningSession): string | undefined {
  if (!session.metadata?.walletId) return undefined
  const wallet = musig2Store.sharedWallets.find(w => w.id === session.metadata?.walletId)
  return wallet?.name
}
</script>

<template>
  <div class="space-y-4">
    <!-- Tabs -->
    <div class="flex gap-2">
      <UButton :color="activeTab === 'incoming' ? 'primary' : 'neutral'"
        :variant="activeTab === 'incoming' ? 'solid' : 'outline'" size="sm" @click="activeTab = 'incoming'">
        Incoming
        <UBadge v-if="incomingRequests.length" color="warning" variant="solid" size="xs" class="ml-1">
          {{ incomingRequests.length }}
        </UBadge>
      </UButton>
      <UButton :color="activeTab === 'outgoing' ? 'primary' : 'neutral'"
        :variant="activeTab === 'outgoing' ? 'solid' : 'outline'" size="sm" @click="activeTab = 'outgoing'">
        Outgoing
        <UBadge v-if="outgoingRequests.length" color="primary" variant="solid" size="xs" class="ml-1">
          {{ outgoingRequests.length }}
        </UBadge>
      </UButton>
    </div>

    <!-- Incoming Requests -->
    <template v-if="activeTab === 'incoming'">
      <div v-if="incomingRequests.length" class="space-y-2">
        <!-- Phase 6: Semantic color classes -->
        <div v-for="request in incomingRequests" :key="request.id"
          class="p-4 bg-background rounded-lg border border-default">
          <div class="flex items-start gap-3">
            <div
              class="w-10 h-10 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-bell" class="w-5 h-5 text-warning" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <p class="font-medium">{{ getDisplayName(request, true) }}</p>
                <UBadge color="warning" variant="subtle" size="xs">
                  Pending
                </UBadge>
              </div>
              <p class="text-sm text-muted">
                Signing request
                <span v-if="getWalletName(request)">
                  for "{{ getWalletName(request) }}"
                </span>
              </p>
              <p class="text-xs text-muted mt-1">
                {{ timeAgo(request.createdAt) }}
              </p>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0">
              <UButton color="success" size="sm" @click="emit('accept', request)">
                Accept
              </UButton>
              <UButton color="error" variant="outline" size="sm" @click="emit('reject', request)">
                Decline
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <UiAppEmptyState v-else icon="i-lucide-inbox" title="No incoming requests"
        description="You'll see signing requests from other users here" />
    </template>

    <!-- Outgoing Requests -->
    <template v-else>
      <div v-if="outgoingRequests.length" class="space-y-2">
        <!-- Phase 6: Semantic color classes -->
        <div v-for="request in outgoingRequests" :key="request.id"
          class="p-4 bg-background rounded-lg border border-default">
          <div class="flex items-start gap-3">
            <div
              class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-send" class="w-5 h-5 text-primary" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <p class="font-medium">{{ getDisplayName(request, false) }}</p>
                <UBadge color="warning" variant="subtle" size="xs">
                  Waiting
                </UBadge>
              </div>
              <p class="text-sm text-muted">
                Awaiting signature
                <span v-if="getWalletName(request)">
                  for "{{ getWalletName(request) }}"
                </span>
              </p>
              <p class="text-xs text-muted mt-1">
                {{ timeAgo(request.createdAt) }}
              </p>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0">
              <UButton color="error" variant="ghost" size="sm" @click="emit('cancel', request)">
                Cancel
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <UiAppEmptyState v-else icon="i-lucide-send" title="No outgoing requests"
        description="Request signatures from available signers or propose spends from shared wallets" />
    </template>
  </div>
</template>
