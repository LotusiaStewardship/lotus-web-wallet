/**
 * Lotus DHT Bootstrap Server
 *
 * Production-ready bootstrap node for the Lotus P2P/DHT network.
 * Uses the lotus-sdk core P2P modules with SQLite for persistent storage.
 *
 * Features:
 * - DHT server mode for peer discovery and routing
 * - GossipSub relay for pub/sub message forwarding
 * - Circuit Relay v2 server for NAT traversal
 * - SQLite storage for peer history and DHT records
 * - Comprehensive event logging and statistics
 */

import { P2P } from 'lotus-sdk'
import { privateKeyFromRaw } from '@libp2p/crypto/keys'
import { config } from 'dotenv'
import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

// ============================================================================
// Configuration
// ============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const DB_PATH = join(DATA_DIR, 'lotus-dht.db')

const LISTEN_PORT = 6969
const STATS_INTERVAL_MS = 60_000 // 1 minute
const PEER_EXCHANGE_INTERVAL_MS = 10_000 // 10 seconds - broadcast peer list

// GossipSub topics to relay
// CRITICAL: These must match the SDK's DHTAdvertiser/DHTDiscoverer topic naming convention
// The SDK uses: lotus/discovery/{protocol} for discovery advertisements
// Old topics (musig2:signers:*) were incorrect and caused message propagation failures
const GOSSIPSUB_TOPICS = [
  // Discovery layer topics (used by DHTAdvertiser/DHTDiscoverer)
  'lotus/discovery/musig2', // MuSig2 signer advertisements
  'lotus/discovery/musig2-request', // MuSig2 signing requests
  'lotus/discovery/wallet-presence', // Wallet presence advertisements
  // Legacy topics (keep for backward compatibility during transition)
  'musig2:signers:spend',
  'musig2:signers:swap',
  'musig2:signers:stake',
  'musig2:signers:vote',
  'musig2:signing-requests',
  // Wallet presence topic (used by p2p store directly)
  'wallet-presence',
  // Peer exchange topic - bootstrap broadcasts connected peers for mesh formation
  'lotus/peers',
]

// ============================================================================
// Database Schema & Storage Interface
// ============================================================================

interface PeerRecord {
  peer_id: string
  first_seen: number
  last_seen: number
  connection_count: number
  multiaddrs: string // JSON array
}

interface DHTRecord {
  key: string
  value: string // JSON
  creator_peer_id: string
  created_at: number
  expires_at: number | null
}

interface TopicStats {
  topic: string
  message_count: number
  last_message_at: number
}

class StorageManager {
  private db: Database.Database

  constructor(dbPath: string) {
    // Ensure data directory exists
    const dir = dirname(dbPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')

    this.initSchema()
  }

  private initSchema(): void {
    // Peers table - tracks peer connection history
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS peers (
        peer_id TEXT PRIMARY KEY,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        connection_count INTEGER DEFAULT 1,
        multiaddrs TEXT DEFAULT '[]'
      )
    `)

    // DHT records table - caches DHT key-value pairs
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dht_records (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        creator_peer_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER
      )
    `)

    // Topic stats table - tracks GossipSub activity
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS topic_stats (
        topic TEXT PRIMARY KEY,
        message_count INTEGER DEFAULT 0,
        last_message_at INTEGER
      )
    `)

    // Create indexes for common queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_peers_last_seen ON peers(last_seen);
      CREATE INDEX IF NOT EXISTS idx_dht_expires ON dht_records(expires_at);
      CREATE INDEX IF NOT EXISTS idx_dht_creator ON dht_records(creator_peer_id);
    `)

    console.log('📦 Database schema initialized')
  }

  // -------------------------------------------------------------------------
  // Peer Management
  // -------------------------------------------------------------------------

  recordPeerConnection(peerId: string, multiaddrs: string[]): void {
    const now = Date.now()
    const stmt = this.db.prepare(`
      INSERT INTO peers (peer_id, first_seen, last_seen, connection_count, multiaddrs)
      VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(peer_id) DO UPDATE SET
        last_seen = excluded.last_seen,
        connection_count = connection_count + 1,
        multiaddrs = excluded.multiaddrs
    `)
    stmt.run(peerId, now, now, JSON.stringify(multiaddrs))
  }

  recordPeerDisconnection(peerId: string): void {
    const stmt = this.db.prepare(`
      UPDATE peers SET last_seen = ? WHERE peer_id = ?
    `)
    stmt.run(Date.now(), peerId)
  }

  getPeer(peerId: string): PeerRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM peers WHERE peer_id = ?')
    return stmt.get(peerId) as PeerRecord | undefined
  }

  getRecentPeers(limit: number = 100): PeerRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM peers ORDER BY last_seen DESC LIMIT ?
    `)
    return stmt.all(limit) as PeerRecord[]
  }

  getPeerCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM peers')
    const result = stmt.get() as { count: number }
    return result.count
  }

  getActivePeerCount(sinceMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - sinceMs
    const stmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM peers WHERE last_seen > ?',
    )
    const result = stmt.get(cutoff) as { count: number }
    return result.count
  }

  // -------------------------------------------------------------------------
  // DHT Record Management
  // -------------------------------------------------------------------------

  storeDHTRecord(
    key: string,
    value: unknown,
    creatorPeerId: string,
    expiresAt?: number,
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO dht_records (key, value, creator_peer_id, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        creator_peer_id = excluded.creator_peer_id,
        created_at = excluded.created_at,
        expires_at = excluded.expires_at
    `)
    stmt.run(
      key,
      JSON.stringify(value),
      creatorPeerId,
      Date.now(),
      expiresAt ?? null,
    )
  }

  getDHTRecord(key: string): DHTRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM dht_records WHERE key = ?')
    const record = stmt.get(key) as DHTRecord | undefined

    // Check expiration
    if (record?.expires_at && record.expires_at < Date.now()) {
      this.deleteDHTRecord(key)
      return undefined
    }

    return record
  }

  deleteDHTRecord(key: string): void {
    const stmt = this.db.prepare('DELETE FROM dht_records WHERE key = ?')
    stmt.run(key)
  }

  cleanupExpiredDHTRecords(): number {
    const stmt = this.db.prepare(
      'DELETE FROM dht_records WHERE expires_at IS NOT NULL AND expires_at < ?',
    )
    const result = stmt.run(Date.now())
    return result.changes
  }

  getDHTRecordCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM dht_records')
    const result = stmt.get() as { count: number }
    return result.count
  }

  // -------------------------------------------------------------------------
  // Topic Stats Management
  // -------------------------------------------------------------------------

  recordTopicMessage(topic: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO topic_stats (topic, message_count, last_message_at)
      VALUES (?, 1, ?)
      ON CONFLICT(topic) DO UPDATE SET
        message_count = message_count + 1,
        last_message_at = excluded.last_message_at
    `)
    stmt.run(topic, Date.now())
  }

  getTopicStats(): TopicStats[] {
    const stmt = this.db.prepare(
      'SELECT * FROM topic_stats ORDER BY message_count DESC',
    )
    return stmt.all() as TopicStats[]
  }

  // -------------------------------------------------------------------------
  // Cleanup & Maintenance
  // -------------------------------------------------------------------------

  vacuum(): void {
    this.db.exec('VACUUM')
  }

  close(): void {
    this.db.close()
  }
}

// ============================================================================
// Bootstrap Server
// ============================================================================

class LotusDHTServer {
  private coordinator: P2P.P2PCoordinator
  private storage: StorageManager
  private statsTimer?: NodeJS.Timeout
  private cleanupTimer?: NodeJS.Timeout
  private peerExchangeTimer?: NodeJS.Timeout
  private startTime: number = 0

  constructor() {
    // Load environment configuration
    const { P2P_PRIVATE_KEY_BASE64 } = config({ path: '.env' }).parsed ?? {}
    if (!P2P_PRIVATE_KEY_BASE64) {
      throw new Error('Missing P2P_PRIVATE_KEY_BASE64 in .env file')
    }

    // Initialize storage
    this.storage = new StorageManager(DB_PATH)

    // Create libp2p private key from base64-encoded raw key
    const privateKey = privateKeyFromRaw(
      Buffer.from(P2P_PRIVATE_KEY_BASE64, 'base64'),
    )

    // Initialize P2P coordinator with bootstrap node configuration
    this.coordinator = new P2P.P2PCoordinator({
      listen: [
        `/ip4/0.0.0.0/tcp/${LISTEN_PORT}`,
        `/ip4/0.0.0.0/tcp/${LISTEN_PORT + 1}/ws`,
      ],
      privateKey,
      // DHT Configuration
      enableDHT: true,
      enableDHTServer: true, // Act as DHT server for routing
      // GossipSub Configuration
      enableGossipSub: true,
      // Relay Configuration (NAT traversal)
      enableRelay: true,
      enableRelayServer: true, // Allow peers to relay through us
      // Disable client-side NAT features (we're a public server)
      enableAutoNAT: false,
      enableDCUTR: false,
      enableUPnP: false,
      // Security Configuration
      securityConfig: {
        disableRateLimiting: false, // Keep rate limiting enabled for production
      },
      // Connection limits
      connectionManager: {
        maxConnections: 200, // Higher limit for bootstrap node
      },
    })
  }

  async start(): Promise<void> {
    this.startTime = Date.now()

    console.log('🌸 Lotus DHT Bootstrap Server')
    console.log('━'.repeat(50))

    // Start P2P coordinator
    await this.coordinator.start()

    console.log(`✅ Server online`)
    console.log(`   📍 Port: ${LISTEN_PORT}`)
    console.log(`   🆔 PeerID: ${this.coordinator.peerId}`)
    console.log(`   📂 Database: ${DB_PATH}`)
    console.log('━'.repeat(50))

    // Setup event handlers
    this.setupEventHandlers()

    // Subscribe to GossipSub topics for relay
    await this.subscribeToTopics()

    // Start periodic tasks
    this.startPeriodicTasks()

    // Handle graceful shutdown
    this.setupShutdownHandlers()

    console.log('\n🚀 Bootstrap node ready for connections\n')
  }

  private setupEventHandlers(): void {
    // Peer connected
    this.coordinator.on(
      P2P.ConnectionEvent.CONNECTED,
      (peerInfo: P2P.PeerInfo) => {
        const peerId = peerInfo.peerId
        const multiaddrs = peerInfo.multiaddrs ?? []

        console.log(`✅ Peer connected: ${peerId}`)
        if (multiaddrs.length > 0) {
          multiaddrs.forEach(addr => console.log(`   📍 ${addr}`))
        }

        // Record in database
        this.storage.recordPeerConnection(peerId, multiaddrs)

        // Log current peer count
        this.logPeerCount()
      },
    )

    // Peer disconnected
    this.coordinator.on(
      P2P.ConnectionEvent.DISCONNECTED,
      (peerInfo: P2P.PeerInfo) => {
        console.log(`❌ Peer disconnected: ${peerInfo.peerId}`)

        // Update database
        this.storage.recordPeerDisconnection(peerInfo.peerId)

        // Log current peer count
        this.logPeerCount()
      },
    )

    // Peer discovered (via DHT or other mechanisms)
    this.coordinator.on(
      P2P.ConnectionEvent.DISCOVERED,
      (peerInfo: P2P.PeerInfo) => {
        console.log(`🔍 Peer discovered: ${peerInfo.peerId}`)
      },
    )

    // Peer updated (multiaddrs changed, etc.)
    this.coordinator.on(
      P2P.ConnectionEvent.UPDATED,
      (peerInfo: P2P.PeerInfo) => {
        console.log(`🔄 Peer updated: ${peerInfo.peerId}`)
        if (peerInfo.multiaddrs && peerInfo.multiaddrs.length > 0) {
          peerInfo.multiaddrs.forEach(addr => console.log(`   📍 ${addr}`))
        }
      },
    )

    // Resource announced to DHT
    this.coordinator.on(
      'resource:announced',
      (announcement: P2P.ResourceAnnouncement) => {
        console.log(
          `📢 Resource announced: ${announcement.resourceType}/${announcement.resourceId}`,
        )

        // Store in database
        this.storage.storeDHTRecord(
          `${announcement.resourceType}:${announcement.resourceId}`,
          announcement.data,
          announcement.creatorPeerId,
          announcement.expiresAt,
        )
      },
    )
  }

  private async subscribeToTopics(): Promise<void> {
    console.log('\n📡 Subscribing to GossipSub topics for relay...')

    for (const topic of GOSSIPSUB_TOPICS) {
      try {
        await this.coordinator.subscribeToTopic(
          topic,
          (message: Uint8Array) => {
            // Record message in stats
            this.storage.recordTopicMessage(topic)

            // Log relay activity (minimal output)
            console.log(`📨 Relayed ${message.length} bytes on ${topic}`)
          },
        )
        console.log(`   ✅ ${topic}`)
      } catch (error) {
        console.error(`   ❌ Failed to subscribe to ${topic}:`, error)
      }
    }

    console.log('')
  }

  private startPeriodicTasks(): void {
    // Stats logging
    this.statsTimer = setInterval(() => {
      this.printStats()
    }, STATS_INTERVAL_MS)

    // DHT record cleanup (every 5 minutes)
    this.cleanupTimer = setInterval(() => {
      const cleaned = this.storage.cleanupExpiredDHTRecords()
      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired DHT records`)
      }
    }, 5 * 60 * 1000)

    // Peer exchange - broadcast connected peer list for mesh formation
    // This enables wallets to discover each other through the bootstrap node
    this.peerExchangeTimer = setInterval(() => {
      this.broadcastPeerList()
    }, PEER_EXCHANGE_INTERVAL_MS)

    // Initial broadcast after a short delay
    setTimeout(() => this.broadcastPeerList(), 2000)
  }

  /**
   * Broadcast connected peer list via GossipSub
   * Enables wallets to discover each other through the bootstrap node
   */
  private async broadcastPeerList(): Promise<void> {
    try {
      const connectedPeers = this.coordinator.getConnectedPeers()

      // Only broadcast if we have peers
      if (connectedPeers.length === 0) return

      // Build peer list with relay addresses
      const peerList = connectedPeers.map(peer => ({
        peerId: peer.peerId,
        multiaddrs: peer.multiaddrs || [],
        // Include relay address through this bootstrap node
        relayAddr: this.buildRelayAddress(peer.peerId),
        lastSeen: peer.lastSeen || Date.now(),
      }))

      const message = {
        type: 'peer-exchange',
        bootstrapPeerId: this.coordinator.peerId,
        peers: peerList,
        timestamp: Date.now(),
      }

      await this.coordinator.publishToTopic('lotus/peers', message)

      // Only log occasionally to avoid spam
      if (Math.random() < 0.1) {
        console.log(`🔄 Broadcast peer list: ${peerList.length} peers`)
      }
    } catch (error) {
      // Silently ignore - this is best-effort
      console.debug('[PeerExchange] Broadcast failed:', error)
    }
  }

  /**
   * Build a relay circuit address for a peer through this bootstrap node
   */
  private buildRelayAddress(peerId: string): string {
    const myAddrs = this.coordinator.getStats().multiaddrs
    // Find a public address (prefer WebSocket for browser compatibility)
    const wsAddr = myAddrs.find(a => a.includes('/ws'))
    const tcpAddr = myAddrs.find(a => a.includes('/tcp/') && !a.includes('/ws'))
    const baseAddr = wsAddr || tcpAddr || myAddrs[0]

    if (!baseAddr) return ''

    // Construct relay circuit address
    return `${baseAddr}/p2p/${this.coordinator.peerId}/p2p-circuit/p2p/${peerId}`
  }

  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n⏹️  Received ${signal}, shutting down...`)

      // Clear timers
      if (this.statsTimer) clearInterval(this.statsTimer)
      if (this.cleanupTimer) clearInterval(this.cleanupTimer)
      if (this.peerExchangeTimer) clearInterval(this.peerExchangeTimer)

      // Stop coordinator
      await this.coordinator.stop()

      // Close database
      this.storage.close()

      console.log('👋 Goodbye!')
      process.exit(0)
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))
  }

  private logPeerCount(): void {
    const peers = this.coordinator.getConnectedPeers()
    console.log(`   👥 Connected peers: ${peers.length}`)
  }

  private printStats(): void {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000)
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = uptime % 60

    const p2pStats = this.coordinator.getStats()
    const dhtStats = this.coordinator.getDHTStats()

    console.log('\n' + '═'.repeat(50))
    console.log('📊 SERVER STATISTICS')
    console.log('═'.repeat(50))

    // Uptime
    console.log(`⏱️  Uptime: ${hours}h ${minutes}m ${seconds}s`)

    // P2P Stats
    console.log(`\n🔗 P2P Network:`)
    console.log(`   Connected peers: ${p2pStats.peers.connected}`)
    console.log(`   Multiaddrs: ${p2pStats.multiaddrs.length}`)

    // DHT Stats
    console.log(`\n🗂️  DHT:`)
    console.log(`   Mode: ${dhtStats.mode}`)
    console.log(`   Routing table: ${dhtStats.routingTableSize} peers`)
    console.log(`   Ready: ${dhtStats.isReady ? 'Yes' : 'No'}`)
    console.log(`   Local records: ${p2pStats.dht.localRecords}`)

    // Database Stats
    console.log(`\n💾 Database:`)
    console.log(`   Total peers seen: ${this.storage.getPeerCount()}`)
    console.log(`   Active (24h): ${this.storage.getActivePeerCount()}`)
    console.log(`   DHT records: ${this.storage.getDHTRecordCount()}`)

    // Topic Stats
    const topicStats = this.storage.getTopicStats()
    if (topicStats.length > 0) {
      console.log(`\n📡 GossipSub Topics:`)
      for (const stat of topicStats) {
        const subscribers = this.coordinator.getTopicPeers(stat.topic).length
        console.log(
          `   ${stat.topic}: ${stat.message_count} msgs, ${subscribers} subscribers`,
        )
      }
    }

    // Current topic subscribers
    console.log(`\n👥 Current Topic Subscribers:`)
    for (const topic of GOSSIPSUB_TOPICS) {
      const subscribers = this.coordinator.getTopicPeers(topic)
      console.log(`   ${topic}: ${subscribers.length}`)
    }

    console.log('═'.repeat(50) + '\n')
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

const server = new LotusDHTServer()
await server.start()
