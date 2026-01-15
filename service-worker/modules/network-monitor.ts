/**
 * Network Monitor Module for Service Worker
 *
 * Provides background monitoring of wallet addresses via Chronik REST API polling.
 * Used when the main app is backgrounded and WebSocket connection may be suspended.
 */
import { ChronikClient } from 'chronik-client'
import type { Utxo } from 'chronik-client'

/**
 * Network Monitor Class
 *
 * Monitors wallet addresses for UTXO changes using Chronik REST API polling.
 * This class is designed for use in a Service Worker context where WebSocket
 * connections may be suspended when the browser tab is backgrounded.
 *
 * Features:
 * - Adaptive polling intervals based on wallet activity state
 * - Automatic detection of new and spent UTXOs
 * - Client notification via Service Worker messaging API
 * - Configurable retry logic for network failures
 *
 * Polling Intervals:
 * - 10s when pending transactions exist
 * - 15s when active signing sessions exist
 * - 20s when recently backgrounded (first 2 minutes)
 * - 60s default polling interval
 *
 * @example
 * ```typescript
 * const monitor = new NetworkMonitor()
 *
 * // Configure with network settings
 * monitor.configure({
 *   chronikUrl: 'https://chronik.example.com',
 *   pollingInterval: 60000,
 *   addresses: ['address1', 'address2'],
 *   scriptType: 'p2pkh',
 *   scriptPayload: 'abc123...'
 * })
 *
 * // Start monitoring
 * monitor.startPolling()
 *
 * // Update state flags to adjust polling frequency
 * monitor.setPendingTransactions(true)
 * monitor.setActiveSigningSessions(true)
 *
 * // Stop when no longer needed
 * monitor.stopPolling()
 * ```
 *
 * @see {@link NetworkMonitorConfig} for configuration options
 * @see {@link SessionMonitor} for related session monitoring functionality
 */
export class NetworkMonitor {
  private chronik: ChronikClient | null = null
  private config: NetworkMonitorConfig | null = null
  private lastKnownUtxos: Map<string, Set<string>> = new Map()
  private pollingTimer: ReturnType<typeof setInterval> | null = null
  private hasPendingTransactions = false
  private hasActiveSigningSessions = false
  private recentlyBackgrounded = false
  private recentlyBackgroundedTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Configure the network monitor
   */
  configure(config: NetworkMonitorConfig): void {
    this.config = config
    console.log('[NetworkMonitor] Configured with:', {
      chronikUrl: config.chronikUrl,
      addresses: config.addresses.length,
      pollingInterval: config.pollingInterval,
    })
    this.chronik = new ChronikClient(config.chronikUrl)
    console.log('[NetworkMonitor] Chronik client initialized')
  }

  /**
   * Start polling for changes
   */
  startPolling(): void {
    if (!this.config) {
      console.warn('[NetworkMonitor] Cannot start polling - not configured')
      return
    }

    // Clear any existing timer
    this.stopPolling()

    // Start polling
    this.pollingTimer = setInterval(
      () => this.checkForChanges(),
      this.getPollingInterval(),
    )

    console.log(
      `[NetworkMonitor] Started polling every ${this.getPollingInterval()}ms`,
    )

    // Do an immediate check
    this.checkForChanges()
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
      console.log('[NetworkMonitor] Stopped polling')
    }
  }

  /**
   * Update the list of addresses to monitor
   */
  updateAddresses(addresses: string[]): void {
    if (this.config) {
      this.config.addresses = addresses
      console.log(`[NetworkMonitor] Updated addresses: ${addresses.length}`)
    }
  }

  /**
   * Update script payload (for single-address wallets)
   */
  updateScriptPayload(
    scriptPayload: string,
    scriptType: 'p2pkh' | 'p2tr-commitment',
  ): void {
    if (this.config) {
      this.config.scriptPayload = scriptPayload
      this.config.scriptType = scriptType
      // Clear cached UTXOs since script changed
      this.lastKnownUtxos.clear()
      console.log(`[NetworkMonitor] Updated script payload`)
    }
  }

  /**
   * Set pending transaction flag (increases polling frequency)
   */
  setPendingTransactions(hasPending: boolean): void {
    this.hasPendingTransactions = hasPending
    this.updatePollingInterval()
  }

  /**
   * Set active signing sessions flag (increases polling frequency)
   */
  setActiveSigningSessions(hasActive: boolean): void {
    this.hasActiveSigningSessions = hasActive
    this.updatePollingInterval()
  }

  /**
   * Mark as recently backgrounded (temporarily increases polling frequency)
   */
  markRecentlyBackgrounded(): void {
    this.recentlyBackgrounded = true
    this.updatePollingInterval()

    // Clear the flag after 2 minutes
    if (this.recentlyBackgroundedTimer) {
      clearTimeout(this.recentlyBackgroundedTimer)
    }
    this.recentlyBackgroundedTimer = setTimeout(() => {
      this.recentlyBackgrounded = false
      this.updatePollingInterval()
    }, 120_000)
  }

  /**
   * Get adaptive polling interval based on current state
   */
  private getPollingInterval(): number {
    if (this.hasPendingTransactions) return 10_000 // 10s
    if (this.hasActiveSigningSessions) return 15_000 // 15s
    if (this.recentlyBackgrounded) return 20_000 // 20s
    return this.config?.pollingInterval ?? 60_000 // 1 minute default
  }

  /**
   * Update polling interval if timer is running
   */
  private updatePollingInterval(): void {
    if (this.pollingTimer) {
      this.stopPolling()
      this.startPolling()
    }
  }

  /**
   * Check for UTXO changes
   */
  private async checkForChanges(): Promise<void> {
    if (!this.config) return

    try {
      const utxos = await this.fetchUtxos()
      const currentUtxoIds = new Set(utxos.map(u => `${u.txid}_${u.outIdx}`))
      const previousUtxoIds =
        this.lastKnownUtxos.get(this.config.scriptPayload) || new Set()

      // Detect new UTXOs (incoming transactions)
      const newUtxoIds = [...currentUtxoIds].filter(
        id => !previousUtxoIds.has(id),
      )

      // Detect removed UTXOs (spent - outgoing transactions)
      const removedUtxoIds = [...previousUtxoIds].filter(
        id => !currentUtxoIds.has(id),
      )

      if (newUtxoIds.length > 0 || removedUtxoIds.length > 0) {
        console.log('[NetworkMonitor] Changes detected:', {
          new: newUtxoIds.length,
          removed: removedUtxoIds.length,
        })

        // Notify clients of balance change
        this.notifyClients({
          type: 'BALANCE_CHANGED',
          payload: {
            address: this.config.scriptPayload,
            utxos: utxos.map(u => ({
              txid: u.txid,
              outIdx: u.outIdx,
              value: u.value,
            })),
          },
        })

        // Notify for each new UTXO (incoming transaction)
        for (const utxoId of newUtxoIds) {
          const utxo = utxos.find(u => `${u.txid}_${u.outIdx}` === utxoId)
          if (utxo) {
            this.notifyClients({
              type: 'TRANSACTION_DETECTED',
              payload: {
                txid: utxo.txid,
                address: this.config.scriptPayload,
                amount: utxo.value,
                isIncoming: true,
                timestamp: Date.now(),
              },
            })
          }
        }

        // Update cached state
        this.lastKnownUtxos.set(this.config.scriptPayload, currentUtxoIds)
      }
    } catch (error) {
      console.error('[NetworkMonitor] Error checking for changes:', error)
    }
  }

  /**
   * Fetch UTXOs from Chronik REST API
   */
  private async fetchUtxos(): Promise<NetworkMonitorUtxoInfo[]> {
    if (!this.config) return []

    const { scriptType, scriptPayload } = this.config

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      try {
        const response = await this.chronik
          ?.script(scriptType, scriptPayload)
          .utxos()
        clearTimeout(timeoutId)

        if (!response) {
          throw new Error(
            `[NetworkMonitor] No UTXOs response received for script ${scriptPayload}`,
          )
        }

        // Type guard for the first element
        const firstScript = response[0]
        if (!firstScript || !Array.isArray(firstScript.utxos)) {
          return []
        }

        return firstScript.utxos.map((utxo: Utxo) => ({
          txid: utxo.outpoint?.txid ?? '',
          outIdx: utxo.outpoint?.outIdx ?? 0,
          value: utxo.value ?? '0',
        }))
      } catch (error) {
        clearTimeout(timeoutId)

        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.warn(
              `[NetworkMonitor] Request timeout (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`,
            )
            lastError = new Error('Request timeout')
          } else {
            console.warn(
              `[NetworkMonitor] Fetch error (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}):`,
              error.message,
            )
            lastError = error
          }
        } else {
          lastError = new Error('Unknown error')
        }

        // Wait before retry (unless it's the last attempt)
        if (attempt < MAX_RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
        }
      }
    }

    // Return empty array if no UTXOs found or retry attempts failed
    return []
  }

  /**
   * Notify all clients of an event
   */
  private notifyClients(message: NetworkClientMessage): void {
    // In service worker context, use clients API
    if (typeof self !== 'undefined' && 'clients' in self) {
      const sw = self as unknown as ServiceWorkerGlobalScope
      sw.clients.matchAll({ type: 'window' }).then(clients => {
        for (const client of clients) {
          console.log(
            '[NetworkMonitor] Notifying client of new message:',
            message.type,
            client.id,
            message.type,
          )
          client.postMessage(message)
        }
      })
    }
    console.warn(
      '[NetworkMonitor] No clients to notify or unsupported context',
      self,
    )
  }

  /**
   * Initialize from stored state (if any)
   */
  initializeFromCache(scriptPayload: string, utxoIds: string[]): void {
    this.lastKnownUtxos.set(scriptPayload, new Set(utxoIds))
    console.log(
      `[NetworkMonitor] Initialized cache with ${utxoIds.length} UTXOs`,
    )
  }

  /**
   * Get current cached UTXO IDs for a script
   */
  getCachedUtxoIds(scriptPayload: string): string[] {
    const cached = this.lastKnownUtxos.get(scriptPayload)
    return cached ? [...cached] : []
  }

  /**
   * Check if monitor is currently polling
   */
  isPolling(): boolean {
    return this.pollingTimer !== null
  }

  /**
   * Get current configuration
   */
  getConfig(): NetworkMonitorConfig | null {
    return this.config
  }
}
