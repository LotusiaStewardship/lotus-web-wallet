# Phase 3: Visual Consistency

**Priority**: P1  
**Effort**: 1 day  
**Dependencies**: Phase 1, Phase 2

---

## Overview

This phase aligns visual details across all P2P/MuSig2/Contacts components to ensure a cohesive user experience. Focus areas include badge colors, avatar rendering, and action button placement.

---

## Task 3.1: Badge Color Semantics

### Current State Analysis

Badge colors are used inconsistently across components:

**`ContactCard.vue`**:

```vue
<UBadge v-if="isMuSig2Ready" color="secondary" variant="subtle" size="xs">
<UBadge v-if="sharedWallets.length" color="info" variant="subtle" size="xs">
<UBadge v-if="networkMismatch" :color="networkBadgeColor" variant="subtle" size="xs">
```

**`SignerCard.vue` (P2P)**:

```vue
<UBadge v-if="signer.reputation" color="warning" variant="subtle" size="xs">
<UBadge color="success" variant="subtle" size="xs">Online</UBadge>
```

**`SharedWalletCard.vue`**:

```vue
<UBadge
  color="primary"
  variant="subtle"
  size="xs"
>{{ threshold }}-of-{{ wallet.participants.length }}</UBadge>
```

### Standardized Badge Color Semantics

| Color       | Semantic Meaning                   | Example Usage                        |
| ----------- | ---------------------------------- | ------------------------------------ |
| `success`   | Online, Active, Complete, Positive | Online status, Completed sessions    |
| `warning`   | Pending, Initializing, Attention   | DHT syncing, Reputation stars        |
| `error`     | Offline, Failed, Negative          | Connection error, Failed session     |
| `neutral`   | Informational, Count, Default      | Transaction types, Participant count |
| `primary`   | Feature/Capability badge           | MuSig2 capable, Threshold display    |
| `info`      | Network-specific, Contextual       | Testnet badge, Shared wallet count   |
| `secondary` | Secondary feature indicator        | Alternative to `primary` for variety |

### Implementation Guidelines

```typescript
// composables/useBadgeColor.ts (optional helper)

export type BadgeSemanticType =
  | 'status-online'
  | 'status-offline'
  | 'status-pending'
  | 'status-error'
  | 'count'
  | 'feature'
  | 'network'
  | 'reputation'

export function getBadgeColor(type: BadgeSemanticType): string {
  const colorMap: Record<BadgeSemanticType, string> = {
    'status-online': 'success',
    'status-offline': 'neutral',
    'status-pending': 'warning',
    'status-error': 'error',
    'count': 'neutral',
    'feature': 'primary',
    'network': 'info',
    'reputation': 'warning',
  }
  return colorMap[type]
}
```

### Components to Update

| Component          | Badge            | Current Color | Target Color    | Reason        |
| ------------------ | ---------------- | ------------- | --------------- | ------------- |
| `ContactCard`      | MuSig2           | `secondary`   | `primary`       | Feature badge |
| `ContactCard`      | Shared wallets   | `info`        | `info`          | ✅ Correct    |
| `SignerCard`       | Online           | `success`     | `success`       | ✅ Correct    |
| `SignerCard`       | Reputation       | `warning`     | `warning`       | ✅ Correct    |
| `SharedWalletCard` | Threshold        | `primary`     | `primary`       | ✅ Correct    |
| `AvailableSigners` | Discovery status | varies        | Verify semantic |

---

## Task 3.2: Avatar Consistency

### Current State Analysis

**ContactCard** - Personalized initials with computed color:

```typescript
const initials = computed(() => {
  const parts = props.contact.name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return props.contact.name.slice(0, 2).toUpperCase()
})

const avatarColor = computed(() => {
  const colors = ['primary', 'success', 'info', 'warning', 'error'] as const
  let hash = 0
  for (let i = 0; i < props.contact.name.length; i++) {
    hash = props.contact.name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
})
```

**SignerCard** - Generic icon:

```vue
<UIcon name="i-lucide-user" class="w-6 h-6 text-primary" />
```

### Target Implementation

Create unified avatar rendering logic:

```vue
<!-- components/common/EntityAvatar.vue -->
<script setup lang="ts">
/**
 * EntityAvatar
 *
 * Unified avatar component for contacts, signers, and other entities.
 * Shows initials when name is available, icon when anonymous.
 */
const props = withDefaults(
  defineProps<{
    /** Entity name (for initials) */
    name?: string
    /** Custom avatar image URL */
    avatar?: string
    /** Fallback icon when no name */
    fallbackIcon?: string
    /** Size variant */
    size?: 'sm' | 'md' | 'lg'
    /** Show online indicator */
    showOnlineIndicator?: boolean
    /** Online status */
    isOnline?: boolean
    /** Recently online (shows warning color) */
    isRecentlyOnline?: boolean
  }>(),
  {
    fallbackIcon: 'i-lucide-user',
    size: 'md',
    showOnlineIndicator: false,
    isOnline: false,
    isRecentlyOnline: false,
  },
)

// Size classes
const sizeClasses = computed(() => {
  const sizes = {
    sm: {
      container: 'w-8 h-8',
      text: 'text-xs',
      icon: 'w-4 h-4',
      indicator: 'w-2 h-2',
    },
    md: {
      container: 'w-10 h-10',
      text: 'text-sm',
      icon: 'w-5 h-5',
      indicator: 'w-3 h-3',
    },
    lg: {
      container: 'w-12 h-12',
      text: 'text-base',
      icon: 'w-6 h-6',
      indicator: 'w-3.5 h-3.5',
    },
  }
  return sizes[props.size]
})

// Generate initials from name
const initials = computed(() => {
  if (!props.name) return null
  const parts = props.name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return props.name.slice(0, 2).toUpperCase()
})

// Generate consistent color based on name
const avatarColor = computed(() => {
  if (!props.name) return 'primary'
  const colors = ['primary', 'success', 'info', 'warning', 'error'] as const
  let hash = 0
  for (let i = 0; i < props.name.length; i++) {
    hash = props.name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
})

// Online indicator color
const indicatorColor = computed(() => {
  if (props.isOnline) return 'bg-success'
  if (props.isRecentlyOnline) return 'bg-warning'
  return 'bg-neutral-400'
})
</script>

<template>
  <div class="relative shrink-0">
    <!-- Avatar with image -->
    <img
      v-if="avatar"
      :src="avatar"
      :alt="name || 'Avatar'"
      :class="[sizeClasses.container, 'rounded-full object-cover']"
    />

    <!-- Avatar with initials -->
    <div
      v-else-if="initials"
      :class="[
        sizeClasses.container,
        sizeClasses.text,
        'rounded-full flex items-center justify-center font-semibold text-white',
        `bg-${avatarColor}-500`,
      ]"
    >
      {{ initials }}
    </div>

    <!-- Avatar with icon fallback -->
    <div
      v-else
      :class="[
        sizeClasses.container,
        'rounded-full flex items-center justify-center',
        'bg-primary-100 dark:bg-primary-900/30',
      ]"
    >
      <UIcon :name="fallbackIcon" :class="[sizeClasses.icon, 'text-primary']" />
    </div>

    <!-- Online indicator -->
    <span
      v-if="showOnlineIndicator"
      :class="[
        'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white dark:border-gray-900',
        sizeClasses.indicator,
        indicatorColor,
      ]"
      :title="
        isOnline ? 'Online' : isRecentlyOnline ? 'Recently active' : 'Offline'
      "
    />
  </div>
</template>
```

### Migration Steps

1. Create `components/common/EntityAvatar.vue`
2. Update `ContactCard.vue` to use `CommonEntityAvatar`
3. Update unified `SignerCard.vue` to use `CommonEntityAvatar`
4. Update `SharedWalletCard.vue` participant avatars

---

## Task 3.3: Action Button Patterns

### Current State Analysis

**ContactCard** - Footer actions, hover-reveal on desktop:

```vue
<div
  class="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-default 
            md:opacity-0 md:group-hover:opacity-100 transition-opacity"
>
  <!-- Actions -->
</div>
```

**SignerCard** - Inline actions, always visible:

```vue
<div class="flex items-center gap-1 flex-shrink-0">
  <UButton ... />
</div>
```

**SharedWalletCard** - Stacked actions:

```vue
<div class="flex flex-col gap-1 flex-shrink-0">
  <UButton ... />
</div>
```

### Standardized Patterns

| Context            | Pattern | Visibility                         | Layout                     |
| ------------------ | ------- | ---------------------------------- | -------------------------- |
| **List Item**      | Inline  | Always visible                     | Horizontal, right-aligned  |
| **Card (Compact)** | Inline  | Always visible                     | Horizontal, right-aligned  |
| **Card (Full)**    | Footer  | Hover on desktop, always on mobile | Horizontal, space-between  |
| **Detail View**    | Footer  | Always visible                     | Horizontal, right-aligned  |
| **Modal**          | Footer  | Always visible                     | Cancel left, Primary right |

### Implementation Guidelines

```vue
<!-- List Item Pattern -->
<div class="flex items-center gap-1 flex-shrink-0">
  <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-action" />
  <UButton color="primary" size="sm">Primary</UButton>
</div>

<!-- Card Footer Pattern -->
<div class="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-default
            md:opacity-0 md:group-hover:opacity-100 transition-opacity">
  <div class="flex items-center gap-1">
    <!-- Secondary actions -->
  </div>
  <div class="flex items-center gap-1">
    <!-- Primary actions -->
  </div>
</div>

<!-- Modal Footer Pattern -->
<div class="flex justify-end gap-3">
  <UButton color="neutral" variant="outline">Cancel</UButton>
  <UButton color="primary">Confirm</UButton>
</div>
```

### Components to Update

| Component          | Current Pattern | Target Pattern | Change Required      |
| ------------------ | --------------- | -------------- | -------------------- |
| `SignerCard`       | Inline          | Inline         | ✅ Correct           |
| `ContactCard`      | Footer hover    | Footer hover   | ✅ Correct           |
| `SharedWalletCard` | Stacked         | Inline         | Update to horizontal |

---

## Task 3.4: Icon Consistency

### Standard Icons for Common Actions

| Action       | Icon                     | Usage                 |
| ------------ | ------------------------ | --------------------- |
| Send         | `i-lucide-send`          | Send transaction      |
| Receive      | `i-lucide-qr-code`       | Receive/QR            |
| Copy         | `i-lucide-copy`          | Copy to clipboard     |
| Edit         | `i-lucide-pencil`        | Edit item             |
| Delete       | `i-lucide-trash-2`       | Delete item           |
| Add          | `i-lucide-plus`          | Add new item          |
| Add Contact  | `i-lucide-user-plus`     | Save as contact       |
| View Details | `i-lucide-chevron-right` | Navigate to detail    |
| Refresh      | `i-lucide-refresh-cw`    | Refresh data          |
| Settings     | `i-lucide-settings`      | Settings/config       |
| Online       | `i-lucide-wifi`          | Online status         |
| Offline      | `i-lucide-wifi-off`      | Offline status        |
| Shield       | `i-lucide-shield`        | MuSig2/Security       |
| Users        | `i-lucide-users`         | Contacts/Participants |
| Star         | `i-lucide-star`          | Favorite              |

### Audit Required

Verify all components use consistent icons for the same actions.

---

## Verification Checklist

### Task 3.1: Badge Colors

- [ ] Badge color semantics documented
- [ ] `ContactCard` badges updated
- [ ] `SignerCard` badges verified
- [ ] `SharedWalletCard` badges verified
- [ ] `AvailableSigners` badges verified
- [ ] All status badges use correct semantic color

### Task 3.2: Avatar Consistency

- [ ] `CommonEntityAvatar` component created
- [ ] `ContactCard` uses `CommonEntityAvatar`
- [ ] `SignerCard` uses `CommonEntityAvatar`
- [ ] Online indicator positioning consistent
- [ ] Color generation consistent

### Task 3.3: Action Buttons

- [ ] List items use inline pattern
- [ ] Cards use footer pattern
- [ ] Modals use standard footer
- [ ] Button order consistent (secondary → primary)
- [ ] Icon-only buttons have tooltips

### Task 3.4: Icon Consistency

- [ ] Icon usage audited
- [ ] Inconsistencies documented
- [ ] Updates applied

---

## Visual Audit Checklist

After implementation, verify:

- [ ] All cards have consistent border radius
- [ ] All cards have consistent padding
- [ ] All hover states use same transition
- [ ] All loading states use same animation
- [ ] All empty states have same structure
- [ ] All badges have same size for same context
- [ ] All avatars have same size for same context
- [ ] All action buttons have same size for same context

---

_Phase 3 of UI Pattern Consistency Remediation_
