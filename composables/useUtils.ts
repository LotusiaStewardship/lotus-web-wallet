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

// Explorer-specific formatting utilities
export const useExplorerFormat = () => {
  /**
   * Format a Unix timestamp to a human readable string (UTC)
   */
  const formatTimestamp = (timestamp: number | string) => {
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
   * Truncate a sha256 hash (txid, block hash) for display
   */
  const truncateTxid = (txid: string, startChars = 16, endChars = 6) => {
    if (!txid || txid.length <= startChars + endChars + 3) return txid
    return `${txid.slice(0, startChars)}...${txid.slice(-endChars)}`
  }

  /**
   * Truncate a block hash for display (shows end portion)
   */
  const truncateBlockHash = (blockHash: string) => {
    if (!blockHash) return ''
    return `${blockHash.slice(0, 1)}...${blockHash.slice(-16)}`
  }

  /**
   * Convert networkhashps or blocksize to minified format
   */
  const toMinifiedNumber = (
    type: 'hashrate' | 'blocksize',
    number: number | string,
  ): string => {
    const unit = type === 'hashrate' ? 'H' : 'B'
    const num = Number(number)
    if (isNaN(num)) return number.toString()

    if (num >= 1_000_000_000_000_000)
      return `${(num / 1_000_000_000_000_000).toFixed(1)} P${unit}`
    if (num >= 1_000_000_000_000)
      return `${(num / 1_000_000_000_000).toFixed(1)} T${unit}`
    if (num >= 1_000_000_000)
      return `${(num / 1_000_000_000).toFixed(1)} G${unit}`
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)} M${unit}`
    if (num >= 1_000) return `${(num / 1000).toFixed(1)} K${unit}`
    return `${num} ${unit}`
  }

  /**
   * Convert seconds to minified time format
   */
  const toMinifiedTime = (seconds: number | string) => {
    const num = Number(seconds)
    if (isNaN(num)) return seconds.toString()

    if (num >= 3600) return `${(num / 3600).toFixed(1)} hours`
    if (num >= 60) return `${(num / 60).toFixed(1)} minutes`
    return `${num.toFixed(1)} seconds`
  }

  /**
   * Calculate blocks from tip
   */
  const numBlocksFromTip = (tipHeight: number, blockHeight: number) => {
    return tipHeight - blockHeight + 1
  }

  /**
   * Get sentiment color for RANK votes
   */
  const getSentimentColor = (
    sentiment: 'positive' | 'negative' | 'neutral',
  ) => {
    switch (sentiment) {
      case 'positive':
        return 'success'
      case 'negative':
        return 'error'
      case 'neutral':
        return 'neutral'
    }
  }

  /**
   * Convert positive and negative vote counts to percentage
   */
  const toMinifiedPercent = (positive: string, negative: string): string => {
    const positiveNum = BigInt(positive)
    const negativeNum = BigInt(negative)
    if (positiveNum === 0n && negativeNum === 0n) return '0'
    if (positiveNum === 0n && negativeNum > 0n) return '0'
    if (positiveNum > 0n && negativeNum === 0n) return '100'
    const total = positiveNum + negativeNum
    const percent = (Number(positiveNum) / Number(total)) * 100
    return percent.toFixed(1)
  }

  /**
   * Get color based on percentage (for vote ratios)
   * Returns Nuxt UI compatible color names
   */
  const toPercentColor = (
    percentage: string,
  ): 'success' | 'warning' | 'error' | 'neutral' => {
    const num = parseFloat(percentage)
    if (num >= 75) return 'success'
    if (num >= 50) return 'warning'
    if (num >= 25) return 'error'
    return 'neutral'
  }

  /**
   * Get ranking change color
   */
  const getRankingColor = (change: number) => {
    return change > 0 ? 'success' : change < 0 ? 'error' : 'neutral'
  }

  /**
   * Format ranking change rate as percentage
   */
  const formatRate = (rate: number) => {
    if (!isFinite(rate)) return 'New'
    return `${Math.abs(rate).toFixed(1)}%`
  }

  /**
   * Minified stat count (for large numbers in sats)
   */
  const toMinifiedStatCount = (
    number: number | string,
    divisor: number = 1_000_000,
  ) => {
    const num = Math.floor(Number(number) / divisor)
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
    if (num <= -1e9) return `${(num / 1e9).toFixed(1)}B`
    if (num <= -1e6) return `${(num / 1e6).toFixed(1)}M`
    if (num <= -1e3) return `${(num / 1e3).toFixed(1)}K`
    return `${num}`
  }

  /**
   * Truncate post ID for display
   */
  const truncatePostId = (postId: string) => {
    return postId.length > 8 ? `${postId.substring(0, 8)}...` : postId
  }

  /**
   * Capitalize first letter of a string
   */
  const toUppercaseFirstLetter = (str: string) => {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  /**
   * Get external post URL for a platform
   */
  const toExternalPostUrl = (
    platform: string,
    profileId: string,
    postId?: string,
  ) => {
    if (platform === 'twitter') {
      if (postId) {
        return `https://x.com/${profileId}/status/${postId}`
      }
      return `https://x.com/${profileId}`
    }
    return '#'
  }

  return {
    formatTimestamp,
    truncateTxid,
    truncateBlockHash,
    toMinifiedNumber,
    toMinifiedTime,
    numBlocksFromTip,
    getSentimentColor,
    toMinifiedPercent,
    toPercentColor,
    getRankingColor,
    formatRate,
    toMinifiedStatCount,
    truncatePostId,
    toUppercaseFirstLetter,
    toExternalPostUrl,
  }
}

/**
 * Address formatting utilities for Lotus addresses
 *
 * Uses Bitcore's XAddress class for proper address parsing and validation.
 * The XAddress format is: prefix + networkChar + Base58(type + script + checksum)
 *
 * For display purposes, we omit the redundant "lotus" prefix and show only
 * the unique identifying portion of the address payload.
 *
 * NOTE: This composable uses the centralized Bitcore SDK provider from
 * ~/composables/useBitcore.ts which is initialized by the bitcore.client.ts plugin.
 */

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

// P2TR (Taproot) payload prefix in Base58 encoding
// P2TR addresses start with "3" because the type byte is 0x02
const P2TR_PAYLOAD_PREFIX = '3'

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
  // Get Bitcore SDK from centralized provider
  const { Bitcore } = useBitcore()

  /**
   * Parse a Lotus address using Bitcore's XAddress class
   * Returns null for invalid addresses
   *
   * The SDK is guaranteed to be loaded by the bitcore.client.ts plugin
   * before any component renders, so Bitcore.value will always be available.
   */
  const parseAddress = (address: string): ParsedAddress | null => {
    if (!address || typeof address !== 'string') return null

    const sdk = Bitcore.value
    if (!sdk?.XAddress) {
      console.warn('Bitcore SDK not available for address parsing')
      return null
    }

    try {
      // Use XAddress._decode for parsing without full validation
      // This avoids needing to instantiate the full class
      const decoded = sdk.XAddress._decode(address)
      if (!decoded || !decoded.network || !decoded.hashBuffer) {
        console.warn(`Failed to decode address ${address}`, decoded)
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
    } catch (e) {
      console.warn(`Error parsing address ${address}:`, e)
      return null
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

    // Parse using Bitcore SDK
    const parsed = parseAddress(address)

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
    const parsed = parseAddress(address)
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
    const parsed = parseAddress(address)
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
    const sdk = Bitcore.value
    if (!sdk?.XAddress) return false
    return sdk.XAddress.isValid(address, network)
  }

  /**
   * Convert a P2PKH hash (20-byte hex string) to a Lotus address
   * The voterId from RANK API is a 20-byte P2PKH hash
   *
   * @param hashHex - 20-byte P2PKH hash as hex string (40 characters)
   * @param network - Network name: 'livenet', 'testnet', or 'regtest'
   * @returns Lotus address string or null if invalid
   */
  const p2pkhHashToAddress = (
    hashHex: string,
    network: 'livenet' | 'testnet' | 'regtest' = 'livenet',
  ): string | null => {
    if (!hashHex || hashHex.length !== 40) return null

    const sdk = Bitcore.value
    if (!sdk?.Address) return null

    try {
      const hashBuffer = Buffer.from(hashHex, 'hex')
      // Use Address.fromPublicKeyHash which returns an Address that can be
      // converted to XAddress format via toXAddress()
      const address = sdk.Address.fromPublicKeyHash(hashBuffer, network)
      return address.toXAddress()
    } catch {
      return null
    }
  }

  /**
   * Get the address type from an address string
   * Returns 'taproot', 'pubkeyhash', 'scripthash', or 'unknown'
   */
  const getAddressType = (
    address: string,
  ): 'pubkeyhash' | 'scripthash' | 'taproot' | 'unknown' => {
    const parsed = parseAddress(address)
    return parsed?.type ?? 'unknown'
  }

  /**
   * Get a user-friendly label for the address type
   * Returns labels that are understandable to both average and advanced users
   */
  const getAddressTypeLabel = (
    address: string,
  ): {
    short: string
    full: string
    icon: string
    color:
      | 'primary'
      | 'warning'
      | 'info'
      | 'error'
      | 'neutral'
      | 'success'
      | 'secondary'
  } => {
    const type = getAddressType(address)

    switch (type) {
      case 'taproot':
        return {
          short: 'Modern',
          full: 'Modern Address (Taproot)',
          icon: 'i-lucide-shield-check',
          color: 'success',
        }
      case 'pubkeyhash':
        return {
          short: 'Classic',
          full: 'Classic Address',
          icon: 'i-lucide-key',
          color: 'neutral',
        }
      case 'scripthash':
        return {
          short: 'Script',
          full: 'Script Address',
          icon: 'i-lucide-file-code',
          color: 'info',
        }
      default:
        return {
          short: 'Unknown',
          full: 'Unknown Address Type',
          icon: 'i-lucide-help-circle',
          color: 'warning',
        }
    }
  }

  /**
   * Check if an address is a Taproot address
   */
  const isTaprootAddress = (address: string): boolean => {
    return getAddressType(address) === 'taproot'
  }

  return {
    truncateAddress,
    parseAddress,
    getAddressFingerprint,
    formatFingerprint,
    fingerprintsMatch,
    getNetworkName,
    isMainnet,
    isValidAddress,
    p2pkhHashToAddress,
    getAddressType,
    getAddressTypeLabel,
    isTaprootAddress,
    NETWORK_CHARS,
  }
}
