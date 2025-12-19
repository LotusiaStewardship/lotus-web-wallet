# UI Pattern Consistency Remediation - Status

**Last Updated**: December 18, 2025  
**Overall Status**: 🟡 Planning Complete - Ready for Implementation

---

## Progress Overview

| Phase   | Description             | Status         | Progress |
| ------- | ----------------------- | -------------- | -------- |
| Phase 1 | Component Consolidation | 🔴 Not Started | 0%       |
| Phase 2 | Pattern Standardization | 🔴 Not Started | 0%       |
| Phase 3 | Visual Consistency      | 🔴 Not Started | 0%       |

---

## Phase 1: Component Consolidation

### Task 1.1: Create Unified SignerCard

- [ ] Create `components/common/SignerCard.vue`
- [ ] Define unified props interface
- [ ] Implement configurable primary action
- [ ] Add avatar with initials support
- [ ] Update `components/p2p/SignerList.vue`
- [ ] Update `components/shared-wallets/AvailableSigners.vue`
- [ ] Delete `components/p2p/SignerCard.vue`
- [ ] Delete `components/shared-wallets/SignerCard.vue`
- [ ] Test P2P page functionality
- [ ] Test Shared Wallets page functionality

### Task 1.2: Refactor P2P HeroCard

- [ ] Audit `components/p2p/HeroCard.vue`
- [ ] Align styling with `UiAppHeroCard`
- [ ] Document as intentional domain extension
- [ ] Test visual appearance

### Task 1.3: Consolidate SignerDetailModal

- [ ] Create `components/common/SignerDetailModal.vue`
- [ ] Update P2P page usage
- [ ] Update Shared Wallets page usage
- [ ] Delete old modal components

---

## Phase 2: Pattern Standardization

### Task 2.1: Empty State Standardization

- [ ] Update `pages/people/contacts.vue`
- [ ] Audit `pages/transact/history.vue`
- [ ] Audit `pages/explore/explorer/index.vue`
- [ ] Verify all empty states use `UiAppEmptyState`

### Task 2.2: Card Wrapper Standardization

- [ ] Audit `components/p2p/` directory
- [ ] Audit `components/musig2/` directory
- [ ] Audit `components/shared-wallets/` directory
- [ ] Document decisions for non-standard implementations

### Task 2.3: Loading State Standardization

- [ ] Create/update skeleton components
- [ ] Ensure consistent `animate-pulse` usage
- [ ] Standardize skeleton item counts

### Task 2.4: Modal Pattern Standardization

- [ ] Audit all modal components
- [ ] Verify header pattern (icon + title)
- [ ] Verify footer button order
- [ ] Ensure Cancel button always available

---

## Phase 3: Visual Consistency

### Task 3.1: Badge Color Semantics

- [ ] Document badge color meanings
- [ ] Update `ContactCard` badges
- [ ] Verify `SignerCard` badges
- [ ] Verify `SharedWalletCard` badges
- [ ] Verify `AvailableSigners` badges

### Task 3.2: Avatar Consistency

- [ ] Create `components/common/EntityAvatar.vue`
- [ ] Update `ContactCard` to use new component
- [ ] Update `SignerCard` to use new component
- [ ] Verify online indicator positioning

### Task 3.3: Action Button Patterns

- [ ] Verify list items use inline pattern
- [ ] Verify cards use footer pattern
- [ ] Verify modals use standard footer
- [ ] Update `SharedWalletCard` actions

### Task 3.4: Icon Consistency

- [ ] Audit icon usage across components
- [ ] Document standard icons
- [ ] Fix inconsistencies

---

## Issues & Blockers

| Issue           | Severity | Status | Notes |
| --------------- | -------- | ------ | ----- |
| None identified | -        | -      | -     |

---

## Decisions Log

| Date       | Decision                               | Rationale                                               |
| ---------- | -------------------------------------- | ------------------------------------------------------- |
| 2025-12-18 | Keep P2P HeroCard as domain-specific   | Complex state management requires specialized component |
| 2025-12-18 | Create unified SignerCard in `common/` | Eliminate duplication, single source of truth           |
| 2025-12-18 | Standardize on `UiAppEmptyState`       | Consistent empty state UX across app                    |

---

## Testing Notes

### Manual Testing Required

After each phase:

1. Navigate to `/people/p2p` - verify all tabs work
2. Navigate to `/people/shared-wallets` - verify wallet list and signers
3. Navigate to `/people/contacts` - verify contact list and actions
4. Test on mobile viewport (< 768px)
5. Test dark mode

### Regression Risks

- SignerCard changes may affect P2P signing flow
- Empty state changes may affect conditional rendering
- Avatar changes may affect layout spacing

---

## Completion Criteria

- [ ] All duplicate components eliminated
- [ ] All empty states use `UiAppEmptyState`
- [ ] All badges use semantic colors
- [ ] All avatars render consistently
- [ ] All action buttons follow established patterns
- [ ] No TypeScript errors
- [ ] No visual regressions
- [ ] Documentation updated

---

_Status tracking for UI Pattern Consistency Remediation_
