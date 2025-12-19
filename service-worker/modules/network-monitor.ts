/**
 * Network Monitor Module for Service Worker
 *
 * Provides background monitoring of wallet addresses via Chronik REST API polling.
 * Used when the main app is backgrounded and WebSocket connection may be suspended.
 */

// ============================================================================
// Types
// ============================================================================

export interface NetworkMonitorConfig {
  chronikUrl: string
  pollingInterval: number // ms
  addresses: string[]
  scriptType: 'p2pkh' | 'p2tr-commitment'
  scriptPayload: string
}

export interface UtxoInfo {
  txid: string
  outIdx: number
  value: string
}

export interface TransactionDetectedPayload {
  txid: string
  address: string
  amount: string
  isIncoming: boolean
  timestamp: number
}

export interface BalanceChangedPayload {
  address: string
  utxos: UtxoInfo[]
}

type ClientMessage =
  | { type: 'BALANCE_CHANGED'; payload: BalanceChangedPayload }
  | { type: 'TRANSACTION_DETECTED'; payload: TransactionDetectedPayload }

// ============================================================================
// Network Monitor Class
// ============================================================================

export class NetworkMonitor {
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
  private async fetchUtxos(): Promise<
    Array<{ txid: string; outIdx: number; value: string }>
  > {
    if (!this.config) return []

    const { chronikUrl, scriptType, scriptPayload } = this.config
    const url = `${chronikUrl}/script/${scriptType}/${scriptPayload}/utxos`

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Chronik returns an array of script UTXOs, we want the first one's utxos
      if (!data || !Array.isArray(data) || data.length === 0) {
        return []
      }

      const scriptUtxos = data[0]?.utxos || []

      return scriptUtxos.map((utxo: any) => ({
        txid: utxo.outpoint?.txid || '',
        outIdx: utxo.outpoint?.outIdx || 0,
        value: utxo.value || '0',
      }))
    } catch (error) {
      console.error('[NetworkMonitor] Failed to fetch UTXOs:', error)
      return []
    }
  }

  /**
   * Notify all clients of an event
   */
  private notifyClients(message: ClientMessage): void {
    // In service worker context, use clients API
    if (typeof self !== 'undefined' && 'clients' in self) {
      const sw = self as unknown as ServiceWorkerGlobalScope
      sw.clients.matchAll({ type: 'window' }).then(clients => {
        for (const client of clients) {
          client.postMessage(message)
        }
      })
    }
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
