/**
 * Network Store
 * Manages network configuration and selection (mainnet, testnet, regtest)
 */
import { defineStore } from 'pinia'

// Network types
//export type NetworkType = 'livenet' | 'testnet' | 'regtest'
export type NetworkType = 'livenet' | 'testnet'

// Network configuration interface
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

// Network configurations
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
    //rankApiUrl: 'https://testnet.lotusia.org/rank/api/v1',
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

// Storage key
const STORAGE_KEY = 'lotus-wallet-network'

// State interface
export interface NetworkState {
  /** Currently selected network */
  currentNetwork: NetworkType
  /** Whether the store has been initialized */
  initialized: boolean
}

export const useNetworkStore = defineStore('network', {
  state: (): NetworkState => ({
    currentNetwork: 'livenet',
    initialized: false,
  }),

  getters: {
    /**
     * Get the current network configuration
     */
    config: (state): NetworkConfig => {
      return NETWORK_CONFIGS[state.currentNetwork]
    },

    /**
     * Get the Chronik URL for current network
     */
    chronikUrl: (state): string => {
      return NETWORK_CONFIGS[state.currentNetwork].chronikUrl
    },

    /**
     * Get the Explorer URL for current network
     */
    explorerUrl: (state): string => {
      return NETWORK_CONFIGS[state.currentNetwork].explorerUrl
    },

    /**
     * Get the Explorer API URL for current network
     */
    explorerApiUrl: (state): string => {
      return NETWORK_CONFIGS[state.currentNetwork].explorerApiUrl
    },

    /**
     * Get the Rank API URL for current network
     */
    rankApiUrl: (state): string => {
      return NETWORK_CONFIGS[state.currentNetwork].rankApiUrl
    },

    /**
     * Check if current network is production (mainnet)
     */
    isProduction: (state): boolean => {
      return NETWORK_CONFIGS[state.currentNetwork].isProduction
    },

    /**
     * Check if current network is testnet
     */
    isTestnet: (state): boolean => {
      return state.currentNetwork === 'testnet'
    },

    /**
     * Check if current network is regtest
     */
    /* isRegtest: (state): boolean => {
      return state.currentNetwork === 'regtest'
    }, */

    /**
     * Get display name for current network
     */
    displayName: (state): string => {
      return NETWORK_CONFIGS[state.currentNetwork].displayName
    },

    /**
     * Get UI color for current network
     */
    color: (state): 'primary' | 'warning' | 'info' => {
      return NETWORK_CONFIGS[state.currentNetwork].color
    },

    /**
     * Get all available networks
     */
    availableNetworks: (): NetworkConfig[] => {
      return Object.values(NETWORK_CONFIGS)
    },
  },

  actions: {
    /**
     * Initialize the network store from localStorage
     */
    initialize() {
      if (this.initialized) return

      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (
            parsed.network &&
            NETWORK_CONFIGS[parsed.network as NetworkType]
          ) {
            this.currentNetwork = parsed.network as NetworkType
          }
        }
        this.initialized = true
      } catch (error) {
        console.error('Failed to load network preference:', error)
        this.currentNetwork = 'livenet'
        this.initialized = true
      }
    },

    /**
     * Save network preference to localStorage
     */
    savePreference() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ network: this.currentNetwork }),
        )
      } catch (error) {
        console.error('Failed to save network preference:', error)
      }
    },

    /**
     * Switch to a different network
     * Returns true if network was changed, false if already on that network
     */
    async switchNetwork(network: NetworkType): Promise<boolean> {
      if (this.currentNetwork === network) {
        return false
      }

      if (!NETWORK_CONFIGS[network]) {
        throw new Error(`Invalid network: ${network}`)
      }

      this.currentNetwork = network
      this.savePreference()

      return true
    },

    /**
     * Get network type from an address string
     * Returns null if address format is not recognized
     */
    getNetworkFromAddress(address: string): NetworkType | null {
      if (!address || typeof address !== 'string') return null
      if (!address.startsWith('lotus')) return null

      // Find network character (first uppercase or underscore after 'lotus')
      const networkCharMatch = address.slice(5).match(/^[_TR]/)
      if (!networkCharMatch) return null

      const networkChar = networkCharMatch[0]

      switch (networkChar) {
        case '_':
          return 'livenet'
        case 'T':
          return 'testnet'
        /* case 'R':
          return 'regtest' */
        default:
          return null
      }
    },

    /**
     * Check if an address matches the current network
     */
    isAddressForCurrentNetwork(address: string): boolean {
      const addressNetwork = this.getNetworkFromAddress(address)
      return addressNetwork === this.currentNetwork
    },

    /**
     * Get network config by type
     */
    getNetworkConfig(network: NetworkType): NetworkConfig {
      return NETWORK_CONFIGS[network]
    },
  },
})
