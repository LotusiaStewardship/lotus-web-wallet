/**
 * Validation Utilities
 *
 * Pure functions for validating user input and data.
 * These functions return boolean or validation result objects.
 */

import { Address } from 'xpi-ts/lib/bitcore'
import {
  LOTUS_PREFIX,
  MAINNET_CHAR,
  TESTNET_CHAR,
  DUST_THRESHOLD,
  MAX_RECIPIENTS,
  LOTUS_DECIMALS,
} from './constants'

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  valid: boolean
  error?: string
}

// ============================================================================
// Address Validation
// ============================================================================

/**
 * Check if a string is a valid Lotus address format
 * Note: This only checks format, not checksum validity
 */
export function isValidAddressString(address: string): boolean {
  if (!address || typeof address !== 'string') return false
  if (!address.startsWith(LOTUS_PREFIX)) return false
  if (address.length < 40 || address.length > 60) return false

  const networkChar = address.charAt(5)
  if (networkChar !== MAINNET_CHAR && networkChar !== TESTNET_CHAR) {
    return false
  }

  return true
}

/**
 * Validates the Lotus address string, then validates with Bitcore library.
 */
export function isValidAddress(address: string): boolean {
  if (!isValidAddressString(address)) return false
  if (!Address.isValid(address)) return false
  return true
}
/**
 * Validate a Lotus address with detailed error message
 */
export function validateAddress(
  address: string,
  expectedNetwork?: 'livenet' | 'testnet',
): ValidationResult {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address is required' }
  }

  if (!address.startsWith(LOTUS_PREFIX)) {
    return { valid: false, error: 'Address must start with "lotus"' }
  }

  if (address.length < 40 || address.length > 60) {
    return { valid: false, error: 'Invalid address length' }
  }

  const networkChar = address.charAt(5)
  if (networkChar !== MAINNET_CHAR && networkChar !== TESTNET_CHAR) {
    return { valid: false, error: 'Invalid network character in address' }
  }

  if (expectedNetwork) {
    const expectedChar =
      expectedNetwork === 'livenet' ? MAINNET_CHAR : TESTNET_CHAR
    if (networkChar !== expectedChar) {
      return {
        valid: false,
        error: `Address is for ${
          networkChar === MAINNET_CHAR ? 'mainnet' : 'testnet'
        }, expected ${expectedNetwork}`,
      }
    }
  }

  return { valid: true }
}

/**
 * Check if address matches the expected network
 */
export function isAddressForNetwork(
  address: string,
  network: 'livenet' | 'testnet',
): boolean {
  if (!isValidAddressString(address)) return false
  if (Address.fromString(address).network.name !== network) return false
  return true
}

// ============================================================================
// Amount Validation
// ============================================================================

/**
 * Check if an amount is valid (positive, not dust)
 */
export function isValidAmount(sats: bigint): boolean {
  return sats > 0n && sats >= DUST_THRESHOLD
}

/**
 * Validate an amount with detailed error message
 */
export function validateAmount(
  sats: bigint,
  maxAmount?: bigint,
): ValidationResult {
  if (sats <= 0n) {
    return { valid: false, error: 'Amount must be greater than 0' }
  }

  if (sats < DUST_THRESHOLD) {
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
 * Validate a user-entered amount string
 */
export function validateAmountInput(input: string): ValidationResult {
  if (!input || input.trim() === '') {
    return { valid: false, error: 'Amount is required' }
  }

  // Remove commas and whitespace
  const cleaned = input.replace(/[,\s]/g, '')

  // Check for valid number format
  if (!/^-?\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '.') {
    return { valid: false, error: 'Invalid number format' }
  }

  const num = parseFloat(cleaned)
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, error: 'Invalid number' }
  }

  if (num < 0) {
    return { valid: false, error: 'Amount cannot be negative' }
  }

  // Check for too many decimal places
  const parts = cleaned.split('.')
  if (parts[1] && parts[1].length > LOTUS_DECIMALS) {
    return {
      valid: false,
      error: `Maximum ${LOTUS_DECIMALS} decimal places allowed`,
    }
  }

  return { valid: true }
}

// ============================================================================
// Transaction Validation
// ============================================================================

/**
 * Check if a string is a valid SHA256 hash (txid, block hash)
 */
export function isSha256(str: string): boolean {
  return /^[a-f0-9]{64}$/i.test(str)
}

/**
 * Validate a transaction ID
 */
export function validateTxid(txid: string): ValidationResult {
  if (!txid || typeof txid !== 'string') {
    return { valid: false, error: 'Transaction ID is required' }
  }

  if (!isSha256(txid)) {
    return { valid: false, error: 'Invalid transaction ID format' }
  }

  return { valid: true }
}

/**
 * Validate number of recipients
 */
export function validateRecipientCount(count: number): ValidationResult {
  if (count < 1) {
    return { valid: false, error: 'At least one recipient is required' }
  }

  if (count > MAX_RECIPIENTS) {
    return {
      valid: false,
      error: `Maximum ${MAX_RECIPIENTS} recipients allowed`,
    }
  }

  return { valid: true }
}

// ============================================================================
// Contact Validation
// ============================================================================

/**
 * Validate a contact name
 */
export function validateContactName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' }
  }

  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return { valid: false, error: 'Name cannot be empty' }
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Name is too long (max 100 characters)' }
  }

  return { valid: true }
}

/**
 * Validate a contact tag
 */
export function validateTag(tag: string): ValidationResult {
  if (!tag || typeof tag !== 'string') {
    return { valid: false, error: 'Tag is required' }
  }

  const trimmed = tag.trim()
  if (trimmed.length === 0) {
    return { valid: false, error: 'Tag cannot be empty' }
  }

  if (trimmed.length > 32) {
    return { valid: false, error: 'Tag is too long (max 32 characters)' }
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Tag can only contain letters, numbers, underscores, and hyphens',
    }
  }

  return { valid: true }
}

// ============================================================================
// Hex Validation
// ============================================================================

/**
 * Check if a string is valid hex
 */
export function isValidHex(str: string): boolean {
  if (!str || typeof str !== 'string') return false
  const hex = str.startsWith('0x') ? str.slice(2) : str
  return /^[a-f0-9]*$/i.test(hex) && hex.length % 2 === 0
}

/**
 * Validate a hex string
 */
export function validateHex(
  hex: string,
  expectedLength?: number,
): ValidationResult {
  if (!hex || typeof hex !== 'string') {
    return { valid: false, error: 'Hex string is required' }
  }

  const cleaned = hex.startsWith('0x') ? hex.slice(2) : hex

  if (!/^[a-f0-9]*$/i.test(cleaned)) {
    return { valid: false, error: 'Invalid hex characters' }
  }

  if (cleaned.length % 2 !== 0) {
    return { valid: false, error: 'Hex string must have even length' }
  }

  if (expectedLength !== undefined && cleaned.length !== expectedLength * 2) {
    return {
      valid: false,
      error: `Expected ${expectedLength} bytes (${
        expectedLength * 2
      } hex characters)`,
    }
  }

  return { valid: true }
}

// ============================================================================
// Public Key Validation
// ============================================================================

/**
 * Validate a public key (33 bytes compressed or 65 bytes uncompressed)
 */
export function validatePublicKey(pubkey: string): ValidationResult {
  const result = validateHex(pubkey)
  if (!result.valid) return result

  const cleaned = pubkey.startsWith('0x') ? pubkey.slice(2) : pubkey
  const bytes = cleaned.length / 2

  if (bytes !== 33 && bytes !== 65) {
    return {
      valid: false,
      error:
        'Public key must be 33 bytes (compressed) or 65 bytes (uncompressed)',
    }
  }

  // Check prefix for compressed keys
  if (bytes === 33) {
    const prefix = cleaned.slice(0, 2)
    if (prefix !== '02' && prefix !== '03') {
      return { valid: false, error: 'Invalid compressed public key prefix' }
    }
  }

  // Check prefix for uncompressed keys
  if (bytes === 65) {
    const prefix = cleaned.slice(0, 2)
    if (prefix !== '04') {
      return { valid: false, error: 'Invalid uncompressed public key prefix' }
    }
  }

  return { valid: true }
}
