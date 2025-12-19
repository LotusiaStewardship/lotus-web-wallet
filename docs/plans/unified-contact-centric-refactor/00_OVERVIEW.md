# Unified Contact-Centric Refactor Plan

**Version**: 1.1.0  
**Date**: December 18, 2025  
**Status**: Planning Complete  
**Scope**: lotus-web-wallet (primary) + lotus-sdk (secondary)

---

## Critical Prerequisites

> ⚠️ **BEFORE IMPLEMENTING ANY FEATURE**, consult:
>
> - [07_HUMAN_CENTERED_UX.md](../../architecture/design/07_HUMAN_CENTERED_UX.md) — Human-centered UX principles (REQUIRED)

Every implementation must satisfy the UX checklist and principles defined in the Human-Centered UX document. No feature ships without answering:

1. **"What can I do here?"** — Clear purpose and value proposition
2. **"How do I do it?"** — Obvious, intuitive actions
3. **"Did it work?"** — Clear feedback and confirmation
4. **"What went wrong?"** — Actionable error recovery

---

## Executive Summary

This comprehensive plan unifies three major initiatives into a single cohesive implementation:

1. **BIP44 Multi-Address Architecture** - Support for multiple account types (primary wallet, MuSig2 signing key, future accounts)
2. **P2P Contact Integration** - Fixing P2P/MuSig2 issues and creating a unified identity model
3. **Contact-Centric UI/UX Redesign** - Restructuring the application around contacts as the primary entity

**Total Estimated Duration**: 11-16 weeks  
**Priority**: P0 (Critical - Core Architecture)

---

## The Vision

The Lotus Web Wallet is evolving from a **wallet-centric** application to a **contact-centric** application. This shift recognizes that the long-term goal is to be a **central hub for human-to-human communication** on the Lotus blockchain.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTACT-CENTRIC MODEL                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                       ┌───────────┐                              │
│                       │  CONTACT  │                              │
│                       │ (Identity)│                              │
│                       └─────┬─────┘                              │
│                             │                                    │
│    ┌────────────────────────┼────────────────────────┐           │
│    │                        │                        │           │
│    ▼                        ▼                        ▼           │
│ ┌──────────┐          ┌──────────┐          ┌──────────┐        │
│ │  Wallet  │          │   P2P    │          │  MuSig2  │        │
│ │(addresses)│         │(presence)│          │(signing) │        │
│ └──────────┘          └──────────┘          └──────────┘        │
│                                                                  │
│ Solution: Unified identity connects all capabilities             │
│ - One contact = one cryptographic identity                       │
│ - Address derived from public key                                │
│ - P2P presence linked to identity                                │
│ - MuSig2 capabilities are contact attributes                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Problem Statement

### Current Issues

| Category     | Issue                                                                   | Severity |
| ------------ | ----------------------------------------------------------------------- | -------- |
| **Identity** | Three disconnected identity concepts (Contact, P2P Peer, MuSig2 Signer) | HIGH     |
| **BIP44**    | Single address/key for all operations (spending, signing, identity)     | HIGH     |
| **P2P**      | Auto-connect setting not respected on startup                           | HIGH     |
| **P2P**      | Online signers don't persist through page reloads                       | HIGH     |
| **MuSig2**   | Shared wallet shows "Address pending..." (no key aggregation)           | HIGH     |
| **Contacts** | Contacts saved from signers have empty addresses                        | HIGH     |
| **MuSig2**   | Duplicate signer entries in Available Signers                           | MEDIUM   |
| **UX**       | Wallet-centric navigation doesn't reflect contact relationships         | MEDIUM   |
| **UX**       | No progressive disclosure of advanced features                          | MEDIUM   |

### Root Cause

The fundamental issue is **lack of a unified identity model**. The wallet has three separate identity concepts that are not connected:

- **libp2p PeerId** (P2P Store) - Transport/connectivity
- **Bitcore PublicKey** (MuSig2 Store) - Signing/cryptography
- **Contact** (Contacts Store) - User-facing identity

---

## Unified Phase Structure

The implementation is organized into **7 phases**, ordered by dependency:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: FOUNDATION                                   │
│  Identity types, Identity store, address derivation utilities            │
│  Duration: 1-2 weeks                                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: BIP44 MULTI-ADDRESS                          │
│  Account types, wallet store refactor, crypto worker updates             │
│  Duration: 2-3 weeks                                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: P2P INFRASTRUCTURE                           │
│  Auto-connect, discovery cache persistence, advertisement deduplication  │
│  Duration: 1-2 weeks                                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 4: CONTACT SYSTEM REFACTOR                      │
│  Contact-identity linking, address derivation, online status             │
│  Duration: 1-2 weeks                                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 5: MUSIG2 INTEGRATION                           │
│  Key aggregation, shared wallet improvements, MuSig2 key isolation       │
│  Duration: 1-2 weeks                                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 6: UI/UX RESTRUCTURE                            │
│  Contact-centric navigation, new components, progressive disclosure      │
│  Duration: 2-3 weeks                                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 7: POLISH & MIGRATION                           │
│  Data migration, testing, documentation, cleanup                         │
│  Duration: 1-2 weeks                                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 PHASE 8: REMAINING ISSUES & BUG FIXES                    │
│  Chronik subscriptions, contact persistence, network-aware addresses     │
│  Duration: 1-2 weeks                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase Summaries

### Phase 1: Foundation (1-2 weeks)

**Goal**: Establish the unified identity model and core utilities.

- Create `types/identity.ts` with Identity interface
- Create `types/accounts.ts` with BIP44 account types
- Create `stores/identity.ts` for identity management
- Create `utils/identity.ts` with address derivation utilities
- Add public key validation and derivation functions

### Phase 2: BIP44 Multi-Address (2-3 weeks)

**Goal**: Support multiple account types derived from single seed phrase.

- Refactor wallet store to support `Map<AccountPurpose, AccountState>`
- Update crypto worker for account-aware key derivation
- Add account configuration and management
- Maintain backward compatibility with existing wallets
- Implement storage schema migration (v1 → v2)

### Phase 3: P2P Infrastructure (1-2 weeks)

**Goal**: Fix P2P connectivity issues and improve reliability.

- Create P2P initialization plugin for auto-connect
- Implement discovery cache persistence (localStorage)
- Fix advertisement deduplication (deterministic IDs)
- Add cache expiry cleanup
- SDK changes for cache injection

### Phase 4: Contact System Refactor (1-2 weeks)

**Goal**: Link contacts to unified identities.

- Update Contact interface with `identityId` field
- Implement `addContact()` with automatic address derivation
- Add `updateContactFromSigner()` action
- Implement multi-signal online status detection
- Create contact migration script

### Phase 5: MuSig2 Integration (1-2 weeks)

**Goal**: Proper key aggregation and MuSig2 key isolation.

- Implement MuSig2 key aggregation in `createSharedWallet()`
- Use dedicated MuSig2 account key (from Phase 2)
- Enable offline wallet viewing (P2P only for spending)
- Fix participant online status display
- Update signing operations to use correct keys

### Phase 6: UI/UX Restructure (2-3 weeks)

**Goal**: Contact-centric interface with progressive disclosure.

- Create contact-aware address display components
- Implement AccountSelector and AccountBadge components
- Update navigation to elevate "People" section
- Add relationship indicators (online, MuSig2, favorite)
- Implement progressive disclosure patterns
- Add loading skeletons and empty states

### Phase 7: Polish & Migration (1-2 weeks)

**Goal**: Production-ready release.

- Run data migrations on existing wallets
- Comprehensive testing (unit, integration, E2E)
- Update documentation
- Remove deprecated code patterns
- Performance optimization

### Phase 8: Remaining Issues & Bug Fixes (1-2 weeks)

**Goal**: Address remaining issues from TODO.md not covered by Phases 1-7.

- Fix Chronik WS subscriptions (only subscribe to receivable addresses)
- Fix contact state persistence in shared wallet context
- Implement network-aware address derivation (livenet vs testnet)
- Include main wallet address in P2P advertisements
- (Optional) WebRTC integration for accurate online status

---

## Key Architectural Decisions

### 1. Public Key as Canonical Identifier

The public key is the **source of truth** for identity. Addresses are derived, not stored separately.

```typescript
interface Identity {
  publicKeyHex: string     // Canonical identifier
  address: string          // Derived from publicKey
  peerId?: string          // P2P connectivity
  isOnline: boolean        // Presence state
  signerCapabilities?: ... // MuSig2 capabilities
}
```

### 2. BIP44 Account Separation

Different operations use different derived keys:

| Account | Path                  | Purpose                                 |
| ------- | --------------------- | --------------------------------------- |
| PRIMARY | `m/44'/10605'/0'/0/0` | Main wallet, receiving, identity        |
| MUSIG2  | `m/44'/10605'/1'/0/0` | MuSig2 signing (isolated from spending) |
| SWAP    | `m/44'/10605'/2'/0/0` | Future: Atomic swaps                    |
| PRIVACY | `m/44'/10605'/3'/0/0` | Future: Privacy features                |

### 3. N-of-N MuSig2 Architecture

MuSig2 shared wallets are **always n-of-n** (all participants must sign):

- **2-of-2**: Two participants, both must sign
- **3-of-3**: Three participants, all must sign
- **5-of-5**: Five participants, all must sign
- **N-of-N**: Any number of participants, all must sign

> **Note**: This differs from FROST which supports m-of-n thresholds. MuSig2 requires unanimous consent.

The contact-centric design supports this by:

- Allowing selection of multiple contacts as participants
- Displaying all participants with their online status
- Coordinating signing sessions across all n participants

### 4. Contact-Identity Linking

Contacts reference identities, enabling unified capabilities:

```typescript
interface Contact {
  id: string
  name: string
  identityId?: string // Links to Identity
  address: string // Derived or legacy
  // ... relationship metadata
}
```

### 5. Progressive Relationship Depth

Contacts have varying levels of capability:

- **Level 0**: Name only (minimal contact)
- **Level 1**: Address known (can transact)
- **Level 2**: Public key + P2P (presence, discovery)
- **Level 3**: Active signer (MuSig2 capabilities)

---

## Dependencies

### External Dependencies

- **lotus-sdk**: SDK changes for cache injection, deterministic advertisement IDs
- **Chronik**: No changes required (supports multiple subscriptions)

### Internal Dependencies

```
Phase 1 ──┬──▶ Phase 2 (needs identity types)
          ├──▶ Phase 4 (needs identity store)
          └──▶ Phase 5 (needs identity utilities)

Phase 2 ────▶ Phase 5 (needs multi-account keys)

Phase 3 ────▶ Phase 5 (needs cache persistence)

Phase 4 ──┬──▶ Phase 5 (needs contact-identity linking)
          └──▶ Phase 6 (needs contact system)

Phase 5 ────▶ Phase 6 (needs MuSig2 integration)

Phase 6 ────▶ Phase 7 (needs UI complete)
```

---

## Risk Mitigation

| Risk                                     | Probability | Impact | Mitigation                                        |
| ---------------------------------------- | ----------- | ------ | ------------------------------------------------- |
| SDK changes break wallet                 | Medium      | High   | Version pin SDK, comprehensive testing            |
| Performance impact from multi-derivation | Low         | Medium | Lazy derivation, caching, crypto worker           |
| User confusion about accounts            | Medium      | Medium | Progressive disclosure, clear labeling            |
| N-of-N coordination failures             | Medium      | Medium | Clear UI for participant status, timeout handling |

---

## Success Metrics

### Technical Metrics

- No increase in wallet load time (< 500ms)
- All tests passing
- MuSig2 key isolated from spending key
- N-of-N signing coordination works for 2-10+ participants

### User Metrics

- No support tickets about lost funds
- Contact-aware features used by > 50% of users
- N-of-N shared wallets successfully created and used

### UX Metrics

- Reduced clicks to common actions
- Improved discoverability of MuSig2 features
- Clear relationship indicators

---

## Document Index

| Document                                                       | Description                                 |
| -------------------------------------------------------------- | ------------------------------------------- |
| [00_OVERVIEW.md](./00_OVERVIEW.md)                             | This document - comprehensive plan overview |
| [01_PHASE_FOUNDATION.md](./01_PHASE_FOUNDATION.md)             | Phase 1: Identity types and store           |
| [02_PHASE_BIP44.md](./02_PHASE_BIP44.md)                       | Phase 2: Multi-address architecture         |
| [03_PHASE_P2P.md](./03_PHASE_P2P.md)                           | Phase 3: P2P infrastructure fixes           |
| [04_PHASE_CONTACTS.md](./04_PHASE_CONTACTS.md)                 | Phase 4: Contact system refactor            |
| [05_PHASE_MUSIG2.md](./05_PHASE_MUSIG2.md)                     | Phase 5: MuSig2 integration                 |
| [06_PHASE_UI.md](./06_PHASE_UI.md)                             | Phase 6: UI/UX restructure                  |
| [07_PHASE_POLISH.md](./07_PHASE_POLISH.md)                     | Phase 7: Polish and migration               |
| [08_PHASE_REMAINING_ISSUES.md](./08_PHASE_REMAINING_ISSUES.md) | Phase 8: Remaining issues & bug fixes       |
| [STATUS.md](./STATUS.md)                                       | Implementation progress tracker             |

---

## Related Documentation

### Existing Plans (Superseded)

- `docs/plans/bip44-multi-address/` - BIP44 implementation details
- `docs/plans/p2p-contact-integration/` - P2P fixes and contact integration

### Design Philosophy

- `docs/architecture/design/00_PHILOSOPHY.md` - Contact-centric design philosophy
- `docs/architecture/design/01_IDENTITY_MODEL.md` - Unified identity architecture
- `docs/architecture/design/02_CONTACT_SYSTEM.md` - Contact management design
- `docs/architecture/design/03_RELATIONSHIP_LAYERS.md` - Relationship layer model
- `docs/architecture/design/04_UI_PATTERNS.md` - Contact-centric UI patterns
- `docs/architecture/design/05_DATA_FLOW.md` - Data flow architecture
- `docs/architecture/design/06_MIGRATION_GUIDE.md` - Migration guidance

---

_Created: December 18, 2025_  
_Status: Planning Complete - Ready for Implementation_
