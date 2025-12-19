/**
 * Application Constants
 *
 * Centralized constants used throughout the application.
 * Import from here instead of defining magic numbers inline.
 */

// ============================================================================
// Lotus Network Constants
// ============================================================================

/** Number of decimal places for Lotus (XPI) */
export const LOTUS_DECIMALS = 6

/** Satoshis per XPI */
export const SATS_PER_XPI = 1_000_000

/** Dust threshold in satoshis */
export const DUST_THRESHOLD = 546n

/** Maximum transaction size in bytes */
export const MAX_TX_SIZE = 100_000

/** BIP44 purpose for HD derivation */
export const BIP44_PURPOSE = 44

/** BIP44 coin type for Lotus */
export const BIP44_COINTYPE = 10605

// ============================================================================
// Fee Constants
// ============================================================================

/** Default fee rate in sat/byte */
export const DEFAULT_FEE_RATE = 1

/** Minimum fee rate in sat/byte */
export const MIN_FEE_RATE = 1

/** Maximum fee rate in sat/byte */
export const MAX_FEE_RATE = 1000

// ============================================================================
// Transaction Size Estimates
// ============================================================================

/** Estimated size of a P2PKH input in bytes */
export const P2PKH_INPUT_SIZE = 148

/** Estimated size of a P2PKH output in bytes */
export const P2PKH_OUTPUT_SIZE = 34

/** Estimated size of a P2TR input in bytes */
export const P2TR_INPUT_SIZE = 58

/** Estimated size of a P2TR output in bytes */
export const P2TR_OUTPUT_SIZE = 43

/** Transaction overhead in bytes */
export const TX_OVERHEAD = 10

// ============================================================================
// Confirmation Constants
// ============================================================================

/** Coinbase maturity (blocks before coinbase can be spent) */
export const COINBASE_MATURITY = 100

/** Number of confirmations considered "confirmed" */
export const CONFIRMED_THRESHOLD = 1

/** Number of confirmations considered "secure" */
export const SECURE_THRESHOLD = 6

// ============================================================================
// UI Constants
// ============================================================================

/** Default toast duration in milliseconds */
export const DEFAULT_TOAST_DURATION = 5000

/** Maximum toasts to show at once */
export const MAX_TOASTS = 5

/** Mobile breakpoint in pixels */
export const MOBILE_BREAKPOINT = 768

/** Tablet breakpoint in pixels */
export const TABLET_BREAKPOINT = 1024

/** Maximum activity events to keep in P2P feed */
export const MAX_ACTIVITY_EVENTS = 50

// ============================================================================
// Storage Keys
// ============================================================================

// NOTE: Storage keys are defined in utils/storage.ts
// Import STORAGE_KEYS from '~/utils/storage' for all storage operations

// ============================================================================
// API Endpoints (defaults, can be overridden by network config)
// ============================================================================

export const DEFAULT_CHRONIK_URL = 'https://chronik.lotusia.org'
export const DEFAULT_EXPLORER_URL = 'https://lotusia.org/explorer'
export const DEFAULT_RANK_API_URL = 'https://rank.lotusia.org/api/v1'

// ============================================================================
// Timeouts and Intervals
// ============================================================================

/** Session timeout for MuSig2 (5 minutes) */
export const MUSIG2_SESSION_TIMEOUT = 5 * 60 * 1000

/** Request timeout for MuSig2 (2 minutes) */
export const MUSIG2_REQUEST_TIMEOUT = 2 * 60 * 1000

/** Presence TTL (1 hour) */
export const PRESENCE_TTL = 60 * 60 * 1000

/** Balance refresh interval (30 seconds) */
export const BALANCE_REFRESH_INTERVAL = 30 * 1000

/** History refresh interval (60 seconds) */
export const HISTORY_REFRESH_INTERVAL = 60 * 1000

// ============================================================================
// Limits
// ============================================================================

/** Maximum contacts allowed */
export const MAX_CONTACTS = 1000

/** Maximum tags per contact */
export const MAX_TAGS_PER_CONTACT = 10

/** Maximum tag length */
export const MAX_TAG_LENGTH = 32

/** Maximum recipients per transaction */
export const MAX_RECIPIENTS = 100

/** Maximum concurrent MuSig2 sessions */
export const MAX_CONCURRENT_SESSIONS = 5

/** Maximum transaction history items to display */
export const MAX_HISTORY_DISPLAY = 100

// ============================================================================
// Address Prefixes
// ============================================================================

/** Lotus address prefix */
export const LOTUS_PREFIX = 'lotus'

/** Mainnet network character */
export const MAINNET_CHAR = '_'

/** Testnet network character */
export const TESTNET_CHAR = 'T'

/** Regtest network character */
export const REGTEST_CHAR = 'R'

/** Payment URI scheme prefix (BIP21-style) */
export const PAYMENT_URI_SCHEME = 'sendto'

// ============================================================================
// Feature Flags
// ============================================================================

/** Enable crypto worker for offloading crypto operations (experimental) */
export const USE_CRYPTO_WORKER = true
