/**
 * Amount Composable
 *
 * Amount formatting and conversion utilities for XPI and satoshis.
 * Pure functions with no SDK dependencies.
 */

// ============================================================================
// Constants (internal - use utils/constants.ts for app-wide constants)
// ============================================================================

/** Satoshis per XPI (bigint for precision) */
const SATS_PER_XPI = 1_000_000n

/** Number of decimal places */
const DECIMALS = 6

/** Dust threshold in satoshis */
const DUST_THRESHOLD = 546n

// ============================================================================
// Types
// ============================================================================

/**
 * Format options for XPI display
 */
export interface FormatOptions {
  /** Minimum decimal places to show */
  minDecimals?: number
  /** Maximum decimal places to show */
  maxDecimals?: number
  /** Whether to show "XPI" unit */
  showUnit?: boolean
  /** Use compact notation for large numbers */
  compact?: boolean
}

// ============================================================================
// Composable
// ============================================================================

export function useAmount() {
  /**
   * Convert satoshis to XPI string
   * @param sats - Amount in satoshis
   * @returns XPI amount as string
   */
  function satsToXPI(sats: bigint | string | number): string {
    const satsBigInt = typeof sats === 'bigint' ? sats : BigInt(sats)
    const isNegative = satsBigInt < 0n
    const absSats = isNegative ? -satsBigInt : satsBigInt

    const whole = absSats / SATS_PER_XPI
    const fraction = absSats % SATS_PER_XPI

    let result: string
    if (fraction === 0n) {
      result = whole.toString()
    } else {
      const fractionStr = fraction.toString().padStart(DECIMALS, '0')
      const trimmed = fractionStr.replace(/0+$/, '')
      result = `${whole}.${trimmed}`
    }

    return isNegative ? `-${result}` : result
  }

  /**
   * Convert XPI string to satoshis
   * @param xpi - Amount in XPI
   * @returns Amount in satoshis as bigint
   */
  function xpiToSats(xpi: string | number): bigint {
    const str = xpi.toString().trim()

    // Handle negative numbers
    const isNegative = str.startsWith('-')
    const absStr = isNegative ? str.slice(1) : str

    const [whole, fraction = ''] = absStr.split('.')
    const wholeSats = BigInt(whole || '0') * SATS_PER_XPI
    const fractionPadded = fraction.padEnd(DECIMALS, '0').slice(0, DECIMALS)
    const fractionSats = BigInt(fractionPadded)
    const result = wholeSats + fractionSats

    return isNegative ? -result : result
  }

  /**
   * Format XPI amount for display with locale formatting
   * @param sats - Amount in satoshis
   * @param options - Formatting options
   * @returns Formatted string
   */
  function formatXPI(
    sats: bigint | string | number,
    options?: FormatOptions,
  ): string {
    const satsBigInt = typeof sats === 'bigint' ? sats : BigInt(sats)
    const xpi = satsToXPI(satsBigInt)
    const num = parseFloat(xpi)

    let formatted: string

    if (options?.compact && Math.abs(num) >= 1000) {
      // Compact notation for large numbers
      if (Math.abs(num) >= 1_000_000_000) {
        formatted = `${(num / 1_000_000_000).toFixed(1)}B`
      } else if (Math.abs(num) >= 1_000_000) {
        formatted = `${(num / 1_000_000).toFixed(1)}M`
      } else if (Math.abs(num) >= 1_000) {
        formatted = `${(num / 1_000).toFixed(1)}K`
      } else {
        formatted = num.toFixed(options?.maxDecimals ?? 2)
      }
    } else {
      formatted = num.toLocaleString(undefined, {
        minimumFractionDigits: options?.minDecimals ?? 0,
        maximumFractionDigits: options?.maxDecimals ?? DECIMALS,
      })
    }

    if (options?.showUnit !== false) {
      return `${formatted} XPI`
    }
    return formatted
  }

  /**
   * Format satoshis for display
   * @param sats - Amount in satoshis
   * @returns Formatted string with "sats" unit
   */
  function formatSats(sats: bigint | string | number): string {
    const satsBigInt = typeof sats === 'bigint' ? sats : BigInt(sats)
    return `${satsBigInt.toLocaleString()} sats`
  }

  /**
   * Format amount with sign (+ or -)
   * @param sats - Amount in satoshis (absolute value)
   * @param isIncoming - Whether this is incoming (positive)
   * @returns Formatted string with sign
   */
  function formatSignedAmount(sats: bigint, isIncoming: boolean): string {
    const formatted = formatXPI(sats, { showUnit: false })
    return isIncoming ? `+${formatted}` : `-${formatted}`
  }

  /**
   * Check if amount is dust
   * @param sats - Amount in satoshis
   * @returns Whether amount is below dust threshold
   */
  function isDust(sats: bigint): boolean {
    return sats > 0n && sats < DUST_THRESHOLD
  }

  /**
   * Get color class for amount display
   * @param sats - Amount in satoshis
   * @param isIncoming - Whether this is incoming
   * @returns Tailwind color class
   */
  function getAmountColor(sats: bigint, isIncoming: boolean): string {
    if (sats === 0n) return 'text-muted'
    return isIncoming ? 'text-success' : 'text-error'
  }

  /**
   * Parse user input to satoshis
   * Handles various input formats
   * @param input - User input string
   * @returns Satoshis as bigint or null if invalid
   */
  function parseAmountInput(input: string): bigint | null {
    if (!input || typeof input !== 'string') return null

    // Remove commas and whitespace
    const cleaned = input.replace(/[,\s]/g, '').trim()

    // Check for valid number format
    if (!/^-?\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '.') {
      return null
    }

    try {
      return xpiToSats(cleaned)
    } catch {
      return null
    }
  }

  /**
   * Validate amount for sending
   * @param sats - Amount in satoshis
   * @param maxAmount - Maximum allowed (e.g., balance)
   * @returns Validation result
   */
  function validateAmount(
    sats: bigint,
    maxAmount?: bigint,
  ): { valid: boolean; error?: string } {
    if (sats <= 0n) {
      return { valid: false, error: 'Amount must be greater than 0' }
    }

    if (isDust(sats)) {
      return {
        valid: false,
        error: `Amount is below dust threshold (${DUST_THRESHOLD} sats)`,
      }
    }

    if (maxAmount !== undefined && sats > maxAmount) {
      return { valid: false, error: 'Insufficient balance' }
    }

    return { valid: true }
  }

  /**
   * Calculate percentage of total
   * @param amount - Amount in satoshis
   * @param total - Total in satoshis
   * @returns Percentage (0-100)
   */
  function percentOfTotal(amount: bigint, total: bigint): number {
    if (total === 0n) return 0
    return Number((amount * 10000n) / total) / 100
  }

  return {
    // Conversion
    satsToXPI,
    xpiToSats,

    // Formatting
    formatXPI,
    formatSats,
    formatSignedAmount,
    getAmountColor,

    // Parsing
    parseAmountInput,

    // Validation
    isDust,
    validateAmount,

    // Utilities
    percentOfTotal,

    // Constants
    SATS_PER_XPI,
    DECIMALS,
    DUST_THRESHOLD,
  }
}
