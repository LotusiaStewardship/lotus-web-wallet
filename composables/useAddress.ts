/**
 * Address Composable
 *
 * Address parsing, formatting, and validation utilities.
 * Uses the Bitcore SDK for address operations.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Parsed address information
 */
export interface AddressInfo {
  /** Full address string */
  address: string
  /** Address type (pubkeyhash, scripthash, taproot) */
  type: 'pubkeyhash' | 'scripthash' | 'taproot'
  /** Network (livenet, testnet, regtest) */
  network: 'livenet' | 'testnet' | 'regtest'
  /** Hash/payload as hex */
  hash: string
}

/**
 * Address type label information for UI display
 */
export interface AddressTypeLabel {
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
}

// ============================================================================
// Composable
// ============================================================================

const { $bitcore } = useNuxtApp()
const networkStore = useNetworkStore()

export function useAddress() {
  /**
   * Validate a Lotus address
   * @param address - Address to validate
   * @param network - Optional network to validate against
   * @returns Whether the address is valid
   */
  function isValidAddress(
    address: string,
    network?: 'livenet' | 'testnet',
  ): boolean {
    if (!address || typeof address !== 'string') return false

    try {
      const addr = new $bitcore.Address(address)
      if (network) {
        return addr.network.name === network
      }
      return true
    } catch {
      return false
    }
  }

  /**
   * Validate address for current network
   * @param address - Address to validate
   * @returns Whether the address is valid for current network
   */
  function isValidForCurrentNetwork(address: string): boolean {
    return isValidAddress(address, networkStore.currentNetwork)
  }

  /**
   * Parse address and extract components
   * @param address - Address to parse
   * @returns Parsed address info or null if invalid
   */
  function parseAddress(address: string): AddressInfo | null {
    if (!address) return null

    try {
      const xaddr = new $bitcore.XAddress(address)
      return {
        address: xaddr.toString(),
        type: xaddr.type as AddressInfo['type'],
        network: xaddr.network.name as AddressInfo['network'],
        hash: xaddr.hashBuffer.toString('hex'),
      }
    } catch {
      return null
    }
  }

  /**
   * Format address as fingerprint (e.g., "Lk9W·oSb8")
   * Shows a short unique identifier for the address
   * @param address - Full address
   * @param length - Number of characters on each side
   * @returns Fingerprint string
   */
  function toFingerprint(address: string, length: number = 4): string {
    if (!address || address.length < length * 2 + 6) return address
    // Skip the "lotus_" prefix (6 chars)
    const prefix = address.slice(6, 6 + length)
    const suffix = address.slice(-length)
    return `${prefix}·${suffix}`
  }

  /**
   * Truncate address for display
   * @param address - Full address
   * @param startChars - Characters to show at start
   * @param endChars - Characters to show at end
   * @returns Truncated address
   */
  function truncateAddress(
    address: string,
    startChars: number = 12,
    endChars: number = 8,
  ): string {
    if (!address || address.length <= startChars + endChars + 3) return address
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
  }

  /**
   * Get address from public key
   * @param publicKeyHex - Public key as hex string
   * @param network - Network to use
   * @returns Address string or null if invalid
   */
  function publicKeyToAddress(
    publicKeyHex: string,
    networkName: 'livenet' | 'testnet' = 'livenet',
  ): string | null {
    if (!publicKeyHex) return null

    try {
      const pubKey = new $bitcore.PublicKey(publicKeyHex)
      const network = $bitcore.Networks.get(networkName)
      const addr = pubKey.toAddress(network)
      return addr.toXAddress(network)
    } catch {
      return null
    }
  }

  /**
   * Convert P2PKH hash to address
   * @param hash - Hash as hex string (20 bytes)
   * @param network - Network to use
   * @returns Address string or null if invalid
   */
  function hashToAddress(
    hash: string,
    networkName: 'livenet' | 'testnet' = 'livenet',
  ): string | null {
    if (!hash) return null

    try {
      // Convert hashbuffer to Script
      const script = $bitcore.Script.fromBuffer(Buffer.from(hash, 'hex'))
      const network = $bitcore.Networks.get(networkName)
      const addr = new $bitcore.Address(script, network)
      return addr.toXAddress(network)
    } catch {
      return null
    }
  }

  /**
   * Get network from address
   * @param address - Address to check
   * @returns Network name or null if invalid
   */
  function getNetworkFromAddress(
    address: string,
  ): 'livenet' | 'testnet' | null {
    const info = parseAddress(address)
    if (!info) return null
    return info.network as 'livenet' | 'testnet'
  }

  /**
   * Check if address is for mainnet
   * @param address - Address to check
   * @returns Whether address is mainnet
   */
  function isMainnetAddress(address: string): boolean {
    return getNetworkFromAddress(address) === 'livenet'
  }

  /**
   * Check if address is for testnet
   * @param address - Address to check
   * @returns Whether address is testnet
   */
  function isTestnetAddress(address: string): boolean {
    return getNetworkFromAddress(address) === 'testnet'
  }

  /**
   * Get address type (p2pkh, p2sh, p2tr)
   * @param address - Address to check
   * @returns Address type or null if invalid
   */
  function getAddressType(address: string): string | null {
    const info = parseAddress(address)
    return info?.type || null
  }

  /**
   * Get network name from address
   * @param address - Address to check
   * @returns Network name or 'unknown' if invalid
   */
  function getNetworkName(
    address: string,
  ): 'livenet' | 'testnet' | 'regtest' | 'unknown' {
    const info = parseAddress(address)
    return info?.network ?? 'unknown'
  }

  /**
   * Format address fingerprint as a compact display string
   * e.g., "Lk9W·oSb8"
   * @param address - Full address
   * @param chunkSize - Number of characters on each side
   * @param separator - Separator character
   * @returns Fingerprint string
   */
  function formatFingerprint(
    address: string,
    chunkSize: number = 5,
    separator: string = '·',
  ): string {
    if (!address || address.length < chunkSize * 2 + 6) return ''
    // Skip the "lotus_" prefix (6 chars)
    const payload = address.slice(6)
    if (payload.length < chunkSize * 2) return ''
    const start = payload.slice(0, chunkSize)
    const end = payload.slice(-chunkSize)
    return `${start}${separator}${end}`
  }

  /**
   * Get a user-friendly label for the address type
   * Returns labels that are understandable to both average and advanced users
   * @param address - Address to check
   * @returns Address type label info
   */
  function getAddressTypeLabel(address: string): AddressTypeLabel {
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

  return {
    // Validation
    isValidAddress,
    isValidForCurrentNetwork,

    // Parsing
    parseAddress,
    getNetworkFromAddress,
    getAddressType,

    // Formatting
    toFingerprint,
    truncateAddress,

    // Conversion
    publicKeyToAddress,
    hashToAddress,

    // Network checks
    isMainnetAddress,
    isTestnetAddress,

    // Additional formatting
    getNetworkName,
    formatFingerprint,
    getAddressTypeLabel,
  }
}
