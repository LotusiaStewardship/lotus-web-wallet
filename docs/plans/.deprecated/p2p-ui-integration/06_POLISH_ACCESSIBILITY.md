# Phase 6: Polish & Accessibility

## Overview

This final phase adds polish to the P2P interface with loading states, empty states, success celebrations, error recovery, and accessibility improvements.

**Priority**: P2 (Medium)
**Estimated Effort**: 1-2 days
**Dependencies**: Phases 1-5

---

## Goals

1. Consistent loading states across all P2P components
2. Helpful empty states with actionable guidance
3. Success celebrations for key actions
4. Error recovery with retry options
5. Keyboard navigation support
6. Screen reader compatibility

---

## Implementation

### Task 6.1: Loading States

Add skeleton loaders and loading indicators to all async operations.

**File**: `components/p2p/SignerListSkeleton.vue`

```vue
<template>
  <div class="space-y-4">
    <div v-for="i in 3" :key="i" class="animate-pulse">
      <div
        class="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
      >
        <!-- Avatar skeleton -->
        <div class="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>

        <!-- Content skeleton -->
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div class="flex gap-2">
            <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
        </div>

        <!-- Action skeleton -->
        <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
      </div>
    </div>
  </div>
</template>
```

**File**: `components/p2p/SessionListSkeleton.vue`

```vue
<template>
  <div class="space-y-4">
    <div v-for="i in 2" :key="i" class="animate-pulse">
      <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div class="flex items-start gap-4">
          <div
            class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"
          ></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

**Update SignerList.vue**:

```vue
<template>
  <UiAppCard title="Available Signers" icon="i-lucide-pen-tool">
    <!-- Loading State -->
    <P2pSignerListSkeleton v-if="loading" />

    <!-- Content -->
    <template v-else-if="signers.length > 0">
      <!-- ... existing content -->
    </template>

    <!-- Empty State -->
    <UiAppEmptyState v-else ... />
  </UiAppCard>
</template>
```

### Task 6.2: Enhanced Empty States

Create illustrated empty states with clear CTAs.

**File**: `components/p2p/EmptyStateSigners.vue`

```vue
<script setup lang="ts">
const emit = defineEmits<{
  becomeSigner: []
  refresh: []
}>()
</script>

<template>
  <div class="text-center py-8">
    <!-- Illustration -->
    <div
      class="w-24 h-24 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center"
    >
      <UIcon name="i-lucide-users" class="w-12 h-12 text-primary/50" />
    </div>

    <h3 class="text-lg font-semibold mb-2">No Signers Available</h3>
    <p class="text-muted max-w-sm mx-auto mb-6">
      No signers are currently online. Check back later or become a signer
      yourself to help others!
    </p>

    <div class="flex justify-center gap-3">
      <UButton color="primary" @click="emit('becomeSigner')">
        <UIcon name="i-lucide-user-plus" class="w-4 h-4 mr-2" />
        Become a Signer
      </UButton>
      <UButton color="neutral" variant="soft" @click="emit('refresh')">
        <UIcon name="i-lucide-refresh-cw" class="w-4 h-4 mr-2" />
        Refresh
      </UButton>
    </div>
  </div>
</template>
```

**File**: `components/p2p/EmptyStateSessions.vue`

```vue
<script setup lang="ts">
const emit = defineEmits<{
  createSession: []
}>()
</script>

<template>
  <div class="text-center py-8">
    <div
      class="w-24 h-24 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center"
    >
      <UIcon name="i-lucide-key" class="w-12 h-12 text-primary/50" />
    </div>

    <h3 class="text-lg font-semibold mb-2">No Active Sessions</h3>
    <p class="text-muted max-w-sm mx-auto mb-6">
      You don't have any active signing sessions. Start one by requesting a
      signature from a signer.
    </p>

    <UButton color="primary" @click="emit('createSession')">
      <UIcon name="i-lucide-plus" class="w-4 h-4 mr-2" />
      Find Signers
    </UButton>
  </div>
</template>
```

### Task 6.3: Success Celebrations

Add celebratory feedback for key actions.

**File**: `composables/useCelebration.ts`

```typescript
export function useCelebration() {
  const { success } = useNotifications()

  // Confetti animation (using canvas-confetti or similar)
  function celebrate(options?: { title?: string; message?: string }) {
    // Show success toast with celebration styling
    success(
      options?.title || '🎉 Success!',
      options?.message || 'Action completed successfully',
    )

    // Trigger confetti if available
    if (typeof window !== 'undefined' && (window as any).confetti) {
      ;(window as any).confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
    }
  }

  // Specific celebrations
  function celebrateSessionComplete() {
    celebrate({
      title: '🎉 Signing Complete!',
      message:
        'Your multi-signature transaction has been signed and broadcast.',
    })
  }

  function celebrateFirstSigner() {
    celebrate({
      title: '🎉 First Signer Found!',
      message: 'You discovered your first signer on the P2P network.',
    })
  }

  function celebrateFirstSession() {
    celebrate({
      title: '🎉 First Session!',
      message: 'You completed your first multi-signature session.',
    })
  }

  return {
    celebrate,
    celebrateSessionComplete,
    celebrateFirstSigner,
    celebrateFirstSession,
  }
}
```

**Usage in P2P page**:

```typescript
const { celebrateSessionComplete } = useCelebration()

// In session completion handler
function handleSessionCompleted(session: WalletSigningSession) {
  celebrateSessionComplete()
  // ... rest of handler
}
```

### Task 6.4: Error Recovery

Add retry buttons and helpful error messages.

**File**: `components/p2p/ErrorState.vue`

```vue
<script setup lang="ts">
const props = defineProps<{
  title?: string
  message: string
  retryable?: boolean
}>()

const emit = defineEmits<{
  retry: []
  dismiss: []
}>()
</script>

<template>
  <div class="p-4 border border-error/20 bg-error/5 rounded-lg">
    <div class="flex items-start gap-3">
      <div
        class="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0"
      >
        <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-error" />
      </div>

      <div class="flex-1 min-w-0">
        <h4 class="font-semibold text-error">
          {{ title || 'Something went wrong' }}
        </h4>
        <p class="text-sm text-muted mt-1">{{ message }}</p>

        <div class="flex gap-2 mt-3">
          <UButton
            v-if="retryable"
            color="error"
            variant="soft"
            size="sm"
            @click="emit('retry')"
          >
            <UIcon name="i-lucide-refresh-cw" class="w-4 h-4 mr-2" />
            Try Again
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            @click="emit('dismiss')"
          >
            Dismiss
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
```

**File**: `components/p2p/ConnectionError.vue`

```vue
<script setup lang="ts">
const emit = defineEmits<{
  retry: []
  troubleshoot: []
}>()
</script>

<template>
  <UiAppCard>
    <div class="text-center py-8">
      <div
        class="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center"
      >
        <UIcon name="i-lucide-wifi-off" class="w-8 h-8 text-error" />
      </div>

      <h3 class="text-lg font-semibold mb-2">Connection Failed</h3>
      <p class="text-muted max-w-sm mx-auto mb-4">
        Unable to connect to the P2P network. This could be due to network
        issues or firewall settings.
      </p>

      <div class="flex justify-center gap-3">
        <UButton color="primary" @click="emit('retry')">
          <UIcon name="i-lucide-refresh-cw" class="w-4 h-4 mr-2" />
          Try Again
        </UButton>
        <UButton color="neutral" variant="soft" @click="emit('troubleshoot')">
          <UIcon name="i-lucide-help-circle" class="w-4 h-4 mr-2" />
          Troubleshoot
        </UButton>
      </div>

      <!-- Troubleshooting Tips -->
      <div class="mt-6 text-left max-w-md mx-auto">
        <h4 class="text-sm font-medium mb-2">Troubleshooting Tips:</h4>
        <ul class="text-sm text-muted space-y-1">
          <li>• Check your internet connection</li>
          <li>• Disable VPN if enabled</li>
          <li>• Allow WebRTC in your browser settings</li>
          <li>• Try refreshing the page</li>
        </ul>
      </div>
    </div>
  </UiAppCard>
</template>
```

### Task 6.5: Keyboard Navigation

Add keyboard shortcuts and focus management.

**File**: `composables/useP2PKeyboard.ts`

```typescript
export function useP2PKeyboard() {
  const activeTab = ref('overview')

  // Tab navigation with keyboard
  function handleKeydown(event: KeyboardEvent) {
    const tabs = ['overview', 'signers', 'sessions', 'requests', 'settings']
    const currentIndex = tabs.indexOf(activeTab.value)

    switch (event.key) {
      case 'ArrowLeft':
        if (currentIndex > 0) {
          activeTab.value = tabs[currentIndex - 1]
        }
        break
      case 'ArrowRight':
        if (currentIndex < tabs.length - 1) {
          activeTab.value = tabs[currentIndex + 1]
        }
        break
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        const index = parseInt(event.key) - 1
        if (tabs[index]) {
          activeTab.value = tabs[index]
        }
        break
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })

  return { activeTab }
}
```

### Task 6.6: Screen Reader Accessibility

Add ARIA labels and live regions.

**Update components with ARIA attributes**:

```vue
<!-- Tab navigation -->
<div
  role="tablist"
  aria-label="P2P sections"
  class="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1"
>
  <button
    v-for="tab in tabs"
    :key="tab.value"
    role="tab"
    :aria-selected="activeTab === tab.value"
    :aria-controls="`panel-${tab.value}`"
    :id="`tab-${tab.value}`"
    @click="activeTab = tab.value"
  >
    {{ tab.label }}
  </button>
</div>

<!-- Tab panels -->
<div
  v-for="tab in tabs"
  :key="tab.value"
  role="tabpanel"
  :id="`panel-${tab.value}`"
  :aria-labelledby="`tab-${tab.value}`"
  :hidden="activeTab !== tab.value"
>
  <!-- Tab content -->
</div>

<!-- Live region for notifications -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
  {{ liveMessage }}
</div>
```

**Add screen reader announcements**:

```typescript
// Announce important events to screen readers
const liveMessage = ref('')

function announce(message: string) {
  liveMessage.value = message
  setTimeout(() => {
    liveMessage.value = ''
  }, 1000)
}

// Usage
function handlePeerConnected(peer: UIPeerInfo) {
  announce(`${peer.nickname || 'A peer'} connected to the network`)
}

function handleRequestReceived(request: UISigningRequest) {
  announce(`New signing request from ${request.fromNickname || 'anonymous'}`)
}
```

---

## Checklist

### Loading States

- [ ] Create `SignerListSkeleton.vue`
- [ ] Create `SessionListSkeleton.vue`
- [ ] Add loading states to all async operations
- [ ] Add loading indicators to buttons

### Empty States

- [ ] Create `EmptyStateSigners.vue`
- [ ] Create `EmptyStateSessions.vue`
- [ ] Update all empty states with illustrations and CTAs

### Success Celebrations

- [ ] Create `useCelebration` composable
- [ ] Add celebration for session completion
- [ ] Add celebration for first signer
- [ ] Add celebration for first session

### Error Recovery

- [ ] Create `ErrorState.vue`
- [ ] Create `ConnectionError.vue`
- [ ] Add retry buttons to all error states
- [ ] Add troubleshooting tips

### Keyboard Navigation

- [ ] Create `useP2PKeyboard` composable
- [ ] Add tab navigation with arrow keys
- [ ] Add number shortcuts for tabs
- [ ] Add focus management

### Accessibility

- [ ] Add ARIA roles to tabs
- [ ] Add ARIA labels to interactive elements
- [ ] Add live region for announcements
- [ ] Test with screen reader
- [ ] Ensure color contrast meets WCAG AA

### Testing

- [ ] All loading states display correctly
- [ ] Empty states show appropriate CTAs
- [ ] Celebrations trigger on success
- [ ] Retry buttons work
- [ ] Keyboard navigation works
- [ ] Screen reader announces events

---

## Final Testing Checklist

Before marking P2P UI integration complete:

### Functional Testing

- [ ] Can connect to P2P network
- [ ] Can disconnect from P2P network
- [ ] Can view and filter signers
- [ ] Can request signature from signer
- [ ] Can accept/reject incoming requests
- [ ] Can view and manage sessions
- [ ] Can save signer as contact
- [ ] Can toggle presence status
- [ ] Activity feed updates in real-time

### UX Testing

- [ ] First-time user understands P2P purpose
- [ ] All actions have loading feedback
- [ ] All errors have recovery options
- [ ] Empty states provide guidance
- [ ] Success actions feel rewarding

### Accessibility Testing

- [ ] Keyboard-only navigation works
- [ ] Screen reader announces events
- [ ] Color contrast is sufficient
- [ ] Focus indicators are visible

---

_Previous: [05_PRESENCE_DISCOVERY.md](./05_PRESENCE_DISCOVERY.md)_
_Back to: [00_OVERVIEW.md](./00_OVERVIEW.md)_
