# Unified Remaining Tasks Plan

## Overview

This plan consolidates all remaining tasks from the **UX Implementation** and **Refactor** plans that are **not covered** by the `unified-p2p-musig2-ui` plan. It provides a single source of truth for completing the lotus-web-wallet.

**Created**: December 11, 2024
**Scope**: Explorer, Social/RANK, Code Cleanup, Polish & Accessibility

---

## Background

Three implementation plans exist for the lotus-web-wallet:

1. **UX Implementation Plan** (`docs/plans/ux-implementation/`)

   - 12 phases covering the complete UX overhaul
   - Phases 1-6, 10-11 complete
   - Phases 7-9, 12 pending/deferred

2. **Refactor Plan** (`docs/plans/refactor/`)

   - 34 phases covering architecture and code refactoring
   - Phases 1-28, 31-34 complete
   - Phases 29-30 pending

3. **Unified P2P/MuSig2 UI Plan** (`docs/plans/unified-p2p-musig2-ui/`)
   - 6 phases covering P2P and MuSig2 UI integration
   - All phases pending
   - **Covers**: UX Phase 9 (P2P Network)

This unified plan covers everything **not** in the P2P/MuSig2 plan.

---

## Scope Exclusions

The following are **explicitly excluded** from this plan (handled by `unified-p2p-musig2-ui`):

- P2P page structure and components
- MuSig2 shared wallet UI
- Signing request flows
- P2P/MuSig2 contact integration
- P2P-related loading states and polish

---

## Phase Summary

| Phase | Document                        | Focus Area                      | Priority | Est. Effort |
| ----- | ------------------------------- | ------------------------------- | -------- | ----------- |
| 1     | 01_EXPLORER_DETAIL.md           | Explorer detail pages           | P1       | 2-3 days    |
| 2     | 02_SOCIAL_RANK.md               | Social/RANK voting UI           | P2       | 2-3 days    |
| 3     | 03_DEPRECATE_USEUTILS.md        | Remove useUtils.ts dependencies | P1       | 0.5 days    |
| 4     | 04_POLISH_ACCESSIBILITY.md      | Keyboard, a11y, performance     | P3       | 2-3 days    |
| 5     | 05_FINAL_VERIFICATION.md        | Testing and verification        | P0       | 1-2 days    |
| 6     | 06_CROSS_FEATURE_INTEGRATION.md | Unified UX across features      | P1       | 2-3 days    |

**Total Estimated Effort**: 10-15 days

---

## Dependencies

### External Dependencies

| Dependency  | Required For | Status    |
| ----------- | ------------ | --------- |
| Chronik API | Explorer     | Available |
| RANK API    | Social       | Available |
| lotus-sdk   | All          | Available |

### Internal Dependencies

| Dependency                | Required For | Status   |
| ------------------------- | ------------ | -------- |
| Design system components  | All phases   | Complete |
| New composables           | All phases   | Complete |
| Service layer             | All phases   | Complete |
| Core wallet functionality | All phases   | Complete |

---

## Relationship to Other Plans

```
┌─────────────────────────────────────┐
│     lotus-web-wallet Plans          │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │  unified-p2p-musig2-ui      │    │
│  │  (P2P + MuSig2 UI)          │    │
│  │  - 6 phases                 │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  unified-remaining-tasks    │◄───┼── THIS PLAN
│  │  (Explorer, Social, Polish) │    │
│  │  - 6 phases                 │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  ux-implementation          │    │
│  │  (Reference - mostly done)  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  refactor                   │    │
│  │  (Reference - mostly done)  │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

## Implementation Order

### Recommended Sequence

1. **Phase 3: Deprecate useUtils** (P1)

   - Quick win, cleans up technical debt
   - No dependencies on other phases

2. **Phase 1: Explorer Detail Pages** (P1)

   - High user value
   - Uses existing components and composables

3. **Phase 2: Social/RANK Voting** (P2)

   - Medium priority
   - Depends on wallet functionality

4. **Phase 6: Cross-Feature Integration** (P1)

   - Creates unified UX across features
   - Should be done after unified-p2p-musig2-ui Phase 5 (Contact Integration)

5. **Phase 4: Polish & Accessibility** (P3)

   - Lower priority but important for production
   - Can be done in parallel with P2P/MuSig2 plan

6. **Phase 5: Final Verification** (P0)
   - Must be done last
   - Validates all work

### Parallel Work

These phases can be worked on in parallel with `unified-p2p-musig2-ui`:

- Phase 1 (Explorer)
- Phase 2 (Social)
- Phase 3 (useUtils deprecation)
- Phase 4 (Polish)

Phase 5 (Final Verification) should wait until both plans are complete.

---

## Success Criteria

### Functional Requirements

- [ ] Explorer shows full transaction details with raw data
- [ ] Explorer shows full address details with history
- [ ] Explorer shows full block details with transactions
- [ ] Social search finds profiles across platforms
- [ ] Voting works with amount selection and confirmation
- [ ] Vote history is visible and exportable
- [ ] All useUtils usages migrated to new composables
- [ ] Keyboard shortcuts work globally
- [ ] Accessibility audit passes WCAG AA

### Technical Requirements

- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] No duplicate exports
- [ ] Lighthouse performance score > 90
- [ ] All pages use design system components

---

## Files Structure

```
docs/plans/unified-remaining-tasks/
├── 00_OVERVIEW.md                # This file
├── 01_EXPLORER_DETAIL.md         # Explorer detail pages
├── 02_SOCIAL_RANK.md             # Social/RANK voting
├── 03_DEPRECATE_USEUTILS.md      # useUtils cleanup
├── 04_POLISH_ACCESSIBILITY.md    # Polish and a11y
├── 05_FINAL_VERIFICATION.md      # Testing checklist
├── 06_CROSS_FEATURE_INTEGRATION.md # Unified UX integration
└── STATUS.md                     # Progress tracking
```

---

## Notes

- This plan supersedes the remaining items in `ux-implementation` (Phases 7, 8, 12) and `refactor` (Phases 29, 30)
- The original plans remain for reference but should not be used for implementation
- All new work should follow existing architectural patterns established in the refactor

---

_Created: December 11, 2024_
