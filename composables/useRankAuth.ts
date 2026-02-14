/**
 * RANK API Authentication Composable
 *
 * Implements the BlockDataSig challenge-response authentication protocol
 * used by rank-backend-ts for authorized endpoints (wallet activity, etc.).
 *
 * Protocol:
 *   1. Client sends request with `Authorization: <base64(payload + ':::' + signature)>` header
 *   2. If server returns 401, parse `WWW-Authenticate: BlockDataSig blockhash=<hash> blockheight=<height>`
 *   3. Create payload: `{ instanceId, scriptPayload, blockhash, blockheight }`
 *   4. Sign payload with wallet private key using Message.sign()
 *   5. Retry request with new Authorization header
 *   6. Server caches auth for 420 blocks (~7 hours)
 *
 * Dependencies:
 *   - Wallet store: scriptPayload, signMessage, initialized
 *   - Network store: rankApiUrl
 */

import { useWalletStore } from '~/stores/wallet'
import { useNetworkStore } from '~/stores/network'

// ============================================================================
// Constants
// ============================================================================

/** PoW difficulty for instanceId generation (number of leading zero hex chars) */
const INSTANCE_ID_DIFFICULTY = 4

/** Delimiter between auth payload and signature in the Authorization header */
const AUTH_HEADER_DELIMITER = ':::'

/** localStorage key for persisted instance data */
const STORAGE_KEY_INSTANCE = 'rank-instance'

/** localStorage key for cached authorization header */
const STORAGE_KEY_AUTH_HEADER = 'rank-auth-header'

// ============================================================================
// Types
// ============================================================================

/** BlockDataSig challenge data from WWW-Authenticate header */
interface BlockDataSig {
  blockhash: string
  blockheight: string
}

/** Persisted instance identity (PoW-mined) */
interface RankInstance {
  instanceId: string
  runtimeId: string
  startTime: string
  nonce: number
}

/** Authorization payload sent to the server */
interface AuthorizationPayload {
  instanceId: string
  scriptPayload: string
  blockhash: string
  blockheight: string
}

// ============================================================================
// Helpers (module-level, not reactive)
// ============================================================================

/**
 * Parse the `WWW-Authenticate: BlockDataSig blockhash=<hash> blockheight=<height>` header
 */
function parseAuthenticateHeader(header: string): BlockDataSig | null {
  const match = header.match(
    /^BlockDataSig\s+blockhash=([a-f0-9]{64})\s+blockheight=(\d+)$/,
  )
  if (!match) return null
  return { blockhash: match[1], blockheight: match[2] }
}

/**
 * Encode a string to base64
 */
function toBase64(str: string): string {
  return btoa(str)
}

/**
 * Generate a PoW-mined instanceId (4 leading zero hex chars)
 * Uses crypto.subtle.digest for SHA-256 hashing
 */
async function mineInstanceId(runtimeId: string): Promise<RankInstance> {
  const leadingZeroes = ''.padStart(INSTANCE_ID_DIFFICULTY, '0')
  let nonce = 0
  const startTime = Date.now()

  while (true) {
    const data = new TextEncoder().encode(`${runtimeId}:${startTime}:${nonce}`)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const instanceId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    if (instanceId.substring(0, INSTANCE_ID_DIFFICULTY) === leadingZeroes) {
      return { instanceId, runtimeId, startTime: startTime.toString(), nonce }
    }
    nonce++
  }
}

// ============================================================================
// Composable
// ============================================================================

export const useRankAuth = () => {
  const walletStore = useWalletStore()
  const networkStore = useNetworkStore()

  /** Cached authorization header (in-memory for current session) */
  const authHeader = ref<string>('')

  /** Current instance identity */
  const instance = ref<RankInstance | null>(null)

  /** Whether the instance is being mined */
  const mining = ref(false)

  /**
   * Get the RANK API base URL
   */
  const getRankApiUrl = () => {
    return networkStore.rankApiUrl || 'https://rank.lotusia.org/api/v1'
  }

  /**
   * Load or generate the instance identity.
   * The instanceId is persisted in localStorage so it survives page reloads.
   */
  async function ensureInstance(): Promise<RankInstance> {
    // Return cached instance if available
    if (instance.value) return instance.value

    // Try loading from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INSTANCE)
      if (stored) {
        const parsed = JSON.parse(stored) as RankInstance
        if (parsed.instanceId && parsed.runtimeId && parsed.startTime && typeof parsed.nonce === 'number') {
          instance.value = parsed
          return parsed
        }
      }
    } catch {
      // Corrupted data, regenerate
    }

    // Mine a new instanceId
    mining.value = true
    try {
      // Use a stable runtimeId derived from the wallet's scriptPayload
      const runtimeId = walletStore.scriptPayload || crypto.randomUUID()
      const newInstance = await mineInstanceId(runtimeId)
      instance.value = newInstance
      localStorage.setItem(STORAGE_KEY_INSTANCE, JSON.stringify(newInstance))
      return newInstance
    } finally {
      mining.value = false
    }
  }

  /**
   * Load cached authorization header from localStorage
   */
  function loadCachedAuthHeader(): string {
    if (authHeader.value) return authHeader.value
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUTH_HEADER)
      if (stored) {
        authHeader.value = stored
        return stored
      }
    } catch {
      // Ignore
    }
    return ''
  }

  /**
   * Create a signed authorization header from a BlockDataSig challenge.
   *
   * @param challenge - The parsed BlockDataSig from the WWW-Authenticate header
   * @returns The base64-encoded authorization header value, or null on failure
   */
  async function createSignedAuthHeader(challenge: BlockDataSig): Promise<string | null> {
    const inst = await ensureInstance()
    if (!walletStore.initialized || !walletStore.scriptPayload) {
      console.error('[useRankAuth] Wallet not initialized')
      return null
    }

    // Build the authorization payload
    const payload: AuthorizationPayload = {
      instanceId: inst.instanceId,
      scriptPayload: walletStore.scriptPayload,
      blockhash: challenge.blockhash,
      blockheight: challenge.blockheight,
    }

    const payloadStr = JSON.stringify(payload)

    // Sign the payload using the wallet's private key
    try {
      const signature = walletStore.signMessage(payloadStr)
      const header = toBase64(payloadStr + AUTH_HEADER_DELIMITER + signature)

      // Cache the new header
      authHeader.value = header
      localStorage.setItem(STORAGE_KEY_AUTH_HEADER, header)

      return header
    } catch (err) {
      console.error('[useRankAuth] Failed to sign auth payload:', err)
      return null
    }
  }

  /**
   * Make an authenticated fetch request to the RANK API.
   *
   * Handles the full challenge-response flow:
   *   1. Try with cached auth header
   *   2. On 401, parse challenge and create new signed header
   *   3. Retry with new header
   *
   * @param url - Full URL to fetch
   * @param options - Standard fetch options (method, body, etc.)
   * @returns The Response object, or null on auth failure
   */
  async function authorizedFetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response | null> {
    const inst = await ensureInstance()
    if (!walletStore.initialized || !walletStore.scriptPayload) {
      console.error('[useRankAuth] Wallet not initialized for authenticated request')
      return null
    }

    // Ensure we have a cached auth header
    const cachedHeader = loadCachedAuthHeader()

    // First attempt with cached header
    const headers = new Headers(options.headers as HeadersInit)
    if (cachedHeader) {
      headers.set('Authorization', cachedHeader)
    }

    const response = await fetch(url, { ...options, headers })

    // If authorized, return the response
    if (response.status !== 401) {
      return response
    }

    // Handle 401: parse the BlockDataSig challenge
    const authenticateHeader = response.headers.get('www-authenticate')
    if (!authenticateHeader) {
      console.error('[useRankAuth] 401 response missing WWW-Authenticate header')
      return null
    }

    const challenge = parseAuthenticateHeader(authenticateHeader)
    if (!challenge) {
      console.error('[useRankAuth] Failed to parse WWW-Authenticate header:', authenticateHeader)
      return null
    }

    // Create a new signed auth header
    const newHeader = await createSignedAuthHeader(challenge)
    if (!newHeader) {
      return null
    }

    // Retry with the new auth header
    const retryHeaders = new Headers(options.headers as HeadersInit)
    retryHeaders.set('Authorization', newHeader)

    const retryResponse = await fetch(url, { ...options, headers: retryHeaders })

    if (retryResponse.status === 401) {
      console.error('[useRankAuth] Auth retry failed — still 401')
      return null
    }

    return retryResponse
  }

  /**
   * Get the instanceId (mining if necessary).
   * Useful for constructing URLs that require instanceId in the path.
   */
  async function getInstanceId(): Promise<string> {
    const inst = await ensureInstance()
    return inst.instanceId
  }

  /**
   * Clear cached auth data (e.g. on logout or network switch)
   */
  function clearAuth() {
    authHeader.value = ''
    instance.value = null
    localStorage.removeItem(STORAGE_KEY_AUTH_HEADER)
    localStorage.removeItem(STORAGE_KEY_INSTANCE)
  }

  return {
    authorizedFetch,
    getInstanceId,
    ensureInstance,
    clearAuth,
    mining,
  }
}
