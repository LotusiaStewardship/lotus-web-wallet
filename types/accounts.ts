/**
 * BIP44 Account Types
 *
 * Type definitions for multi-account architecture.
 * Supports multiple derived accounts from a single seed phrase.
 */

/**
 * Predefined account purposes following BIP44 account index convention
 */
export enum AccountPurpose {
  /** Primary wallet - receiving, sending, identity */
  PRIMARY = 0,
  /** MuSig2 signing - dedicated key for multi-sig */
  MUSIG2 = 1,
  /** Atomic swaps - future use */
  SWAP = 2,
  /** Privacy features - future use */
  PRIVACY = 3,
}

/**
 * User-friendly labels for UI display (no technical jargon)
 */
export const ACCOUNT_FRIENDLY_LABELS: Record<AccountPurpose, string> = {
  [AccountPurpose.PRIMARY]: 'Main Wallet',
  [AccountPurpose.MUSIG2]: 'Signing Key',
  [AccountPurpose.SWAP]: 'Swap Account',
  [AccountPurpose.PRIVACY]: 'Private Account',
}

/**
 * User-friendly descriptions for UI display
 */
export const ACCOUNT_DESCRIPTIONS: Record<AccountPurpose, string> = {
  [AccountPurpose.PRIMARY]: 'Your main address for sending and receiving',
  [AccountPurpose.MUSIG2]: 'Used for shared wallet participation',
  [AccountPurpose.SWAP]: 'For atomic swap transactions',
  [AccountPurpose.PRIVACY]: 'Enhanced privacy features',
}

/**
 * Configuration for a single account
 */
export interface AccountConfig {
  purpose: AccountPurpose
  label: string
  enabled: boolean
  gapLimit: number
}

/**
 * Default account configurations
 */
export const DEFAULT_ACCOUNTS: AccountConfig[] = [
  {
    purpose: AccountPurpose.PRIMARY,
    label: 'Primary Wallet',
    enabled: true,
    gapLimit: 0,
  },
  {
    purpose: AccountPurpose.MUSIG2,
    label: 'MuSig2 Signing',
    enabled: true,
    gapLimit: 0,
  },
]

/**
 * A single derived address/key pair
 */
export interface DerivedAddress {
  /** Address index within the account */
  index: number
  /** Whether this is a change address */
  isChange: boolean
  /** Full BIP44 derivation path */
  path: string
  /** Lotus address string */
  address: string
  /** Script payload for address matching */
  scriptPayload: string
  /** Compressed public key in hex format */
  publicKeyHex: string
}

/**
 * State for a single account
 */
export interface AccountState {
  /** Account purpose/type */
  purpose: AccountPurpose
  /** Whether this account is enabled */
  enabled: boolean
  /** Primary derived address for this account */
  primaryAddress: DerivedAddress | null
  /** All derived addresses (for gap limit support) */
  addresses: DerivedAddress[]
  /** Last used address index */
  lastUsedIndex: number
}

/**
 * BIP44 constants for Lotus
 */
export const BIP44 = {
  /** BIP44 purpose constant */
  PURPOSE: 44,
  /** Lotus coin type (registered) */
  COIN_TYPE: 10605,
} as const

/**
 * Build a BIP44 derivation path
 *
 * @param accountIndex - Account index (0 = PRIMARY, 1 = MUSIG2, etc.)
 * @param isChange - Whether this is a change address (internal chain)
 * @param addressIndex - Address index within the chain
 * @returns Full BIP44 derivation path string
 */
export function buildDerivationPath(
  accountIndex: number,
  isChange: boolean = false,
  addressIndex: number = 0,
): string {
  const change = isChange ? 1 : 0
  return `m/${BIP44.PURPOSE}'/${BIP44.COIN_TYPE}'/${accountIndex}'/${change}/${addressIndex}`
}

/**
 * Get the derivation path for a specific account purpose
 *
 * @param purpose - Account purpose enum value
 * @param isChange - Whether this is a change address
 * @param addressIndex - Address index within the chain
 * @returns Full BIP44 derivation path string
 */
export function getAccountPath(
  purpose: AccountPurpose,
  isChange: boolean = false,
  addressIndex: number = 0,
): string {
  return buildDerivationPath(purpose, isChange, addressIndex)
}
