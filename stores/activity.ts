/**
 * Activity Store
 *
 * Unified activity aggregation from wallet, P2P, MuSig2, and contacts stores.
 * Provides a single view of all user activity across features.
 */
import { defineStore } from 'pinia'
import { useWalletStore } from './wallet'
import { useP2PStore } from './p2p'
import { useMuSig2Store } from './musig2'

// ============================================================================
// Types
// ============================================================================

export type ActivityType =
  | 'transaction_sent'
  | 'transaction_received'
  | 'signing_request_received'
  | 'signing_request_sent'
  | 'signing_session_completed'
  | 'shared_wallet_funded'
  | 'shared_wallet_spent'
  | 'peer_connected'
  | 'peer_disconnected'
  | 'p2p_info'
  | 'p2p_error'

export interface ActivityItem {
  /** Unique ID */
  id: string
  /** Activity type */
  type: ActivityType
  /** Timestamp */
  timestamp: number
  /** Activity data (varies by type) */
  data: Record<string, unknown>
  /** Human-readable description */
  description: string
  /** Icon name */
  icon: string
  /** Color for the activity */
  color: 'primary' | 'success' | 'warning' | 'error' | 'neutral'
}

// ============================================================================
// Store Definition
// ============================================================================

export const useActivityStore = defineStore('activity', {
  state: () => ({
    // Activity store is computed from other stores, no persistent state needed
  }),

  getters: {
    /**
     * Get all activity from all sources, sorted by timestamp descending
     */
    allActivity(): ActivityItem[] {
      const activities: ActivityItem[] = []

      const walletStore = useWalletStore()
      const p2pStore = useP2PStore()
      const musig2Store = useMuSig2Store()

      // Wallet transactions
      for (const tx of walletStore.transactionHistory) {
        activities.push({
          id: `tx_${tx.txid}`,
          type: tx.isSend ? 'transaction_sent' : 'transaction_received',
          timestamp: parseInt(tx.timestamp) * 1000 || Date.now(),
          data: {
            txid: tx.txid,
            amount: tx.amount,
            address: tx.address,
            confirmations: tx.confirmations,
          },
          description: tx.isSend
            ? `Sent ${(Number(tx.amount) / 1_000_000).toFixed(2)} XPI`
            : `Received ${(Number(tx.amount) / 1_000_000).toFixed(2)} XPI`,
          icon: tx.isSend
            ? 'i-lucide-arrow-up-right'
            : 'i-lucide-arrow-down-left',
          color: tx.isSend ? 'warning' : 'success',
        })
      }

      // P2P events
      for (const event of p2pStore.activityEvents) {
        let type: ActivityType
        let color: ActivityItem['color']
        let icon: string

        switch (event.type) {
          case 'peer_joined':
            type = 'peer_connected'
            color = 'success'
            icon = 'i-lucide-user-plus'
            break
          case 'peer_left':
            type = 'peer_disconnected'
            color = 'neutral'
            icon = 'i-lucide-user-minus'
            break
          case 'error':
            type = 'p2p_error'
            color = 'error'
            icon = 'i-lucide-alert-circle'
            break
          default:
            type = 'p2p_info'
            color = 'primary'
            icon = 'i-lucide-radio'
        }

        activities.push({
          id: event.id,
          type,
          timestamp: event.timestamp,
          data: {
            peerId: event.peerId,
            nickname: event.nickname,
            protocol: event.protocol,
          },
          description: event.message,
          icon,
          color,
        })
      }

      // MuSig2 sessions
      for (const session of musig2Store.activeSessions) {
        let type: ActivityType
        let description: string
        let color: ActivityItem['color']

        if (session.state === 'completed') {
          type = 'signing_session_completed'
          description = 'Signing session completed'
          color = 'success'
        } else if (session.isInitiator) {
          type = 'signing_request_sent'
          description = 'Signing request sent'
          color = 'primary'
        } else {
          type = 'signing_request_received'
          description = 'Signing request received'
          color = 'warning'
        }

        activities.push({
          id: `session_${session.id}`,
          type,
          timestamp: session.createdAt,
          data: {
            sessionId: session.id,
            state: session.state,
            participants: session.participants,
          },
          description,
          icon: 'i-lucide-pen-tool',
          color,
        })
      }

      // Sort by timestamp descending
      return activities.sort((a, b) => b.timestamp - a.timestamp)
    },

    /**
     * Get filtered activity by type
     */
    filteredActivity() {
      return (
        filter: 'all' | 'transaction' | 'p2p' | 'musig2',
      ): ActivityItem[] => {
        const all = this.allActivity

        if (filter === 'all') return all

        return all.filter(activity => {
          switch (filter) {
            case 'transaction':
              return (
                activity.type === 'transaction_sent' ||
                activity.type === 'transaction_received'
              )
            case 'p2p':
              return (
                activity.type === 'peer_connected' ||
                activity.type === 'peer_disconnected' ||
                activity.type === 'p2p_info' ||
                activity.type === 'p2p_error'
              )
            case 'musig2':
              return (
                activity.type === 'signing_request_received' ||
                activity.type === 'signing_request_sent' ||
                activity.type === 'signing_session_completed' ||
                activity.type === 'shared_wallet_funded' ||
                activity.type === 'shared_wallet_spent'
              )
            default:
              return true
          }
        })
      }
    },

    /**
     * Get recent activity (limited)
     */
    recentActivity(): ActivityItem[] {
      return this.allActivity.slice(0, 20)
    },

    /**
     * Get activity count by type
     */
    activityCounts(): Record<string, number> {
      const counts: Record<string, number> = {
        all: 0,
        transaction: 0,
        p2p: 0,
        musig2: 0,
      }

      for (const activity of this.allActivity) {
        counts.all++

        if (
          activity.type === 'transaction_sent' ||
          activity.type === 'transaction_received'
        ) {
          counts.transaction++
        } else if (
          activity.type === 'peer_connected' ||
          activity.type === 'peer_disconnected' ||
          activity.type === 'p2p_info' ||
          activity.type === 'p2p_error'
        ) {
          counts.p2p++
        } else {
          counts.musig2++
        }
      }

      return counts
    },
  },
})
