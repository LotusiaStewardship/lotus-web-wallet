<script setup lang="ts">
/**
 * ParticipantList
 *
 * Phase 4: Migrated to use identity store as canonical source for online status.
 * Phase 5: Enhanced with multi-signal online status detection.
 * Shows all participants in a shared wallet with their connection status.
 * Uses identity store for canonical online status.
 */
import { useP2PStore } from '~/stores/p2p'
import { useContactsStore } from '~/stores/contacts'
import { useIdentityStore } from '~/stores/identity'
import type { SharedWalletParticipant } from '~/stores/musig2'
import type { PeerConnectionStatus, PeerConnectionType } from '~/types/p2p'
import type { OnlineStatus } from '~/types/contact'

const props = defineProps<{
  /** Participants to display */
  participants: SharedWalletParticipant[]
  /** Show connection controls (connect button) */
  showConnectionControls?: boolean
}>()

const emit = defineEmits<{
  viewParticipant: [participant: SharedWalletParticipant]
  addToContacts: [participant: SharedWalletParticipant]
}>()

const p2pStore = useP2PStore()
const contactsStore = useContactsStore()
const identityStore = useIdentityStore()
const { copy } = useClipboard()

// Track which field was recently copied
const recentlyCopied = ref<string | null>(null)

// Track which participants are currently connecting
const connectingPeers = ref<Set<string>>(new Set())

// Use OnlineStatus type from identity store (Phase 4)
type ParticipantStatus = OnlineStatus

/**
 * Get P2P connection status for a participant (Phase 4)
 */
interface ConnectionInfo {
  status: PeerConnectionStatus | 'unknown'
  type?: PeerConnectionType
}

function getConnectionStatus(participant: SharedWalletParticipant): ConnectionInfo {
  // Self is always "connected"
  if (participant.isMe) {
    return { status: 'connected', type: 'direct' }
  }

  // Check if currently connecting
  if (participant.peerId && connectingPeers.value.has(participant.peerId)) {
    return { status: 'connecting' }
  }

  // Check P2P store for connection status
  if (participant.peerId) {
    const peer = p2pStore.onlinePeers.find(p => p.peerId === participant.peerId)
    if (peer) {
      return {
        status: peer.connectionStatus || 'disconnected',
        type: peer.connectionType,
      }
    }
  }

  return { status: 'unknown' }
}

/**
 * Connect to a specific participant (Phase 4)
 */
async function connectToParticipant(participant: SharedWalletParticipant) {
  if (!participant.peerId) return

  connectingPeers.value.add(participant.peerId)

  try {
    await p2pStore.connectToOnlinePeer(participant.peerId)
  } finally {
    connectingPeers.value.delete(participant.peerId)
  }
}

/**
 * Phase 4: Get online status using identity store as canonical source
 */
function getParticipantStatus(participant: SharedWalletParticipant): ParticipantStatus {
  // Self is always online
  if (participant.isMe) return 'online'

  // Use identity store as canonical source for online status
  return identityStore.getOnlineStatus(participant.publicKeyHex)
}

/**
 * Get status color class for a participant
 */
function getStatusColor(status: ParticipantStatus): string {
  switch (status) {
    case 'online':
      return 'bg-success-500'
    case 'recently_online':
      return 'bg-warning'
    case 'offline':
      return 'bg-muted'
    default:
      return 'bg-muted'
  }
}

/**
 * Get status label for a participant
 */
function getStatusLabel(status: ParticipantStatus): string {
  switch (status) {
    case 'online':
      return 'Online'
    case 'recently_online':
      return 'Recently Online'
    case 'offline':
      return 'Offline'
    default:
      return 'Unknown'
  }
}

/**
 * Get badge color for status
 */
function getStatusBadgeColor(status: ParticipantStatus): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'online':
      return 'success'
    case 'recently_online':
      return 'warning'
    case 'offline':
    default:
      return 'neutral'
  }
}

/**
 * Get connection status color (Phase 4)
 */
function getConnectionStatusColor(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'connected':
      return 'success'
    case 'connecting':
      return 'warning'
    case 'disconnected':
    case 'failed':
      return 'error'
    default:
      return 'neutral'
  }
}

/**
 * Get connection status label (Phase 4)
 */
function getConnectionStatusLabel(conn: ConnectionInfo): string {
  if (conn.status === 'connected') {
    return conn.type === 'webrtc'
      ? 'WebRTC'
      : conn.type === 'relay'
        ? 'Relay'
        : 'Connected'
  }
  if (conn.status === 'connecting') return 'Connecting...'
  if (conn.status === 'disconnected') return 'Offline'
  if (conn.status === 'failed') return 'Failed'
  return 'Unknown'
}

// Check if participant is a contact
function isContact(participant: SharedWalletParticipant): boolean {
  // Check by publicKey first (more reliable), then peerId
  const byPubKey = contactsStore.findByPublicKey(participant.publicKeyHex)
  if (byPubKey) return true
  return contactsStore.contacts.some(c => c.peerId === participant.peerId)
}

// Get contact for participant
function getContact(participant: SharedWalletParticipant) {
  const byPubKey = contactsStore.findByPublicKey(participant.publicKeyHex)
  if (byPubKey) return byPubKey
  return contactsStore.contacts.find(c => c.peerId === participant.peerId)
}

// Get display name
function getDisplayName(participant: SharedWalletParticipant): string {
  if (participant.isMe) return 'You'
  if (participant.nickname) return participant.nickname
  const contact = getContact(participant)
  if (contact) return contact.name
  if (participant.publicKeyHex) {
    return `Signer ${participant.publicKeyHex.slice(0, 8)}`
  }
  if (participant.peerId) {
    return `${participant.peerId.slice(0, 8)}...`
  }
  return 'Unknown'
}

// Truncate public key for display
function truncateKey(key: string): string {
  if (!key || key.length <= 16) return key || 'N/A'
  return `${key.slice(0, 8)}...${key.slice(-8)}`
}

// Copy to clipboard
async function copyToClipboard(text: string, id: string) {
  await copy(text)
  recentlyCopied.value = id
  setTimeout(() => {
    if (recentlyCopied.value === id) {
      recentlyCopied.value = null
    }
  }, 2000)
}
</script>

<template>
  <div class="space-y-2">
    <!-- Phase 6: Semantic color classes instead of hardcoded gray -->
    <div v-for="participant in participants" :key="participant.peerId"
      class="p-3 bg-background rounded-lg border border-default">
      <div class="flex items-center gap-3">
        <!-- Avatar with online indicator - Phase 6: Using OnlineStatusBadge -->
        <div class="relative flex-shrink-0">
          <CommonAvatar :name="getDisplayName(participant)" size="md" />
          <div class="absolute -bottom-1 -right-1">
            <CommonOnlineStatusBadge :status="getParticipantStatus(participant)" size="xs" />
          </div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ getDisplayName(participant) }}</span>
            <UBadge v-if="participant.isMe" color="primary" variant="subtle" size="xs">
              You
            </UBadge>
            <UBadge v-if="isContact(participant) && !participant.isMe" color="neutral" variant="subtle" size="xs">
              Contact
            </UBadge>
          </div>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-xs text-muted font-mono">
              {{ truncateKey(participant.publicKeyHex) }}
            </span>
            <UButton v-if="participant.publicKeyHex" color="neutral" variant="ghost" size="xs"
              :icon="recentlyCopied === participant.peerId ? 'i-lucide-check' : 'i-lucide-copy'"
              @click="copyToClipboard(participant.publicKeyHex, participant.peerId)" />
          </div>
        </div>

        <!-- Status & Actions -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- Connection Status Badge (Phase 4) -->
          <UBadge v-if="showConnectionControls"
            :color="getConnectionStatusColor(getConnectionStatus(participant).status)" variant="subtle" size="xs">
            {{ getConnectionStatusLabel(getConnectionStatus(participant)) }}
          </UBadge>

          <!-- Phase 6: Online Status Badge using OnlineStatusBadge component -->
          <CommonOnlineStatusBadge v-else :status="getParticipantStatus(participant)" show-label size="sm" />

          <!-- Connect button if disconnected (Phase 4) -->
          <UButton
            v-if="showConnectionControls && !participant.isMe && participant.peerId && getConnectionStatus(participant).status === 'disconnected'"
            size="xs" color="primary" variant="ghost" icon="i-lucide-plug"
            :loading="connectingPeers.has(participant.peerId)" @click="connectToParticipant(participant)">
            Connect
          </UButton>

          <!-- Add to contacts button -->
          <UButton v-if="!participant.isMe && !isContact(participant)" color="neutral" variant="ghost" size="xs"
            icon="i-lucide-user-plus" title="Add to contacts" @click="emit('addToContacts', participant)" />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <UiAppEmptyState v-if="participants.length === 0" icon="i-lucide-users" title="No participants"
      description="This wallet has no participants configured" />
  </div>
</template>
