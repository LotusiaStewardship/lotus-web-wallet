/**
 * Bitcore SDK Plugin
 *
 * Initializes the Bitcore SDK from xpi-ts once at app startup and provides
 * it globally via Nuxt's provide/inject pattern.
 *
 * Uses static imports for clean, synchronous access to the SDK.
 * The SDK is loaded before any component renders, eliminating race conditions.
 *
 * The `.client.ts` suffix ensures this only runs in the browser (SPA mode).
 */
import { Bitcore } from 'xpi-ts'

/**
 * Get the Bitcore SDK instance synchronously
 */
export function getBitcore() {
  return Bitcore
}

/**
 * Check if the SDK is loaded (always true with static imports)
 */
export function isBitcoreLoaded(): boolean {
  return true
}

/**
 * Ensure the SDK is loaded
 * This is the primary way to access the SDK
 */
export async function ensureBitcore() {
  return Bitcore
}

// Nuxt plugin definition
export default defineNuxtPlugin({
  name: 'bitcore',
  setup() {
    console.log('[Bitcore Plugin] SDK loaded successfully')

    // Provide the SDK instance to the app
    return {
      provide: {
        bitcore: Bitcore,
      },
    }
  },
})
