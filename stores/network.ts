/**
 * Network Store
 * Manages network configuration and selection (mainnet, testnet, regtest)
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getItem, setItem, STORAGE_KEYS } from '~/utils/storage'

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

// State interface
export interface NetworkState {
  /** Currently selected network */
  currentNetwork: NetworkType
  /** Whether the store has been initialized */
  initialized: boolean
}

export const useNetworkStore = defineStore('network', () => {
  // === STATE ===
  const currentNetwork = ref<NetworkType>('livenet')
  const initialized = ref(false)

  // === GETTERS ===
  /**
   * Get the current network configuration
   */
  const config = computed((): NetworkConfig => {
    return NETWORK_CONFIGS[currentNetwork.value]
  })

  /**
   * Get the Chronik URL for current network
   */
  const chronikUrl = computed((): string => {
    return NETWORK_CONFIGS[currentNetwork.value].chronikUrl
  })

  /**
   * Get the Explorer URL for current network
   */
  const explorerUrl = computed((): string => {
    return NETWORK_CONFIGS[currentNetwork.value].explorerUrl
  })

  /**
   * Get the Explorer API URL for current network
   */
  const explorerApiUrl = computed((): string => {
    return NETWORK_CONFIGS[currentNetwork.value].explorerApiUrl
  })

  /**
   * Get the Rank API URL for current network
   */
  const rankApiUrl = computed((): string => {
    return NETWORK_CONFIGS[currentNetwork.value].rankApiUrl
  })

  /**
   * Check if current network is production (mainnet)
   */
  const isProduction = computed((): boolean => {
    return NETWORK_CONFIGS[currentNetwork.value].isProduction
  })

  /**
   * Check if current network is testnet
   */
  const isTestnet = computed((): boolean => {
    return currentNetwork.value === 'testnet'
  })

  /**
   * Get display name for current network
   */
  const displayName = computed((): string => {
    return NETWORK_CONFIGS[currentNetwork.value].displayName
  })

  /**
   * Get UI color for current network
   */
  const color = computed((): 'primary' | 'warning' | 'info' => {
    return NETWORK_CONFIGS[currentNetwork.value].color
  })

  /**
   * Get all available networks
   */
  const availableNetworks = computed((): NetworkConfig[] => {
    return Object.values(NETWORK_CONFIGS)
  })

  // === ACTIONS ===
  /**
   * Initialize the network store from storage service
   */
  function initialize() {
    if (initialized.value) return

    const saved = getItem<{ network: NetworkType }>(STORAGE_KEYS.NETWORK, {
      network: 'livenet',
    })
    if (saved.network && NETWORK_CONFIGS[saved.network]) {
      currentNetwork.value = saved.network
    }
    initialized.value = true
  }

  /**
   * Save network preference to storage service
   */
  function savePreference() {
    setItem(STORAGE_KEYS.NETWORK, { network: currentNetwork.value })
  }

  /**
   * Switch to a different network
   * Returns true if network was changed, false if already on that network
   */
  async function switchNetwork(network: NetworkType): Promise<boolean> {
    if (currentNetwork.value === network) {
      return false
    }

    if (!NETWORK_CONFIGS[network]) {
      throw new Error(`Invalid network: ${network}`)
    }

    currentNetwork.value = network
    savePreference()

    return true
  }

  /**
   * Get network type from an address string
   * Returns null if address format is not recognized
   */
  function getNetworkFromAddress(address: string): NetworkType | null {
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
  }

  /**
   * Check if an address matches the current network
   */
  function isAddressForCurrentNetwork(address: string): boolean {
    const addressNetwork = getNetworkFromAddress(address)
    return addressNetwork === currentNetwork.value
  }

  /**
   * Get network config by type
   */
  function getNetworkConfig(network: NetworkType): NetworkConfig {
    return NETWORK_CONFIGS[network]
  }

  // === RETURN ===
  return {
    // State
    currentNetwork,
    initialized,
    // Getters
    config,
    chronikUrl,
    explorerUrl,
    explorerApiUrl,
    rankApiUrl,
    isProduction,
    isTestnet,
    displayName,
    color,
    availableNetworks,
    // Actions
    initialize,
    savePreference,
    switchNetwork,
    getNetworkFromAddress,
    isAddressForCurrentNetwork,
    getNetworkConfig,
  }
})
