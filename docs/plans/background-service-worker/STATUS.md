# Background Service Worker Plan - Status

## Overall Progress

| Phase                              | Status      | Notes                                   |
| ---------------------------------- | ----------- | --------------------------------------- |
| Phase 1: Service Worker Foundation | ✅ Complete | @vite-pwa/nuxt setup, TypeScript SW     |
| Phase 2: Network Monitor           | ✅ Complete | Chronik polling, tx detection           |
| Phase 3: Session Monitor           | ✅ Complete | MuSig2 timeouts, P2P presence, requests |
| Phase 4: Push Notifications        | ✅ Complete | Browser notifications from SW           |
| Phase 5: State Synchronization     | ✅ Complete | IndexedDB caching, state sync           |
| Phase 6: Crypto Worker             | ✅ Complete | Web Worker for crypto operations        |

**Legend**: 🔲 Not Started | 🟡 In Progress | ✅ Complete | ⏸️ Blocked

---

## Phase 1: Service Worker Foundation

### Status: ✅ Complete (via Unified Master Plan Phase 1)

### Tasks

| Task                                      | Status | Notes                               |
| ----------------------------------------- | ------ | ----------------------------------- |
| Install `@vite-pwa/nuxt` module           | ✅     | `npm install @vite-pwa/nuxt`        |
| Configure PWA in `nuxt.config.ts`         | ✅     | injectManifest strategy             |
| Update `tsconfig.json` with WebWorker lib | ✅     | Added WebWorker lib                 |
| Create `service-worker/sw.ts`             | ✅     | TypeScript service worker           |
| Create `types/service-worker.ts`          | ✅     | Message type definitions            |
| Create `composables/useServiceWorker.ts`  | ✅     | Client-side composable              |
| Setup message listener in `app.vue`       | ✅     | Via plugin service-worker.client.ts |
| Test SW registration                      | 🔲     | Pending manual verification         |
| Test message passing                      | 🔲     | Pending manual verification         |

---

## Phase 2: Network Monitor

### Status: ✅ Complete (via Unified Master Plan Phase 3)

### Tasks

| Task                            | Status | Notes                                           |
| ------------------------------- | ------ | ----------------------------------------------- |
| Implement Chronik REST polling  | ✅     | `service-worker/modules/network-monitor.ts`     |
| Implement UTXO change detection | ✅     | Compares cached vs fetched UTXOs                |
| Implement transaction tracking  | ✅     | Detects new/spent UTXOs                         |
| Implement adaptive polling      | ✅     | 10s-60s based on pending tx/sessions/background |
| Integrate with wallet store     | ✅     | `stores/wallet.ts` SW integration methods       |
| Test background tx detection    | 🔲     | Pending manual verification                     |

---

## Phase 3: Session Monitor

### Status: ✅ Complete (via Unified Master Plan Phase 5)

### Tasks

| Task                                 | Status | Notes                                        |
| ------------------------------------ | ------ | -------------------------------------------- |
| Implement session timeout warnings   | ✅     | `session-monitor.ts` sendWarning()           |
| Implement signing request tracking   | ✅     | SigningRequest interface, addSigningRequest  |
| Implement presence refresh signaling | ✅     | startPresenceRefresh(), REFRESH_PRESENCE     |
| Integrate with MuSig2 store          | ✅     | registerSessionWithSW, handleSessionExpiring |
| Integrate with P2P store             | ✅     | Via useServiceWorker composable              |
| Test session expiry notifications    | 🔲     | Pending manual verification                  |

---

## Phase 4: Push Notifications

### Status: ✅ Complete (via Unified Master Plan Phase 8)

### Tasks

| Task                                  | Status | Notes                                          |
| ------------------------------------- | ------ | ---------------------------------------------- |
| Implement SW notification system      | ✅     | `service-worker/modules/push-notifications.ts` |
| Implement notification templates      | ✅     | Templates for all event types                  |
| Implement click handling with actions | ✅     | `setupNotificationClickHandler()`              |
| Implement badge management            | ✅     | `updateBadge()`, `clearBadge()`                |
| Integrate with notification store     | ✅     | `showBrowserNotification()` action             |
| Create permission request UI          | ✅     | `PermissionPrompt.vue`, settings toggle        |
| Test background notifications         | 🔲     | Pending manual verification                    |

---

## Phase 5: State Synchronization

### Status: ✅ Complete (via Unified Master Plan Phase 10)

### Tasks

| Task                        | Status | Notes                                         |
| --------------------------- | ------ | --------------------------------------------- |
| Initialize IndexedDB schema | ✅     | `service-worker/modules/state-sync.ts`        |
| Implement CRUD operations   | ✅     | cacheState, getState, getAllState, clearState |
| Implement state caching     | ✅     | State and UTXO caching                        |
| Implement state sync        | ✅     | broadcastState, SW message handlers           |
| Integrate with wallet store | ✅     | Via SW message passing                        |
| Create offline indicator    | ✅     | `components/common/OfflineIndicator.vue`      |
| Test offline mode           | 🔲     | Pending manual verification                   |

---

## Phase 6: Crypto Worker

### Status: ✅ Complete (via Unified Master Plan Phase 10)

### Tasks - Implementation

| Task                                    | Status | Notes                                            |
| --------------------------------------- | ------ | ------------------------------------------------ |
| Create `types/crypto-worker.ts`         | ✅     | Complete type definitions with ResponseTypeMap   |
| Create `workers/crypto.worker.ts`       | ✅     | Full Bitcore SDK integration                     |
| Configure Vite worker bundling          | ✅     | Worker config with Node.js polyfills             |
| Create `composables/useCryptoWorker.ts` | ✅     | Promise-based interface with convenience methods |
| Implement mnemonic generation           | ✅     | Full SDK implementation via worker               |
| Implement mnemonic validation           | ✅     | Full SDK implementation via worker               |
| Implement key derivation                | ✅     | Full SDK implementation (P2PKH + P2TR)           |
| Implement transaction signing           | ✅     | Full SDK implementation (ECDSA + Schnorr)        |
| Implement message signing               | ✅     | Full SDK implementation via worker               |
| Implement message verification          | ✅     | Full SDK implementation via worker               |
| Implement hash operations               | ✅     | SHA256, SHA256d, RIPEMD160, HASH160              |
| Add MuSig2 operation stubs              | 🔲     | Deferred to future phase                         |
| Add `USE_CRYPTO_WORKER` feature flag    | ✅     | Default: false in `utils/constants.ts`           |
| Integrate with wallet store             | ✅     | Behind feature flag                              |
| Test UI responsiveness                  | 🔲     | Pending manual verification                      |

### Tasks - Deprecation (Phase B)

| Task                                                        | Status | Notes                                         |
| ----------------------------------------------------------- | ------ | --------------------------------------------- |
| Create `utils/deprecation.ts` helper                        | 🔲     | Warning utility                               |
| Add `@deprecated` to `plugins/bitcore.client.ts`            | 🔲     | getBitcore, ensureBitcore, isBitcoreLoaded    |
| Add `@deprecated` to `composables/useBitcore.ts`            | 🔲     | Entire composable                             |
| Add `@deprecated` to getter functions in `stores/wallet.ts` | 🔲     | getMnemonic, getTransaction, etc.             |
| Add `@deprecated` to wallet store methods                   | 🔲     | signMessage, verifyMessage, isValidSeedPhrase |
| Add deprecation console warnings (dev mode)                 | 🔲     |                                               |
| Document migration path in code comments                    | 🔲     |                                               |

---

## Dependencies on Other Plans

### notification-system

- **Phase 4 (Browser Notifications)**: Superseded by this plan's Phase 4
- Update notification-system/STATUS.md to note this dependency

### unified-p2p-musig2-ui

- **Phase 4 (Signing Flow)**: Benefits from Phase 3 (Session Monitor)
- **Phase 6 (Polish)**: Benefits from Phase 4 (Push Notifications)
- Can proceed in parallel; SW integration enhances but doesn't block

### unified-remaining-tasks

- **Phase 2 (Social/RANK)**: Can optionally use Phase 2 (Network Monitor) for activity polling
- No blocking dependency

---

## Blockers

None currently identified.

---

## Notes

- Service worker requires HTTPS in production (localhost exempt for dev)
- Safari has limited Push API support
- Consider PWA manifest for full installable app experience

---

## Changelog

| Date       | Change                                                                |
| ---------- | --------------------------------------------------------------------- |
| 2024-12-11 | Plan created with 5 phases                                            |
| 2024-12-11 | Added Phase 6 (Crypto Worker) for cryptographic operations offloading |
| 2024-12-11 | Updated Phase 1 to use @vite-pwa/nuxt with TypeScript                 |
| 2024-12-11 | Phase 1 completed via Unified Master Plan Phase 1                     |
| 2024-12-11 | Phase 2 completed via Unified Master Plan Phase 3                     |
| 2024-12-11 | Phase 3 completed via Unified Master Plan Phase 5                     |
| 2024-12-11 | Phase 4 completed via Unified Master Plan Phase 8                     |
| 2024-12-11 | Phase 5 completed via Unified Master Plan Phase 10                    |
| 2024-12-11 | Phase 6 completed via Unified Master Plan Phase 10                    |

---

_Last Updated: December 11, 2024_
_Note: This plan is superseded by the Unified Master Plan. See `docs/plans/unified-master-plan/`_
