/**
 * Network Types
 *
 * Type definitions for network configuration and selection.
 */

// ============================================================================
// Network Types
// ============================================================================

/**
 * Supported network types
 */
export type NetworkType = 'livenet' | 'testnet'
// Future: | 'regtest'

// ============================================================================
// Network Configuration Types
// ============================================================================

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

// ============================================================================
// Network State Types
// ============================================================================

/**
 * Network store state
 */
export interface NetworkState {
  /** Currently selected network */
  currentNetwork: NetworkType
  /** Whether the store has been initialized */
  initialized: boolean
}

// ============================================================================
// Network Configurations
// ============================================================================

/**
 * All network configurations
 */
export const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  livenet: {
    name: 'livenet',
    displayName: 'Mainnet',
    networkChar: '_',
    chronikUrl: 'https://chronik.lotusia.org',
    explorerUrl: 'https://lotusia.org/explorer',
    explorerApiUrl: 'https://lotusia.org/api/explorer',
    rankApiUrl: 'https://rank.lotusia.org/api/v1',
    color: 'primary',
    isProduction: true,
  },
  testnet: {
    name: 'testnet',
    displayName: 'Testnet',
    networkChar: 'T',
    chronikUrl: 'https://testnet.lotusia.org/chronik',
    explorerUrl: 'https://testnet.lotusia.org/explorer',
    explorerApiUrl: 'https://testnet.lotusia.org/api/explorer',
    rankApiUrl: 'https://rank.lotusia.org/api/v1',
    color: 'warning',
    isProduction: false,
  },
  /* regtest: {
    name: 'regtest',
    displayName: 'Regtest',
    networkChar: 'R',
    chronikUrl: 'http://localhost:8331',
    explorerUrl: '',
    explorerApiUrl: '',
    rankApiUrl: '',
    color: 'info',
    isProduction: false,
  }, */
}

// ============================================================================
// Constants
// ============================================================================

/** Storage key for network preference */
export const NETWORK_STORAGE_KEY = 'lotus-wallet-network'

/** Default network */
export const DEFAULT_NETWORK: NetworkType = 'livenet'
