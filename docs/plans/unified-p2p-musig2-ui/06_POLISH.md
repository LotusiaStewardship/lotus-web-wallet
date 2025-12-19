# Phase 6: Polish & Accessibility

## Overview

This final phase focuses on polish, error handling, loading states, accessibility, and overall UX improvements. These refinements transform the functional implementation into a polished, production-ready experience.

**Priority**: P2 (Medium)
**Estimated Effort**: 2 days
**Dependencies**: Phases 1-5

---

## Objectives

1. Add loading states and skeleton loaders
2. Create meaningful empty states with guidance
3. Implement error handling and recovery
4. Add success celebrations and feedback
5. Implement notifications and badges
6. Ensure keyboard navigation and accessibility

---

## Task 6.1: Loading States

Add consistent loading states across all P2P and MuSig2 components.

### Skeleton Loaders

```vue
<!-- components/p2p/SignerListSkeleton.vue -->
<template>
  <div class="space-y-3">
    <div v-for="i in 3" :key="i" class="animate-pulse">
      <div class="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div class="w-12 h-12 rounded-full bg-muted" />
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-muted rounded w-1/3" />
          <div class="h-3 bg-muted rounded w-1/2" />
        </div>
        <div class="flex gap-2">
          <div class="h-8 w-20 bg-muted rounded" />
          <div class="h-8 w-16 bg-muted rounded" />
        </div>
      </div>
    </div>
  </div>
</template>
```

```vue
<!-- components/musig2/SharedWalletListSkeleton.vue -->
<template>
  <div class="space-y-3">
    <div v-for="i in 2" :key="i" class="animate-pulse">
      <div class="p-4 bg-muted/30 rounded-lg">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-lg bg-muted" />
          <div class="flex-1 space-y-2">
            <div class="h-5 bg-muted rounded w-1/4" />
            <div class="h-6 bg-muted rounded w-1/3" />
            <div class="h-3 bg-muted rounded w-1/2" />
          </div>
          <div class="flex gap-2">
            <div class="h-9 w-20 bg-muted rounded" />
            <div class="h-9 w-20 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

### Loading State Component

```vue
<!-- components/shared/LoadingOverlay.vue -->
<script setup lang="ts">
defineProps<{
  message?: string
  fullScreen?: boolean
}>()
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-4"
    :class="
      fullScreen
        ? 'fixed inset-0 bg-background/80 backdrop-blur-sm z-50'
        : 'py-12'
    "
  >
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 text-primary animate-spin" />
    <p v-if="message" class="text-sm text-muted-foreground">{{ message }}</p>
  </div>
</template>
```

---

## Task 6.2: Empty States

Create meaningful empty states with actionable guidance.

### P2P Empty States

```vue
<!-- In P2P page - Signers tab empty state -->
<AppEmptyState
  v-if="!signersLoading && discoveredSigners.length === 0"
  icon="i-lucide-search"
  title="No signers found"
  description="No signers are currently advertising on the network. Try refreshing or check back later."
>
  <template #action>
    <div class="flex gap-2">
      <UButton
        variant="outline"
        icon="i-lucide-refresh-cw"
        @click="handleRefreshSigners"
      >
        Refresh
      </UButton>
      <UButton
        color="primary"
        icon="i-lucide-radio"
        @click="handleConfigureSigner"
      >
        Become a Signer
      </UButton>
    </div>
  </template>
</AppEmptyState>
```

```vue
<!-- Sessions tab empty state -->
<AppEmptyState
  v-if="activeSessions.length === 0"
  icon="i-lucide-layers"
  title="No active sessions"
  description="Signing sessions will appear here when you initiate or join a collaborative transaction."
>
  <template #action>
    <UButton
      variant="outline"
      @click="activeTab = 'signers'"
    >
      Find Signers
    </UButton>
  </template>
</AppEmptyState>
```

### MuSig2 Empty States

```vue
<!-- Shared wallets empty state -->
<AppEmptyState
  icon="i-lucide-shield"
  title="No shared wallets yet"
  description="Create a shared wallet with your contacts to enable collaborative spending with multi-signature security."
>
  <template #illustration>
    <div class="flex justify-center mb-4">
      <div class="relative">
        <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <UIcon name="i-lucide-shield" class="w-10 h-10 text-primary" />
        </div>
        <div class="absolute -right-2 -bottom-2 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
          <UIcon name="i-lucide-plus" class="w-4 h-4 text-green-500" />
        </div>
      </div>
    </div>
  </template>
  <template #action>
    <UButton
      color="primary"
      icon="i-lucide-plus"
      @click="showCreateModal = true"
    >
      Create Your First Shared Wallet
    </UButton>
  </template>
</AppEmptyState>
```

---

## Task 6.3: Error Handling

Implement consistent error handling with recovery options.

### Error State Component

```vue
<!-- components/shared/ErrorState.vue -->
<script setup lang="ts">
defineProps<{
  title?: string
  message: string
  retryLabel?: string
  showRetry?: boolean
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <div
      class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4"
    >
      <UIcon name="i-lucide-alert-circle" class="w-8 h-8 text-red-500" />
    </div>
    <h3 class="text-lg font-semibold mb-2">
      {{ title || 'Something went wrong' }}
    </h3>
    <p class="text-muted-foreground mb-4 max-w-md">{{ message }}</p>
    <UButton
      v-if="showRetry"
      variant="outline"
      icon="i-lucide-refresh-cw"
      @click="emit('retry')"
    >
      {{ retryLabel || 'Try Again' }}
    </UButton>
  </div>
</template>
```

### Error Handling Pattern

```typescript
// Consistent error handling in components
async function handleAction() {
  isLoading.value = true
  errorMessage.value = null

  try {
    await someAsyncOperation()
    success('Success', 'Operation completed successfully')
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred'
    errorMessage.value = message
    error('Error', message)

    // Log for debugging
    console.error('Action failed:', err)
  } finally {
    isLoading.value = false
  }
}
```

### Connection Error Handling

```vue
<!-- P2P connection error -->
<UAlert
  v-if="connectionError"
  color="error"
  icon="i-lucide-wifi-off"
  class="mb-4"
>
  <template #title>Connection Failed</template>
  <template #description>
    {{ connectionError }}
  </template>
  <template #actions>
    <UButton
      color="error"
      variant="soft"
      size="sm"
      @click="handleConnect"
    >
      Retry Connection
    </UButton>
  </template>
</UAlert>
```

---

## Task 6.4: Success Feedback

Add success celebrations and positive feedback.

### Success Animation Component

```vue
<!-- components/shared/SuccessAnimation.vue -->
<script setup lang="ts">
defineProps<{
  title: string
  message?: string
}>()

const show = defineModel<boolean>('show', { default: false })
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition-all duration-200"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="show"
      class="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50"
      @click="show = false"
    >
      <div class="text-center">
        <div
          class="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 animate-bounce"
        >
          <UIcon
            name="i-lucide-check-circle"
            class="w-10 h-10 text-green-500"
          />
        </div>
        <h3 class="text-xl font-semibold mb-2">{{ title }}</h3>
        <p v-if="message" class="text-muted-foreground">{{ message }}</p>
      </div>
    </div>
  </Transition>
</template>
```

### Transaction Success

```vue
<!-- After successful transaction signing -->
<SharedSuccessAnimation
  v-model:show="showSuccess"
  title="Transaction Signed!"
  message="Your transaction has been broadcast to the network"
/>
```

---

## Task 6.5: Notifications & Badges

Implement notification system for P2P events.

### Notification Types

```typescript
// composables/useP2PNotifications.ts
export function useP2PNotifications() {
  const { success, warning, info } = useNotifications()

  function notifySigningRequest(request: UISigningRequest) {
    warning(
      'Signing Request',
      `${request.fromNickname || 'Someone'} wants you to co-sign a transaction`,
      {
        actions: [
          {
            label: 'View',
            click: () => navigateTo('/people/p2p?tab=requests'),
          },
        ],
      },
    )
  }

  function notifySessionComplete(session: WalletSigningSession) {
    success(
      'Transaction Signed',
      'The collaborative transaction has been broadcast',
    )
  }

  function notifySessionFailed(session: WalletSigningSession, reason: string) {
    warning('Signing Failed', reason)
  }

  function notifyPeerConnected(nickname: string) {
    info('Peer Connected', `${nickname} is now online`)
  }

  return {
    notifySigningRequest,
    notifySessionComplete,
    notifySessionFailed,
    notifyPeerConnected,
  }
}
```

### Navigation Badges

```vue
<!-- In layouts/default.vue -->
<script setup lang="ts">
const musig2Store = useMuSig2Store()

const pendingCount = computed(() => {
  const requests = musig2Store.incomingRequests?.length || 0
  const sessions = Array.from(
    musig2Store.activeSessions?.values() || [],
  ).filter(s => s.state !== 'completed' && s.state !== 'failed').length
  return requests + sessions
})
</script>

<!-- Navigation item -->
<NuxtLink to="/people" class="relative">
  <UIcon name="i-lucide-users" />
  <span>People</span>
  <span
    v-if="pendingCount > 0"
    class="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium"
  >
    {{ pendingCount > 9 ? '9+' : pendingCount }}
  </span>
</NuxtLink>
```

---

## Task 6.6: Accessibility

Ensure keyboard navigation and screen reader support.

### Focus Management

```vue
<!-- Modal focus trap -->
<script setup lang="ts">
const modalRef = ref<HTMLElement>()

// Focus first focusable element when modal opens
watch(open, isOpen => {
  if (isOpen) {
    nextTick(() => {
      const firstFocusable = modalRef.value?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) as HTMLElement
      firstFocusable?.focus()
    })
  }
})
</script>
```

### ARIA Labels

```vue
<!-- Proper ARIA labels -->
<UButton aria-label="Accept signing request from Alice" @click="handleAccept">
  Accept
</UButton>

<div role="status" aria-live="polite" class="sr-only">
  {{ statusMessage }}
</div>

<!-- Progress indicator -->
<div
  role="progressbar"
  :aria-valuenow="progress"
  aria-valuemin="0"
  aria-valuemax="100"
  :aria-label="`Signing progress: ${progress}%`"
>
  <UProgress :value="progress" />
</div>
```

### Keyboard Shortcuts

```typescript
// composables/useKeyboardShortcuts.ts
export function useP2PKeyboardShortcuts() {
  const router = useRouter()

  onKeyStroke('p', e => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault()
      router.push('/people/p2p')
    }
  })

  onKeyStroke('Escape', () => {
    // Close any open modals
  })
}
```

---

## Task 6.7: Responsive Design

Ensure all components work well on mobile.

### Mobile Tab Navigation

```vue
<!-- Horizontal scrollable tabs on mobile -->
<div class="flex rounded-lg bg-muted/50 p-1 overflow-x-auto scrollbar-hide">
  <button
    v-for="tab in tabs"
    :key="tab.value"
    class="flex items-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0"
    :class="activeTab === tab.value
      ? 'bg-background shadow text-primary'
      : 'text-muted-foreground'"
    @click="activeTab = tab.value"
  >
    <UIcon :name="tab.icon" class="w-4 h-4" />
    <span class="hidden sm:inline">{{ tab.label }}</span>
    <UBadge v-if="tab.badge" size="xs">{{ tab.badge }}</UBadge>
  </button>
</div>
```

### Mobile-Friendly Modals

```vue
<!-- Full-screen modal on mobile -->
<UModal
  v-model:open="open"
  :ui="{
    width: 'max-w-lg w-full',
    // Full screen on mobile
    wrapper: 'sm:items-center items-end',
    container: 'sm:rounded-lg rounded-t-lg sm:my-8 my-0',
  }"
>
  <!-- Content -->
</UModal>
```

---

## Implementation Checklist

### Loading States

- [ ] Create `SignerListSkeleton.vue`
- [ ] Create `SharedWalletListSkeleton.vue`
- [ ] Create `LoadingOverlay.vue`
- [ ] Add loading states to all async operations

### Empty States

- [ ] Add empty state to signers list
- [ ] Add empty state to sessions list
- [ ] Add empty state to requests list
- [ ] Add empty state to shared wallets list
- [ ] Add illustrations to empty states

### Error Handling

- [ ] Create `ErrorState.vue` component
- [ ] Add error handling to all async operations
- [ ] Add retry functionality where appropriate
- [ ] Add connection error handling

### Success Feedback

- [ ] Create `SuccessAnimation.vue`
- [ ] Add success feedback to wallet creation
- [ ] Add success feedback to transaction signing
- [ ] Add success feedback to request acceptance

### Notifications

- [ ] Create `useP2PNotifications` composable
- [ ] Add notification for incoming requests
- [ ] Add notification for session completion
- [ ] Add navigation badges

### Accessibility

- [ ] Add ARIA labels to interactive elements
- [ ] Implement focus management in modals
- [ ] Add keyboard shortcuts
- [ ] Test with screen reader

### Responsive

- [ ] Make tabs scrollable on mobile
- [ ] Make modals full-screen on mobile
- [ ] Test all components on mobile viewport

---

## Files to Create/Modify

| File                                             | Action | Description              |
| ------------------------------------------------ | ------ | ------------------------ |
| `components/p2p/SignerListSkeleton.vue`          | Create | Loading skeleton         |
| `components/musig2/SharedWalletListSkeleton.vue` | Create | Loading skeleton         |
| `components/shared/LoadingOverlay.vue`           | Create | Loading overlay          |
| `components/shared/ErrorState.vue`               | Create | Error display            |
| `components/shared/SuccessAnimation.vue`         | Create | Success feedback         |
| `composables/useP2PNotifications.ts`             | Create | Notification helpers     |
| Various components                               | Modify | Add loading/error states |
| `layouts/default.vue`                            | Modify | Add navigation badges    |

---

## Testing Checklist

- [ ] Loading states appear during async operations
- [ ] Empty states show appropriate guidance
- [ ] Errors are caught and displayed
- [ ] Retry functionality works
- [ ] Success animations play
- [ ] Notifications appear for P2P events
- [ ] Navigation badges update correctly
- [ ] Keyboard navigation works
- [ ] Screen reader announces changes
- [ ] Mobile layout is usable

---

_Previous: [05_CONTACT_INTEGRATION.md](./05_CONTACT_INTEGRATION.md)_
