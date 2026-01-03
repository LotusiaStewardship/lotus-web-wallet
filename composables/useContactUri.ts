/**
 * Contact URI Composable
 *
 * Handles parsing and generation of Contact URIs for sharing wallet identity.
 * The Contact URI format establishes the PRIMARY BIP44 address as the canonical
 * human identity for wallet-to-wallet interactions.
 *
 * URI Format:
 *   lotus-contact://<PRIMARY_ADDRESS>?name=<URL_ENCODED_NAME>&pubkey=<HEX_PUBKEY>
 *
 * Examples:
 *   lotus-contact://lotus_16PSJKLMN...
 *   lotus-contact://lotus_16PSJKLMN...?name=Alice
 *   lotus-contact://lotus_16PSJKLMN...?name=Alice&pubkey=02abc123...
 */
import { useAddress } from './useAddress'

// ============================================================================
// Types
// ============================================================================

/**
 * Parsed contact information from a Contact URI
 */
export interface ContactUriData {
  /** PRIMARY address (required) - the human identity anchor */
  address: string
  /** Display name (optional) */
  name?: string
  /** Compressed public key hex (optional) - enables MuSig2 capability */
  publicKeyHex?: string
}

/**
 * Result of parsing a Contact URI
 */
export interface ContactUriParseResult {
  success: boolean
  data?: ContactUriData
  error?: string
}

// ============================================================================
// Constants
// ============================================================================

export const CONTACT_URI_SCHEME = 'lotus-contact'
export const CONTACT_URI_PREFIX = `${CONTACT_URI_SCHEME}://`

// ============================================================================
// Composable
// ============================================================================

export function useContactUri() {
  const { isValidAddress } = useAddress()

  /**
   * Check if a string is a Contact URI
   * @param uri - String to check
   * @returns Whether the string is a Contact URI
   */
  function isContactUri(uri: string): boolean {
    if (!uri || typeof uri !== 'string') return false
    return uri.toLowerCase().startsWith(CONTACT_URI_PREFIX.toLowerCase())
  }

  /**
   * Parse a Contact URI into its components
   * @param uri - Contact URI to parse
   * @returns Parse result with data or error
   */
  function parseContactUri(uri: string): ContactUriParseResult {
    if (!uri || typeof uri !== 'string') {
      return { success: false, error: 'Invalid URI: empty or not a string' }
    }

    // Check scheme
    if (!isContactUri(uri)) {
      return {
        success: false,
        error: `Invalid scheme: expected ${CONTACT_URI_SCHEME}://`,
      }
    }

    try {
      // Extract the part after the scheme
      const withoutScheme = uri.slice(CONTACT_URI_PREFIX.length)

      // Split address from query params
      const [addressPart, queryString] = withoutScheme.split('?')

      if (!addressPart) {
        return { success: false, error: 'Missing address in Contact URI' }
      }

      // Validate the address
      const address = addressPart.trim()
      if (!isValidAddress(address)) {
        return { success: false, error: 'Invalid Lotus address in Contact URI' }
      }

      // Parse query parameters
      const data: ContactUriData = { address }

      if (queryString) {
        const params = new URLSearchParams(queryString)

        const name = params.get('name')
        if (name) {
          data.name = decodeURIComponent(name)
        }

        const pubkey = params.get('pubkey')
        if (pubkey) {
          // Validate public key format (should be 66 hex chars for compressed)
          if (/^[0-9a-fA-F]{66}$/.test(pubkey)) {
            data.publicKeyHex = pubkey.toLowerCase()
          }
        }
      }

      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse Contact URI: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      }
    }
  }

  /**
   * Generate a Contact URI from contact data
   * @param data - Contact data to encode
   * @returns Contact URI string
   */
  function generateContactUri(data: ContactUriData): string {
    if (!data.address) {
      throw new Error('Address is required to generate Contact URI')
    }

    let uri = `${CONTACT_URI_PREFIX}${data.address}`

    const params = new URLSearchParams()

    if (data.name) {
      params.set('name', data.name)
    }

    if (data.publicKeyHex) {
      params.set('pubkey', data.publicKeyHex)
    }

    const queryString = params.toString()
    if (queryString) {
      uri += `?${queryString}`
    }

    return uri
  }

  /**
   * Generate a Contact URI for the current user (self)
   * Uses the wallet store to get PRIMARY address and public key
   * @param name - Optional display name to include
   * @returns Contact URI string or null if wallet not initialized
   */
  function generateMyContactUri(name?: string): string | null {
    const walletStore = useWalletStore()

    const address = walletStore.getAccountAddress(AccountPurpose.PRIMARY)
    if (!address) return null

    const publicKeyHex = walletStore.getPublicKeyHex(AccountPurpose.PRIMARY)

    return generateContactUri({
      address,
      name,
      publicKeyHex: publicKeyHex || undefined,
    })
  }

  /**
   * Generate a Contact URI for an existing contact/person
   * @param person - Person object to generate URI for
   * @returns Contact URI string
   */
  function generateContactUriForPerson(person: {
    address: string
    name?: string
    publicKeyHex?: string
  }): string {
    return generateContactUri({
      address: person.address,
      name: person.name,
      publicKeyHex: person.publicKeyHex,
    })
  }

  return {
    // Constants
    CONTACT_URI_SCHEME,
    CONTACT_URI_PREFIX,

    // Detection
    isContactUri,

    // Parsing
    parseContactUri,

    // Generation
    generateContactUri,
    generateMyContactUri,
    generateContactUriForPerson,
  }
}

// ============================================================================
// Imports (at bottom to avoid circular dependency issues)
// ============================================================================

import { useWalletStore } from '~/stores/wallet'
import { AccountPurpose } from '~/types/accounts'
