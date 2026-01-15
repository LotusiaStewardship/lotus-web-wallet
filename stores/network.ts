/**
 * Network Store
 * Manages network configuration and selection (mainnet, testnet, regtest)
 */
import { defineStore } from 'pinia'
import type { Address, NetworkName } from 'xpi-ts/lib/bitcore'

export const useNetworkStore = defineStore('network', () => {
  // Import Bitcore plugin
  const { $bitcore } = useNuxtApp()

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
  function getNetworkFromAddress(
    address: string | Address,
  ): NetworkName | null {
    if (!$bitcore.Address.isValid(address)) return null

    if (typeof address === 'string') {
      address = $bitcore.Address.fromString(address)
    }

    return address.network.name
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
