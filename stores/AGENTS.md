# Stores AGENTS.md

Blueprint for coding agents working on the `stores/` directory of lotus-web-wallet.

## Purpose

The `stores/` directory contains all Pinia stores that manage reactive application state. Stores are the single source of truth for wallet data, UI state, user preferences, and domain-specific state (contacts, notifications, onboarding, etc.).

## Store Organization

| Store | File | Responsibility |
|-------|------|----------------|
| Wallet | `wallet.ts` | Core wallet state, UTXO cache, blockchain interactions, draft transactions, multi-account management, Chronik integration |
| Network | `network.ts` | Network config (livenet/testnet), URL management, address validation |
| Contacts | `contacts.ts` | Contact CRUD, groups, favorites, P2P peer linking, identity resolution, MuSig2 signer discovery |
| Draft | `draft.ts` | Draft transaction state for SendModal, fee estimation, coin control, OP_RETURN, locktime |
| Feed | `feed.ts` | RANK feed state |
| Identity | `identity.ts` | Unified identities across P2P & social feeds, online status, presence tracking |
| Notifications | `notifications.ts` | Persistent notification queue, browser notifications, preferences |
| Onboarding | `onboarding.ts` | First-time user flow, step tracking, feature hints, backup reminders, getting-started checklist |
| People | `people.ts` | People/profile management |
| Settings | `settings.ts` | User preferences |
| UI | `ui.ts` | Global UI state: sidebar, theme, loading, command palette, toasts (NOT modal state — modals use `useOverlays`) |
| Activity | `activity.ts` | Combined activity feed (transactions, votes) |

## Pinia Patterns & Conventions

### Store Definition

All stores use the **setup function syntax** with `defineStore()`:

```ts
export const useWalletStore = defineStore('wallet', () => {
  // State, getters, actions
})
```

### State Declaration

- Use Vue `ref()` for reactive state
- Use `computed()` for derived state (getters)
- Keep state serializable where possible (avoid storing crypto objects directly)
- Use `markRaw()` for non-reactive objects (crypto keys, SDK instances)

```ts
const balance = ref<WalletBalance>({ total: '0', spendable: '0', utxoCount: 0 })
const balanceXPI = computed(() => toLotusUnits(balance.value.total))
```

### Getters

- Simple derived state → `computed()` properties
- Parameterized lookups → regular functions (not composables)

```ts
// Computed getter (no params)
const hasBalance = computed(() => BigInt(balance.value.total) > 0n)

// Parameterized getter (as function)
function getContactById(id: string): Contact | undefined {
  return contacts.value.find(c => c.id === id)
}
```

### Actions

- Async operations use `async/await`
- Mutate state directly (no `this` in setup syntax)
- Call `save()` / persistence functions after state changes
- Use other stores by calling their composable: `const networkStore = useNetworkStore()`

## Service-Store Separation

**Critical architectural pattern**: Stores manage reactive state; services handle API calls and business logic.

- **Stores** → reactive state, computed values, persistence
- **Services** → API calls, data transformation, event callbacks
- **Composables** → bridge between services and stores/components

Services notify stores via callbacks. Stores do NOT contain HTTP/fetch logic directly — they delegate to services and react to their results.

## Storage Persistence

All persistent state uses the storage utilities from `~/utils/storage`:

```ts
import { getItem, setItem, getRawItem, setRawItem, STORAGE_KEYS } from '~/utils/storage'
```

- `getItem()` / `setItem()` — JSON-serialized storage with defaults
- `getRawItem()` / `setRawItem()` — raw string storage
- `STORAGE_KEYS` — centralized key constants

Persistence pattern:
```ts
function save() {
  setItem(STORAGE_KEYS.WALLET_STATE, {
    balance: balance.value,
    // ...serializable state
  })
}
```

## Non-Reactive Objects

Use `markRaw()` for objects that should never be made reactive:

- Crypto keys (private keys, public keys, scripts)
- SDK class instances (Bitcore objects)
- Large data structures not needed for reactivity

```ts
_accountKeys.set(purpose, {
  privateKey: markRaw(signingKey),
  publicKey: markRaw(signingKey.publicKey),
  script: markRaw(script),
})
```

## SDK Class Access Pattern

**Never** use module-level variables for SDK classes. Always get them from `useNuxtApp()` inside the store or via getter functions:

```ts
// Inside store setup function
const { $bitcore, $chronik, $cryptoWorker } = useNuxtApp()

// Then use $bitcore.Address, $bitcore.Script, etc.
```

This ensures proper initialization order and avoids SSR/hydration issues.

## Inter-Store Communication

Stores access other stores by calling their composables directly:

```ts
const networkStore = useNetworkStore()
const notificationStore = useNotificationStore()
const activityStore = useActivityStore()
```

Common cross-store patterns:
- `wallet.ts` → `network.ts` (current network config)
- `wallet.ts` → `notifications.ts` (transaction notifications)
- `wallet.ts` → `activity.ts` (transaction recording)
- `contacts.ts` → `identity.ts` (identity resolution)
- `contacts.ts` → `p2p.ts` (peer status)
- `draft.ts` → `wallet.ts` (UTXOs, signing)

## UI Store Boundaries

The `ui.ts` store manages:
- Sidebar state (collapsed, mobile open)
- Theme preference
- Global loading state
- Command palette
- Toast notifications (legacy)
- Notification badge count

**NOT** in `ui.ts`:
- Modal state → use `useOverlays()` composable
- Page-specific UI state → use component-local state or dedicated stores

## Anti-Patterns to Avoid

1. **Do NOT put API/fetch logic in stores** — use services
2. **Do NOT store crypto objects as reactive state** — use `markRaw()` or private variables
3. **Do NOT use module-level SDK instances** — get from `useNuxtApp()` inside store
4. **Do NOT mutate state outside actions** — all mutations should go through store actions
5. **Do NOT bypass storage utilities** — always use `getItem`/`setItem` from `~/utils/storage`
6. **Do NOT store modal state in ui.ts** — use `useOverlays()` instead
7. **Do NOT mix service logic into stores** — keep stores focused on state management
8. **Do NOT use `this` in setup syntax** — access state directly (no `this.balance`)

## Store Initialization Pattern

Most stores follow this initialization pattern:

```ts
function initialize() {
  if (initialized.value) return

  const saved = getItem<SomeType>(STORAGE_KEYS.SOME_KEY, defaultValue)
  // Restore state from saved...
  initialized.value = true
}
```

The wallet store is special — it has `initialize()` which loads from storage or creates a new wallet, then initializes the Chronik connection in the background.

## Related Documentation

- `docs/architecture/v2/02_STATE_MANAGEMENT.md` — Detailed store patterns and architecture
- `docs/architecture/v2/03_SERVICES.md` — Service layer interaction with stores
- `docs/architecture/v2/08_DATA_FLOW.md` — End-to-end data flow diagrams
