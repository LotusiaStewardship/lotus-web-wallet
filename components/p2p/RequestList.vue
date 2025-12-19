<script setup lang="ts">
/**
 * P2PRequestList
 *
 * List of incoming and outgoing signing requests with status tracking.
 */
import { useContactsStore } from '~/stores/contacts'

interface IncomingRequest {
  id: string
  fromPeerId: string
  fromNickname?: string
  walletId?: string
  amount: string | bigint
  transactionType: string
  message?: string
  timestamp: number
  expiresAt?: number
  status?: 'pending' | 'accepted' | 'rejected' | 'expired'
}

interface OutgoingRequest {
  id: string
  toPeerId: string
  toNickname?: string
  walletId?: string
  amount: string | bigint
  transactionType: string
  message?: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'signing' | 'completed'
  timestamp: number
  expiresAt?: number
}

const props = defineProps<{
  /** Incoming requests */
  incoming: IncomingRequest[]
  /** Outgoing requests */
  outgoing: OutgoingRequest[]
}>()

const emit = defineEmits<{
  accept: [request: IncomingRequest]
  reject: [request: IncomingRequest]
  cancel: [request: OutgoingRequest]
  viewDetails: [request: IncomingRequest | OutgoingRequest]
}>()

const contactsStore = useContactsStore()
const { formatXPI } = useAmount()
const { timeAgo } = useTime()

const activeTab = ref<'incoming' | 'outgoing'>('incoming')

// Status configuration
const statusConfig: Record<string, { color: string; label: string; icon: string }> = {
  pending: { color: 'warning', label: 'Pending', icon: 'i-lucide-clock' },
  accepted: { color: 'success', label: 'Accepted', icon: 'i-lucide-check' },
  rejected: { color: 'error', label: 'Rejected', icon: 'i-lucide-x' },
  expired: { color: 'neutral', label: 'Expired', icon: 'i-lucide-timer-off' },
  signing: { color: 'primary', label: 'Signing...', icon: 'i-lucide-pen-tool' },
  completed: { color: 'success', label: 'Completed', icon: 'i-lucide-check-circle' },
}

function getStatusConfig(status: string) {
  return statusConfig[status] || { color: 'neutral', label: status, icon: 'i-lucide-help-circle' }
}

// Check if request is expired
function isExpired(request: IncomingRequest | OutgoingRequest): boolean {
  if (!request.expiresAt) return false
  return request.expiresAt <= Date.now()
}

// Get contact name for peer
function getContactName(peerId: string): string | undefined {
  return contactsStore.contacts.find(c => c.peerId === peerId)?.name
}
</script>

<template>
  <div class="space-y-4">
    <!-- Tabs -->
    <div class="flex gap-2">
      <UButton :color="activeTab === 'incoming' ? 'primary' : 'neutral'"
        :variant="activeTab === 'incoming' ? 'solid' : 'outline'" size="sm" @click="activeTab = 'incoming'">
        Incoming
        <UBadge v-if="incoming.length" color="warning" variant="solid" size="xs" class="ml-1">
          {{ incoming.length }}
        </UBadge>
      </UButton>
      <UButton :color="activeTab === 'outgoing' ? 'primary' : 'neutral'"
        :variant="activeTab === 'outgoing' ? 'solid' : 'outline'" size="sm" @click="activeTab = 'outgoing'">
        Outgoing
        <UBadge v-if="outgoing.length" color="primary" variant="solid" size="xs" class="ml-1">
          {{ outgoing.length }}
        </UBadge>
      </UButton>
    </div>

    <!-- Incoming Requests -->
    <UiAppCard v-if="activeTab === 'incoming'" title="Incoming Requests" icon="i-lucide-inbox">
      <div v-if="incoming.length" class="divide-y divide-default -mx-4">
        <div v-for="request in incoming" :key="request.id" class="px-4 py-3">
          <div class="flex items-start gap-3">
            <div
              class="w-10 h-10 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-bell" class="w-5 h-5 text-warning" />
            </div>

            <div class="flex-1 min-w-0">
              <p class="font-medium">{{ request.fromNickname || 'Anonymous' }}</p>
              <p class="text-sm text-muted">
                {{ request.transactionType }} • {{ formatXPI(request.amount) }}
              </p>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0">
              <span class="text-xs text-muted">{{ timeAgo(request.timestamp) }}</span>
              <UButton color="success" size="xs" @click="emit('accept', request)">
                Accept
              </UButton>
              <UButton color="error" variant="outline" size="xs" @click="emit('reject', request)">
                Decline
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <UiAppEmptyState v-else icon="i-lucide-inbox" title="No incoming requests"
        description="You'll see signing requests from other users here" />
    </UiAppCard>

    <!-- Outgoing Requests -->
    <UiAppCard v-else title="Outgoing Requests" icon="i-lucide-send">
      <div v-if="outgoing.length" class="divide-y divide-default -mx-4">
        <div v-for="request in outgoing" :key="request.id" class="px-4 py-3">
          <div class="flex items-start gap-3">
            <div
              class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-send" class="w-5 h-5 text-primary" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="font-medium">{{ request.toNickname || 'Anonymous' }}</p>
                <UBadge
                  :color="request.status === 'pending' ? 'warning' : request.status === 'accepted' ? 'success' : 'error'"
                  variant="subtle" size="xs">
                  {{ request.status }}
                </UBadge>
              </div>
              <p class="text-sm text-muted">
                {{ request.transactionType }} • {{ formatXPI(request.amount) }}
              </p>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0">
              <span class="text-xs text-muted">{{ timeAgo(request.timestamp) }}</span>
              <UButton v-if="request.status === 'pending'" color="error" variant="ghost" size="xs"
                @click="emit('cancel', request)">
                Cancel
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <UiAppEmptyState v-else icon="i-lucide-send" title="No outgoing requests"
        description="Request signatures from available signers" />
    </UiAppCard>
  </div>
</template>
