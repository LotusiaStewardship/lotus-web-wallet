/**
 * QR Code Composable
 *
 * Payment URI handling utilities for QR codes.
 * For QR code rendering, use the CommonQRCode component or qrcode-vue3 directly.
 */
import { PAYMENT_URI_SCHEME } from '~/utils/constants'

// ============================================================================
// Types
// ============================================================================

/**
 * Payment URI options
 */
export interface PaymentURIOptions {
  /** Amount in XPI */
  amount?: string
  /** Label (recipient name) */
  label?: string
  /** Message/memo */
  message?: string
}

/**
 * Parsed payment URI data
 */
export interface PaymentURIData {
  /** Recipient address */
  address: string
  /** Amount in XPI */
  amount?: string
  /** Label */
  label?: string
  /** Message */
  message?: string
}

// ============================================================================
// Composable
// ============================================================================

export function useQRCode() {
  /**
   * Create a Lotus payment URI
   * @param address - Recipient address
   * @param options - Payment options
   * @returns Payment URI string
   */
  function createPaymentURI(
    address: string,
    options?: PaymentURIOptions,
  ): string {
    let uri = `${PAYMENT_URI_SCHEME}:${address}`
    const params: string[] = []

    if (options?.amount) {
      params.push(`amount=${options.amount}`)
    }
    if (options?.label) {
      params.push(`label=${encodeURIComponent(options.label)}`)
    }
    if (options?.message) {
      params.push(`message=${encodeURIComponent(options.message)}`)
    }

    if (params.length > 0) {
      uri += `?${params.join('&')}`
    }

    return uri
  }

  /**
   * Parse a Lotus payment URI
   * @param uri - Payment URI to parse
   * @returns Parsed data or null if invalid
   */
  function parsePaymentURI(uri: string): PaymentURIData | null {
    if (!uri || typeof uri !== 'string') return null

    try {
      // Handle both payment URI scheme and raw address
      let addressPart: string
      let queryPart: string | undefined

      if (uri.toLowerCase().startsWith(`${PAYMENT_URI_SCHEME}:`)) {
        const withoutScheme = uri.slice(PAYMENT_URI_SCHEME.length + 1)
        const queryIndex = withoutScheme.indexOf('?')
        if (queryIndex !== -1) {
          addressPart = withoutScheme.slice(0, queryIndex)
          queryPart = withoutScheme.slice(queryIndex + 1)
        } else {
          addressPart = withoutScheme
        }
      } else if (uri.startsWith('lotus_') || uri.startsWith('lotusT')) {
        // Raw address
        addressPart = uri
      } else {
        return null
      }

      const params = new URLSearchParams(queryPart || '')

      return {
        address: addressPart,
        amount: params.get('amount') || undefined,
        label: params.get('label') || undefined,
        message: params.get('message') || undefined,
      }
    } catch {
      return null
    }
  }

  /**
   * Check if a string looks like a payment URI
   * @param str - String to check
   * @returns Whether it looks like a payment URI
   */
  function isPaymentURI(str: string): boolean {
    if (!str) return false
    return str.toLowerCase().startsWith(`${PAYMENT_URI_SCHEME}:`)
  }

  /**
   * Check if a string looks like a Lotus address
   * @param str - String to check
   * @returns Whether it looks like an address
   */
  function looksLikeAddress(str: string): boolean {
    if (!str) return false
    return str.startsWith('lotus_') || str.startsWith('lotusT')
  }

  /**
   * Extract address from QR scan result
   * Handles both payment URIs and raw addresses
   * @param scanResult - QR scan result
   * @returns Extracted address or null
   */
  function extractAddress(scanResult: string): string | null {
    if (!scanResult) return null

    // Try parsing as payment URI
    const parsed = parsePaymentURI(scanResult)
    if (parsed) return parsed.address

    // Check if it's a raw address
    if (looksLikeAddress(scanResult)) return scanResult

    return null
  }

  return {
    // Payment URI
    createPaymentURI,
    parsePaymentURI,

    // Utilities
    isPaymentURI,
    looksLikeAddress,
    extractAddress,
  }
}
