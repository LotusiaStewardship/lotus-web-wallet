# 02: Design System & Component Patterns

## Overview

This document defines the visual design system and component patterns for the refactored wallet. Consistency is key - every page should feel like part of the same application.

---

## Design Tokens

### Colors (via Nuxt UI)

Use Nuxt UI's color system consistently:

| Purpose | Color     | Usage                                          |
| ------- | --------- | ---------------------------------------------- |
| Primary | `primary` | Main actions, links, highlights                |
| Success | `success` | Positive amounts, confirmations, online status |
| Warning | `warning` | Pending states, caution messages               |
| Error   | `error`   | Negative amounts, errors, offline status       |
| Neutral | `neutral` | Secondary actions, borders, muted text         |

### Spacing Scale

```css
/* Use Tailwind spacing consistently */
space-y-2   /* 8px - tight grouping */
space-y-4   /* 16px - standard grouping */
space-y-6   /* 24px - section separation */
gap-2       /* 8px - inline elements */
gap-3       /* 12px - card content */
gap-4       /* 16px - form fields */
p-4         /* 16px - card padding */
p-6         /* 24px - hero card padding */
```

### Typography

```css
/* Headings */
text-3xl font-bold     /* Page titles in hero cards */
text-xl font-semibold  /* Card headers */
text-lg font-medium    /* Section titles */
text-base font-medium  /* List item titles */
text-sm                /* Body text, descriptions */
text-xs                /* Timestamps, metadata */

/* Muted text */
text-muted             /* Secondary information */
```

### Container Widths

```css
max-w-3xl   /* Standard content width (all pages) */
max-w-4xl   /* Wide content (P2P hub with sidebar) */
mx-auto     /* Always center containers */
```

---

## Core UI Components

### AppCard

Standardized card wrapper with consistent styling.

```vue
<!-- components/ui/AppCard.vue -->
<script setup lang="ts">
defineProps<{
  title?: string
  icon?: string
  iconColor?: string
  action?: { label: string; to?: string; onClick?: () => void }
  noPadding?: boolean
}>()
</script>

<template>
  <UCard :ui="{ body: { padding: noPadding ? '' : 'p-4' } }">
    <template v-if="title || $slots.header" #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div
            v-if="icon"
            class="w-8 h-8 rounded-lg flex items-center justify-center"
            :class="iconColor || 'bg-primary-100 dark:bg-primary-900/30'"
          >
            <UIcon :name="icon" class="w-4 h-4 text-primary" />
          </div>
          <span class="font-semibold">{{ title }}</span>
          <slot name="header-badge" />
        </div>
        <slot name="header-action">
          <UButton
            v-if="action"
            :to="action.to"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="action.onClick"
          >
            {{ action.label }}
          </UButton>
        </slot>
      </div>
    </template>
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </UCard>
</template>
```

**Usage:**

```vue
<AppCard
  title="Recent Activity"
  icon="i-lucide-activity"
  :action="{ label: 'View All', to: '/history' }"
>
  <ActivityFeed :transactions="recentTxs" />
</AppCard>
```

---

### AppHeroCard

Hero card for page headers with centered content.

```vue
<!-- components/ui/AppHeroCard.vue -->
<script setup lang="ts">
defineProps<{
  icon?: string
  iconClass?: string
  title: string
  subtitle?: string
  gradient?: boolean
}>()
</script>

<template>
  <UCard
    :class="
      gradient &&
      'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20'
    "
  >
    <div class="text-center py-6">
      <div v-if="icon" class="mb-4">
        <div
          class="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
          :class="iconClass || 'bg-primary-100 dark:bg-primary-900/30'"
        >
          <UIcon :name="icon" class="w-8 h-8 text-primary" />
        </div>
      </div>
      <slot name="icon" />
      <h1 class="text-3xl font-bold mb-2">{{ title }}</h1>
      <p v-if="subtitle" class="text-muted">{{ subtitle }}</p>
      <slot name="subtitle" />
      <div v-if="$slots.actions" class="mt-4">
        <slot name="actions" />
      </div>
    </div>
  </UCard>
</template>
```

**Usage:**

```vue
<AppHeroCard
  icon="i-lucide-wallet"
  title="1,234.56 XPI"
  subtitle="Connected to mainnet"
  gradient
>
  <template #actions>
    <div class="flex justify-center gap-3">
      <UButton to="/send">Send</UButton>
      <UButton to="/receive" variant="outline">Receive</UButton>
    </div>
  </template>
</AppHeroCard>
```

---

### AppEmptyState

Empty state with illustration and call-to-action.

```vue
<!-- components/ui/AppEmptyState.vue -->
<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description?: string
  action?: { label: string; to?: string; onClick?: () => void }
}>()
</script>

<template>
  <div class="text-center py-12">
    <div
      class="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center"
    >
      <UIcon :name="icon" class="w-8 h-8 text-muted" />
    </div>
    <h3 class="text-lg font-medium mb-2">{{ title }}</h3>
    <p v-if="description" class="text-sm text-muted mb-4 max-w-sm mx-auto">
      {{ description }}
    </p>
    <UButton
      v-if="action"
      :to="action.to"
      color="primary"
      @click="action.onClick"
    >
      {{ action.label }}
    </UButton>
  </div>
</template>
```

**Usage:**

```vue
<AppEmptyState
  icon="i-lucide-users"
  title="No contacts yet"
  description="Add contacts to quickly send to your friends and family"
  :action="{ label: 'Add Contact', onClick: openAddContact }"
/>
```

---

### AppLoadingState

Loading state with spinner and optional message.

```vue
<!-- components/ui/AppLoadingState.vue -->
<script setup lang="ts">
defineProps<{
  message?: string
  size?: 'sm' | 'md' | 'lg'
}>()

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}
</script>

<template>
  <div class="flex flex-col items-center justify-center py-8">
    <UIcon
      name="i-lucide-loader-2"
      :class="[sizeClasses[size || 'md'], 'animate-spin text-primary']"
    />
    <p v-if="message" class="text-sm text-muted mt-2">{{ message }}</p>
  </div>
</template>
```

---

### AppErrorState

Error state with retry action.

```vue
<!-- components/ui/AppErrorState.vue -->
<script setup lang="ts">
defineProps<{
  title?: string
  message: string
  retryLabel?: string
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="text-center py-8">
    <div
      class="w-12 h-12 mx-auto mb-4 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center"
    >
      <UIcon name="i-lucide-alert-circle" class="w-6 h-6 text-error" />
    </div>
    <h3 v-if="title" class="text-lg font-medium mb-1">{{ title }}</h3>
    <p class="text-sm text-muted mb-4">{{ message }}</p>
    <UButton color="primary" variant="outline" @click="emit('retry')">
      {{ retryLabel || 'Try Again' }}
    </UButton>
  </div>
</template>
```

---

### AppStatCard

Compact stat display.

```vue
<!-- components/ui/AppStatCard.vue -->
<script setup lang="ts">
defineProps<{
  value: string | number
  label: string
  icon?: string
  trend?: 'up' | 'down' | 'neutral'
  mono?: boolean
}>()
</script>

<template>
  <div class="text-center">
    <div class="flex items-center justify-center gap-1 mb-1">
      <UIcon v-if="icon" :name="icon" class="w-4 h-4 text-muted" />
      <span class="text-xl font-semibold" :class="{ 'font-mono': mono }">
        {{ value }}
      </span>
      <UIcon
        v-if="trend === 'up'"
        name="i-lucide-trending-up"
        class="w-4 h-4 text-success"
      />
      <UIcon
        v-if="trend === 'down'"
        name="i-lucide-trending-down"
        class="w-4 h-4 text-error"
      />
    </div>
    <p class="text-xs text-muted">{{ label }}</p>
  </div>
</template>
```

---

## List Item Patterns

### Standard List Item Layout

All list items follow this structure:

```
┌─────────────────────────────────────────────────────────────┐
│ [Icon/Avatar]  [Content: Title + Subtitle]  [Value/Action]  │
└─────────────────────────────────────────────────────────────┘
```

```vue
<!-- Pattern for list items -->
<div class="flex items-center gap-3 py-3">
  <!-- Left: Icon or Avatar -->
  <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
    <UIcon name="i-lucide-arrow-up-right" class="w-5 h-5 text-primary" />
  </div>

  <!-- Middle: Content -->
  <div class="flex-1 min-w-0">
    <p class="font-medium truncate">Title</p>
    <p class="text-sm text-muted truncate">Subtitle or description</p>
  </div>

  <!-- Right: Value or Action -->
  <div class="text-right flex-shrink-0">
    <p class="font-medium">-100.00 XPI</p>
    <p class="text-xs text-muted">2 min ago</p>
  </div>
</div>
```

### List Container

```vue
<div class="divide-y divide-default">
  <ListItem v-for="item in items" :key="item.id" :item="item" />
</div>
```

---

## Icon Color Conventions

| Context          | Icon                       | Color Class    |
| ---------------- | -------------------------- | -------------- |
| Send/Outgoing    | `i-lucide-arrow-up-right`  | `text-error`   |
| Receive/Incoming | `i-lucide-arrow-down-left` | `text-success` |
| Pending          | `i-lucide-clock`           | `text-warning` |
| Confirmed        | `i-lucide-check-circle`    | `text-success` |
| Error            | `i-lucide-alert-circle`    | `text-error`   |
| Info             | `i-lucide-info`            | `text-primary` |
| Settings         | `i-lucide-settings`        | `text-muted`   |
| Copy             | `i-lucide-copy`            | `text-muted`   |
| External Link    | `i-lucide-external-link`   | `text-muted`   |

---

## Badge Conventions

```vue
<!-- Status badges -->
<UBadge color="success" variant="subtle" size="sm">Confirmed</UBadge>
<UBadge color="warning" variant="subtle" size="sm">Pending</UBadge>
<UBadge color="error" variant="subtle" size="sm">Failed</UBadge>

<!-- Count badges -->
<UBadge color="primary" variant="solid" size="xs">3</UBadge>

<!-- Type badges -->
<UBadge color="neutral" variant="outline" size="sm">Coinbase</UBadge>
<UBadge color="primary" variant="outline" size="sm">RANK</UBadge>

<!-- Identity badges -->
<UBadge color="primary" variant="subtle" size="sm">You</UBadge>
<UBadge color="success" variant="subtle" size="sm">Contact</UBadge>
```

---

## Form Patterns

### Standard Form Layout

```vue
<div class="space-y-4">
  <UFormField label="Recipient" required>
    <UInput v-model="recipient" placeholder="lotus_..." />
  </UFormField>
  
  <UFormField label="Amount" hint="Available: 1,234.56 XPI">
    <UInput v-model="amount" type="number" placeholder="0.00">
      <template #trailing>
        <span class="text-muted text-sm">XPI</span>
      </template>
    </UInput>
  </UFormField>
  
  <UFormField label="Note" hint="Optional">
    <UTextarea v-model="note" placeholder="What's this for?" :rows="2" />
  </UFormField>
</div>
```

### Form Actions

```vue
<div class="flex gap-3 pt-4">
  <UButton color="neutral" variant="outline" class="flex-1" @click="cancel">
    Cancel
  </UButton>
  <UButton color="primary" class="flex-1" :loading="loading" @click="submit">
    Send
  </UButton>
</div>
```

---

## Modal Patterns

### Confirmation Modal

```vue
<UModal v-model:open="open">
  <template #content>
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-warning" />
          <span class="font-semibold">Confirm Transaction</span>
        </div>
      </template>
      
      <div class="space-y-4">
        <!-- Content -->
      </div>
      
      <template #footer>
        <div class="flex gap-3">
          <UButton color="neutral" variant="outline" class="flex-1" @click="open = false">
            Cancel
          </UButton>
          <UButton color="primary" class="flex-1" @click="confirm">
            Confirm
          </UButton>
        </div>
      </template>
    </UCard>
  </template>
</UModal>
```

---

## Page Layout Pattern

Every page should follow this structure:

```vue
<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Hero Card (optional) -->
    <AppHeroCard
      icon="i-lucide-wallet"
      :title="balance"
      :subtitle="networkStatus"
    />

    <!-- Quick Stats (optional) -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard v-for="stat in stats" :key="stat.label">
        <AppStatCard v-bind="stat" />
      </UCard>
    </div>

    <!-- Main Content -->
    <AppCard title="Section Title" icon="i-lucide-list">
      <!-- Content -->
    </AppCard>

    <!-- Additional Sections -->
    <AppCard title="Another Section">
      <!-- Content -->
    </AppCard>
  </div>
</template>
```

---

## Responsive Patterns

### Grid Layouts

```vue
<!-- 2 columns on mobile, 4 on desktop -->
<div class="grid grid-cols-2 md:grid-cols-4 gap-4">

<!-- Single column on mobile, 2 on tablet, 3 on desktop -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

<!-- Main content + sidebar -->
<div class="grid md:grid-cols-3 gap-6">
  <div class="md:col-span-2"><!-- Main --></div>
  <div><!-- Sidebar --></div>
</div>
```

### Hide/Show on Breakpoints

```vue
<!-- Hide on mobile -->
<div class="hidden md:block">

<!-- Show only on mobile -->
<div class="md:hidden">
```

---

## Animation Patterns

### List Transitions

```vue
<TransitionGroup name="list" tag="div" class="divide-y divide-default">
  <div v-for="item in items" :key="item.id">
    <!-- Item content -->
  </div>
</TransitionGroup>

<style>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
```

### Loading Pulse

```vue
<div class="animate-pulse">
  <div class="h-4 bg-muted/50 rounded w-3/4 mb-2"></div>
  <div class="h-4 bg-muted/50 rounded w-1/2"></div>
</div>
```

---

## Accessibility Guidelines

1. **Focus States**: All interactive elements must have visible focus states
2. **Color Contrast**: Don't rely on color alone to convey information
3. **Touch Targets**: Minimum 44x44px for touch targets
4. **Screen Readers**: Use proper ARIA labels and semantic HTML
5. **Keyboard Navigation**: All features accessible via keyboard

---

_Next: [03_STORES_REFACTOR.md](./03_STORES_REFACTOR.md)_
