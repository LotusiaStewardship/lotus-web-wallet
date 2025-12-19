/**
 * P2P Initialization Plugin
 *
 * Loads P2P settings and auto-connects if enabled.
 * Runs after Bitcore plugin but before app mount.
 *
 * The `.client.ts` suffix ensures this only runs in the browser (SPA mode).
 */
import { ensureBitcore } from './bitcore.client'
import { useP2PStore } from '~/stores/p2p'

export default defineNuxtPlugin({
  name: 'p2p-init',
  async setup() {
    // Ensure Bitcore SDK is loaded first (P2P depends on it)
    await ensureBitcore()

    const p2pStore = useP2PStore()

    // Load P2P settings from storage first
    p2pStore.loadSettings()

    console.log('[P2P Plugin] Settings loaded:', {
      autoConnect: p2pStore.settings.autoConnect,
      enableDHT: p2pStore.settings.enableDHT,
      enableGossipSub: p2pStore.settings.enableGossipSub,
    })

    // Auto-connect if enabled
    if (p2pStore.settings.autoConnect) {
      console.log('[P2P Plugin] Auto-connect enabled, initializing P2P...')

      try {
        const bootstrapPeers = p2pStore.getEffectiveBootstrapPeers()

        await p2pStore.initialize({
          bootstrapNodes: bootstrapPeers,
          enableDHT: p2pStore.settings.enableDHT,
        })

        console.log('[P2P Plugin] P2P initialized successfully')
      } catch (error) {
        console.error('[P2P Plugin] Failed to auto-connect:', error)
      }
    } else {
      console.log('[P2P Plugin] Auto-connect disabled, skipping P2P init')
    }
  },
})
