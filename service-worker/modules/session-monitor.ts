/**
 * Session Monitor Module for Service Worker
 *
 * Tracks MuSig2 signing sessions and P2P presence sessions in the background.
 * Sends warnings before session expiry and notifications when sessions expire.
 */
export class SessionMonitor {
  private sessions: Map<string, SessionInfo> = new Map()
  private signingRequests: Map<string, SigningRequest> = new Map()
  private checkInterval: ReturnType<typeof setInterval> | null = null
  private presenceRefreshInterval: ReturnType<typeof setInterval> | null = null

  private readonly CHECK_INTERVAL_MS = 5_000 // Check every 5 seconds
  private readonly DEFAULT_WARNING_OFFSET_MS = 60_000 // 1 minute before expiry

  /**
   * Add a session to monitor
   */
  addSession(session: SessionInfo): void {
    this.sessions.set(session.id, {
      ...session,
      warningSent: false,
    })
    this.ensureMonitoring()
    console.log(
      `[SessionMonitor] Added session: ${session.id} (${session.type})`,
    )
  }

  /**
   * Remove a session from monitoring
   */
  removeSession(id: string): void {
    this.sessions.delete(id)
    console.log(`[SessionMonitor] Removed session: ${id}`)

    if (this.sessions.size === 0 && this.signingRequests.size === 0) {
      this.stopMonitoring()
    }
  }

  /**
   * Add a signing request to track
   */
  addSigningRequest(request: SigningRequest): void {
    this.signingRequests.set(request.id, request)
    this.ensureMonitoring()

    // Notify clients of new request
    this.notifyClients({
      type: 'SIGNING_REQUEST_RECEIVED',
      payload: request,
    })

    console.log(`[SessionMonitor] Added signing request: ${request.id}`)
  }

  /**
   * Update signing request status
   */
  updateSigningRequestStatus(
    requestId: string,
    status: SigningRequest['status'],
  ): void {
    const request = this.signingRequests.get(requestId)
    if (request) {
      request.status = status
      if (status !== 'pending') {
        // Remove non-pending requests after a short delay
        setTimeout(() => {
          this.signingRequests.delete(requestId)
        }, 5000)
      }
    }
  }

  /**
   * Get all pending signing requests
   */
  getPendingRequests(): SigningRequest[] {
    return Array.from(this.signingRequests.values()).filter(
      r => r.status === 'pending',
    )
  }

  /**
   * Start presence refresh signaling
   */
  startPresenceRefresh(intervalMs: number = 30_000): void {
    this.stopPresenceRefresh()

    this.presenceRefreshInterval = setInterval(() => {
      this.notifyClients({
        type: 'REFRESH_PRESENCE',
        payload: { timestamp: Date.now() },
      })
    }, intervalMs)

    console.log(
      `[SessionMonitor] Started presence refresh every ${intervalMs}ms`,
    )
  }

  /**
   * Stop presence refresh signaling
   */
  stopPresenceRefresh(): void {
    if (this.presenceRefreshInterval) {
      clearInterval(this.presenceRefreshInterval)
      this.presenceRefreshInterval = null
      console.log('[SessionMonitor] Stopped presence refresh')
    }
  }

  /**
   * Get session by ID
   */
  getSession(id: string): SessionInfo | undefined {
    return this.sessions.get(id)
  }

  /**
   * Get all sessions
   */
  getAllSessions(): SessionInfo[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean {
    return this.checkInterval !== null
  }

  /**
   * Ensure monitoring is running
   */
  private ensureMonitoring(): void {
    if (!this.checkInterval) {
      this.startMonitoring()
    }
  }

  /**
   * Start the monitoring loop
   */
  private startMonitoring(): void {
    if (this.checkInterval) return

    this.checkInterval = setInterval(
      () => this.checkSessions(),
      this.CHECK_INTERVAL_MS,
    )

    console.log('[SessionMonitor] Started monitoring')
  }

  /**
   * Stop the monitoring loop
   */
  private stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
      console.log('[SessionMonitor] Stopped monitoring')
    }
  }

  /**
   * Check all sessions for expiry warnings and expirations
   */
  private checkSessions(): void {
    const now = Date.now()

    // Check sessions
    for (const [id, session] of this.sessions) {
      // Check for expiry warning
      if (now >= session.warningAt && !session.warningSent) {
        this.sendWarning(session)
        session.warningSent = true
      }

      // Check for expiry
      if (now >= session.expiresAt) {
        this.sendExpiry(session)
        this.sessions.delete(id)
      }
    }

    // Check signing requests
    for (const [id, request] of this.signingRequests) {
      if (request.status === 'pending' && now >= request.expiresAt) {
        request.status = 'expired'
        this.notifyClients({
          type: 'SIGNING_REQUEST_EXPIRED',
          payload: { requestId: id },
        })
        this.signingRequests.delete(id)
      }
    }

    // Stop monitoring if nothing left to track
    if (this.sessions.size === 0 && this.signingRequests.size === 0) {
      this.stopMonitoring()
    }
  }

  /**
   * Send expiry warning to clients
   */
  private sendWarning(session: SessionInfo): void {
    this.notifyClients({
      type: 'SESSION_EXPIRING',
      payload: {
        sessionId: session.id,
        sessionType: session.type,
        expiresIn: session.expiresAt - Date.now(),
      },
    })

    console.log(
      `[SessionMonitor] Warning sent for session: ${
        session.id
      } (expires in ${Math.round((session.expiresAt - Date.now()) / 1000)}s)`,
    )
  }

  /**
   * Send expiry notification to clients
   */
  private sendExpiry(session: SessionInfo): void {
    this.notifyClients({
      type: 'SESSION_EXPIRED',
      payload: {
        sessionId: session.id,
        sessionType: session.type,
      },
    })

    console.log(`[SessionMonitor] Session expired: ${session.id}`)
  }

  /**
   * Notify all clients of an event
   */
  private notifyClients(message: SessionClientMessage): void {
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
   * Cleanup all sessions and stop monitoring
   */
  cleanup(): void {
    this.sessions.clear()
    this.signingRequests.clear()
    this.stopMonitoring()
    this.stopPresenceRefresh()
    console.log('[SessionMonitor] Cleaned up')
  }
}
