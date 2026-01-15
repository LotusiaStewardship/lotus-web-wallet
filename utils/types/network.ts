/**
 * Network Types
 *
 * Type definitions for network configuration and selection.
 */

/**
 * Supported network types
 */
export type NetworkType = 'livenet' | 'testnet'

/**
 * Network configuration
 */
export interface NetworkConfig {
  /** Internal network name used by Bitcore */
  name: NetworkType
  /** Human-readable display name */
  displayName: string
  /** Network character used in XAddress encoding */
  networkChar: string
  /** Chronik server URL */
  chronikUrl: string
  /** Block explorer URL */
  explorerUrl: string
  /** Explorer API URL */
  explorerApiUrl: string
  /** Rank API URL */
  rankApiUrl: string
  /** UI color theme for this network */
  color: 'primary' | 'warning' | 'info'
  /** Whether this is a production network */
  isProduction: boolean
}

/**
 * Network store state
 */
export interface NetworkState {
  /** Currently selected network */
  currentNetwork: NetworkType
  /** Whether the store has been initialized */
  initialized: boolean
}
