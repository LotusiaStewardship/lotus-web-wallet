/**
 * Activity Display Utilities
 *
 * Pure functions for deriving display properties from ActivityItem objects.
 * These are used across the home page, activity feed, and activity item components.
 */

// ============================================================================
// Activity Icon
// ============================================================================

/**
 * Get the icon name for an activity item based on its type
 */
export function getActivityIcon(item: ActivityItem): string {
  const data = item.data
  switch (data.type) {
    case 'transaction':
      return data.direction === 'incoming'
        ? 'i-lucide-arrow-down-left'
        : 'i-lucide-arrow-up-right'
    case 'signing_request':
      return 'i-lucide-pen-tool'
    case 'signing_complete':
      return 'i-lucide-check-circle'
    case 'peer_connected':
      return 'i-lucide-wifi'
    case 'peer_disconnected':
      return 'i-lucide-wifi-off'
    case 'signer_discovered':
      return 'i-lucide-user-plus'
    case 'wallet_created':
      return 'i-lucide-shield-plus'
    case 'wallet_funded':
      return 'i-lucide-wallet'
    case 'vote_received':
      return data.voteType === 'upvote'
        ? 'i-lucide-thumbs-up'
        : 'i-lucide-thumbs-down'
    case 'system':
      return data.severity === 'error'
        ? 'i-lucide-alert-circle'
        : data.severity === 'warning'
        ? 'i-lucide-alert-triangle'
        : 'i-lucide-info'
    default:
      return 'i-lucide-activity'
  }
}

// ============================================================================
// Activity Color
// ============================================================================

export type ActivityColorName =
  | 'success'
  | 'warning'
  | 'error'
  | 'primary'
  | 'info'
  | 'neutral'

/**
 * Get the color name for an activity item based on its type
 */
export function getActivityColor(item: ActivityItem): ActivityColorName {
  const data = item.data
  switch (data.type) {
    case 'transaction':
      return data.direction === 'incoming' ? 'success' : 'warning'
    case 'signing_request':
      return 'warning'
    case 'signing_complete':
      return 'success'
    case 'signer_discovered':
    case 'wallet_created':
      return 'primary'
    case 'system':
      return data.severity === 'error'
        ? 'error'
        : data.severity === 'warning'
        ? 'warning'
        : 'info'
    default:
      return 'neutral'
  }
}

/**
 * Get the background class for an activity icon based on color
 */
export function getActivityIconBgClass(item: ActivityItem): string {
  const color = getActivityColor(item)
  switch (color) {
    case 'success':
      return 'bg-success/10'
    case 'warning':
      return 'bg-warning/10'
    case 'error':
      return 'bg-error/10'
    case 'primary':
      return 'bg-primary/10'
    case 'info':
      return 'bg-info/10'
    default:
      return 'bg-gray-100 dark:bg-gray-800'
  }
}

/**
 * Get the text class for an activity icon based on color
 */
export function getActivityIconTextClass(item: ActivityItem): string {
  const color = getActivityColor(item)
  switch (color) {
    case 'success':
      return 'text-success'
    case 'warning':
      return 'text-warning'
    case 'error':
      return 'text-error'
    case 'primary':
      return 'text-primary'
    case 'info':
      return 'text-info'
    default:
      return 'text-gray-500'
  }
}

// ============================================================================
// Activity Title & Description
// ============================================================================

/**
 * Get a human-readable title for an activity item
 */
export function getActivityTitle(item: ActivityItem): string {
  const data = item.data
  switch (data.type) {
    case 'transaction':
      const direction = data.direction === 'incoming' ? 'Received' : 'Sent'
      const amount = Number(data.amountSats || 0) / 1_000_000
      return `${direction} ${amount.toLocaleString(undefined, {
        maximumFractionDigits: 6,
      })} XPI`
    case 'signing_request':
      return 'Signature requested'
    case 'signing_complete':
      return 'Transaction signed'
    case 'peer_connected':
      return `${data.peerName || 'Peer'} connected`
    case 'peer_disconnected':
      return `${data.peerName || 'Peer'} disconnected`
    case 'signer_discovered':
      return 'New signer discovered'
    case 'wallet_created':
      return 'Shared wallet created'
    case 'wallet_funded':
      return 'Wallet received funds'
    case 'vote_received':
      return `${data.voteType === 'upvote' ? 'Upvote' : 'Downvote'} received`
    case 'system':
      return String(data.title || 'System notification')
    default:
      return 'Activity'
  }
}

/**
 * Get a subtitle/description for an activity item
 */
export function getActivitySubtitle(item: ActivityItem): string {
  const data = item.data
  switch (data.type) {
    case 'transaction':
      const confirmations = data.confirmations
      return confirmations > 0
        ? `${confirmations} confirmation${confirmations > 1 ? 's' : ''}`
        : 'Pending confirmation'
    case 'signing_request':
    case 'signing_complete':
      return String(data.walletName || '')
    case 'signer_discovered':
      const pubKey = String(data.publicKeyHex || '')
      return String(
        data.nickname ||
          (pubKey ? `${pubKey.slice(0, 8)}...${pubKey.slice(-6)}` : ''),
      )
    case 'wallet_created':
    case 'wallet_funded':
      return String(data.walletName || '')
    case 'vote_received':
      return `${data.platform} profile`
    case 'system':
      return String(data.message || '')
    default:
      return ''
  }
}

// ============================================================================
// Activity Amount
// ============================================================================

/**
 * Get the amount for an activity item if applicable
 * Returns null if the activity type doesn't have an amount
 */
export function getActivityAmount(item: ActivityItem): string | null {
  const data = item.data
  switch (data.type) {
    case 'transaction':
    case 'signing_request':
    case 'signing_complete':
    case 'wallet_funded':
      const sats = data.amountSats
      if (!sats) return null
      const xpi = Number(sats) / 1_000_000
      return `${xpi.toLocaleString(undefined, {
        maximumFractionDigits: 6,
      })} XPI`
    default:
      return null
  }
}

/**
 * Get the amount text class for an activity item
 */
export function getActivityAmountClass(item: ActivityItem): string {
  const data = item.data
  if (data.type === 'transaction') {
    return data.direction === 'incoming' ? 'text-success' : 'text-warning'
  }
  return ''
}
