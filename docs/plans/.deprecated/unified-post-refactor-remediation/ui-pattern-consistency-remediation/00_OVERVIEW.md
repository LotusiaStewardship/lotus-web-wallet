# UI Pattern Consistency Remediation Plan

**Version**: 1.0.0  
**Date**: December 18, 2025  
**Status**: Planning Complete  
**Scope**: lotus-web-wallet P2P/MuSig2/Shared Contacts UI

---

## Critical Prerequisites

> ⚠️ **BEFORE IMPLEMENTING ANY CHANGES**, consult:
>
> - [07_HUMAN_CENTERED_UX.md](../../architecture/design/07_HUMAN_CENTERED_UX.md) — Human-centered UX principles (REQUIRED)
> - [05_COMPONENTS.md](../../architecture/05_COMPONENTS.md) — Component organization and design patterns

Every implementation must satisfy the UX checklist and principles defined in the Human-Centered UX document.

---

## Executive Summary

This plan addresses UI pattern inconsistencies identified in the recently modified P2P, MuSig2, and Shared Contacts areas of the lotus-web-wallet. The changes deviate from established patterns documented in `docs/architecture/05_COMPONENTS.md` and the Human-Centered UX guidelines.

**Total Estimated Duration**: 3-5 days  
**Priority**: P1 (High - UX Consistency)

---

## Problem Statement

### Identified Issues

| Category                      | Issue                                                                          | Severity |
| ----------------------------- | ------------------------------------------------------------------------------ | -------- |
| **Component Duplication**     | `SignerCard` exists in both `components/p2p/` and `components/shared-wallets/` | HIGH     |
| **Inconsistent Card Styles**  | P2P cards use custom styling vs. established `UiAppCard` pattern               | HIGH     |
| **Mixed List Patterns**       | Some lists use `UCard` directly, others use custom divs                        | MEDIUM   |
| **Inconsistent Empty States** | Different empty state implementations across P2P/MuSig2 pages                  | MEDIUM   |
| **Avatar Inconsistency**      | `ContactCard` uses computed initials, `SignerCard` uses static icon            | MEDIUM   |
| **Action Button Placement**   | Inconsistent action button positioning across card components                  | MEDIUM   |
| **Loading State Variance**    | Different skeleton implementations in different components                     | LOW      |
| **Badge Color Usage**         | Inconsistent badge color semantics across components                           | LOW      |

### Root Cause

The P2P/MuSig2/Shared Contacts UI was developed iteratively across multiple phases without a unified component audit. This resulted in:

1. **Component proliferation** - Similar components created in different directories
2. **Style drift** - Custom CSS instead of using established UI components
3. **Pattern divergence** - Different approaches to common UI patterns (cards, lists, empty states)

---

## Architecture Guidelines Reference

### From `05_COMPONENTS.md` - Established Patterns

```
components/
├── common/          # Shared UI components (17)
├── contacts/        # Contact management (10)
├── ui/              # Base UI elements (10)
└── ...
```

**Key Principles**:

- **Shared components** belong in `components/common/` or `components/ui/`
- **Domain-specific components** belong in their feature directory
- **Naming convention**: `[Domain][Name].vue` (e.g., `ContactCard.vue`)

### From `07_HUMAN_CENTERED_UX.md` - UX Requirements

1. **Consistency Requirements** (Principle 9):

   - Same icons for same actions across app
   - Same colors for same meanings
   - Same component styles (buttons, cards, modals)
   - Primary action always in same position

2. **Progressive Disclosure** (Principle 1):
   - Level 1: Essential (Always Visible)
   - Level 2: Contextual (Visible When Relevant)
   - Level 3: Advanced (On Demand)

---

## Detailed Analysis

### Issue 1: Duplicate SignerCard Components

**Current State**:

```
components/
├── p2p/
│   └── SignerCard.vue          # 114 lines, custom styling
└── shared-wallets/
    └── SignerCard.vue          # 105 lines, similar but different
```

**Problems**:

- Near-identical functionality with subtle differences
- Different action buttons ("Request" vs "Add")
- Inconsistent styling approaches
- Maintenance burden (changes needed in two places)

**Solution**: Create unified `CommonSignerCard.vue` with configurable actions.

---

### Issue 2: Card Styling Inconsistency

**P2P HeroCard** (`components/p2p/HeroCard.vue`):

```vue
<div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 p-6 text-white">
```

**Established Pattern** (`components/ui/AppHeroCard.vue`):

```vue
<UCard class="bg-gradient-to-br from-primary-500 to-primary-700 text-white">
```

**Problem**: P2P HeroCard uses custom div styling instead of the established `UiAppHeroCard` component.

**Solution**: Refactor to use `UiAppHeroCard` or extend it.

---

### Issue 3: List Item Patterns

**ContactCard** (`components/contacts/ContactCard.vue`):

- Uses `rounded-lg border` with hover states
- Has `compact` mode support
- Includes activity stats section
- 299 lines, feature-rich

**SignerCard** (`components/p2p/SignerCard.vue`):

- Uses `px-4 py-4 hover:bg-muted/50`
- No compact mode
- No stats section
- 114 lines, simpler

**Problem**: Inconsistent card structure and feature parity.

**Solution**: Establish base card pattern and extend for specific use cases.

---

### Issue 4: Empty State Implementations

**P2P Page** (`pages/people/p2p.vue`):

```vue
<UiAppEmptyState
  icon="i-lucide-users"
  title="No peers connected"
  description="Waiting for peers to connect..."
/>
```

**Contacts Page** (`pages/people/contacts.vue`):

```vue
<div class="p-8 text-center">
  <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100...">
    <UIcon name="i-lucide-users" class="w-8 h-8 text-gray-400" />
  </div>
  <h3 class="font-medium mb-1">No contacts yet</h3>
  ...
</div>
```

**Problem**: P2P uses `UiAppEmptyState`, Contacts uses custom implementation.

**Solution**: Standardize on `UiAppEmptyState` component everywhere.

---

### Issue 5: Avatar Rendering

**ContactCard**:

```typescript
const initials = computed(() => {
  const parts = props.contact.name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return props.contact.name.slice(0, 2).toUpperCase()
})
```

**SignerCard**:

```vue
<UIcon name="i-lucide-user" class="w-6 h-6 text-primary" />
```

**Problem**: Contacts show personalized initials, Signers show generic icon.

**Solution**: Use `CommonAvatar` component with fallback to initials for named entities.

---

### Issue 6: Action Button Positioning

**ContactCard**: Actions in footer, visible on hover (desktop) or always (mobile)

```vue
<div class="flex items-center justify-between gap-2 mt-3 pt-3 border-t
            md:opacity-0 md:group-hover:opacity-100">
```

**SignerCard**: Actions inline, always visible

```vue
<div class="flex items-center gap-1 flex-shrink-0">
  <UButton ... />
</div>
```

**Problem**: Inconsistent action visibility and placement patterns.

**Solution**: Standardize on inline actions for list items, footer actions for detail views.

---

## Remediation Phases

### Phase 1: Component Consolidation (1-2 days)

**Goal**: Eliminate duplicate components and establish shared base components.

#### 1.1 Create Unified SignerCard

Create `components/common/SignerCard.vue`:

- Merge functionality from both existing SignerCard components
- Support configurable primary action (Request/Add/Custom)
- Use `CommonAvatar` for consistent avatar rendering
- Follow `ContactCard` patterns for structure

#### 1.2 Refactor P2P HeroCard

Update `components/p2p/HeroCard.vue`:

- Extend or compose with `UiAppHeroCard`
- Maintain P2P-specific content
- Ensure consistent gradient and spacing

#### 1.3 Delete Duplicate Components

- Remove `components/shared-wallets/SignerCard.vue`
- Update imports in `SharedWalletsAvailableSigners.vue`

---

### Phase 2: Pattern Standardization (1-2 days)

**Goal**: Ensure all components follow established patterns.

#### 2.1 Empty State Standardization

Update all pages to use `UiAppEmptyState`:

- `pages/people/contacts.vue` - Replace custom empty state
- `pages/people/shared-wallets/index.vue` - Verify usage
- `pages/people/p2p.vue` - Already correct, verify consistency

#### 2.2 Card Wrapper Standardization

Ensure all card-based layouts use `UiAppCard`:

- Audit `components/p2p/` for custom card implementations
- Audit `components/musig2/` for custom card implementations
- Refactor to use `UiAppCard` where appropriate

#### 2.3 Loading State Standardization

Create/use consistent skeleton components:

- Use `UiAppSkeleton` for all loading states
- Remove inline skeleton implementations
- Ensure consistent animation timing

---

### Phase 3: Visual Consistency (1 day)

**Goal**: Align visual details across all P2P/MuSig2/Contacts components.

#### 3.1 Badge Color Semantics

Establish and document badge color meanings:
| Color | Meaning |
| --------- | -------------------------------- |
| `success` | Online, Active, Complete |
| `warning` | Pending, Initializing, Caution |
| `error` | Offline, Failed, Error |
| `neutral` | Informational, Count, Default |
| `primary` | Feature badge (MuSig2, etc.) |
| `info` | Network-specific (Testnet, etc.) |

#### 3.2 Avatar Consistency

Ensure all person/entity representations use consistent avatar:

- Named entities: Show initials with computed color
- Anonymous entities: Show icon with neutral background
- Online indicator: Consistent positioning and styling

#### 3.3 Action Button Patterns

Standardize action button patterns:

- **List items**: Inline actions, right-aligned
- **Cards**: Footer actions or hover-reveal
- **Modals**: Footer with Cancel/Primary pattern

---

## Implementation Checklist

### Pre-Implementation

- [ ] Review `07_HUMAN_CENTERED_UX.md` checklist
- [ ] Identify all affected components
- [ ] Create test cases for visual regression

### Phase 1: Component Consolidation

- [ ] Create `components/common/SignerCard.vue`
- [ ] Update `components/p2p/SignerList.vue` to use common component
- [ ] Update `components/shared-wallets/AvailableSigners.vue` to use common component
- [ ] Delete `components/shared-wallets/SignerCard.vue`
- [ ] Refactor `components/p2p/HeroCard.vue` to use `UiAppHeroCard`
- [ ] Test all affected pages

### Phase 2: Pattern Standardization

- [ ] Update `pages/people/contacts.vue` empty state
- [ ] Audit and update card wrappers in `components/p2p/`
- [ ] Audit and update card wrappers in `components/musig2/`
- [ ] Standardize skeleton loading states
- [ ] Test all affected pages

### Phase 3: Visual Consistency

- [ ] Document badge color semantics
- [ ] Update badge usage across components
- [ ] Standardize avatar rendering
- [ ] Standardize action button placement
- [ ] Final visual audit

---

## Success Criteria

### Technical Metrics

- Zero duplicate components for same functionality
- All card-based layouts use `UiAppCard` or documented exceptions
- All empty states use `UiAppEmptyState`
- Consistent badge color usage

### UX Metrics

- Same action = Same visual treatment everywhere
- Consistent loading/empty/error states
- Predictable action button locations

### Maintenance Metrics

- Single source of truth for shared components
- Clear component ownership (common vs domain-specific)
- Documented patterns for future development

---

## Document Index

| Document                                                         | Description                            |
| ---------------------------------------------------------------- | -------------------------------------- |
| [00_OVERVIEW.md](./00_OVERVIEW.md)                               | This document - comprehensive overview |
| [01_COMPONENT_CONSOLIDATION.md](./01_COMPONENT_CONSOLIDATION.md) | Phase 1: Component deduplication       |
| [02_PATTERN_STANDARDIZATION.md](./02_PATTERN_STANDARDIZATION.md) | Phase 2: Pattern alignment             |
| [03_VISUAL_CONSISTENCY.md](./03_VISUAL_CONSISTENCY.md)           | Phase 3: Visual details                |
| [STATUS.md](./STATUS.md)                                         | Implementation progress tracker        |

---

## Related Documentation

### Architecture

- `docs/architecture/05_COMPONENTS.md` - Component organization
- `docs/architecture/design/07_HUMAN_CENTERED_UX.md` - UX principles

### Existing Plans

- `docs/plans/unified-contact-centric-refactor/` - Contact-centric redesign
- `docs/plans/unified-p2p-musig2-ui/` - P2P/MuSig2 integration

---

_Created: December 18, 2025_  
_Status: Planning Complete - Ready for Implementation_
