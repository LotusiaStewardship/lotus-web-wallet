# utils/AGENTS.md

Blueprint for coding agents working in the `utils/` directory of lotus-web-wallet.

---

## Purpose

The `utils/` directory contains **pure, framework-agnostic utility functions** used across the Lotus Web Wallet application. Every function here is deterministic, side-effect-free (unless explicitly documented), and independently testable.

These utilities serve as the foundational layer — composables, stores, and components import from here, but `utils/` never imports from them.

---

## Directory Organization

| File / Directory       | Responsibility                                                |
| ---------------------- | ------------------------------------------------------------- |
| `index.ts`             | Central type exports from `types/` subdirectory               |
| `accounts.ts`          | BIP44 derivation path building                                |
| `activity.ts`          | Activity feed display properties (icons, colors, titles)      |
| `cashweb/`             | CashAddr encoding utilities and protobuf definitions          |
| `constants.ts`         | Application-wide constants (network, fees, limits, timeouts)  |
| `feed.ts`              | RANK feed helpers (vote bucketing, controversy scoring)       |
| `formatting.ts`        | Number, XPI, address, time, and hex formatting                |
| `helpers.ts`           | General-purpose utilities (arrays, objects, async, errors)    |
| `identity.ts`          | Public key validation, address derivation, identity levels    |
| `sanitize.ts`          | Input sanitization (comment text, HTML escaping)              |
| `storage.ts`           | localStorage and IndexedDB abstraction with caching           |
| `terminology.ts`       | Technical-to-user-friendly term translation                   |
| `types.ts`             | Legacy cache state types (pending IndexedDB integration)      |
| `types/`               | TypeScript type definitions organized by domain               |
| `validation.ts`        | Address, amount, hex, public key, and input validation        |

### Type Definitions (`types/`)

| File               | Domain                          |
| ------------------ | ------------------------------- |
| `accounts.ts`      | Account configuration types     |
| `activity.ts`      | Activity item types             |
| `cashweb/`         | CashAddr protobuf types         |
| `crypto-worker.ts` | Crypto worker message types     |
| `draft.ts`         | Draft transaction types         |
| `explorer.ts`      | Block explorer API types        |
| `identity.ts`      | Identity and presence types     |
| `musig2.ts`        | MuSig2 session and signer types |
| `network.ts`       | Network configuration types     |
| `people.ts`        | People/profile types            |
| `plugins.ts`       | Plugin system types             |
| `sw.ts`            | Service worker types            |
| `wallet.ts`        | Wallet state and UTXO types     |

---

## Utility Function Patterns

### Pure Functions (Majority)

Functions with no side effects, deterministic outputs for given inputs:

```ts
// formatting.ts — pure, deterministic
export function formatXPI(sats: bigint, options?: { showSymbol?: boolean }): string {
  const xpi = Number(sats) / SATS_PER_XPI
  return options?.showSymbol ? `${xpi} XPI` : String(xpi)
}

// validation.ts — pure, returns ValidationResult
export function validateAddress(address: string, expectedNetwork?: NetworkType): ValidationResult {
  if (!address.startsWith(LOTUS_PREFIX)) {
    return { valid: false, error: 'Address must start with "lotus"' }
  }
  return { valid: true }
}
```

### Validation Pattern

Validation functions return a `ValidationResult` object with `valid: boolean` and optional `error: string`:

```ts
export interface ValidationResult {
  valid: boolean
  error?: string
}
```

- Use `isValidXxx()` for simple boolean checks
- Use `validateXxx()` for detailed error messages

### Formatting Pattern

Formatting functions accept raw values and return display-ready strings:

- `formatXPI()` — satoshis → human-readable XPI
- `truncateAddress()` — full address → truncated display
- `formatRelativeTime()` — timestamp → "5m ago"
- `formatUnixTimestamp()` — unix seconds → localized date string

### Storage Pattern

Storage utilities provide typed wrappers with automatic JSON serialization:

```ts
// localStorage (sync)
getItem<T>(key: StorageKey, defaultValue: T): T
setItem<T>(key: StorageKey, value: T): boolean

// IndexedDB (async)
getFromDB<T>(storeName: StoreName, key: string): Promise<T | null>
putInDB<T>(storeName: StoreName, value: T): Promise<boolean>

// Cache with TTL
getCached<T>(key: string): Promise<T | null>
setCached<T>(key: string, value: T, ttlMs: number): Promise<boolean>
```

---

## Key Utilities by Category

### Constants & Configuration

| Constant              | Value / Purpose                                    |
| --------------------- | -------------------------------------------------- |
| `NETWORK_CONFIGS`     | Livenet/testnet URLs, colors, production flags     |
| `SATS_PER_XPI`        | `1_000_000` — satoshi conversion factor            |
| `LOTUS_DECIMALS`      | `6` — decimal places for XPI                       |
| `DUST_THRESHOLD`      | `546n` — minimum output in satoshis                |
| `BIP44_PURPOSE`       | `44` — HD wallet purpose                           |
| `BIP44_COINTYPE`      | `10605` — Lotus coin type                          |
| `AccountPurpose`      | Enum: PRIMARY, MUSIG2, SWAP, PRIVACY               |
| `STORAGE_KEYS`        | All localStorage/IndexedDB key constants            |
| `DEFAULT_FEE_RATE`    | `1` sat/byte                                       |

### Formatting

| Function                | Input               | Output                        |
| ----------------------- | ------------------- | ----------------------------- |
| `formatXPI()`           | satoshis            | Formatted XPI string          |
| `satsToXPI()`           | satoshis            | XPI number                    |
| `xpiToSats()`           | XPI number          | satoshis bigint               |
| `parseXPIInput()`       | user input string   | satoshis bigint or null       |
| `truncateAddress()`     | full address        | Truncated address string      |
| `truncateTxid()`        | transaction ID      | Truncated txid string         |
| `formatRelativeTime()`  | timestamp (ms)      | Relative time string          |
| `formatDateGroup()`     | timestamp (ms)      | "Today", "Yesterday", etc.    |
| `formatUnixTimestamp()` | unix seconds        | Localized date/time string    |
| `formatDuration()`      | seconds             | Human-readable duration       |
| `formatBytes()`         | bytes               | Human-readable size           |
| `formatHashrate()`      | hashrate            | Human-readable hashrate       |

### Validation

| Function                  | Validates                          |
| ------------------------- | ---------------------------------- |
| `isValidAddress()`        | Lotus address format + checksum    |
| `validateAddress()`       | Address with network check         |
| `isValidAmount()`         | Positive, above dust threshold     |
| `validateAmount()`        | Amount with balance check          |
| `validateAmountInput()`   | User-entered amount string         |
| `validateTxid()`          | SHA256 transaction ID format       |
| `validateHex()`           | Hex string with optional length    |
| `validatePublicKey()`     | Compressed/uncompressed public key |
| `validateContactName()`   | Contact name length/format         |
| `validateTag()`           | Tag format (alphanumeric + _-)     |
| `validateRecipientCount()`| Number of transaction recipients   |

### Helpers

| Function         | Purpose                              |
| ---------------- | ------------------------------------ |
| `generateId()`   | Unique ID with optional prefix       |
| `generateUUID()` | RFC 4122 v4 UUID                     |
| `unique()`       | Remove array duplicates              |
| `uniqueBy()`     | Remove duplicates by key             |
| `groupBy()`      | Group array items by key             |
| `sortBy()`       | Sort array by key (asc/desc)         |
| `chunk()`        | Split array into chunks              |
| `deepClone()`    | Deep clone via JSON                  |
| `pick()` / `omit()` | Select/exclude object keys        |
| `debounce()`     | Debounced function wrapper           |
| `throttle()`     | Throttled function wrapper           |
| `retry()`        | Retry with exponential backoff       |
| `getErrorMessage()` | Extract message from unknown error |
| `copyToClipboard()`| Browser clipboard copy             |
| `buildUrl()`     | URL with query parameters            |

### Identity

| Function                      | Purpose                                |
| ----------------------------- | -------------------------------------- |
| `isValidPublicKey()`          | Compressed public key format check     |
| `deriveAddressFromPublicKey()`| Public key → Lotus address             |
| `createIdentity()`            | Build Identity from public key         |
| `getIdentityLevel()`          | Determine capability level             |
| `canParticipateInMuSig2()`    | Check MuSig2 eligibility               |
| `canCheckPresence()`          | Check P2P presence capability          |
| `publicKeysEqual()`           | Case-insensitive public key comparison |

### Feed (RANK Protocol)

| Function            | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `bucketVoteCount()` | Convert exact votes to bucketed display    |
| `controversyScore()`| Burn-weighted controversy ratio (0–1)      |
| `isControversial()` | Check if content meets controversy threshold|

### Sanitization

| Function                  | Purpose                                |
| ------------------------- | -------------------------------------- |
| `sanitizeCommentText()`   | Remove control chars, normalize Unicode|
| `validateCommentText()`   | Check comment validity and length      |
| `processCommentForDisplay()`| Full sanitization pipeline           |
| `escapeHtml()`            | HTML entity encoding (deprecated)      |
| `stripHtmlTags()`         | Remove all HTML tags                   |

### Terminology

| Function                  | Purpose                                |
| ------------------------- | -------------------------------------- |
| `formatTechnicalTerm()`   | Translate single technical term        |
| `formatTechnicalMessage()`| Replace terms in full message          |
| `getTermExplanation()`    | Get tooltip with explanation           |

---

## Best Practices

### 1. Purity

All utils functions must be **pure** — same input always produces same output, no side effects:

```ts
// ✅ Pure: deterministic, no side effects
export function formatXPI(sats: bigint): string { ... }

// ❌ Impure: reads/writes external state
export function getBalance(): number {
  return walletStore.balance // Don't do this in utils/
}
```

Exceptions (must be explicitly documented):
- `storage.ts` — I/O is inherent to its purpose
- `helpers.ts` — `copyToClipboard()`, `sleep()` — side effects are the function's purpose

### 2. Determinism

Functions must produce deterministic outputs for given inputs:

```ts
// ✅ Deterministic
export function satsToXPI(sats: bigint): number {
  return Number(sats) / SATS_PER_XPI
}

// ❌ Non-deterministic (uses Date.now())
export function getTimeAgo(timestamp: number): string {
  return Date.now() - timestamp // Don't do this
}
```

### 3. Type Safety

- **Strict TypeScript** — no `any` types, explicit return types
- Use branded types or enums where appropriate (`AccountPurpose`, `NetworkType`)
- Import types from `~/utils/types/` domain files
- Use `ValidationResult` interface for all validation functions

### 4. Framework Agnostic

Utils must **never** import from:
- Vue (`vue`, `@vue/*`)
- Nuxt (`#app`, `#imports`, `useRuntimeConfig`)
- Pinia (`pinia`, `useXxxStore`)
- Nuxt UI (`@nuxt/ui`)

The exception is `identity.ts` which imports from `~/plugins/bitcore.client` — this is acceptable because the bitcore plugin is itself a pure crypto library wrapper.

### 5. Import Conventions

```ts
// Use ~/ alias for project root
import { SATS_PER_XPI, LOTUS_DECIMALS } from '~/utils/constants'
import { isValidAddress } from '~/utils/validation'

// Relative imports within utils/
import { STORAGE_KEYS } from './storage'
```

### 6. Central Exports

- `index.ts` re-exports all types from `types/` subdirectory
- New type files in `types/` should be added to `index.ts` exports
- Utility modules are imported directly, not through `index.ts`

### 7. Error Handling

- Validation functions return `ValidationResult` objects, never throw
- Formatting functions handle edge cases gracefully (empty input, null, undefined)
- Storage functions catch errors and return defaults/false
- Use `getErrorMessage(error: unknown)` to safely extract error messages

### 8. Naming Conventions

| Prefix       | Usage                              | Example                    |
| ------------ | ---------------------------------- | -------------------------- |
| `format`     | Convert to display string          | `formatXPI()`, `formatBytes()` |
| `validate`   | Check + return detailed result     | `validateAddress()`, `validateAmount()` |
| `isValid`    | Simple boolean check               | `isValidAddress()`, `isValidHex()` |
| `parse`      | Convert input to typed value       | `parseXPIInput()`          |
| `truncate`   | Shorten for display                | `truncateAddress()`, `truncateTxid()` |
| `get`        | Derive/extract a property          | `getNetworkFromAddress()`, `getIdentityLevel()` |
| `build`      | Construct a value                  | `buildDerivationPath()`, `buildUrl()` |
| `sanitize`   | Clean user input                   | `sanitizeCommentText()`    |
| `process`    | Multi-step transformation          | `processCommentForDisplay()` |

---

## Anti-Patterns to Avoid

### ❌ Don't import from composables, stores, or components

```ts
// ❌ Wrong: creates circular dependency, breaks purity
import { useWalletStore } from '~/stores/wallet'
import { useWallet } from '~/composables/useWallet'
```

### ❌ Don't use reactive state

```ts
// ❌ Wrong: utils should not hold reactive state
let cachedBalance = ref(0)
```

### ❌ Don't use `any` types

```ts
// ❌ Wrong
export function process(data: any): any { ... }

// ✅ Right
export function process(data: TransactionData): ValidationResult { ... }
```

### ❌ Don't mutate input objects

```ts
// ❌ Wrong: mutates input
export function normalize(obj: object) {
  obj.normalized = true
  return obj
}

// ✅ Right: returns new object
export function normalize(obj: object) {
  return { ...obj, normalized: true }
}
```

### ❌ Don't mix concerns

```ts
// ❌ Wrong: formatting + API call
export async function formatAndFetchBalance(address: string): string {
  const response = await fetch(`/api/balance/${address}`)
  return formatXPI(response.balance)
}

// ✅ Right: separate concerns
export function formatBalance(sats: bigint): string {
  return formatXPI(sats)
}
```

### ❌ Don't skip null/undefined checks

```ts
// ❌ Wrong: will crash on null input
export function getNetwork(address: string): NetworkType {
  return address.charAt(5) === '_' ? 'livenet' : 'testnet'
}

// ✅ Right: handles edge cases
export function getNetwork(address: string): NetworkType | null {
  if (!address || typeof address !== 'string') return null
  return address.charAt(5) === '_' ? 'livenet' : 'testnet'
}
```

---

## Related Documentation

- **Root AGENTS.md**: `/AGENTS.md` — project-wide conventions and architecture
- **Lotus Docs**: https://lotusia.org/docs
- **xpi-ts Reference**: https://github.com/LotusiaStewardship/xpi-ts
- **BIP44 Specification**: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
- **RANK Protocol**: See `composables/useRankApi.ts` and `echo-chamber-mitigation.md` in monorepo
