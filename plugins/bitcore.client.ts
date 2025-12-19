/**
 * Bitcore SDK Plugin
 *
 * Initializes the Lotus SDK (Bitcore) once at app startup and provides
 * it globally via Nuxt's provide/inject pattern.
 *
 * This ensures the SDK is loaded before any component tries to use it,
 * eliminating race conditions and the need for workaround functions.
 *
 * The `.client.ts` suffix ensures this only runs in the browser (SPA mode).
 */
import type * as BitcoreTypes from 'lotus-sdk/lib/bitcore'

// SDK state - module-level singleton
let sdkInstance: typeof BitcoreTypes | null = null
let sdkLoading: Promise<typeof BitcoreTypes> | null = null

/**
 * Load the Bitcore SDK from lotus-sdk
 * Returns cached instance if already loaded
 */
async function loadBitcoreSDK(): Promise<typeof BitcoreTypes> {
  // Return cached instance
  if (sdkInstance) {
    return sdkInstance
  }

  // Return existing loading promise to prevent duplicate loads
  if (sdkLoading) {
    return sdkLoading
  }

  // Start loading
  sdkLoading = (async () => {
    const { Bitcore } = await import('lotus-sdk')
    sdkInstance = Bitcore as typeof BitcoreTypes
    return sdkInstance
  })()

  return sdkLoading
}

/**
 * Get the Bitcore SDK instance synchronously
 * Returns null if not yet loaded
 */
export function getBitcore(): typeof BitcoreTypes | null {
  return sdkInstance
}

/**
 * Check if the SDK is loaded
 */
export function isBitcoreLoaded(): boolean {
  return sdkInstance !== null
}

/**
 * Ensure the SDK is loaded, loading it if necessary
 * This is the primary way to access the SDK
 */
export async function ensureBitcore(): Promise<typeof BitcoreTypes> {
  return loadBitcoreSDK()
}

// Nuxt plugin definition
export default defineNuxtPlugin(async () => {
  // Load SDK during plugin initialization (before app renders)
  const Bitcore = await loadBitcoreSDK()

  console.log('[Bitcore Plugin] SDK loaded successfully')

  // Provide the SDK instance to the app
  return {
    provide: {
      bitcore: Bitcore,
    },
  }
})
