# AGENTS.md — Composables Directory

Blueprint for AI coding agents working in the `composables/` directory of lotus-web-wallet.

---

## Purpose

The `composables/` directory contains Vue 3 Composition API composables — reusable, encapsulated logic units that provide reactive state, computed values, and side-effect management. Composables are **auto-imported by Nuxt 3** (no explicit imports needed in components) and serve as the primary interface between components and the application's stores, APIs, and utilities.

---

## Conventions

### Naming
- Files: `usePascalCase.ts` (e.g., `useWallet.ts`, `useRankApi.ts`)
- Exports: Named function exports — `export function useXxx() { ... }`
- Return objects: Destructure-friendly — return `{ ... }` with clearly named properties

### Code Style
- **TypeScript strict mode** — all parameters, return types, and refs must be typed
- **Vue 3 Composition API** — use `ref()`, `computed()`, `watch()`, `onMounted()`, etc.
- **Imports**: Use `~/` alias for project root (e.g., `import { SATOSHIS_PER_XPI } from '~/utils/constants'`)
- **No default exports** — Nuxt auto-import requires named exports
- Keep composables **focused** — one responsibility per file

### Reactivity Patterns
```ts
// Good: reactive state with clear types
export function useBalance() {
  const balance = ref<number>(0)
  const formatted = computed(() => formatXPI(balance.value))
  return { balance, formatted }
}

// Good: accepting reactive inputs
export function useFiltered(items: Ref<Item[]>, query: Ref<string>) {
  return computed(() => items.value.filter(i => i.name.includes(query.value)))
}
```

---

## Key Composables by Category

### Wallet & Transactions
| Composable | Responsibility |
|---|---|
| `useWallet.ts` | High-level wallet helpers (balance, UTXOs, address management) |
| `useTransactionBuilder.ts` | Transaction construction (inputs, outputs, signing) |
| `useTransaction.ts` | Core transaction utilities |
| `useTransactionDetails.ts` | Transaction detail resolution |
| `useTransactionNormalizer.ts` | Transaction normalization for display |
| `useSharedWalletContext.ts` | Shared wallet context resolution |

### Blockchain & Indexer
| Composable | Responsibility |
|---|---|
| `useChronikClient.ts` | Reactive Chronik blockchain client wrapper |
| `useExplorerApi.ts` | Block explorer API wrapper |

### RANK Protocol
| Composable | Responsibility |
|---|---|
| `useRankApi.ts` | RANK protocol REST API wrapper (~27KB) |
| `useRankVote.ts` | RANK voting flow (build tx, sign, broadcast) |
| `useRankAuth.ts` | BlockDataSig authentication for RANK API |
| `useRnkcComment.ts` | RNKC comment transaction flow |
| `usePostVotePolling.ts` | Post-vote polling for vote status |

### Identity & People
| Composable | Responsibility |
|---|---|
| `useFeedIdentity.ts` | Feed identity resolution |
| `usePersonContext.ts` | Person/profile context |
| `useContactContext.ts` | Contact context resolution |
| `useContactUri.ts` | Contact URI parsing |

### Address & Amount
| Composable | Responsibility |
|---|---|
| `useAddress.ts` | Address parsing and validation |
| `useAmount.ts` | Satoshi ↔ XPI formatting and conversion |

### UI & Interaction
| Composable | Responsibility |
|---|---|
| `useOverlays.ts` | **Programmatic modal/slideover system** (~22KB) — modals opened via functions, NOT v-model |
| `useNotifications.ts` | Toast notification helpers |
| `useFocusManagement.ts` | Focus trap and restoration utilities |
| `useKeyboardShortcuts.ts` | Keyboard shortcut registration |
| `useDismissible.ts` | Dismissible UI state |
| `useAvatars.ts` | Avatar generation/handling |
| `useAnnounce.ts` | Accessibility announcement utilities |

### Crypto & Security
| Composable | Responsibility |
|---|---|
| `useMnemonic.ts` | Mnemonic/seed phrase utilities |
| `useSeedPhrase.ts` | Seed phrase handling and validation |
| `useSignerContext.ts` | Signer context resolution |

### Time & Formatting
| Composable | Responsibility |
|---|---|
| `useTime.ts` | Relative/absolute time formatting |

### PWA & Platform
| Composable | Responsibility |
|---|---|
| `useServiceWorker.ts` | Service worker communication bridge |
| `usePWAInstall.ts` | PWA install prompt handling |
| `useShare.ts` | Web Share API integration |
| `useQRCode.ts` | QR code generation and payment URI parsing |
| `useClipboard.ts` | Clipboard operations |

---

## Patterns & Best Practices

### 1. Prefer stateless composables
Composables should provide **behavior**, not store state. State belongs in Pinia stores (`stores/`). Composables wrap store access or provide derived/computed values.

```ts
// Good: composable wraps store access
export function useWallet() {
  const store = useWalletStore()
  const balance = computed(() => store.totalBalance)
  return { balance, send: store.sendTransaction }
}
```

### 2. useOverlays is the programmatic modal system
- Modals are opened via **function calls**, NOT `v-model`
- Example: `useOverlays().open('SendModal', { props })` not `<SendModal v-model="open" />`
- Always use `useOverlays()` to manage modals, slides, and confirmations

### 3. Destructure returns for clarity
```ts
// Good
const { balance, send, receive } = useWallet()

// Avoid: returning a single object that must be accessed with dot notation
```

### 4. Handle async operations with reactive state
```ts
// Good pattern for async composables
export function useFetchData() {
  const data = ref<Data | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch() {
    loading.value = true
    error.value = null
    try {
      data.value = await api.get()
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, fetch }
}
```

### 5. Use runtime config for API URLs
```ts
const config = useRuntimeConfig()
const apiUrl = config.public.rankApiUrl
```

---

## Anti-Patterns to Avoid

### ❌ Storing persistent state in composables
State that needs to persist across navigations belongs in Pinia stores, not composables.

### ❌ Mutating refs passed as parameters
Treat input refs as read-only. Return computed values instead of mutating inputs.

### ❌ Side effects on composable initialization
Avoid `watch`, `watchEffect`, or `onMounted` at the top level unless the composable is explicitly lifecycle-aware. Prefer returning a `start()` or `init()` function.

### ❌ Using v-model with useOverlays
The overlay system is **programmatic only**. Do not create v-model bindings for modals managed by `useOverlays`.

### ❌ Importing composables explicitly
Nuxt auto-imports all composables. Explicit imports like `import { useWallet } from '~/composables/useWallet'` are unnecessary and may cause circular dependency issues.

### ❌ Mixing concerns
A composable should have a single responsibility. Don't combine wallet logic with UI state in one file.

---

## Architecture Context

- **State management**: Pinia stores (`stores/`) own reactive state; composables provide helpers and derived values
- **Chronik client**: `useChronikClient.ts` wraps the WebSocket-based blockchain indexer
- **Transaction flow**: `useTransactionBuilder.ts` handles input/output selection and signing; `useTransactionNormalizer.ts` prepares data for display
- **RANK protocol**: `useRankApi.ts` (REST API), `useRankVote.ts` (voting), `useRankAuth.ts` (authentication) work together for social curation features
- **Crypto operations**: Heavy crypto work is offloaded to `workers/crypto.worker.ts`; composables coordinate with the worker

---

## Related Documentation

- Root AGENTS.md: `/AGENTS.md`
- Pinia stores: `/stores/`
- Types: `/types/`
- Utilities: `/utils/`
- Workers: `/workers/crypto.worker.ts`
- Nuxt composables docs: https://nuxt.com/docs/guide/directory-structure/composables
