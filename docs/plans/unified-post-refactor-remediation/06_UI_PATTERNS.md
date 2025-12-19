# Phase 6: UI Pattern Standardization

**Priority**: P1  
**Effort**: 1-2 days  
**Dependencies**: Phase 5 (UI Component Consolidation)

---

## Overview

This phase ensures all components follow established patterns for empty states, cards, avatars, badges, and action buttons. The goal is consistent UX across P2P/MuSig2/Contacts areas.

---

## Critical Prerequisites

> ⚠️ **BEFORE IMPLEMENTING ANY CHANGES**, consult:
>
> - [07_HUMAN_CENTERED_UX.md](../../architecture/design/07_HUMAN_CENTERED_UX.md) — Human-centered UX principles
> - [05_COMPONENTS.md](../../architecture/05_COMPONENTS.md) — Component organization patterns

---

## Problem Statement

### Identified Inconsistencies

| Category             | Issue                                                | Severity |
| -------------------- | ---------------------------------------------------- | -------- |
| **Empty States**     | P2P uses `UiAppEmptyState`, Contacts uses custom div | MEDIUM   |
| **Card Wrappers**    | Some use `UCard`, others use custom divs             | MEDIUM   |
| **Loading States**   | Different skeleton implementations                   | LOW      |
| **Badge Colors**     | Inconsistent color semantics                         | LOW      |
| **Avatar Rendering** | ContactCard uses initials, SignerCard uses icon      | MEDIUM   |
| **Action Buttons**   | Inconsistent placement patterns                      | MEDIUM   |

---

## Implementation

### Task 6.1: Standardize Empty States to `UiAppEmptyState`

All pages should use the `UiAppEmptyState` component for empty states.

**File**: `pages/people/contacts.vue`

**Before**:

```vue
<div class="p-8 text-center">
  <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100...">
    <UIcon name="i-lucide-users" class="w-8 h-8 text-gray-400" />
  </div>
  <h3 class="font-medium mb-1">No contacts yet</h3>
  <p class="text-sm text-muted mb-4">Add contacts to send Lotus easily</p>
  <UButton icon="i-lucide-plus" @click="openAddContact">
    Add Contact
  </UButton>
</div>
```

**After**:

```vue
<UiAppEmptyState
  icon="i-lucide-users"
  title="No contacts yet"
  description="Add contacts to send Lotus easily"
>
  <template #action>
    <UButton icon="i-lucide-plus" @click="openAddContact">
      Add Contact
    </UButton>
  </template>
</UiAppEmptyState>
```

**Pages to Update**:

- [ ] `pages/people/contacts.vue`
- [ ] `pages/transact/history.vue` (verify)
- [ ] `pages/explore/explorer/index.vue` (verify)
- [ ] `pages/people/shared-wallets/index.vue` (verify)

---

### Task 6.2: Standardize Card Wrappers

Audit and update card-based layouts to use consistent patterns.

**Standard Pattern**:

```vue
<!-- For list items within a card -->
<UCard>
  <template #header>
    <div class="flex items-center justify-between">
      <h3 class="font-semibold">Title</h3>
      <UButton size="sm" variant="ghost">Action</UButton>
    </div>
  </template>

  <div class="divide-y">
    <div v-for="item in items" :key="item.id" class="py-3">
      <!-- Item content -->
    </div>
  </div>
</UCard>

<!-- For standalone cards -->
<UCard class="hover:border-primary transition-colors">
  <!-- Card content -->
</UCard>
```

**Components to Audit**:

- [ ] `components/p2p/HeroCard.vue` - Document as intentional extension
- [ ] `components/p2p/SignerList.vue` - Verify card wrapper
- [ ] `components/musig2/CreateSharedWalletModal.vue` - Verify step cards
- [ ] `components/shared-wallets/SharedWalletCard.vue` - Verify pattern

---

### Task 6.3: Standardize Skeleton Loading States

Create consistent skeleton patterns.

**Standard Pattern**:

```vue
<!-- Skeleton for list items -->
<div v-if="loading" class="space-y-3">
  <div v-for="i in 3" :key="i" class="flex items-center gap-3 p-4">
    <USkeleton class="w-12 h-12 rounded-full" />
    <div class="flex-1 space-y-2">
      <USkeleton class="h-4 w-1/3" />
      <USkeleton class="h-3 w-1/2" />
    </div>
  </div>
</div>

<!-- Skeleton for cards -->
<div v-if="loading" class="grid gap-4 md:grid-cols-2">
  <USkeleton v-for="i in 4" :key="i" class="h-32 rounded-lg" />
</div>
```

**Components to Update**:

- [ ] `components/shared-wallets/AvailableSigners.vue` - Already has skeletons, verify consistency
- [ ] `components/p2p/SignerList.vue` - Add if missing
- [ ] `components/contacts/ContactList.vue` - Add if missing

---

### Task 6.4: Document Badge Color Semantics

Create and document standard badge color meanings.

**File**: `docs/architecture/05_COMPONENTS.md` (add section)

```markdown
## Badge Color Semantics

| Color     | Meaning                             | Examples                         |
| --------- | ----------------------------------- | -------------------------------- |
| `success` | Online, Active, Complete, Confirmed | Online status, Confirmed TX      |
| `warning` | Pending, Initializing, Caution      | Pending TX, Connecting           |
| `error`   | Offline, Failed, Error              | Offline status, Failed TX        |
| `neutral` | Informational, Count, Default       | Transaction count, Default state |
| `primary` | Feature badge, Highlight            | MuSig2 badge, Featured           |
| `info`    | Network-specific, Metadata          | Testnet badge, Version           |
```

**Components to Verify**:

- [ ] `components/contacts/ContactCard.vue` - Verify badge colors
- [ ] `components/common/SignerCard.vue` - Verify badge colors
- [ ] `components/shared-wallets/SharedWalletCard.vue` - Verify badge colors
- [ ] `components/shared-wallets/AvailableSigners.vue` - Verify badge colors

---

### Task 6.5: Standardize Avatar Rendering

Ensure all person/entity representations use consistent avatar patterns.

**Standard Pattern**:

```vue
<!-- Avatar with initials -->
<div class="relative">
  <div
    :class="[
      'rounded-full flex items-center justify-center',
      'bg-primary-100 dark:bg-primary-900/30',
      sizeClass,
    ]"
  >
    <!-- Show initials if name available -->
    <span v-if="initials" class="font-semibold text-primary">
      {{ initials }}
    </span>
    <!-- Fallback to icon -->
    <UIcon v-else name="i-lucide-user" class="text-primary" />
  </div>

  <!-- Online indicator -->
  <span
    v-if="showOnlineIndicator && isOnline"
    class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success-500 border-2 border-white dark:border-gray-900"
  />
</div>
```

**Initials Computation**:

```typescript
const initials = computed(() => {
  if (!name) return null
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})
```

**Components to Verify**:

- [ ] `components/contacts/ContactCard.vue` - Already has initials
- [ ] `components/common/SignerCard.vue` - Updated in Phase 5
- [ ] `components/shared-wallets/ParticipantList.vue` - Verify pattern

---

### Task 6.6: Standardize Action Button Patterns

Establish consistent action button placement.

**Standard Patterns**:

| Context          | Pattern                             | Example                 |
| ---------------- | ----------------------------------- | ----------------------- |
| **List Items**   | Inline actions, right-aligned       | SignerCard, ContactCard |
| **Cards**        | Footer actions or hover-reveal      | SharedWalletCard        |
| **Modals**       | Footer with Cancel/Primary          | All modals              |
| **Detail Views** | Header actions or dedicated section | Contact detail          |

**Modal Footer Pattern**:

```vue
<template #footer>
  <div class="flex justify-end gap-2">
    <UButton color="neutral" variant="ghost" @click="close"> Cancel </UButton>
    <UButton color="primary" :loading="loading" @click="submit">
      {{ primaryActionLabel }}
    </UButton>
  </div>
</template>
```

**Components to Verify**:

- [ ] All modal components use standard footer
- [ ] `components/shared-wallets/SharedWalletCard.vue` - Verify action placement
- [ ] `components/contacts/ContactCard.vue` - Verify hover-reveal pattern

---

## Testing Checklist

### Empty States

1. Navigate to `/people/contacts` with no contacts
2. Verify `UiAppEmptyState` component used
3. Verify action button works
4. Repeat for other pages

### Visual Consistency

1. Compare ContactCard and SignerCard side by side
2. Verify avatar rendering matches
3. Verify badge colors are semantic
4. Verify action button placement consistent

### Dark Mode

1. Enable dark mode
2. Navigate through all P2P/MuSig2/Contacts pages
3. Verify all components render correctly
4. Verify no contrast issues

### Mobile

1. Set viewport to mobile (< 768px)
2. Navigate through all affected pages
3. Verify touch targets adequate
4. Verify no layout issues

---

## Files Summary

| File                                 | Change                    | Lines Changed |
| ------------------------------------ | ------------------------- | ------------- |
| `pages/people/contacts.vue`          | Update empty state        | ~10 lines     |
| `pages/transact/history.vue`         | Verify/update empty state | ~10 lines     |
| `docs/architecture/05_COMPONENTS.md` | Add badge color docs      | ~20 lines     |
| Multiple components                  | Verify/update patterns    | ~50 lines     |

---

## Success Criteria

- [ ] All empty states use `UiAppEmptyState`
- [ ] Consistent badge color usage documented and applied
- [ ] Consistent avatar rendering with initials
- [ ] Predictable action button locations
- [ ] No visual regressions
- [ ] Dark mode works correctly
- [ ] Mobile layout works correctly

---

_Phase 6 of Post-Refactor Remediation Plan_
