# 17: Integration - Contacts Components

## Overview

This phase integrates the scaffolded contact components into the existing contacts page, replacing inline implementations with the new design system components.

**Goal:** Replace `pages/contacts.vue` implementation with scaffolded components from `components/contacts/`.

---

## Current State

### Existing Page (`pages/contacts.vue`)

- Uses inline `UCard` implementations
- Has search, filter, and CRUD functionality
- Works but doesn't use the new design system

### Scaffolded Components (`components/contacts/`)

- `ContactSearch.vue` - Search input with result count
- `ContactListItem.vue` - Contact list item with actions
- `ContactQuickCard.vue` - Favorite contact quick card
- `ContactFormSlideover.vue` - Add/edit contact form
- `ContactDetailSlideover.vue` - Contact details view
- `ContactGroupModal.vue` - Create/manage groups
- `ContactPicker.vue` - Contact selection modal

---

## Integration Tasks

### Phase 17.1: Fix Component Type Errors

Before integration, fix type errors in scaffolded components:

#### ContactDetailSlideover.vue

- Remove references to non-existent Contact properties:
  - `totalSent`, `totalReceived`, `transactionCount`
  - `signerCapabilities`, `lastTransactionAt`
- Use existing Contact type properties

#### ContactListItem.vue

- Remove `lastTransactionAt` reference
- Remove `signerCapabilities` reference
- Use existing Contact type

#### ContactFormSlideover.vue

- Fix `groupList` reference (use `contacts` or add getter)
- Fix implicit `any` type for parameter `g`

#### ContactPicker.vue

- Fix `contactList` reference (should be `contacts`)
- Fix implicit `any` type for parameter `c`

#### ContactQuickCard.vue

- Fix ContactAvatar prop mismatch

### Phase 17.2: Integrate into Contacts Page

Replace inline implementations in `pages/contacts.vue`:

```vue
<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Hero Header -->
    <AppHeroCard
      icon="i-lucide-users"
      title="Contacts"
      :subtitle="`${contactsStore.contacts.length} contacts`"
    >
      <template #actions>
        <UButton color="primary" icon="i-lucide-plus" @click="openAddContact">
          Add Contact
        </UButton>
      </template>
    </AppHeroCard>

    <!-- Favorites Quick Access -->
    <div v-if="favorites.length" class="flex gap-3 overflow-x-auto pb-2">
      <ContactsQuickCard
        v-for="contact in favorites"
        :key="contact.id"
        :contact="contact"
        @click="openContactDetail(contact)"
        @send="sendToContact(contact)"
      />
    </div>

    <!-- Search -->
    <ContactsSearch
      v-model="searchQuery"
      :result-count="filteredContacts.length"
    />

    <!-- Contact List -->
    <AppCard title="All Contacts" icon="i-lucide-list">
      <AppEmptyState
        v-if="!filteredContacts.length"
        icon="i-lucide-users"
        title="No contacts"
        description="Add contacts for quick access when sending"
      >
        <template #actions>
          <UButton color="primary" icon="i-lucide-plus" @click="openAddContact">
            Add Contact
          </UButton>
        </template>
      </AppEmptyState>

      <div v-else class="divide-y divide-default -mx-4">
        <ContactsListItem
          v-for="contact in filteredContacts"
          :key="contact.id"
          :contact="contact"
          class="px-4"
          @click="openContactDetail(contact)"
          @send="sendToContact(contact)"
          @toggle-favorite="toggleFavorite(contact)"
        />
      </div>
    </AppCard>

    <!-- Slideovers -->
    <ContactsFormSlideover
      v-model:open="showAddModal"
      @save="handleContactSaved"
    />

    <ContactsFormSlideover
      v-model:open="showEditModal"
      :contact="editingContact"
      @save="handleContactSaved"
    />

    <ContactsDetailSlideover
      v-model:open="showDetailModal"
      :contact="selectedContact"
      @edit="openEditModal"
      @delete="confirmDelete"
      @send="sendToContact"
    />
  </div>
</template>
```

### Phase 17.3: Verify Functionality

- [ ] Search works correctly
- [ ] Add contact works
- [ ] Edit contact works
- [ ] Delete contact works
- [ ] Favorites toggle works
- [ ] Send to contact navigates correctly

---

## Type Fixes Required

### Contact Interface Alignment

The scaffolded components expect additional properties. Options:

**Option A: Extend Contact type (Recommended)**

```typescript
// stores/contacts.ts - extend Contact interface
export interface Contact {
  // ... existing properties

  // Optional computed/derived properties
  totalSent?: bigint
  totalReceived?: bigint
  transactionCount?: number
  lastTransactionAt?: number
  signerCapabilities?: string[]
}
```

**Option B: Simplify components to use existing type**
Remove references to non-existent properties in components.

---

## Integration Checklist

- [ ] Fix ContactDetailSlideover type errors
- [ ] Fix ContactListItem type errors
- [ ] Fix ContactFormSlideover type errors
- [ ] Fix ContactPicker type errors
- [ ] Fix ContactQuickCard type errors
- [ ] Refactor pages/contacts.vue to use new components
- [ ] Verify all CRUD operations work
- [ ] Verify search and filter work
- [ ] Verify favorites work

---

_Next: [18_INTEGRATION_EXPLORER.md](./18_INTEGRATION_EXPLORER.md)_
