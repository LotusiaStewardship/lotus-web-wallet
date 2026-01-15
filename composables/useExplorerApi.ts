/**
 * Explorer API composable
 * Fetches transaction data from the Lotus Explorer API
 */

import type {
  ScriptChunkPlatformUTF8,
  ScriptChunkSentimentUTF8,
} from 'xpi-ts/lib/rank'
import type { PeerInfo, MiningInfo } from 'xpi-ts/lib/rpc'
import type { BlockInfo as ChronikBlockInfo } from 'chronik-client'
import { useNetworkStore } from '~/stores/network'

// Get Explorer API URL from network store
const getExplorerApiUrl = () => {
  const networkStore = useNetworkStore()
  return networkStore.explorerApiUrl || 'https://lotusia.org/api/explorer'
}

// Network overview types
export interface GeoIPData {
  country: string
  countryCode: string
  region: string
  regionName: string
  city: string
  lat: number
  lon: number
  timezone: string
  isp: string
  org: string
  as: string
}

export interface NetworkOverview {
  mininginfo: MiningInfo
  peerinfo: PeerInfo[]
}

/**
 * Address history response from Explorer API
 */
export interface AddressHistoryResponse {
  lastSeen: string | null
  history: {
    txs: ExplorerTx[]
    numPages: number
  }
}

export const useExplorerApi = () => {
  // Get the Explorer plugin from Nuxt context (valid inside composable function)
  const { $explorer } = useNuxtApp()
  /**
   * Fetch a single transaction from the Explorer API
   */
  const fetchTransaction = async (txid: string): Promise<ExplorerTx | null> => {
    try {
      const response = await fetch(`${getExplorerApiUrl()}/tx/${txid}`)
      if (!response.ok) {
        console.error(`Failed to fetch transaction ${txid}: ${response.status}`)
        return null
      }
      const json = await response.json()
      return json
    } catch (error) {
      console.error(`Error fetching transaction ${txid}:`, error)
      return null
    }
  }

  /**
   * Fetch multiple transactions from the Explorer API
   */
  const fetchTransactions = async (
    txids: string[],
  ): Promise<Map<string, ExplorerTx>> => {
    const results = new Map<string, ExplorerTx>()

    // Fetch in parallel with a concurrency limit
    const BATCH_SIZE = 10
    for (let i = 0; i < txids.length; i += BATCH_SIZE) {
      const batch = txids.slice(i, i + BATCH_SIZE)
      const promises = batch.map(txid => fetchTransaction(txid))
      const responses = await Promise.all(promises)

      responses.forEach((tx, index) => {
        if (tx) {
          results.set(batch[index], tx)
        }
      })
    }

    return results
  }

  /**
   * Get display info for a transaction type
   */
  const getTransactionTypeInfo = (type: ExplorerTxType) => {
    switch (type) {
      case 'give':
        return {
          label: 'Gave',
          icon: 'i-lucide-arrow-up-right',
          color: 'error' as const,
          bgClass: 'bg-error-100 dark:bg-error-900/20',
          textClass: 'text-error-500',
        }
      case 'receive':
        return {
          label: 'Received',
          icon: 'i-lucide-arrow-down-left',
          color: 'success' as const,
          bgClass: 'bg-success-100 dark:bg-success-900/20',
          textClass: 'text-success-500',
        }
      case 'rank':
        return {
          label: 'Voted',
          icon: 'i-lucide-thumbs-up',
          color: 'info' as const,
          bgClass: 'bg-info-100 dark:bg-info-900/20',
          textClass: 'text-info-500',
        }
      case 'burn':
        return {
          label: 'Burned',
          icon: 'i-lucide-flame',
          color: 'warning' as const,
          bgClass: 'bg-warning-100 dark:bg-warning-900/20',
          textClass: 'text-warning-500',
        }
      case 'coinbase':
        return {
          label: 'Mined',
          icon: 'i-lucide-pickaxe',
          color: 'success' as const,
          bgClass: 'bg-success-100 dark:bg-success-900/20',
          textClass: 'text-success-500',
        }
      case 'self':
        return {
          label: 'Self',
          icon: 'i-lucide-rotate-cw',
          color: 'neutral' as const,
          bgClass: 'bg-muted/50',
          textClass: 'text-muted',
        }
      default:
        return {
          label: 'Transaction',
          icon: 'i-lucide-circle-dot',
          color: 'neutral' as const,
          bgClass: 'bg-muted/50',
          textClass: 'text-muted',
        }
    }
  }

  /**
   * Get sentiment display info for RANK votes
   */
  const getSentimentInfo = (sentiment: 'positive' | 'negative' | 'neutral') => {
    switch (sentiment) {
      case 'positive':
        return {
          label: 'Upvote',
          icon: 'i-lucide-thumbs-up',
          color: 'success' as const,
        }
      case 'negative':
        return {
          label: 'Downvote',
          icon: 'i-lucide-thumbs-down',
          color: 'error' as const,
        }
      default:
        return {
          label: 'Neutral',
          icon: 'i-lucide-minus',
          color: 'neutral' as const,
        }
    }
  }

  /**
   * Format platform name for display
   */
  const formatPlatformName = (platform: string): string => {
    const platformMap: Record<ScriptChunkPlatformUTF8, string> = {
      twitter: 'X (Twitter)',
      lotusia: 'Lotusia',
    }
    return (
      platformMap[platform.toLowerCase() as ScriptChunkPlatformUTF8] || platform
    )
  }

  /**
   * Fetch network overview (mining info + peers)
   */
  const fetchNetworkOverview = async (): Promise<NetworkOverview | null> => {
    try {
      const response = await fetch(`${getExplorerApiUrl()}/overview`)
      if (!response.ok) {
        console.error(`Failed to fetch network overview: ${response.status}`)
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching network overview:', error)
      return null
    }
  }

  /**
   * Fetch paginated block list
   * Returns BlockInfo array (not full blocks with transactions)
   */
  const fetchBlocks = async (
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{ blocks: ChronikBlockInfo[]; tipHeight: number } | null> => {
    try {
      const response = await fetch(
        `${getExplorerApiUrl()}/blocks?page=${page}&pageSize=${pageSize}`,
      )
      if (!response.ok) {
        console.error(`Failed to fetch blocks: ${response.status}`)
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching blocks:', error)
      return null
    }
  }

  /**
   * Fetch single block by hash or height
   * Returns full block with transactions enriched with sumBurnedSats and minedBy address
   */
  const fetchBlock = async (
    hashOrHeight: string,
  ): Promise<ExplorerBlock | null> => {
    try {
      const response = await fetch(
        `${getExplorerApiUrl()}/block/${hashOrHeight}`,
      )
      if (!response.ok) {
        console.error(
          `Failed to fetch block ${hashOrHeight}: ${response.status}`,
        )
        return null
      }
      return await response.json()
    } catch (error) {
      console.error(`Error fetching block ${hashOrHeight}:`, error)
      return null
    }
  }

  /**
   * Fetch address transaction history
   * Returns transactions with sumBurnedSats added
   */
  const fetchAddressHistory = async (
    address: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<AddressHistoryResponse | null> => {
    try {
      const response = await fetch(
        `${getExplorerApiUrl()}/address/${address}?page=${page}&pageSize=${pageSize}`,
      )
      if (!response.ok) {
        console.error(
          `Failed to fetch address history ${address}: ${response.status}`,
        )
        return null
      }
      return await response.json()
    } catch (error) {
      console.error(`Error fetching address history ${address}:`, error)
      return null
    }
  }

  /**
   * Fetch address balance
   * Returns balance as a string in sats
   */
  const fetchAddressBalance = async (
    address: string,
  ): Promise<string | null> => {
    try {
      const response = await fetch(
        `${getExplorerApiUrl()}/address/${address}/balance`,
      )
      if (!response.ok) {
        console.error(
          `Failed to fetch address balance ${address}: ${response.status}`,
        )
        return null
      }
      // Balance endpoint returns just a string, not an object
      return await response.json()
    } catch (error) {
      console.error(`Error fetching address balance ${address}:`, error)
      return null
    }
  }

  /**
   * Fetch blockchain info (tip height, etc.)
   */
  const fetchChainInfo = async (): Promise<{ tipHeight: number } | null> => {
    try {
      const response = await fetch(`${getExplorerApiUrl()}/chain-info`)
      if (!response.ok) {
        console.error(`Failed to fetch chain info: ${response.status}`)
        return null
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching chain info:', error)
      return null
    }
  }

  return {
    // Existing methods
    getTransactionTypeInfo,
    getSentimentInfo,
    formatPlatformName,
    getExplorerApiUrl,
    fetchChainInfo,
    fetchNetworkOverview,
    // Explorer plugin methods
    fetchRecentBlocks: $explorer.fetchRecentBlocks,
    fetchBlocks: $explorer.fetchBlocks,
    fetchBlock: $explorer.fetchBlock,
    fetchAddressHistory: $explorer.fetchAddressHistory,
    fetchAddressBalance: $explorer.fetchAddressBalance,
    fetchTransaction: $explorer.fetchTransaction,
    fetchTransactions: $explorer.fetchTransactionBatch,
  }
}
