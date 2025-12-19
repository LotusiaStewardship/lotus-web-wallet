# Phase 2: Pattern Standardization

**Priority**: P0  
**Effort**: 1-2 days  
**Dependencies**: Phase 1 (Component Consolidation)

---

## Overview

This phase ensures all P2P/MuSig2/Shared Contacts components follow established patterns from `docs/architecture/05_COMPONENTS.md` and `docs/architecture/design/07_HUMAN_CENTERED_UX.md`.

---

## Task 2.1: Empty State Standardization

### Current State Analysis

**Correct Usage** - `pages/people/p2p.vue`:

```vue
<UiAppEmptyState
  icon="i-lucide-users"
  title="No peers connected"
  description="Waiting for peers to connect..."
/>
```

**Incorrect Usage** - `pages/people/contacts.vue`:

```vue
<div class="p-8 text-center">
  <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
    <UIcon name="i-lucide-users" class="w-8 h-8 text-gray-400" />
  </div>
  <h3 class="font-medium mb-1">{{ searchQuery ? 'No contacts found' : 'No contacts yet' }}</h3>
  <p class="text-sm text-muted mb-4">{{ searchQuery ? 'Try a different search' : 'Add contacts to easily send XPI' }}</p>
</div>
```

### Files Requiring Updates

| File                               | Current State             | Action Required                |
| ---------------------------------- | ------------------------- | ------------------------------ |
| `pages/people/contacts.vue`        | Custom div implementation | Replace with `UiAppEmptyState` |
| `pages/transact/history.vue`       | Verify usage              | Audit and update if needed     |
| `pages/explore/explorer/index.vue` | Verify usage              | Audit and update if needed     |

### Target Implementation

Update `pages/people/contacts.vue` (lines 239-246):

```vue
<!-- Before -->
<div v-if="displayedContacts.length === 0" class="p-8 text-center">
  <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
    <UIcon name="i-lucide-users" class="w-8 h-8 text-gray-400" />
  </div>
  <h3 class="font-medium mb-1">{{ searchQuery ? 'No contacts found' : 'No contacts yet' }}</h3>
  <p class="text-sm text-muted mb-4">{{ searchQuery ? 'Try a different search' : 'Add contacts to easily send XPI' }}</p>
</div>

<!-- After -->
<UiAppEmptyState
  v-if="displayedContacts.length === 0"
  icon="i-lucide-users"
  :title="searchQuery ? 'No contacts found' : 'No contacts yet'"
  :description="searchQuery ? 'Try a different search' : 'Add contacts to easily send XPI'"
>
  <template v-if="!searchQuery" #actions>
    <UButton color="primary" icon="i-lucide-plus" @click="showAddModal = true">
      Add Contact
    </UButton>
  </template>
</UiAppEmptyState>
```

---

## Task 2.2: Card Wrapper Standardization

### Established Pattern

From `components/ui/AppCard.vue`:

```vue
<UiAppCard title="Card Title" icon="i-lucide-icon">
  <!-- Content -->
</UiAppCard>
```

### Components to Audit

#### `components/p2p/` Directory

| Component            | Current Wrapper | Action                              |
| -------------------- | --------------- | ----------------------------------- |
| `HeroCard.vue`       | Custom div      | Keep (domain-specific, see Phase 1) |
| `OnboardingCard.vue` | Custom div      | Evaluate for `UiAppCard`            |
| `SettingsPanel.vue`  | Custom div      | Evaluate for `UiAppCard`            |
| `ActivityFeed.vue`   | None (list)     | N/A                                 |
| `SignerList.vue`     | None (list)     | N/A                                 |
| `SessionList.vue`    | None (list)     | N/A                                 |
| `RequestList.vue`    | None (list)     | N/A                                 |

#### `components/musig2/` Directory

| Component                     | Current Wrapper | Action                   |
| ----------------------------- | --------------- | ------------------------ |
| `SharedWalletCard.vue`        | Custom div      | Evaluate for `UiAppCard` |
| `SharedWalletList.vue`        | None (list)     | N/A                      |
| `SharedWalletDetail.vue`      | Custom sections | Evaluate for `UiAppCard` |
| `CreateSharedWalletModal.vue` | `UModal`        | Correct                  |
| `ProposeSpendModal.vue`       | `UModal`        | Correct                  |

#### `components/shared-wallets/` Directory

| Component              | Current Wrapper | Action                    |
| ---------------------- | --------------- | ------------------------- |
| `AvailableSigners.vue` | Custom div      | Evaluate for `UiAppCard`  |
| `NetworkStatusBar.vue` | Custom div      | Keep (status bar pattern) |
| `PendingRequests.vue`  | Custom div      | Evaluate for `UiAppCard`  |
| `SignerModePanel.vue`  | Custom div      | Evaluate for `UiAppCard`  |

### Decision Framework

Use `UiAppCard` when:

- Content is a self-contained section with a title
- Content benefits from consistent card styling
- Content has header actions

Keep custom implementation when:

- Component is a specialized pattern (hero, status bar)
- Component is a list container (no title/header needed)
- Component has unique layout requirements

---

## Task 2.3: Loading State Standardization

### Current State Analysis

**Inline Skeleton** - `components/shared-wallets/AvailableSigners.vue`:

```vue
<div v-if="(loading || musig2Store.loading) && filteredSigners.length === 0" class="space-y-3">
  <div v-for="i in 3" :key="i" class="animate-pulse">
    <div class="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
        <div class="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  </div>
</div>
```

**Dedicated Skeleton Component** - `components/p2p/SignerListSkeleton.vue`:

```vue
<!-- Exists but may not be used consistently -->
```

### Target Implementation

1. **Use `UiAppSkeleton`** for simple loading states
2. **Create domain-specific skeletons** for complex layouts
3. **Ensure consistent animation** (`animate-pulse` class)

### Skeleton Component Inventory

| Skeleton Needed           | Location               | Status                    |
| ------------------------- | ---------------------- | ------------------------- |
| SignerCard skeleton       | `components/common/`   | Create                    |
| SharedWalletCard skeleton | `components/musig2/`   | Exists                    |
| ContactCard skeleton      | `components/contacts/` | Create if needed          |
| Generic list skeleton     | `components/ui/`       | Exists as `UiAppSkeleton` |

---

## Task 2.4: Modal Pattern Standardization

### Established Pattern

From existing modals:

```vue
<UModal v-model:open="showModal">
  <template #header>
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-icon" class="w-5 h-5" />
      <span>Modal Title</span>
    </div>
  </template>

  <template #body>
    <!-- Content -->
  </template>

  <template #footer>
    <div class="flex justify-end gap-3">
      <UButton color="neutral" variant="outline" @click="showModal = false">
        Cancel
      </UButton>
      <UButton color="primary" @click="handleSubmit">
        Confirm
      </UButton>
    </div>
  </template>
</UModal>
```

### Modals to Audit

| Modal                | File                                            | Pattern Compliance |
| -------------------- | ----------------------------------------------- | ------------------ |
| Add Contact          | `pages/people/contacts.vue`                     | ✅ Correct         |
| Edit Contact         | `pages/people/contacts.vue`                     | ✅ Correct         |
| Create Group         | `components/contacts/ContactGroupModal.vue`     | Verify             |
| Create Shared Wallet | `components/musig2/CreateSharedWalletModal.vue` | Verify             |
| Propose Spend        | `components/musig2/ProposeSpendModal.vue`       | Verify             |
| Fund Wallet          | `components/musig2/FundWalletModal.vue`         | Verify             |
| Signer Detail        | `components/p2p/SignerDetailModal.vue`          | Verify             |
| Session Detail       | `components/p2p/SessionDetailModal.vue`         | Verify             |
| Signing Request      | `components/p2p/SigningRequestModal.vue`        | Verify             |

### Footer Button Order

Establish consistent footer button order:

1. **Cancel/Close** - Left side, neutral color, outline variant
2. **Secondary Action** - Middle (if needed), neutral color
3. **Primary Action** - Right side, primary color, solid variant

---

## Verification Checklist

### Task 2.1: Empty States

- [ ] `pages/people/contacts.vue` uses `UiAppEmptyState`
- [ ] `pages/transact/history.vue` audited
- [ ] `pages/explore/explorer/index.vue` audited
- [ ] All empty states have actionable guidance
- [ ] Consistent icon and text styling

### Task 2.2: Card Wrappers

- [ ] `components/p2p/` directory audited
- [ ] `components/musig2/` directory audited
- [ ] `components/shared-wallets/` directory audited
- [ ] Decisions documented for non-standard implementations

### Task 2.3: Loading States

- [ ] Skeleton components created/updated
- [ ] Consistent `animate-pulse` usage
- [ ] Loading states show appropriate number of skeleton items
- [ ] Progress banners use consistent styling

### Task 2.4: Modal Patterns

- [ ] All modals use `UModal` component
- [ ] Header pattern consistent (icon + title)
- [ ] Footer button order consistent
- [ ] Cancel button always available

---

## Implementation Order

1. **Empty States** (highest visibility impact)
2. **Modal Patterns** (user interaction consistency)
3. **Card Wrappers** (structural consistency)
4. **Loading States** (polish)

---

_Phase 2 of UI Pattern Consistency Remediation_
