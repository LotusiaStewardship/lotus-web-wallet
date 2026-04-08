/**
 * CashWeb Keypair Utilities
 *
 * Pure functions for generating and managing CashWeb messaging keys.
 * These are framework-agnostic and can be used from any layer.
 */
import { PrivateKey, PublicKey } from 'xpi-ts/lib/bitcore'

/**
 * Generate a fresh ephemeral keypair for a single message.
 *
 * Ephemeral keys are used for ECDH with the recipient's public key
 * to derive a shared symmetric encryption key. Each message gets its
 * own ephemeral keypair for forward secrecy.
 *
 * The returned keypair exists only in memory and should be discarded
 * after the message construction/decryption flow completes.
 */
export function generateEphemeralKey(): {
  privateKey: PrivateKey
  publicKey: PublicKey
} {
  const privateKey = new PrivateKey()
  return {
    privateKey,
    publicKey: privateKey.toPublicKey(),
  }
}

/**
 * Reconstruct an ephemeral keypair from a hex-encoded private key.
 *
 * Useful for deterministic testing or reconstructing a key from
 * data embedded in a received message (e.g., the sender's ephemeral
 * public key is included in the message, and the receiver derives
 * their stealth private key from it).
 *
 * @param hex - Hex-encoded private key
 */
export function ephemeralKeyFromHex(hex: string): {
  privateKey: PrivateKey
  publicKey: PublicKey
} {
  const privateKey = new PrivateKey(hex)
  return {
    privateKey,
    publicKey: privateKey.toPublicKey(),
  }
}

/**
 * Convert a public key to hex string for serialization.
 *
 * @param publicKey - xpi-ts PublicKey instance
 * @returns Compressed public key as hex string
 */
export function publicKeyToHex(publicKey: PublicKey): string {
  return publicKey.toString()
}

/**
 * Parse a hex-encoded public key string into a PublicKey instance.
 *
 * @param hex - Hex-encoded compressed public key
 */
export function publicKeyFromHex(hex: string): PublicKey {
  return PublicKey.fromString(hex)
}
