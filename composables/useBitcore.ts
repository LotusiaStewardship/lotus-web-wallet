/**
 * Bitcore SDK Composable
 *
 * Provides access to the Lotus SDK (Bitcore) throughout the application.
 * The SDK is initialized by the bitcore.client.ts plugin at app startup.
 *
 * Usage:
 *   const { Bitcore, isReady } = useBitcore()
 *
 *   // Bitcore is guaranteed to be available after plugin initialization
 *   const address = new Bitcore.XAddress(addressString)
 */
import type * as BitcoreTypes from 'lotus-sdk/lib/bitcore'
import {
  getBitcore,
  isBitcoreLoaded,
  ensureBitcore,
} from '~/plugins/bitcore.client'

/**
 * Composable for accessing the Bitcore SDK
 *
 * In most cases, the SDK will already be loaded by the plugin.
 * The `isReady` ref can be used for edge cases where you need to
 * wait for the SDK.
 */
export function useBitcore() {
  const nuxtApp = useNuxtApp()

  // Reactive state for SDK readiness
  const isReady = ref(isBitcoreLoaded())

  // Get SDK from plugin injection or module-level cache
  const Bitcore = computed<typeof BitcoreTypes | null>(() => {
    // Prefer plugin-provided instance
    if (nuxtApp.$bitcore) {
      return nuxtApp.$bitcore as typeof BitcoreTypes
    }
    // Fall back to module-level cache
    return getBitcore()
  })

  // Ensure SDK is loaded (for edge cases)
  const ensureLoaded = async (): Promise<typeof BitcoreTypes> => {
    const sdk = await ensureBitcore()
    isReady.value = true
    return sdk
  }

  // Watch for SDK availability
  if (!isReady.value) {
    ensureLoaded().then(() => {
      isReady.value = true
    })
  }

  return {
    /**
     * The Bitcore SDK instance
     * Will be null only during initial plugin loading (rare edge case)
     */
    Bitcore,

    /**
     * Whether the SDK is ready to use
     */
    isReady,

    /**
     * Ensure the SDK is loaded (returns promise)
     * Use this if you need to guarantee SDK availability
     */
    ensureLoaded,

    // Convenience exports for commonly used classes
    // These are getters that return the class from the SDK

    /**
     * XAddress class for Lotus address handling
     */
    XAddress: computed(() => Bitcore.value?.XAddress),

    /**
     * Address class (legacy, prefer XAddress)
     */
    Address: computed(() => Bitcore.value?.Address),

    /**
     * Script class for script operations
     */
    Script: computed(() => Bitcore.value?.Script),

    /**
     * Transaction class for building transactions
     */
    Transaction: computed(() => Bitcore.value?.Transaction),

    /**
     * PrivateKey class
     */
    PrivateKey: computed(() => Bitcore.value?.PrivateKey),

    /**
     * PublicKey class
     */
    PublicKey: computed(() => Bitcore.value?.PublicKey),

    /**
     * HDPrivateKey class for HD wallet derivation
     */
    HDPrivateKey: computed(() => Bitcore.value?.HDPrivateKey),

    /**
     * Mnemonic class for seed phrase handling
     */
    Mnemonic: computed(() => Bitcore.value?.Mnemonic),

    /**
     * Networks configuration
     */
    Networks: computed(() => Bitcore.value?.Networks),

    /**
     * Message class for signing/verifying messages
     */
    Message: computed(() => Bitcore.value?.Message),
  }
}

/**
 * Get the raw Bitcore SDK instance synchronously
 * Use this only when you're certain the SDK is loaded
 * (e.g., in event handlers after component mount)
 */
export function getBitcoreSync(): typeof BitcoreTypes | null {
  return getBitcore()
}

/**
 * Type-safe way to get the SDK, throws if not loaded
 */
export function requireBitcore(): typeof BitcoreTypes {
  const sdk = getBitcore()
  if (!sdk) {
    throw new Error(
      'Bitcore SDK not loaded. Ensure the bitcore plugin has initialized.',
    )
  }
  return sdk
}
