/**
 * Service Worker Plugin
 *
 * Initializes the service worker connection on app startup.
 * Only runs on the client side (.client.ts suffix).
 */
import { useServiceWorker } from '~/composables/useServiceWorker'

export default defineNuxtPlugin(() => {
  const { initialize, onMessage } = useServiceWorker()

  // Initialize service worker connection (non-blocking)
  // Don't await - let it initialize in the background
  initialize().catch(err => {
    console.warn('[SW Plugin] Service worker initialization failed:', err)
  })

  // Set up global message listener for SW events
  onMessage((event: MessageEvent) => {
    const { type, payload } = event.data || {}

    switch (type) {
      case 'BALANCE_CHANGED':
        console.log('[SW Event] Balance changed:', payload)
        // Will be handled by network monitor in Phase 3
        break

      case 'TRANSACTION_DETECTED':
        console.log('[SW Event] Transaction detected:', payload)
        // Will be handled by network monitor in Phase 3
        break

      case 'SESSION_EXPIRING':
        console.log('[SW Event] Session expiring:', payload)
        // Will be handled by session monitor in Phase 5
        break

      case 'SIGNING_REQUEST':
        console.log('[SW Event] Signing request:', payload)
        // Will be handled by signing flow in Phase 6
        break

      default:
        // Unknown or internal message type
        break
    }
  })
})
