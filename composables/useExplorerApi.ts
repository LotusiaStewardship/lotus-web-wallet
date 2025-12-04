/**
 * Explorer API composable
 * Fetches transaction data from the Lotus Explorer API
 */

import type { ScriptChunkPlatformUTF8 } from 'lotus-sdk/lib/rank'
import type {
  Block as ChronikBlock,
  BlockInfo as ChronikBlockInfo,
  Tx as ChronikTx,
  TxInput as ChronikTxInput,
  TxOutput as ChronikTxOutput,
} from 'chronik-client'
import { useNetworkStore } from '~/stores/network'

// Get Explorer API URL from network store
const getExplorerApiUrl = () => {
  const networkStore = useNetworkStore()
  return networkStore.explorerApiUrl || 'https://lotusia.org/api/explorer'
}

// Types matching the Explorer API response
export interface ExplorerTxInput {
  prevOut: {
    txid: string
    outIdx: number
  }
  inputScript: string
  outputScript: string
  value: string
  sequenceNo: number
  address?: string
}

export interface RankOutput {
  platform: string
  profileId: string
  postId?: string
  sentiment: 'positive' | 'negative' | 'neutral'
}

export interface ExplorerTxOutput {
  value: string
  outputScript: string
  spentBy?: {
    txid: string
    outIdx: number
  }
  address?: string
  rankOutput?: RankOutput
}

export interface ExplorerTx {
  txid: string
  version: number
  inputs: ExplorerTxInput[]
  outputs: ExplorerTxOutput[]
  lockTime: number
  block?: {
    height: number
    hash: string
    timestamp: string
  }
  timeFirstSeen: string
  size: number
  isCoinbase: boolean
  network: string
  confirmations: number
  sumBurnedSats: string
}

/**
 * Explorer Block type
 * Extends Chronik Block with miner address and enriched transactions
 */
export type ExplorerBlock = ChronikBlock & {
  minedBy?: string
  txs: ExplorerTx[]
}

// Re-export Chronik types for convenience
export type { ChronikBlock, ChronikBlockInfo, ChronikTx }

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

export interface PeerInfo {
  id: number
  addr: string
  addrlocal?: string
  services: string
  relaytxes: boolean
  lastsend: number
  lastrecv: number
  bytessent: number
  bytesrecv: number
  conntime: number
  timeoffset: number
  pingtime?: number
  minping?: number
  version: number
  subver: string
  inbound: boolean
  startingheight: number
  banscore: number
  synced_headers: number
  synced_blocks: number
  whitelisted: boolean
  geoip?: GeoIPData
}

export interface MiningInfo {
  blocks: number
  currentblocksize: number
  currentblocktx: number
  difficulty: number
  networkhashps: number
  pooledtx: number
  chain: string
  warnings: string
}

export interface NetworkOverview {
  mininginfo: MiningInfo
  peerinfo: PeerInfo[]
}

/**
 * Address transaction with sumBurnedSats
 * Used in address history responses
 */
export type AddressTx = ChronikTx & {
  sumBurnedSats: string
}

/**
 * Address history response from Explorer API
 */
export interface AddressHistoryResponse {
  lastSeen: string | null
  history: {
    txs: AddressTx[]
    numPages: number
  }
}

// Transaction type classification
export type TransactionType =
  | 'give'
  | 'receive'
  | 'rank'
  | 'burn'
  | 'coinbase'
  | 'self'
  | 'unknown'

export interface ParsedTransaction {
  txid: string
  type: TransactionType
  timestamp: number
  confirmations: number
  blockHeight: number

  // For give/receive transactions
  amount?: string // in sats
  counterpartyAddress?: string

  // For RANK transactions
  rankData?: {
    platform: string
    profileId: string
    postId?: string
    sentiment: 'positive' | 'negative' | 'neutral'
    burnedAmount: string
  }

  // For burn transactions (non-RANK OP_RETURN)
  burnedAmount?: string

  // Raw data for advanced view
  raw: ExplorerTx
}

export const useExplorerApi = () => {
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
   * Parse a transaction to determine its type and extract relevant data
   */
  const parseTransaction = (
    tx: ExplorerTx,
    userAddress: string,
  ): ParsedTransaction => {
    const timestamp = tx.block?.timestamp
      ? parseInt(tx.block.timestamp)
      : parseInt(tx.timeFirstSeen)

    const blockHeight = tx.block?.height ?? -1

    // Base parsed transaction
    const parsed: ParsedTransaction = {
      txid: tx.txid,
      type: 'unknown',
      timestamp,
      confirmations: tx.confirmations,
      blockHeight,
      raw: tx,
    }

    // Check for coinbase
    if (tx.isCoinbase) {
      parsed.type = 'coinbase'
      // Sum all outputs to user address
      const received = tx.outputs
        .filter(o => o.address === userAddress)
        .reduce((sum, o) => sum + BigInt(o.value), 0n)
      parsed.amount = received.toString()
      return parsed
    }

    // Check for RANK transaction
    const rankOutput = tx.outputs.find(o => o.rankOutput)
    if (rankOutput?.rankOutput) {
      parsed.type = 'rank'
      parsed.rankData = {
        platform: rankOutput.rankOutput.platform,
        profileId: rankOutput.rankOutput.profileId,
        postId: rankOutput.rankOutput.postId,
        sentiment: rankOutput.rankOutput.sentiment,
        burnedAmount: rankOutput.value,
      }
      return parsed
    }

    // Check for burn (non-RANK OP_RETURN with value)
    const burnedSats = BigInt(tx.sumBurnedSats)
    if (burnedSats > 0n && !rankOutput) {
      parsed.type = 'burn'
      parsed.burnedAmount = tx.sumBurnedSats
      return parsed
    }

    // Calculate give/receive
    let inputFromUser = 0n
    let outputToUser = 0n
    let counterpartyAddress = ''

    // Sum inputs from user
    for (const input of tx.inputs) {
      if (input.address === userAddress) {
        inputFromUser += BigInt(input.value)
      }
    }

    // Sum outputs to user and find counterparty
    for (const output of tx.outputs) {
      if (output.address === userAddress) {
        outputToUser += BigInt(output.value)
      } else if (output.address && !counterpartyAddress) {
        counterpartyAddress = output.address
      }
    }

    // Determine if give or receive
    if (
      inputFromUser > 0n &&
      outputToUser > 0n &&
      inputFromUser === outputToUser + burnedSats
    ) {
      // Self-send (consolidation or fee payment)
      parsed.type = 'self'
      parsed.amount = burnedSats.toString() // Fee paid
      return parsed
    }

    if (inputFromUser > outputToUser) {
      // User sent more than received = Give
      parsed.type = 'give'
      parsed.amount = (inputFromUser - outputToUser).toString()
      parsed.counterpartyAddress = counterpartyAddress
    } else if (outputToUser > inputFromUser) {
      // User received more than sent = Receive
      parsed.type = 'receive'
      parsed.amount = (outputToUser - inputFromUser).toString()
      // For receives, counterparty is the first input address
      if (tx.inputs[0]?.address) {
        parsed.counterpartyAddress = tx.inputs[0].address
      }
    }

    return parsed
  }

  /**
   * Get display info for a transaction type
   */
  const getTransactionTypeInfo = (type: TransactionType) => {
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
    fetchTransaction,
    fetchTransactions,
    parseTransaction,
    getTransactionTypeInfo,
    getSentimentInfo,
    formatPlatformName,
    getExplorerApiUrl,
    // New Explorer methods
    fetchNetworkOverview,
    fetchBlocks,
    fetchBlock,
    fetchAddressHistory,
    fetchAddressBalance,
    fetchChainInfo,
  }
}
