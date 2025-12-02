/**
 * Utility composable for common functions
 */

// Format large numbers with locale
export const useFormatNumber = () => {
  const formatNumber = (
    num: string | number,
    options?: Intl.NumberFormatOptions,
  ) => {
    return Number(num).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
      ...options,
    })
  }

  const formatCompact = (num: string | number) => {
    const n = Number(num)
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
    return n.toFixed(0)
  }

  return { formatNumber, formatCompact }
}

// Format time relative to now
export const useFormatTime = () => {
  const formatRelative = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return { formatRelative, formatDateTime }
}

// Clipboard utilities
export const useClipboard = () => {
  const toast = useToast()

  const copy = async (text: string, successMessage = 'Copied to clipboard') => {
    try {
      await navigator.clipboard.writeText(text)
      toast.add({
        title: successMessage,
        color: 'success',
        icon: 'i-lucide-check',
      })
      return true
    } catch (err) {
      toast.add({
        title: 'Copy failed',
        color: 'error',
        icon: 'i-lucide-x',
      })
      return false
    }
  }

  return { copy }
}

// Lotus unit conversions
export const useLotusUnits = () => {
  const DECIMALS = 6
  const SATS_PER_XPI = 1_000_000

  const toXPI = (sats: string | number) => Number(sats) / SATS_PER_XPI
  const toSats = (xpi: string | number) =>
    Math.floor(Number(xpi) * SATS_PER_XPI)

  const formatXPI = (sats: string | number) => {
    return toXPI(sats).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: DECIMALS,
    })
  }

  return { toXPI, toSats, formatXPI, DECIMALS, SATS_PER_XPI }
}

// Validation utilities
export const useValidation = () => {
  const isSha256 = (str: string) => /^[a-f0-9]{64}$/i.test(str)

  const isValidSeedPhraseLength = (phrase: string) => {
    const words = phrase.trim().split(/\s+/)
    return words.length === 12 || words.length === 24
  }

  return { isSha256, isValidSeedPhraseLength }
}

/**
 * Address formatting utilities for Lotus addresses
 *
 * Uses Bitcore's XAddress class for proper address parsing and validation.
 * The XAddress format is: prefix + networkChar + Base58(type + script + checksum)
 *
 * For display purposes, we omit the redundant "lotus" prefix and show only
 * the unique identifying portion of the address payload.
 */

// Bitcore module (loaded dynamically)
let Bitcore: any = null
let bitcoreLoaded = false

const loadBitcore = async () => {
  if (!bitcoreLoaded) {
    const sdkModule = await import('lotus-sdk')
    Bitcore = sdkModule.Bitcore
    bitcoreLoaded = true
  }
  return Bitcore
}

// Network character constants (from XAddress spec)
// Note: Bitcore uses 'livenet' internally, but we also support 'mainnet' alias
const NETWORK_CHARS: Record<string, string> = {
  livenet: '_',
  mainnet: '_',
  testnet: 'T',
  regtest: 'R',
}

// Common P2PKH payload prefix in Base58 encoding
// All P2PKH addresses start with "16PSJ" because it encodes:
// type byte (0x00) + P2PKH script prefix (OP_DUP OP_HASH160 OP_PUSH20)
const P2PKH_PAYLOAD_PREFIX = '16PSJ'

export interface ParsedAddress {
  /** The full original address string */
  full: string
  /** Network name: livenet, testnet, or regtest */
  networkName: 'livenet' | 'testnet' | 'regtest'
  /** Network character: _, T, or R */
  networkChar: string
  /** Address type: pubkeyhash, scripthash, or taproot */
  type: 'pubkeyhash' | 'scripthash' | 'taproot'
  /** The Base58 encoded payload (after prefix + network char) */
  payload: string
  /** The unique portion of payload (after common P2PKH prefix for P2PKH addresses) */
  uniquePayload: string
  /** Hash buffer as hex string */
  hashHex: string
  /** Whether this is a P2PKH address */
  isP2PKH: boolean
  /** Whether this is a P2SH address */
  isP2SH: boolean
  /** Whether this is a Taproot address */
  isTaproot: boolean
}

export const useAddressFormat = () => {
  /**
   * Parse a Lotus address using Bitcore's XAddress class
   * Returns null for invalid addresses
   */
  const parseAddress = (address: string): ParsedAddress | null => {
    if (!address || typeof address !== 'string') return null

    try {
      // Use XAddress._decode for parsing without full validation
      // This avoids needing to instantiate the full class
      const decoded = Bitcore?.XAddress?._decode(address)
      if (!decoded || !decoded.network || !decoded.hashBuffer) {
        return null
      }

      const networkName = decoded.network.name as
        | 'livenet'
        | 'testnet'
        | 'regtest'
      const networkChar =
        decoded.network.networkbyte || NETWORK_CHARS[networkName] || '_'
      const type = decoded.type as 'pubkeyhash' | 'scripthash' | 'taproot'

      // Extract payload (everything after "lotus" + network char)
      const prefixEnd = address.indexOf(networkChar)
      const payload = prefixEnd >= 0 ? address.slice(prefixEnd + 1) : ''

      // For P2PKH, skip the common "16PSJ" prefix to get unique portion
      const isP2PKH = type === 'pubkeyhash'
      const uniquePayload =
        isP2PKH && payload.startsWith(P2PKH_PAYLOAD_PREFIX)
          ? payload.slice(P2PKH_PAYLOAD_PREFIX.length)
          : payload

      return {
        full: address,
        networkName,
        networkChar,
        type,
        payload,
        uniquePayload,
        hashHex: decoded.hashBuffer.toString('hex'),
        isP2PKH,
        isP2SH: type === 'scripthash',
        isTaproot: type === 'taproot',
      }
    } catch {
      return null
    }
  }

  /**
   * Synchronous address parsing using string manipulation
   * Used when Bitcore is not yet loaded
   */
  const parseAddressSync = (address: string): ParsedAddress | null => {
    if (!address || typeof address !== 'string') return null
    if (!address.startsWith('lotus')) return null

    // Find network character position (first uppercase or underscore after 'lotus')
    const networkCharMatch = address.slice(5).match(/^[_TR]/)
    if (!networkCharMatch) return null

    const networkChar = networkCharMatch[0]
    const payload = address.slice(6) // After "lotus" + network char

    let networkName: 'livenet' | 'testnet' | 'regtest'
    if (networkChar === '_') networkName = 'livenet'
    else if (networkChar === 'T') networkName = 'testnet'
    else if (networkChar === 'R') networkName = 'regtest'
    else return null

    // Determine type from payload prefix
    const isP2PKH = payload.startsWith(P2PKH_PAYLOAD_PREFIX)
    const uniquePayload = isP2PKH
      ? payload.slice(P2PKH_PAYLOAD_PREFIX.length)
      : payload

    // We can't determine exact type without Bitcore, assume P2PKH if it has the prefix
    const type = isP2PKH ? 'pubkeyhash' : 'pubkeyhash' // Default assumption

    return {
      full: address,
      networkName,
      networkChar,
      type,
      payload,
      uniquePayload,
      hashHex: '', // Can't extract without Bitcore
      isP2PKH,
      isP2SH: false,
      isTaproot: false,
    }
  }

  /**
   * Truncate a Lotus address for display
   *
   * Omits the redundant "lotus" prefix and common P2PKH payload prefix.
   * Shows network indicator for non-mainnet addresses.
   *
   * @param address - Full Lotus address
   * @param startChars - Number of chars to show at start (default: 4)
   * @param endChars - Number of chars to show at end (default: 4)
   * @returns Truncated display string like "Lk9W...oSb8"
   */
  const truncateAddress = (
    address: string,
    startChars: number = 5,
    endChars: number = 5,
  ): string => {
    if (!address) return ''

    // Try Bitcore parsing first, fall back to sync parsing
    const parsed = Bitcore ? parseAddress(address) : parseAddressSync(address)

    // Handle non-Lotus addresses with simple truncation
    if (!parsed) {
      if (address.length <= 16) return address
      return `${address.slice(0, 8)}...${address.slice(-6)}`
    }

    const { networkName, uniquePayload } = parsed

    // For short payloads, return as-is
    if (uniquePayload.length <= startChars + endChars + 3) {
      return uniquePayload
    }

    // Build display string
    let display = ''

    // Add network indicator for non-mainnet
    if (networkName === 'testnet') display += '[T] '
    else if (networkName === 'regtest') display += '[R] '

    // Show truncated unique payload
    const startChunk = uniquePayload.slice(0, startChars)
    const endChunk = uniquePayload.slice(-endChars)
    display += `${startChunk}...${endChunk}`

    return display
  }

  /**
   * Get the identifying "fingerprint" of an address
   * Uses the unique portion of the payload for identification
   */
  const getAddressFingerprint = (
    address: string,
    chunkSize: number = 5,
  ): {
    start: string
    end: string
    networkName: string
    networkChar: string
  } | null => {
    const parsed = Bitcore ? parseAddress(address) : parseAddressSync(address)
    if (!parsed) return null

    const { networkName, networkChar, uniquePayload } = parsed
    if (uniquePayload.length < chunkSize * 2) return null

    return {
      start: uniquePayload.slice(0, chunkSize),
      end: uniquePayload.slice(-chunkSize),
      networkName,
      networkChar,
    }
  }

  /**
   * Format address fingerprint as a compact display string
   * e.g., "Lk9W·oSb8"
   */
  const formatFingerprint = (
    address: string,
    chunkSize: number = 5,
    separator: string = '·',
  ): string => {
    const fp = getAddressFingerprint(address, chunkSize)
    if (!fp) return ''
    return `${fp.start}${separator}${fp.end}`
  }

  /**
   * Check if two addresses have the same fingerprint
   */
  const fingerprintsMatch = (
    addr1: string,
    addr2: string,
    chunkSize: number = 5,
  ): boolean => {
    const fp1 = getAddressFingerprint(addr1, chunkSize)
    const fp2 = getAddressFingerprint(addr2, chunkSize)
    if (!fp1 || !fp2) return false
    return fp1.start === fp2.start && fp1.end === fp2.end
  }

  /**
   * Get network name from address
   */
  const getNetworkName = (
    address: string,
  ): 'livenet' | 'testnet' | 'regtest' | 'unknown' => {
    const parsed = Bitcore ? parseAddress(address) : parseAddressSync(address)
    return parsed?.networkName ?? 'unknown'
  }

  /**
   * Check if address is for mainnet (livenet)
   */
  const isMainnet = (address: string): boolean => {
    return getNetworkName(address) === 'livenet'
  }

  /**
   * Validate an address using Bitcore's XAddress class
   * Returns true if the address is valid
   */
  const isValidAddress = (address: string, network?: string): boolean => {
    if (!Bitcore?.XAddress) return false
    return Bitcore.XAddress.isValid(address, network)
  }

  /**
   * Ensure Bitcore is loaded for full functionality
   */
  const ensureBitcoreLoaded = async () => {
    await loadBitcore()
  }

  return {
    truncateAddress,
    parseAddress,
    parseAddressSync,
    getAddressFingerprint,
    formatFingerprint,
    fingerprintsMatch,
    getNetworkName,
    isMainnet,
    isValidAddress,
    ensureBitcoreLoaded,
    NETWORK_CHARS,
  }
}
