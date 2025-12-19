# UX Inconsistencies Analysis

Detailed analysis of inconsistent UX patterns across the application.

---

## 1. Online Status Display

### Current Implementations

The app displays online status in **6+ different ways**:

| Location                   | Visual          | Colors          | States                        |
| -------------------------- | --------------- | --------------- | ----------------------------- |
| ContactCard                | Green dot       | green/gray      | online/offline                |
| ContactDetailSlideover     | Dot + text      | green/gray      | online/offline + last seen    |
| SignerCard                 | Badge + ring    | green/gray      | online/offline                |
| SignerDetailModal (p2p)    | Badge with icon | success/neutral | online/offline                |
| SignerDetailModal (shared) | Badge with icon | success/neutral | online/offline                |
| ParticipantList            | Dot             | green/gray      | online/offline                |
| CreateSharedWalletModal    | Badge           | success         | online only (timestamp check) |

### Visual Inconsistencies

```vue
<!-- ContactCard: Dot only -->
<span class="w-3 h-3 rounded-full bg-success-500" />

<!-- SignerCard: Ring around avatar + dot -->
<div :class="isOnline ? 'ring-2 ring-success-500' : ''">
<span class="w-3 h-3 rounded-full bg-success-500" />

<!-- SignerDetailModal: Badge with icon -->
<UBadge :color="onlineStatus.color" variant="subtle" size="sm">
  <UIcon :name="onlineStatus.icon" class="w-3 h-3 mr-1" />
  {{ onlineStatus.label }}
</UBadge>

<!-- CreateSharedWalletModal: Timestamp-based check -->
<UBadge v-if="contact.lastSeenOnline && Date.now() - contact.lastSeenOnline < 300000">
  Online
</UBadge>
```

### Recommended Standard

Use `OnlineStatusBadge` component everywhere (already planned in responsibility consolidation):

```vue
<OnlineStatusBadge :status="onlineStatus" />
<!-- Renders consistent badge for: online, recently_online, offline, unknown -->
```

---

## 2. Contact/Entity Display

### Current Implementations

Contact names are resolved differently across components:

| Component                 | Resolution Logic                                  |
| ------------------------- | ------------------------------------------------- |
| ContactCard               | `contact.name`                                    |
| AddressDisplay (common)   | `contact.name` or fingerprint                     |
| AddressDisplay (explorer) | `contact.name` or "You" or truncated              |
| TxItem (wallet)           | `contact.name` or truncated address               |
| TxItem (history)          | `contact.name` or `counterpartyName` or truncated |
| ParticipantList           | `contact.name` or "Unknown"                       |
| SignerCard                | `signer.nickname` or "Anonymous"                  |

### Missing Fallbacks

Some components don't check identity store for nickname:

```typescript
// Current: Only checks contact
const label = contact?.name || truncateAddress(address)

// Should be: Check identity too
const label = contact?.name || identity?.nickname || truncateAddress(address)
```

### Recommended Standard

Create `useEntityName()` composable:

```typescript
function useEntityName(address?: string, publicKey?: string) {
  const contactsStore = useContactsStore()
  const identityStore = useIdentityStore()

  return computed(() => {
    // 1. Check if it's own address
    if (address === walletStore.address) return 'You'

    // 2. Check contact by address
    const contact = address ? contactsStore.findByAddress(address) : null
    if (contact?.name) return contact.name

    // 3. Check identity by public key
    const identity = publicKey ? identityStore.get(publicKey) : null
    if (identity?.nickname) return identity.nickname

    // 4. Fallback to truncated address
    return address ? truncateAddress(address) : 'Unknown'
  })
}
```

---

## 3. Transaction Display

### Current Implementations

Transaction items have different layouts:

| Component       | Icon           | Amount            | Time        | Actions               |
| --------------- | -------------- | ----------------- | ----------- | --------------------- |
| wallet/TxItem   | Colored circle | Right, mono       | Below label | Link to explorer      |
| history/TxItem  | Colored circle | Right, mono + fee | Below label | Click event + chevron |
| explorer/TxItem | Colored square | Right             | Right       | Link + chevron        |

### Visual Differences

```
wallet/TxItem:
┌─────────────────────────────────────────┐
│ [●] Label                    +1.00 XPI  │
│     2 hours ago                         │
└─────────────────────────────────────────┘

history/TxItem:
┌─────────────────────────────────────────────┐
│ [●] Label [badge]            +1.00 XPI   >  │
│     2 hours ago              Fee: 0.01      │
└─────────────────────────────────────────────┘

explorer/TxItem:
┌─────────────────────────────────────────────┐
│ [■] abc123...def [You]       1.00 XPI    >  │
│     Transfer • 2 in → 3 out  2 hours ago    │
└─────────────────────────────────────────────┘
```

### Recommended Standard

Create unified `TxItem.vue` with variants:

```vue
<TxItem
  :transaction="tx"
  variant="compact"     <!-- wallet dashboard -->
  variant="standard"    <!-- history page -->
  variant="detailed"    <!-- explorer -->
/>
```

---

## 4. Action Button Placement

### Current Patterns

Action buttons appear in different positions:

| Component              | Primary Action     | Secondary Actions |
| ---------------------- | ------------------ | ----------------- |
| ContactCard            | Right side         | Dropdown menu     |
| ContactDetailSlideover | Footer, right      | Footer, left      |
| SignerCard             | Right side, inline | Left of primary   |
| SignerDetailModal      | Footer, right      | Footer, left      |
| SharedWalletCard       | Bottom             | None              |
| ProposeSpendModal      | Footer, right      | Footer, left      |

### Inconsistencies

1. **ContactCard**: Actions in dropdown menu
2. **SignerCard**: Actions inline, always visible
3. **Modals**: Footer with left/right split
4. **Cards**: Sometimes bottom, sometimes right

### Recommended Standard

1. **List items**: Primary action right, secondary in overflow menu
2. **Detail views**: Footer with cancel left, actions right
3. **Cards**: Actions at bottom or in header

---

## 5. Empty States

### Current Implementations

| Component        | Icon   | Title  | Description | Action |
| ---------------- | ------ | ------ | ----------- | ------ |
| ContactSearch    | ✓      | ✓      | ✓           | ✓      |
| SignerList       | ✓      | ✓      | ✓           | ✗      |
| SharedWalletList | ✓      | ✓      | ✓           | ✓      |
| ActivityFeed     | ✓      | ✗      | ✓           | ✗      |
| TxItem lists     | Varies | Varies | Varies      | Varies |

### Visual Differences

```vue
<!-- Some use UiAppEmptyState -->
<UiAppEmptyState
  icon="i-lucide-users"
  title="No contacts"
  description="Add your first contact"
/>

<!-- Some use inline -->
<div class="text-center py-8">
  <UIcon name="i-lucide-activity" class="w-12 h-12 text-muted mx-auto mb-3" />
  <p class="text-muted">No activity yet</p>
</div>

<!-- Some use different sizing -->
<div class="py-4 text-center">
  <p class="text-sm text-muted">No results</p>
</div>
```

### Recommended Standard

Always use `UiAppEmptyState`:

```vue
<UiAppEmptyState :icon="icon" :title="title" :description="description">
  <template #action>
    <UButton>Add First Item</UButton>
  </template>
</UiAppEmptyState>
```

---

## 6. Loading States

### Current Implementations

| Component        | Loading Indicator |
| ---------------- | ----------------- |
| SignerList       | Custom skeleton   |
| SharedWalletList | Custom skeleton   |
| ContactSearch    | Spinner in button |
| ActivityFeed     | None              |
| TxItem lists     | Varies            |

### Inconsistencies

1. **Skeletons**: Different implementations per component
2. **Spinners**: Sometimes in buttons, sometimes standalone
3. **No loading**: Some components show nothing while loading

### Recommended Standard

1. Use `UiAppSkeleton` for list loading
2. Use `UiAppLoadingState` for full-page loading
3. Use button `loading` prop for action loading

---

## 7. Modal/Slideover Patterns

### Current Implementations

| Component               | Type      | Header                    | Footer  |
| ----------------------- | --------- | ------------------------- | ------- |
| ContactDetailSlideover  | Slideover | Icon + title              | Actions |
| ContactFormSlideover    | Slideover | Title only                | Actions |
| SignerDetailModal       | Modal     | Title + close button      | Actions |
| CreateSharedWalletModal | Modal     | Icon + title + step badge | Actions |
| ProposeSpendModal       | Modal     | Icon + title              | Actions |

### Inconsistencies

1. **Header format**: Some have icons, some don't
2. **Close button**: Some in header, some rely on backdrop
3. **Footer layout**: Mostly consistent but some variations

### Recommended Standard

```vue
<!-- Modal header -->
<template #header>
  <div class="flex items-center gap-2">
    <UIcon :name="icon" class="w-5 h-5 text-primary" />
    <span class="font-semibold">{{ title }}</span>
  </div>
</template>

<!-- Modal footer -->
<template #footer>
  <div class="flex justify-between">
    <UButton color="neutral" variant="ghost" @click="close"> Cancel </UButton>
    <div class="flex gap-2">
      <!-- Secondary actions -->
      <UButton color="primary" @click="submit">
        {{ primaryLabel }}
      </UButton>
    </div>
  </div>
</template>
```

---

## 8. Form Patterns

### Current Implementations

| Form                    | Validation      | Error Display    | Submit        |
| ----------------------- | --------------- | ---------------- | ------------- |
| ContactForm             | Inline          | Below field      | Footer button |
| SendForm                | Computed        | Inline + summary | Footer button |
| SettingsForm            | None            | None             | Auto-save     |
| CreateSharedWalletModal | Step validation | Alert            | Footer button |

### Inconsistencies

1. **Validation timing**: Some on blur, some on submit
2. **Error display**: Some inline, some in alerts
3. **Submit behavior**: Some auto-save, some require button

### Recommended Standard

1. Validate on blur for individual fields
2. Show errors below fields
3. Disable submit until valid
4. Show loading state during submit

---

## 9. Navigation Patterns

### Current Implementations

| Feature                | Navigation Method              |
| ---------------------- | ------------------------------ |
| Contact → Send         | `router.push` with query param |
| Signer → Shared Wallet | `navigateTo` with query param  |
| Tx → Explorer          | `NuxtLink`                     |
| Settings sections      | Tab component                  |

### Inconsistencies

1. **Query params vs route params**: Mixed usage
2. **NuxtLink vs router.push**: Mixed usage
3. **Tab vs page navigation**: Inconsistent

### Recommended Standard

1. Use route params for entity IDs: `/contacts/:id`
2. Use query params for actions: `?action=create`
3. Use `NuxtLink` for declarative navigation
4. Use `router.push` for programmatic navigation

---

## 10. Color Usage

### Current Implementations

| Semantic       | Colors Used                       |
| -------------- | --------------------------------- |
| Success/Online | `success`, `green`, `success-500` |
| Error/Offline  | `error`, `red`, `neutral`         |
| Warning        | `warning`, `yellow`               |
| Primary        | `primary`                         |
| Muted          | `muted`, `neutral`, `gray`        |

### Inconsistencies

1. **Offline**: Sometimes `neutral`, sometimes `error`
2. **Muted text**: Sometimes `text-muted`, sometimes `text-gray-500`
3. **Background**: Mixed `bg-muted/50` and `bg-gray-100`

### Recommended Standard

Use semantic color names consistently:

- `success` for positive states
- `error` for negative states
- `warning` for caution states
- `neutral` for inactive/offline states
- `muted` for secondary text

---

## Summary: UX Patterns to Standardize

| Pattern                | Current State          | Target State                  |
| ---------------------- | ---------------------- | ----------------------------- |
| Online status          | 6+ implementations     | 1 component                   |
| Entity name resolution | Inconsistent fallbacks | 1 composable                  |
| Transaction display    | 3 layouts              | 1 component with variants     |
| Action placement       | Varies                 | Consistent per context        |
| Empty states           | Mixed                  | Always use UiAppEmptyState    |
| Loading states         | Mixed                  | Standardized skeleton/spinner |
| Modal headers          | Varies                 | Consistent icon + title       |
| Form validation        | Mixed                  | Consistent blur + inline      |
| Navigation             | Mixed                  | Consistent patterns           |
| Colors                 | Mixed names            | Semantic names only           |
