# CashWeb Integration Plan

## Overview

This plan outlines the migration of CashWeb components from the `stamp` repository into the `lotus-web-wallet` Nuxt application. The migration must respect the existing Nuxt architecture, including plugins, service workers, web workers, stores, and composables.

**Created**: January 2025
**Updated**: April 2026
**Source Repository**: `StampChat/stamp` (`src/cashweb/`)
**Target Repository**: `LotusiaStewardship/lotus-web-wallet`
**Priority**: P1 (High)
**Estimated Effort**: 13-18 days

---

## Problem Statement

The `stamp` repository contains CashWeb protocol implementations for decentralized messaging, profile management, and blockchain-based communication. These components need to be integrated into `lotus-web-wallet` to enable:

1. **Encrypted Messaging** - End-to-end encrypted communication between wallet users
2. **Profile Management** - User profiles stored on-chain via the registry system
3. **Proof of Publication** - Paid API access via blockchain transactions
4. **Stealth Payments** - Confidential transaction support

### Current State

| Component            | Stamp Location                | Integration Status                           |
| -------------------- | ----------------------------- | -------------------------------------------- |
| Wallet Core          | `src/cashweb/wallet/`         | ✅ Partially migrated via `stores/wallet.ts` |
| Relay Client         | `src/cashweb/relay/`          | ❌ Not migrated                              |
| Registry Handler     | `src/cashweb/registry/`       | ❌ Not migrated                              |
| PoP Protocol         | `src/cashweb/pop.ts`          | ❌ Not migrated                              |
| Protobuf Definitions | `src/cashweb/**/`             | ❌ Not migrated                              |
| Signed Payload       | `src/cashweb/signed_payload/` | ❌ Not migrated                              |
| BIP70 Payment        | `src/cashweb/bip70/`          | ❌ Not migrated                              |

---

## Architectural Mapping

### Stamp → lotus-web-wallet Component Mapping

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           STAMP CASHWEB COMPONENTS                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  relay/                                                                         │
│  ├── index.ts (RelayClient)          → Plugin + Service Worker Module           │
│  ├── crypto.ts (PayloadConstructor)  → Crypto Worker                            │
│  ├── constructors.ts (MessageConstructor) → Utils + Crypto Worker               │
│  ├── extension.ts (ParsedMessage)    → Utils                                    │
│  ├── encode-entry.ts                 → Utils                                   │
│  ├── decode-entry.ts                 → Utils                                   │
│  └── storage/storage.ts (MessageStore) → Service Worker State Sync              │
│                                                                                 │
│  registry/                                                                      │
│  └── index.ts (RegistryHandler)      → Plugin + Store                          │
│                                                                                 │
│  pop.ts                              → Plugin                                   │
│                                                                                 │
│  signed_payload/                     → Utils/types                             │
│                                                                                 │
│  bip70/                              → Utils (optional, future phase)           │
│                                                                                 │
│  wallet/                             → Already integrated (stores/wallet.ts)    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      LOTUS-WEB-WALLET ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  plugins/                                                                       │
│  ├── relay.client.ts         ← RelayClient HTTP operations                      │
│  ├── pop.client.ts           ← PoP protocol                                     │
│  └── registry.client.ts      ← RegistryHandler HTTP operations                 │
│                                                                                 │
│  service-worker/                                                                │
│  ├── sw.ts                   ← Message routing                                  │
│  └── modules/                                                                   │
│      ├── relay-sync.ts       ← WebSocket persistence, message polling           │
│      └── state-sync.ts       ← MessageStore (IndexedDB)                         │
│                                                                                 │
│  workers/                                                                       │
│  └── crypto.worker.ts        ← PayloadConstructor (encryption/decryption)      │
│                                                                                 │
│  stores/                                                                        │
│  ├── messages.ts             ← Message state management                         │
│  └── profiles.ts             ← Profile state management                         │
│                                                                                 │
│  composables/                                                                   │
│  ├── useRelayClient.ts       ← RelayClient composable                          │
│  ├── useCashWebKeys.ts       ← Keypair orchestration (identity, ephemeral)     │
│  ├── useMessages.ts          ← Message operations                               │
│  └── useProfiles.ts          ← Profile operations                              │
│                                                                                 │
│  utils/                                                                         │
│  ├── cashweb/                ← Core CashWeb utilities                           │
│  │   ├── keys.ts             ← Ephemeral key generation                        │
│  │   ├── encode-entry.ts     ← Entry encoding                                   │
│  │   ├── decode-entry.ts     ← Entry decoding                                   │
│  │   └── constructors.ts     ← Transaction construction helpers                │
│  └── types/                                                                    │
│      ├── relay.ts            ← Relay protobuf types                             │
│      ├── registry.ts         ← Registry protobuf types                          │
│      └── signed-payload.ts   ← SignedPayload types                              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Placement Rationale

### Plugins (HTTP Operations)

| Component                        | Rationale                                                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `RelayClient` (HTTP methods)     | Nuxt plugins provide singleton instances via dependency injection. HTTP calls are stateless and can run in the main thread. |
| `RegistryHandler` (HTTP methods) | Same rationale as RelayClient. Profile metadata fetches are HTTP GET operations.                                            |
| `PoP Protocol`                   | Payment request handling is HTTP-based. Plugin provides access to wallet store for transaction construction.                |

### Service Worker (Persistent Connections)

| Component                 | Rationale                                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RelayClient` (WebSocket) | WebSocket connections are killed when tabs are suspended. Service worker maintains persistent connection for real-time message delivery.            |
| `MessageStore`            | IndexedDB access in service worker enables offline message storage and cross-tab synchronization. Already partially implemented in `state-sync.ts`. |
| `Message Polling`         | Background polling for messages when WebSocket unavailable. Fits existing `network-monitor.ts` pattern.                                             |

### Crypto Worker (CPU-Intensive Operations)

| Component                      | Rationale                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `PayloadConstructor.encrypt()` | AES-CBC encryption can block UI on large payloads. Offloading to worker prevents frame drops.      |
| `PayloadConstructor.decrypt()` | Same rationale as encryption.                                                                      |
| `Key Derivation`               | HD key derivation for stamp addresses is CPU-intensive. Worker already handles similar operations. |

### Stores (Reactive State)

| Component       | Rationale                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `MessagesStore` | Pinia store provides reactive message list for UI components. Syncs with service worker via message passing. |
| `ProfilesStore` | Profile data needs reactive binding for UI. Cached in store, persisted via service worker.                   |

### Utils (Pure Functions)

| Component                   | Rationale                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `encode-entry.ts`           | Pure function transforming message items to protobuf entries. No side effects, suitable for utils.        |
| `decode-entry.ts`           | Pure function transforming protobuf entries to message items. Async due to UTXO operations but stateless. |
| `constructors.ts` (helpers) | Transaction construction helpers used by both main thread and worker.                                     |

---

## Phase Summary

| Phase | Document                          | Focus Area                                  | Priority | Est. Effort |
| ----- | --------------------------------- | ------------------------------------------- | -------- | ----------- |
| 1     | `01_PROTOBUF_TYPES.md`            | Protobuf type definitions and serialization | P0       | 1-2 days    |
| 2     | `02_CRYPTO_INTEGRATION.md`        | PayloadConstructor in crypto worker         | P0       | 2-3 days    |
| 2.5   | `02B_KEYPAIR_MANAGEMENT.md`       | Identity key, ephemeral keys, orchestration | P0       | 1-2 days    |
| 3     | `03_RELAY_PLUGIN.md`              | RelayClient HTTP plugin                     | P0       | 2 days      |
| 4     | `04_SERVICE_WORKER_RELAY.md`      | WebSocket persistence, MessageStore         | P1       | 2-3 days    |
| 5     | `05_REGISTRY_PLUGIN.md`           | RegistryHandler plugin and store            | P1       | 1-2 days    |
| 6     | `06_POP_PLUGIN.md`                | Proof of Publication plugin                 | P2       | 1 day       |
| 7     | `07_MESSAGES_STORE.md`            | Messages Pinia store and composables        | P1       | 2 days      |
| 8     | `08_INTEGRATION_TESTING.md`       | End-to-end testing and validation           | P0       | 1-2 days    |

**Total Estimated Effort**: 13-18 days

---

## Dependencies

### Internal Dependencies

| Dependency                             | Required For      | Status      |
| -------------------------------------- | ----------------- | ----------- |
| `stores/wallet.ts`                     | Phases 2, 2.5, 3, 4, 6 | ✅ Complete |
| `plugins/chronik.client.ts`            | Phases 3, 4       | ✅ Complete |
| `plugins/bitcore.client.ts`            | Phases 1, 2       | ✅ Complete |
| `workers/crypto.worker.ts`             | Phase 2           | ✅ Complete |
| `service-worker/sw.ts`                 | Phase 4           | ✅ Complete |
| `service-worker/modules/state-sync.ts` | Phase 4           | ✅ Complete |

### External Dependencies

| Dependency        | Required For | Status                       |
| ----------------- | ------------ | ---------------------------- |
| `protobufjs`      | Phase 1      | Available                    |
| `node-forge`      | Phase 2      | Available (already in stamp) |
| `bitcore-lib-xpi` | All phases   | ✅ Available via xpi-ts      |

---

## Relationship to Other Plans

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       lotus-web-wallet Plans                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐            │
│  │ background-service-worker/  │    │ cashweb-integration/         │            │
│  │                             │    │                             │            │
│  │ • Service Worker Foundation │    │ • Protobuf Types            │            │
│  │ • Network Monitor           │───▶│ • Crypto Integration       │            │
│  │ • State Sync (IndexedDB)    │    │ • Service Worker Relay     │            │
│  │ • Crypto Worker             │    │ • Messages Store           │            │
│  └─────────────────────────────┘    └─────────────────────────────┘            │
│                                                                                 │
│  CashWeb integration extends the service worker architecture with:             │
│  - WebSocket persistence for real-time messaging                               │
│  - MessageStore using existing IndexedDB infrastructure                         │
│  - Crypto operations in existing crypto worker                                 │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

### Phase Completion Criteria

1. **Protobuf Types**: All protobuf types compile and serialize/deserialize correctly
2. **Crypto Integration**: Encryption/decryption works in crypto worker without UI blocking
2.5. **Keypair Management**: Identity key derived, ephemeral key generation, orchestration composable functional
3. **Relay Plugin**: HTTP operations work for profile fetches and message sending
4. **Service Worker Relay**: WebSocket persists in background, messages stored in IndexedDB
5. **Registry Plugin**: Profile metadata can be fetched and updated
6. **PoP Plugin**: Payment requests can be constructed and sent
7. **Messages Store**: UI displays messages reactively, syncs with service worker
8. **Integration Testing**: End-to-end message send/receive works across tab states

### Non-Goals (Future Phases)

- BIP70 payment protocol (optional, low priority)
- Forum/broadcast messaging (requires backend support)
- Stealth payments (requires additional UX design)

---

## Risk Assessment

| Risk                               | Impact | Mitigation                                                               |
| ---------------------------------- | ------ | ------------------------------------------------------------------------ |
| Protobuf version mismatch          | High   | Use same protobuf definitions from stamp, generate fresh TS types        |
| Crypto worker thread safety        | Medium | Ensure no shared mutable state, use message passing                      |
| Service worker WebSocket lifecycle | High   | Follow existing `network-monitor.ts` patterns, handle reconnection       |
| IndexedDB schema conflicts         | Medium | Use separate object stores for messages, extend existing `state-sync.ts` |
| Key derivation compatibility       | High   | Verify HD derivation paths match stamp implementation                    |

---

## Implementation Notes

### Protobuf Handling

The stamp repository uses protobuf definitions in `src/cashweb/**/proto/`. These should be:

1. Copied to `utils/cashweb/proto/`
2. Compiled to TypeScript using `protobufjs-cli`
3. Type definitions generated for `relay_pb`, `stealth_pb`, `p2pkh_pb`, `metadata_pb`, `payload_pb`

### Key Derivation Paths

Stamp uses specific HD derivation paths for different purposes:

| Purpose           | Path                        | Notes                                  |
| ----------------- | --------------------------- | -------------------------------------- |
| Identity Key      | `m/44'/899'/0'/0/0`         | Added in Phase 2.5 (Keypair Management)|
| Stamp Addresses   | `m/44'/145'/{txn}/{output}` | Derived from payload digest            |
| Stealth Addresses | `m/44'/145'/{txn}/{output}` | Derived from ephemeral key             |

These must be preserved in the crypto worker implementation.

### Service Worker Message Protocol

Extend existing service worker message types in `utils/types/sw.ts`:

```typescript
// New message types for CashWeb
type CashWebMessageType =
  | 'CONNECT_RELAY'
  | 'DISCONNECT_RELAY'
  | 'SEND_MESSAGE'
  | 'GET_MESSAGES'
  | 'MESSAGE_RECEIVED'
  | 'RELAY_CONNECTED'
  | 'RELAY_DISCONNECTED'
```

---

## References

- [CashWeb Protocol Specification](https://github.com/cashweb/cashweb-spec)
- [Stamp Repository](https://github.com/StampChat/stamp)
- [Lotus Documentation](https://lotusia.org/docs)
- [Lotus FAQ](https://lotusia.org/faq)
