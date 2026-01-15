/**
 * Application Constants
 *
 * Centralized constants used throughout the application.
 * Import from here instead of defining magic numbers inline.
 */

// ============================================================================
// Lotus Network and Wallet Constants
// ============================================================================

/**
 * All network configurations
 */
export const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  livenet: {
    name: 'livenet',
    displayName: 'Mainnet',
    networkChar: '_',
    chronikUrl: 'https://chronik.lotusia.org',
    explorerUrl: 'https://lotusia.org/explorer',
    explorerApiUrl: 'https://lotusia.org/api/explorer',
    rankApiUrl: 'https://rank.lotusia.org/api/v1',
    color: 'primary',
    isProduction: true,
  },
  testnet: {
    name: 'testnet',
    displayName: 'Testnet',
    networkChar: 'T',
    chronikUrl: 'https://testnet.lotusia.org/chronik',
    explorerUrl: 'https://testnet.lotusia.org/explorer',
    explorerApiUrl: 'https://testnet.lotusia.org/api/explorer',
    rankApiUrl: 'https://rank.lotusia.org/api/v1',
    color: 'warning',
    isProduction: false,
  },
  /* regtest: {
    name: 'regtest',
    displayName: 'Regtest',
    networkChar: 'R',
    chronikUrl: 'http://localhost:8331',
    explorerUrl: '',
    explorerApiUrl: '',
    rankApiUrl: '',
    color: 'info',
    isProduction: false,
  }, */
}

/** Default network */
export const DEFAULT_NETWORK: NetworkType = 'livenet'

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

/**
 * Predefined account purposes following BIP44 account index convention
 */
export enum AccountPurpose {
  /** Primary wallet - receiving, sending, identity */
  PRIMARY = 0,
  /** MuSig2 signing - dedicated key for multi-sig */
  MUSIG2 = 1,
  /** Atomic swaps - future use */
  SWAP = 2,
  /** Privacy features - future use */
  PRIVACY = 3,
}

/**
 * User-friendly labels for UI display (no technical jargon)
 */
export const ACCOUNT_FRIENDLY_LABELS: Record<AccountPurpose, string> = {
  [AccountPurpose.PRIMARY]: 'Main Wallet',
  [AccountPurpose.MUSIG2]: 'Signing Key',
  [AccountPurpose.SWAP]: 'Swap Account',
  [AccountPurpose.PRIVACY]: 'Private Account',
}

/**
 * User-friendly descriptions for UI display
 */
export const ACCOUNT_DESCRIPTIONS: Record<AccountPurpose, string> = {
  [AccountPurpose.PRIMARY]: 'Your main address for sending and receiving',
  [AccountPurpose.MUSIG2]: 'Used for shared wallet participation',
  [AccountPurpose.SWAP]: 'For atomic swap transactions',
  [AccountPurpose.PRIVACY]: 'Enhanced privacy features',
}

/**
 * Default account configurations
 */
export const DEFAULT_ACCOUNTS: AccountConfig[] = [
  {
    purpose: AccountPurpose.PRIMARY,
    label: 'Primary Wallet',
    enabled: true,
    gapLimit: 0,
  },
  {
    purpose: AccountPurpose.MUSIG2,
    label: 'MuSig2 Signing',
    enabled: true,
    gapLimit: 0,
  },
]

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

/** Consensus-enforced maximum output amount (2.1B XPI) */
export const MAX_OUTPUT_AMOUNT = 2_100_000_000_1000_000n

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
// Network Monitor
// ============================================================================

/** Request timeout in milliseconds */
export const REQUEST_TIMEOUT_MS = 10_000

/** Maximum retry attempts for failed requests */
export const MAX_RETRY_ATTEMPTS = 3

/** Delay between retries in milliseconds */
export const RETRY_DELAY_MS = 1_000

// ============================================================================
// Feature Flags
// ============================================================================

/** Enable crypto worker for offloading crypto operations (experimental) */
export const USE_CRYPTO_WORKER = true
