/**
 * Formatting Utilities
 *
 * Pure functions for formatting values for display.
 * These functions have no side effects and can be used anywhere.
 */

import {
  LOTUS_DECIMALS,
  SATS_PER_XPI,
  LOTUS_PREFIX,
  MAINNET_CHAR,
  TESTNET_CHAR,
} from './constants'

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Format a number with locale-aware separators
 */
export function formatNumber(
  num: string | number | bigint,
  options?: Intl.NumberFormatOptions,
): string {
  const value = typeof num === 'bigint' ? Number(num) : Number(num)
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
    ...options,
  })
}

/**
 * Format a number in compact notation (1K, 1M, 1B)
 */
export function formatCompact(num: string | number | bigint): string {
  const n = typeof num === 'bigint' ? Number(num) : Number(num)
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(0)
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

// ============================================================================
// Lotus Amount Formatting
// ============================================================================

/**
 * Convert satoshis to XPI
 */
export function satsToXPI(sats: string | number | bigint): number {
  const value = typeof sats === 'bigint' ? Number(sats) : Number(sats)
  return value / SATS_PER_XPI
}

/**
 * Convert XPI to satoshis
 */
export function xpiToSats(xpi: string | number): bigint {
  return BigInt(Math.floor(Number(xpi) * SATS_PER_XPI))
}

/**
 * Format satoshis as XPI with proper decimals
 */
export function formatXPI(
  sats: string | number | bigint,
  options?: {
    showSymbol?: boolean
    minDecimals?: number
    maxDecimals?: number
  },
): string {
  const {
    showSymbol = false,
    minDecimals = 2,
    maxDecimals = LOTUS_DECIMALS,
  } = options ?? {}

  const xpi = satsToXPI(sats)
  const formatted = xpi.toLocaleString(undefined, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  })

  return showSymbol ? `${formatted} XPI` : formatted
}

/**
 * Format satoshis as a compact XPI string
 */
export function formatXPICompact(sats: string | number | bigint): string {
  const xpi = satsToXPI(sats)
  return formatCompact(xpi)
}

/**
 * Parse a user-entered XPI amount to satoshis
 * Returns null if invalid
 */
export function parseXPIInput(input: string): bigint | null {
  // Remove commas and whitespace
  const cleaned = input.replace(/[,\s]/g, '')

  // Check for valid number format
  if (!/^-?\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '.') {
    return null
  }

  const num = parseFloat(cleaned)
  if (isNaN(num) || !isFinite(num)) {
    return null
  }

  // Check for too many decimal places
  const parts = cleaned.split('.')
  if (parts[1] && parts[1].length > LOTUS_DECIMALS) {
    return null
  }

  return xpiToSats(num)
}

// ============================================================================
// Address Formatting
// ============================================================================

/**
 * Truncate an address for display
 */
export function truncateAddress(
  address: string,
  startChars: number = 12,
  endChars: number = 6,
): string {
  if (!address || address.length <= startChars + endChars + 3) {
    return address
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

/**
 * Get the network from a Lotus address
 */
export function getNetworkFromAddress(
  address: string,
): 'livenet' | 'testnet' | null {
  if (!address || !address.startsWith(LOTUS_PREFIX)) {
    return null
  }

  const networkChar = address.charAt(5)
  switch (networkChar) {
    case MAINNET_CHAR:
      return 'livenet'
    case TESTNET_CHAR:
      return 'testnet'
    default:
      return null
  }
}

// ============================================================================
// Transaction ID Formatting
// ============================================================================

/**
 * Truncate a transaction ID for display
 */
export function truncateTxid(
  txid: string,
  startChars: number = 16,
  endChars: number = 6,
): string {
  if (!txid || txid.length <= startChars + endChars + 3) {
    return txid
  }
  return `${txid.slice(0, startChars)}...${txid.slice(-endChars)}`
}

/**
 * Truncate a block hash for display
 */
export function truncateBlockHash(blockHash: string): string {
  if (!blockHash) return ''
  return `${blockHash.slice(0, 1)}...${blockHash.slice(-16)}`
}

// ============================================================================
// Time Formatting
// ============================================================================

/**
 * Format a timestamp as relative time (e.g., "5m ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 0) return 'Just now'
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`

  return new Date(timestamp).toLocaleDateString()
}

/**
 * Format a timestamp as date/time string
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

/**
 * Format a Unix timestamp (seconds) to a human readable string (UTC)
 */
export function formatUnixTimestamp(timestamp: number | string): string {
  const date = new Date(Number(timestamp) * 1000)
  return (
    date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC'
  )
}

/**
 * Format seconds to a human readable duration
 */
export function formatDuration(seconds: number | string): string {
  const num = Number(seconds)
  if (isNaN(num)) return String(seconds)

  if (num >= 3600) return `${(num / 3600).toFixed(1)} hours`
  if (num >= 60) return `${(num / 60).toFixed(1)} minutes`
  return `${num.toFixed(1)} seconds`
}

// ============================================================================
// Size Formatting
// ============================================================================

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`
  return `${bytes} B`
}

/**
 * Format hashrate to human readable string
 */
export function formatHashrate(hashrate: number | string): string {
  const num = Number(hashrate)
  if (isNaN(num)) return String(hashrate)

  if (num >= 1e15) return `${(num / 1e15).toFixed(1)} PH/s`
  if (num >= 1e12) return `${(num / 1e12).toFixed(1)} TH/s`
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)} GH/s`
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)} MH/s`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)} KH/s`
  return `${num} H/s`
}

// ============================================================================
// Hex Formatting
// ============================================================================

/**
 * Format a hex string with 0x prefix
 */
export function formatHex(hex: string): string {
  if (hex.startsWith('0x')) return hex
  return `0x${hex}`
}

/**
 * Remove 0x prefix from hex string
 */
export function stripHexPrefix(hex: string): string {
  if (hex.startsWith('0x')) return hex.slice(2)
  return hex
}
