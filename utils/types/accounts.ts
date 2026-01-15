/**
 * Account Types and Configuration
 *
 * Type definitions for multi-account wallet architecture following BIP44 standards.
 * Supports multiple derived accounts from a single seed phrase, each with
 * dedicated purposes (primary wallet, MuSig2 signing, swaps, privacy).
 */

/**
 * Configuration for a single account within the wallet.
 * Defines how an account should behave and be displayed to the user.
 */
export interface AccountConfig {
  /**
   * The purpose/type of this account, determining its derivation path
   * and intended use case (e.g., PRIMARY for main wallet, MUSIG2 for signing)
   */
  purpose: AccountPurpose

  /**
   * Human-readable label for display in the UI.
   * Can be customized by the user to identify the account.
   */
  label: string

  /**
   * Whether this account is active and should be monitored.
   * Disabled accounts are not scanned for transactions or included in balance totals.
   */
  enabled: boolean

  /**
   * Number of consecutive unused addresses to scan before stopping.
   * Following BIP44 gap limit recommendations. A value of 0 means
   * only the primary address is used (no gap limit scanning).
   */
  gapLimit: number
}

/**
 * Represents a single derived address/key pair from an HD wallet.
 * Contains all information needed to receive funds and verify ownership.
 */
export interface DerivedAddress {
  /**
   * The address index within the account's derivation chain.
   * Used in the BIP44 path: m/44'/10605'/account'/change/index
   */
  index: number

  /**
   * Indicates whether this is a change address (internal chain).
   * - false (0): External chain - for receiving payments
   * - true (1): Internal chain - for transaction change outputs
   */
  isChange: boolean

  /**
   * Full BIP44 derivation path used to derive this address.
   * Format: m/44'/10605'/account'/change/index
   * Example: m/44'/10605'/0'/0/0 for first external address of primary account
   */
  path: string

  /**
   * The Lotus address string in human-readable format.
   * Used for receiving funds and displaying to users.
   * Example: lotus_16PSJLk9W4p...
   */
  address: string

  /**
   * Script payload (hash) used for matching UTXOs to this address.
   * Derived from the public key and used in transaction scripts.
   */
  scriptPayload: string

  /**
   * Compressed public key in hexadecimal format (33 bytes / 66 hex chars).
   * Used for signature verification and identity purposes.
   * Starts with 02 or 03 depending on the y-coordinate parity.
   */
  publicKeyHex: string
}

/**
 * Runtime state for a single account within the wallet.
 * Tracks derived addresses and usage information for transaction monitoring.
 */
export interface AccountState {
  /**
   * The purpose/type identifier for this account.
   * Determines the account index in the BIP44 derivation path.
   */
  purpose: AccountPurpose

  /**
   * Whether this account is currently active and being monitored.
   * Mirrors the enabled flag from AccountConfig but may differ during runtime.
   */
  enabled: boolean

  /**
   * The primary (first) derived address for this account.
   * This is the main address displayed to users for receiving funds.
   * Null if the account has not been initialized or derivation failed.
   */
  primaryAddress: DerivedAddress | null

  /**
   * Collection of all derived addresses for this account.
   * Includes both external (receiving) and internal (change) addresses.
   * Size depends on gap limit settings and address discovery.
   */
  addresses: DerivedAddress[]

  /**
   * The highest address index that has received transactions.
   * Used for gap limit calculations and address discovery.
   * -1 indicates no addresses have been used yet.
   */
  lastUsedIndex: number
}
