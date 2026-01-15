/**
 * Crypto Worker Init Plugin (client-only)
 *
 * Moves the crypto worker initialization out of `app.vue` and runs it once
 * during client startup to warm the worker and ensure `isReady` state is set.
 * This mirrors the previous logic but centralizes bootstrapping in a plugin.
 */
export default defineNuxtPlugin({
  name: 'crypto-worker-init',
  dependsOn: ['crypto-worker'],
  setup: () => {
    /* if (!USE_CRYPTO_WORKER) {
      console.log('[CryptoInit] Feature flag disabled; skipping worker init')
      return
    } */

    if (typeof Worker === 'undefined') {
      console.log(
        '[CryptoInit] Web Workers not supported; skipping worker init',
      )
      return
    }

    try {
      const { $cryptoWorker } = useNuxtApp()

      // Init only if not ready - `init()` is idempotent
      if (!$cryptoWorker.isReady) {
        $cryptoWorker
          .init()
          .then(() => console.log('[CryptoInit] Crypto worker initialized'))
          .catch((err: unknown) =>
            console.error(
              '[CryptoInit] Failed to initialize crypto worker:',
              err,
            ),
          )
      }
    } catch (err) {
      console.error('[CryptoInit] Initialization failed:', err)
    }
  },
})
