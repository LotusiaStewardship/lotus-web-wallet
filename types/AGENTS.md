# AGENTS.md — Types Directory

Blueprint for working with type definitions in `types/`.

---

## Purpose

The `types/` directory contains all shared TypeScript type definitions for the Lotus Web Wallet application. Types are organized by domain and serve as the single source of truth for:

- Pinia store state shapes
- Component props and emit signatures
- Service function parameter/return types
- Event callback interfaces
- Modal result types (for `useOverlays` system)
- P2P networking contracts
- Transaction building and display

---

## Directory Structure

| File              | Domain                  | Key Types                                                              |
| ----------------- | ----------------------- | ---------------------------------------------------------------------- |
| `contact.ts`      | Contact management      | `Contact`, `ContactAddresses`, `ContactGroup`, `ContactsState`         |
| `p2p.ts`          | P2P networking          | `P2PConnectionState`, `UIPeerInfo`, `UIPresenceAdvertisement`, `P2PState` |
| `transaction.ts`  | Transaction building    | `DraftTransactionState`, `ParsedTransaction`, `TxInput`, `TxOutput`    |
| `ui.ts`           | UI state management     | `ModalConfig`, `ToastConfig`, `UIState`, `ConfirmDialogResult`         |
| `index.ts`        | Central exports         | Re-exports all domain types                                            |

---

## TypeScript Conventions

### Strict Mode

- TypeScript strict mode is enabled globally via `nuxt.config.ts`
- No `any` types — use `unknown` when type is truly indeterminate
- All function parameters and return types must be explicitly typed

### Interfaces vs Types

```ts
// Use `interface` for object shapes (extendable, better error messages)
export interface Contact {
  id: string
  name: string
  address: string
}

// Use `type` for unions, intersections, and aliases
export type OnlineStatus = 'online' | 'recently_online' | 'offline' | 'unknown'
export type ContactInput = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>
```

### JSDoc Comments

Every exported type must have a JSDoc comment describing its purpose:

```ts
/**
 * Contact record with unified identity linkage.
 * Used across contacts store and people feed components.
 */
export interface Contact { ... }
```

### Derived Types

Prefer utility types over duplication:

```ts
// Creation input — excludes auto-generated fields
export type ContactInput = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>

// Update input — partial, excludes immutable fields
export type ContactUpdate = Partial<Omit<Contact, 'id' | 'createdAt'>>

// Selective projection
export type ContactSummary = Pick<Contact, 'id' | 'name' | 'avatar'>
```

### Naming Conventions

| Pattern                 | Example                     | Usage                                    |
| ----------------------- | --------------------------- | ---------------------------------------- |
| `*State`                | `ContactsState`, `UIState`  | Pinia store state shapes                 |
| `*Config`               | `ModalConfig`, `ToastConfig`| Configuration objects                    |
| `*Input` / `*Options`   | `ContactInput`, `P2PInitOptions` | Function parameters              |
| `*Result`               | `BroadcastResult`, `ConfirmDialogResult` | Function return values     |
| `*Event`                | `P2PActivityEvent`          | Event/callback payloads                  |
| `*Addresses`            | `ContactAddresses`          | Network-specific address collections     |

### Naming Conflicts

When names collide across domains, use explicit aliased exports in `index.ts`:

```ts
// SignerCapabilities exists in both contact.ts and musig2.ts with different shapes
export {
  type SignerCapabilities as ContactSignerCapabilities,
} from './contact'
```

---

## Export Patterns

### Central Index

All types are re-exported from `index.ts` for clean imports:

```ts
// Domain-specific re-exports
export { type Contact, type ContactInput, ... } from './contact'
export * from './p2p'
export * from './transaction'
export * from './ui'
```

### Import Style

Prefer named imports from the central index:

```ts
// Preferred — single import source
import type { Contact, ContactInput, ContactsState } from '~/types'

// Acceptable — domain-specific when only one domain is needed
import type { P2PConnectionState } from '~/types/p2p'
```

### Constants

Domain constants live alongside their related types:

```ts
// In contact.ts
export const CONTACTS_STORAGE_KEY = 'lotus-wallet-contacts'
export const MAX_CONTACTS = 1000
export const MAX_TAGS_PER_CONTACT = 10
```

---

## Type Patterns

### Pinia Store State

State interfaces mirror the store's reactive state shape:

```ts
export interface ContactsState {
  contacts: Contact[]
  groups: ContactGroup[]
  initialized: boolean
}
```

### Modal Result Types

Modal results use a consistent `confirmed`/`data` pattern:

```ts
export interface ConfirmDialogResult {
  confirmed: boolean
}
```

### Union Types for State Machines

Use discriminated unions for finite state:

```ts
export type OnlineStatus = 'online' | 'recently_online' | 'offline' | 'unknown'

export enum P2PConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  // ...
}
```

### BigInt for Amounts

All satoshi amounts use `bigint` to prevent precision loss:

```ts
export interface Contact {
  totalSent?: bigint
  totalReceived?: bigint
}

export interface TxInput {
  value: bigint
}
```

---

## Anti-Patterns

| Anti-Pattern                      | Why It's Bad                              | Fix                                        |
| --------------------------------- | ----------------------------------------- | ------------------------------------------ |
| Using `any`                       | Defeats type safety                       | Use `unknown` with type guards             |
| Duplicating type definitions      | Drift between copies                      | Use `Omit`, `Pick`, `Partial` utilities    |
| Exporting types from non-type files | Blurs concerns                          | Keep types in `types/`, imports from there |
| Mutable type properties           | Unexpected state changes                  | Use `readonly` for immutable fields        |
| Side effects in type files        | Types should be pure                      | No runtime logic in type files             |
| Circular dependencies             | Breaks type resolution                    | Extract shared types to a common module    |
| Missing JSDoc on exported types   | Poor developer experience                 | Document every exported type               |
| Naming collisions without aliases | Ambiguous imports                         | Use `as` alias in `index.ts` exports       |

---

## Domain Notes

### Contact Types (`contact.ts`)

- The contact system is **deprecated** in favor of the People store
- Types should be reviewed for removal during future cleanup
- `ContactWithIdentity` extends `Contact` with resolved identity data
- Legacy P2P fields (`peerId`, `publicKey`, `signerCapabilities`) are marked `@deprecated`

### P2P Types (`p2p.ts`)

- Contains types for libp2p-based peer discovery and presence
- `P2PState` mirrors the P2P Pinia store shape
- Presence advertising uses TTL-based expiration (`expiresAt`)
- TODO: Review for duplication with store types (noted 1/10/26)

### Transaction Types (`transaction.ts`)

- **Currently unused** in the codebase (noted 1/10/26)
- Provides a complete draft → build → broadcast type flow
- `DraftTransactionState` is designed for reactive store management
- All amounts use `bigint` for satoshi precision

### UI Types (`ui.ts`)

- **Currently unused** in the codebase (noted 1/10/26)
- Provides types for modals, toasts, loading states, and dialogs
- `UIState` mirrors the UI Pinia store shape
- Designed for use with `useOverlays` composable system

---

## Related Documentation

- [Root AGENTS.md](../AGENTS.md) — Project-wide coding conventions
- [07_TYPE_SYSTEM.md](../docs/07_TYPE_SYSTEM.md) — Detailed type organization guide
- [Nuxt 3 Auto-Imports](https://nuxt.com/docs/guide/directory-structure/composables) — Composables and components auto-import
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) — Official TypeScript reference
