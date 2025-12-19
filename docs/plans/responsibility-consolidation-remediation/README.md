# Responsibility Consolidation Remediation

**Status**: Ready for Implementation  
**Created**: December 2024  
**Updated**: December 2024 - Expanded to include UI consolidation  
**Estimated Duration**: 8-10 days

---

## Summary

This remediation plan addresses structural issues identified in the codebase analysis. The plan is **UI/UX complete**, ensuring every backend change includes corresponding frontend updates, and now includes **UI component consolidation** to eliminate duplicate components and standardize UX patterns.

### Analysis Documents

- `docs/analysis/responsibility-consolidation/` - Backend responsibility analysis
- `docs/analysis/ui-ux-consolidation/` - UI/UX consolidation analysis

---

## Key Goals

1. **Eliminate private state leakage** - `draft.ts` no longer accesses `wallet.ts._*` properties
2. **Consolidate identity data** - Single source of truth in `identity.ts`
3. **Create clean API boundaries** - Stores expose public methods, not internal state
4. **Update all affected UI** - 35 components and 11 pages migrated
5. **Eliminate duplicate components** - Merge 10 duplicate components into unified versions
6. **Standardize UX patterns** - Consistent online status, empty states, loading states
7. **Standardize online status** - New `OnlineStatusBadge` component used everywhere

---

## Documents

| Document                                                     | Description                                |
| ------------------------------------------------------------ | ------------------------------------------ |
| [00_MASTER_PLAN.md](./00_MASTER_PLAN.md)                     | Overview, 7 phases, and success criteria   |
| [01_PHASE_DETAILS.md](./01_PHASE_DETAILS.md)                 | Detailed implementation for phases 1-4     |
| [02_COMPONENT_MIGRATION.md](./02_COMPONENT_MIGRATION.md)     | Component-by-component migration guide     |
| [03_TESTING_CHECKLIST.md](./03_TESTING_CHECKLIST.md)         | Comprehensive verification steps           |
| [04_API_REFERENCE.md](./04_API_REFERENCE.md)                 | New public APIs and composables            |
| [05_UI_UX_IMPACT_ANALYSIS.md](./05_UI_UX_IMPACT_ANALYSIS.md) | User-facing changes and visual consistency |
| [06_EXECUTION_TIMELINE.md](./06_EXECUTION_TIMELINE.md)       | Day-by-day breakdown (10 days)             |
| [07_UI_CONSOLIDATION.md](./07_UI_CONSOLIDATION.md)           | UI component consolidation (phases 5-6)    |

---

## Phase Overview

| Phase | Name                       | Duration | Key Deliverables                                            |
| ----- | -------------------------- | -------- | ----------------------------------------------------------- |
| 1     | Wallet API                 | 0.5 days | Public transaction building API                             |
| 2     | Identity Consolidation     | 1.5 days | Unified entity data, store integration                      |
| 3     | Facade Composables         | 1 day    | useContactContext, useSharedWalletContext, useSignerContext |
| 4     | Component Migration        | 2 days   | All 35 components and 11 pages updated                      |
| 5     | UI Component Consolidation | 2 days   | Merge 10 duplicate components, create unified versions      |
| 6     | UX Pattern Standardization | 1 day    | Consistent visual patterns throughout app                   |
| 7     | Cleanup & Testing          | 1 day    | Remove deprecated code, full verification                   |

---

## Affected Modules

### Stores (6)

- `wallet.ts` - Add public API
- `draft.ts` - Use public API
- `identity.ts` - Become canonical source
- `contacts.ts` - Simplify to relationship metadata
- `p2p.ts` - Update identity on events
- `musig2.ts` - Reference identity store

### New Composables (3)

- `useContactContext.ts`
- `useSharedWalletContext.ts`
- `useSignerContext.ts`

### New Components (6)

- `OnlineStatusBadge.vue` - Unified online status display
- `TxItem.vue` - Unified transaction item with variants
- `NetworkStatus.vue` - Unified network status with modes
- `EntityCard.vue` - Unified entity card for contacts/signers
- `CopyableField.vue` - Standardized copy-to-clipboard field

### Components to Delete (10)

- `explorer/AddressDisplay.vue` → merged into `common/AddressDisplay.vue`
- `p2p/SignerDetailModal.vue` → merged into `common/SignerDetailModal.vue`
- `shared-wallets/SignerDetailModal.vue` → merged into `common/SignerDetailModal.vue`
- `wallet/TxItem.vue` → merged into `common/TxItem.vue`
- `history/TxItem.vue` → merged into `common/TxItem.vue`
- `explorer/TxItem.vue` → merged into `common/TxItem.vue`
- `wallet/NetworkStatus.vue` → merged into `common/NetworkStatus.vue`
- `p2p/NetworkStatus.vue` → merged into `common/NetworkStatus.vue`
- `shared-wallets/NetworkStatusBar.vue` → merged into `common/NetworkStatus.vue`
- `p2p/ActivityFeed.vue` → merged into `common/ActivityFeed.vue`

### Components to Migrate (35)

See [02_COMPONENT_MIGRATION.md](./02_COMPONENT_MIGRATION.md)

### Pages to Migrate (11)

See [02_COMPONENT_MIGRATION.md](./02_COMPONENT_MIGRATION.md)

---

## Quick Start

1. Read [00_MASTER_PLAN.md](./00_MASTER_PLAN.md) for overview
2. Follow [06_EXECUTION_TIMELINE.md](./06_EXECUTION_TIMELINE.md) for day-by-day tasks
3. Use [01_PHASE_DETAILS.md](./01_PHASE_DETAILS.md) for implementation details
4. Verify with [03_TESTING_CHECKLIST.md](./03_TESTING_CHECKLIST.md)

---

## Related Documentation

- **Analysis**: `docs/analysis/responsibility-consolidation/`
- **Architecture**: `docs/architecture/`
