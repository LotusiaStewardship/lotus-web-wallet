# Background Service Worker Integration Plan

## Overview

This plan outlines the integration of a background service worker architecture into the lotus-web-wallet. The goal is to provide consistent runtime behavior for network activity, session management, and time-sensitive notifications that must continue operating when the browser tab is inactive or in the background.

**Created**: December 11, 2024
**Updated**: December 11, 2024
**Scope**: Service worker architecture, background network operations, session monitoring, push notifications, cryptographic operations offloading
**Priority**: P1 (High)
**Estimated Effort**: 7-9 days

---

## Problem Statement

The current lotus-web-wallet architecture relies on foreground JavaScript execution for all network operations and state management. This creates several issues:

### Current Limitations

| Issue                       | Impact                                                                    | Affected Modules                          |
| --------------------------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| **Tab suspension**          | Mobile browsers aggressively suspend background tabs, causing stale state | `stores/wallet.ts`, `services/chronik.ts` |
| **WebSocket disconnection** | Chronik WebSocket disconnects when tab is inactive                        | `services/chronik.ts`                     |
| **P2P connection drops**    | libp2p connections are lost when tab is backgrounded                      | `services/p2p.ts`, `stores/p2p.ts`        |
| **MuSig2 session timeouts** | Signing sessions expire without user notification                         | `services/musig2.ts`, `stores/musig2.ts`  |
| **Missed transactions**     | Incoming transactions not detected while tab is inactive                  | `stores/wallet.ts`                        |
| **Presence expiration**     | P2P presence advertisements expire without refresh                        | `services/p2p.ts`                         |

### Current Workarounds

The codebase has a visibility change handler in `stores/wallet.ts` (lines 572-584) that refreshes UTXOs when the tab becomes visible. This is a reactive workaround, not a proactive solution.

---

## Proposed Architecture

### Service Worker Responsibilities

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SERVICE WORKER LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │  Network Monitor    │  │  Session Monitor    │  │  Push Handler       │ │
│  │  ─────────────────  │  │  ─────────────────  │  │  ─────────────────  │ │
│  │  • Chronik polling  │  │  • MuSig2 timeouts  │  │  • Browser notifs   │ │
│  │  • Balance checks   │  │  • P2P presence     │  │  • Click handling   │ │
│  │  • Block updates    │  │  • Session expiry   │  │  • Badge updates    │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐                          │
│  │  State Sync         │  │  Message Broker     │                          │
│  │  ─────────────────  │  │  ─────────────────  │                          │
│  │  • IndexedDB cache  │  │  • SW ↔ Client      │                          │
│  │  • Offline support  │  │  • Event dispatch   │                          │
│  │  • Conflict resolve │  │  • State updates    │                          │
│  └─────────────────────┘  └─────────────────────┘                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER (Existing)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  services/chronik.ts  │  services/p2p.ts  │  services/musig2.ts            │
│  stores/wallet.ts     │  stores/p2p.ts    │  stores/musig2.ts              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Modules Requiring Background Integration

### Critical (P0)

| Module                        | Current Location      | Background Need                               |
| ----------------------------- | --------------------- | --------------------------------------------- |
| **Chronik WebSocket**         | `services/chronik.ts` | Maintain connection, poll when WS unavailable |
| **Transaction Detection**     | `stores/wallet.ts`    | Detect incoming transactions in background    |
| **MuSig2 Session Monitoring** | `services/musig2.ts`  | Track session timeouts, notify before expiry  |

### High Priority (P1)

| Module                     | Current Location   | Background Need                              |
| -------------------------- | ------------------ | -------------------------------------------- |
| **P2P Presence**           | `services/p2p.ts`  | Refresh presence advertisements periodically |
| **Signing Request Alerts** | `stores/musig2.ts` | Notify of incoming signing requests          |
| **Balance Polling**        | `stores/wallet.ts` | Periodic balance verification                |

### Medium Priority (P2)

| Module                     | Current Location            | Background Need                              |
| -------------------------- | --------------------------- | -------------------------------------------- |
| **Block Height Updates**   | `services/chronik.ts`       | Track confirmations for pending transactions |
| **RANK Activity**          | `composables/useRankApi.ts` | Monitor voting activity on watched profiles  |
| **Shared Wallet Balances** | `stores/musig2.ts`          | Monitor shared wallet balance changes        |

---

## Phase Summary

| Phase | Document                        | Focus Area                                    | Priority | Est. Effort |
| ----- | ------------------------------- | --------------------------------------------- | -------- | ----------- |
| 1     | 01_SERVICE_WORKER_FOUNDATION.md | Core SW setup with @vite-pwa/nuxt, TypeScript | P0       | 1-2 days    |
| 2     | 02_NETWORK_MONITOR.md           | Chronik polling, transaction detection        | P0       | 1-2 days    |
| 3     | 03_SESSION_MONITOR.md           | MuSig2 timeouts, P2P presence refresh         | P1       | 1 day       |
| 4     | 04_PUSH_NOTIFICATIONS.md        | Browser notifications from SW, badge updates  | P1       | 1 day       |
| 5     | 05_STATE_SYNCHRONIZATION.md     | IndexedDB caching, client-SW state sync       | P2       | 1 day       |
| 6     | 06_CRYPTO_WORKER.md             | Web Worker for cryptographic operations       | P1       | 1-2 days    |

**Total Estimated Effort**: 7-9 days

---

## Dependencies

### Internal Dependencies

| Dependency                | Required For | Status   |
| ------------------------- | ------------ | -------- |
| `services/chronik.ts`     | Phase 2      | Complete |
| `services/p2p.ts`         | Phase 3      | Complete |
| `services/musig2.ts`      | Phase 3      | Complete |
| `stores/notifications.ts` | Phase 4      | Complete |
| `services/storage.ts`     | Phase 5      | Complete |

### External Dependencies

| Dependency         | Required For | Status    |
| ------------------ | ------------ | --------- |
| @vite-pwa/nuxt     | Phase 1      | Available |
| Service Worker API | All phases   | Available |
| IndexedDB          | Phase 5      | Available |
| Push API           | Phase 4      | Available |
| Notification API   | Phase 4      | Available |
| Web Worker API     | Phase 6      | Available |
| Web Crypto API     | Phase 6      | Available |

---

## Relationship to Other Plans

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       lotus-web-wallet Plans                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────┐                                           │
│  │  background-service-worker  │◄── THIS PLAN                              │
│  │  (Background Operations)    │                                           │
│  │  - 5 phases                 │                                           │
│  └──────────────┬──────────────┘                                           │
│                 │                                                           │
│                 │ ENABLES                                                   │
│                 ▼                                                           │
│  ┌─────────────────────────────┐                                           │
│  │  notification-system        │                                           │
│  │  Phase 4: Browser Notifs    │◄── Requires SW for background alerts      │
│  └─────────────────────────────┘                                           │
│                                                                             │
│  ┌─────────────────────────────┐                                           │
│  │  unified-p2p-musig2-ui      │                                           │
│  │  Phase 4: Signing Flow      │◄── Requires SW for session monitoring     │
│  │  Phase 6: Polish            │◄── Requires SW for reliable notifications │
│  └─────────────────────────────┘                                           │
│                                                                             │
│  ┌─────────────────────────────┐                                           │
│  │  unified-remaining-tasks    │                                           │
│  │  Phase 2: Social/RANK       │◄── Can use SW for activity monitoring     │
│  └─────────────────────────────┘                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Integration Points

1. **notification-system/04_BROWSER_NOTIFICATIONS.md**

   - Currently describes basic browser notification support
   - This plan provides the service worker foundation that enables true background notifications
   - Phase 4 of this plan supersedes/enhances that phase

2. **unified-p2p-musig2-ui/04_SIGNING_FLOW.md**

   - Signing sessions have timeouts (SESSION_TIMEOUT in `types/musig2.ts`)
   - Phase 3 of this plan enables proactive timeout warnings
   - Users will be notified before sessions expire, even with tab backgrounded

3. **unified-remaining-tasks/02_SOCIAL_RANK.md**
   - RANK activity monitoring could benefit from background polling
   - Phase 2 of this plan provides the infrastructure for this

---

## Implementation Order

### Recommended Sequence

1. **Phase 1: Service Worker Foundation** (P0)

   - Must be done first - provides infrastructure for all other phases
   - Sets up message passing between SW and client

2. **Phase 2: Network Monitor** (P0)

   - Critical for core wallet functionality
   - Ensures transactions are detected even when tab is inactive

3. **Phase 3: Session Monitor** (P1)

   - Important for MuSig2 reliability
   - Should be done alongside unified-p2p-musig2-ui Phase 4

4. **Phase 4: Push Notifications** (P1)

   - Enhances notification-system Phase 4
   - Provides true background notification capability

5. **Phase 5: State Synchronization** (P2)
   - Lower priority but improves reliability
   - Can be done in parallel with other work

---

## Success Criteria

### Functional Requirements

- [ ] Service worker registers and activates successfully
- [ ] Incoming transactions detected while tab is in background
- [ ] MuSig2 session timeout warnings appear before expiry
- [ ] P2P presence remains active while tab is backgrounded
- [ ] Browser notifications work from service worker
- [ ] State synchronizes correctly between SW and client

### Technical Requirements

- [ ] No TypeScript errors in service worker code
- [ ] Service worker survives browser restarts (persistent registration)
- [ ] Message passing works reliably between SW and all clients
- [ ] IndexedDB operations are atomic and handle conflicts
- [ ] Graceful degradation when SW is not supported

### Performance Requirements

- [ ] Service worker does not impact page load time
- [ ] Background polling uses minimal battery/data
- [ ] State sync does not cause UI jank

---

## Files Structure

```
docs/plans/background-service-worker/
├── 00_OVERVIEW.md                    # This file
├── 01_SERVICE_WORKER_FOUNDATION.md   # Core SW setup with @vite-pwa/nuxt
├── 02_NETWORK_MONITOR.md             # Chronik polling, tx detection
├── 03_SESSION_MONITOR.md             # MuSig2/P2P session management
├── 04_PUSH_NOTIFICATIONS.md          # Browser notifications from SW
├── 05_STATE_SYNCHRONIZATION.md       # IndexedDB caching, state sync
├── 06_CRYPTO_WORKER.md               # Web Worker for crypto operations
└── STATUS.md                         # Progress tracking
```

---

## Technical Considerations

### Build Pipeline: @vite-pwa/nuxt

This plan uses the official `@vite-pwa/nuxt` module for proper Nuxt 3 integration:

- **TypeScript Support**: Service worker written in TypeScript, transpiled by Vite
- **Workbox Integration**: Uses `injectManifest` strategy for custom SW logic
- **Development Support**: Hot reload and debugging during development
- **PWA Features**: Manifest generation, offline support, install prompts

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@vite-pwa/nuxt'],
  pwa: {
    strategies: 'injectManifest',
    srcDir: 'service-worker',
    filename: 'sw.ts',
    // ... additional options
  },
})
```

### Service Worker Limitations

- **No DOM access**: SW cannot directly manipulate the page
- **No synchronous storage**: Must use IndexedDB, not localStorage
- **Limited lifetime**: SW may be terminated when idle
- **HTTPS required**: SW only works on secure origins (localhost exempt)

### Web Worker for Crypto (Phase 6)

Cryptographic operations are offloaded to a dedicated Web Worker (not the service worker) because:

- **CPU-intensive**: Key derivation, signing block the main thread
- **Transferable objects**: Can pass ArrayBuffers efficiently
- **Dedicated thread**: Doesn't compete with SW lifecycle

### Browser Compatibility

| Feature         | Chrome | Firefox | Safari     | Edge |
| --------------- | ------ | ------- | ---------- | ---- |
| Service Worker  | ✅     | ✅      | ✅         | ✅   |
| Web Worker      | ✅     | ✅      | ✅         | ✅   |
| Push API        | ✅     | ✅      | ⚠️ Limited | ✅   |
| Background Sync | ✅     | ❌      | ❌         | ✅   |
| Periodic Sync   | ✅     | ❌      | ❌         | ✅   |
| Web Crypto API  | ✅     | ✅      | ✅         | ✅   |

### Fallback Strategy

For browsers with limited SW support:

1. Continue using existing visibility change handlers
2. Use more aggressive polling when tab is visible
3. Show warnings about reduced functionality
4. Crypto operations fall back to main thread (slower but functional)

---

## Notes

- This plan focuses on **background operations** that benefit from service worker execution
- The existing foreground services remain the primary implementation
- Service worker acts as a **reliability layer**, not a replacement
- Phase 4 (Push Notifications) should be coordinated with `notification-system` plan
- Phase 3 (Session Monitor) should be coordinated with `unified-p2p-musig2-ui` plan

---

_Created: December 11, 2024_
