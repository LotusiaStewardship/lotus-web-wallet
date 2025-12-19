/**
 * Identity Utilities
 *
 * Functions for identity validation, derivation, and level detection.
 * These utilities work with the unified Identity model.
 */
import { getBitcore, isBitcoreLoaded } from '~/plugins/bitcore.client'
import type { Identity, IdentityInput } from '~/types/identity'
import { IdentityLevel } from '~/types/identity'

/**
 * Validate a compressed public key format.
 *
 * A valid compressed public key is:
 * - 66 hex characters (representing 33 bytes)
 * - Starts with 02 (Y is even) or 03 (Y is odd)
 * - Followed by 64 hex characters (32-byte X coordinate)
 *
 * @param publicKeyHex - The public key to validate
 * @returns true if the public key format is valid
 */
export function isValidPublicKey(publicKeyHex: string): boolean {
  if (!publicKeyHex || typeof publicKeyHex !== 'string') {
    return false
  }
  return /^0[23][0-9a-fA-F]{64}$/.test(publicKeyHex)
}

/**
 * Derive a Lotus address from a compressed public key.
 *
 * @param publicKeyHex - Compressed public key in hex format
 * @param network - Network type ('livenet' or 'testnet')
 * @returns Lotus address string, or null if derivation fails
 */
export function deriveAddressFromPublicKey(
  publicKeyHex: string,
  network: 'livenet' | 'testnet' = 'livenet',
): string | null {
  if (!isBitcoreLoaded()) {
    console.warn('[Identity] Bitcore not loaded, cannot derive address')
    return null
  }

  if (!isValidPublicKey(publicKeyHex)) {
    console.warn(
      '[Identity] Invalid public key format:',
      publicKeyHex?.slice(0, 20),
    )
    return null
  }

  try {
    const Bitcore = getBitcore()
    if (!Bitcore) {
      console.warn('[Identity] Bitcore SDK not available')
      return null
    }

    const pubKey = new Bitcore.PublicKey(publicKeyHex)
    const address = Bitcore.Address.fromPublicKey(pubKey, network)
    return address.toString()
  } catch (error) {
    console.error('[Identity] Failed to derive address:', error)
    return null
  }
}

/**
 * Create an Identity from a public key.
 *
 * @param publicKeyHex - Compressed public key in hex format
 * @param network - Network type ('livenet' or 'testnet')
 * @returns New Identity object
 * @throws Error if public key is invalid or address derivation fails
 */
export function createIdentity(
  publicKeyHex: string,
  network: 'livenet' | 'testnet' = 'livenet',
): Identity {
  if (!isValidPublicKey(publicKeyHex)) {
    throw new Error('Invalid public key format')
  }

  const address = deriveAddressFromPublicKey(publicKeyHex, network)
  if (!address) {
    throw new Error('Failed to derive address from public key')
  }

  const now = Date.now()
  return {
    publicKeyHex,
    address,
    isOnline: false,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Create an Identity from an IdentityInput with optional fields.
 *
 * @param input - Identity input with publicKeyHex and optional fields
 * @param network - Network type ('livenet' or 'testnet')
 * @returns New Identity object with all provided fields
 * @throws Error if public key is invalid or address derivation fails
 */
export function createIdentityFromInput(
  input: IdentityInput,
  network: 'livenet' | 'testnet' = 'livenet',
): Identity {
  const identity = createIdentity(input.publicKeyHex, network)

  if (input.peerId) {
    identity.peerId = input.peerId
  }
  if (input.multiaddrs) {
    identity.multiaddrs = input.multiaddrs
  }
  if (input.signerCapabilities) {
    identity.signerCapabilities = input.signerCapabilities
    identity.isOnline = input.signerCapabilities.available
  }

  return identity
}

/**
 * Get the relationship level of an identity.
 *
 * Levels indicate increasing capability:
 * - ADDRESS_ONLY: Can only transact (legacy contact)
 * - PUBLIC_KEY: Can participate in MuSig2
 * - P2P_CONNECTED: Can check presence, direct messaging
 * - ACTIVE_SIGNER: Currently advertising signing capabilities
 *
 * @param identity - Identity to evaluate
 * @returns IdentityLevel enum value
 */
export function getIdentityLevel(identity: Identity): IdentityLevel {
  if (identity.signerCapabilities?.available) {
    return IdentityLevel.ACTIVE_SIGNER
  }
  if (identity.peerId) {
    return IdentityLevel.P2P_CONNECTED
  }
  if (identity.publicKeyHex) {
    return IdentityLevel.PUBLIC_KEY
  }
  return IdentityLevel.ADDRESS_ONLY
}

/**
 * Check if an identity can participate in MuSig2.
 *
 * MuSig2 requires the public key to be known for key aggregation.
 *
 * @param identity - Identity to check
 * @returns true if the identity can participate in MuSig2
 */
export function canParticipateInMuSig2(identity: Identity): boolean {
  return getIdentityLevel(identity) >= IdentityLevel.PUBLIC_KEY
}

/**
 * Check if an identity's presence can be tracked.
 *
 * Presence tracking requires P2P connectivity (peerId).
 *
 * @param identity - Identity to check
 * @returns true if presence can be tracked
 */
export function canCheckPresence(identity: Identity): boolean {
  return getIdentityLevel(identity) >= IdentityLevel.P2P_CONNECTED
}

/**
 * Check if an identity is an active signer.
 *
 * @param identity - Identity to check
 * @returns true if the identity is actively advertising signing capabilities
 */
export function isActiveSigner(identity: Identity): boolean {
  return getIdentityLevel(identity) === IdentityLevel.ACTIVE_SIGNER
}

/**
 * Check if a string is a valid Lotus address.
 *
 * @param address - Address string to validate
 * @returns true if the address is valid
 */
export function isValidLotusAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false
  }
  if (!address.startsWith('lotus')) {
    return false
  }

  if (!isBitcoreLoaded()) {
    return address.length >= 40 && address.length <= 60
  }

  try {
    const Bitcore = getBitcore()
    if (!Bitcore) {
      return address.length >= 40 && address.length <= 60
    }
    Bitcore.Address.fromString(address)
    return true
  } catch {
    return false
  }
}

/**
 * Get a human-readable label for an identity level.
 *
 * @param level - IdentityLevel enum value
 * @returns Human-readable string
 */
export function getIdentityLevelLabel(level: IdentityLevel): string {
  switch (level) {
    case IdentityLevel.ACTIVE_SIGNER:
      return 'Active Signer'
    case IdentityLevel.P2P_CONNECTED:
      return 'P2P Connected'
    case IdentityLevel.PUBLIC_KEY:
      return 'Public Key Known'
    case IdentityLevel.ADDRESS_ONLY:
    default:
      return 'Address Only'
  }
}

/**
 * Normalize a public key to lowercase hex.
 *
 * @param publicKeyHex - Public key in hex format
 * @returns Normalized lowercase hex string
 */
export function normalizePublicKey(publicKeyHex: string): string {
  return publicKeyHex.toLowerCase()
}

/**
 * Compare two public keys for equality (case-insensitive).
 *
 * @param a - First public key
 * @param b - Second public key
 * @returns true if the public keys are equal
 */
export function publicKeysEqual(a: string, b: string): boolean {
  return normalizePublicKey(a) === normalizePublicKey(b)
}
