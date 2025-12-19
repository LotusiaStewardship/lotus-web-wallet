# Phase 12: Polish & Accessibility

## Overview

This final phase focuses on polish, accessibility, performance optimization, and keyboard navigation. These improvements make the wallet feel professional and usable by everyone.

**Priority**: P3 (Lower)
**Estimated Effort**: 2-3 days
**Dependencies**: All previous phases

---

## Goals

1. Keyboard shortcuts and navigation
2. Accessibility audit and fixes
3. Performance optimization
4. Loading state standardization
5. Error handling improvements
6. Mobile optimization pass

---

## 1. Keyboard Shortcuts

### File: `composables/useKeyboardShortcuts.ts`

```ts
import { onKeyStroke } from '@vueuse/core'

export function useKeyboardShortcuts() {
  const router = useRouter()

  // Global shortcuts
  const shortcuts = [
    { key: 'k', meta: true, action: () => openCommandPalette() },
    { key: 's', meta: true, action: () => router.push('/transact/send') },
    { key: 'r', meta: true, action: () => router.push('/transact/receive') },
    { key: 'h', meta: true, action: () => router.push('/transact/history') },
    { key: '/', action: () => focusSearch() },
    { key: '?', action: () => openShortcutsHelp() },
    { key: 'Escape', action: () => closeModals() },
  ]

  // Register shortcuts
  shortcuts.forEach(({ key, meta, action }) => {
    onKeyStroke(key, e => {
      if (meta && !(e.metaKey || e.ctrlKey)) return

      // Don't trigger if typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (key !== 'Escape') return
      }

      e.preventDefault()
      action()
    })
  })

  return {
    shortcuts,
  }
}

// Command palette state (global)
const commandPaletteOpen = ref(false)
export function openCommandPalette() {
  commandPaletteOpen.value = true
}
export function closeCommandPalette() {
  commandPaletteOpen.value = false
}
export function useCommandPalette() {
  return { open: commandPaletteOpen }
}

// Shortcuts help modal
const shortcutsHelpOpen = ref(false)
export function openShortcutsHelp() {
  shortcutsHelpOpen.value = true
}
export function useShortcutsHelp() {
  return { open: shortcutsHelpOpen }
}

// Focus search
function focusSearch() {
  const searchInput = document.querySelector(
    '[data-search-input]',
  ) as HTMLInputElement
  searchInput?.focus()
}

// Close modals
function closeModals() {
  commandPaletteOpen.value = false
  shortcutsHelpOpen.value = false
  // Could emit event for other modals
}
```

### Keyboard Shortcuts Help Modal

**File**: `components/layout/KeyboardShortcutsModal.vue`

```vue
<script setup lang="ts">
import { useShortcutsHelp } from '~/composables/useKeyboardShortcuts'

const { open } = useShortcutsHelp()

const shortcutGroups = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['⌘', 'S'], description: 'Go to Send' },
      { keys: ['⌘', 'R'], description: 'Go to Receive' },
      { keys: ['⌘', 'H'], description: 'Go to History' },
      { keys: ['/'], description: 'Focus search' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close modal/dialog' },
    ],
  },
]
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-md' }">
    <div class="p-6">
      <h2 class="text-xl font-bold mb-6">Keyboard Shortcuts</h2>

      <div class="space-y-6">
        <div v-for="group in shortcutGroups" :key="group.title">
          <h3
            class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3"
          >
            {{ group.title }}
          </h3>
          <div class="space-y-2">
            <div
              v-for="shortcut in group.shortcuts"
              :key="shortcut.description"
              class="flex items-center justify-between"
            >
              <span class="text-gray-600 dark:text-gray-400">{{
                shortcut.description
              }}</span>
              <div class="flex items-center gap-1">
                <kbd
                  v-for="key in shortcut.keys"
                  :key="key"
                  class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono"
                >
                  {{ key }}
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UButton
        color="neutral"
        variant="soft"
        block
        class="mt-6"
        @click="open = false"
      >
        Close
      </UButton>
    </div>
  </UModal>
</template>
```

---

## 2. Accessibility Improvements

### 2.1 Skip Links

**File**: `components/layout/SkipLinks.vue`

```vue
<template>
  <div class="sr-only focus-within:not-sr-only">
    <a
      href="#main-content"
      class="absolute top-0 left-0 z-50 px-4 py-2 bg-primary text-white focus:outline-none"
    >
      Skip to main content
    </a>
    <a
      href="#main-navigation"
      class="absolute top-0 left-0 z-50 px-4 py-2 bg-primary text-white focus:outline-none"
    >
      Skip to navigation
    </a>
  </div>
</template>
```

### 2.2 Focus Management

```ts
// composables/useFocusManagement.ts

export function useFocusManagement() {
  // Trap focus within a modal
  function trapFocus(element: HTMLElement) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    element.addEventListener('keydown', handleKeyDown)
    firstElement?.focus()

    return () => {
      element.removeEventListener('keydown', handleKeyDown)
    }
  }

  // Return focus to trigger element after modal closes
  function returnFocus(triggerElement: HTMLElement | null) {
    triggerElement?.focus()
  }

  return {
    trapFocus,
    returnFocus,
  }
}
```

### 2.3 ARIA Labels

Add proper ARIA labels to interactive elements:

```vue
<!-- Example: Balance card with proper ARIA -->
<div
  role="region"
  aria-label="Wallet balance"
  class="balance-card"
>
  <div aria-live="polite" aria-atomic="true">
    <span class="sr-only">Current balance:</span>
    {{ formattedBalance }} XPI
  </div>

  <button
    :aria-label="balanceVisible ? 'Hide balance' : 'Show balance'"
    :aria-pressed="balanceVisible"
    @click="toggleBalance"
  >
    <UIcon :name="balanceVisible ? 'i-lucide-eye' : 'i-lucide-eye-off'" />
  </button>
</div>
```

### 2.4 Color Contrast

Ensure all text meets WCAG AA standards:

```css
/* In your CSS/Tailwind config */

/* Minimum contrast ratios:
   - Normal text: 4.5:1
   - Large text (18px+ or 14px+ bold): 3:1
   - UI components: 3:1
*/

/* Example fixes */
.text-gray-500 {
  /* Ensure this has enough contrast on both light and dark backgrounds */
  @apply text-gray-600 dark:text-gray-400;
}
```

---

## 3. Performance Optimization

### 3.1 Virtual Scrolling for Long Lists

**File**: `components/common/VirtualList.vue`

```vue
<script setup lang="ts">
import { useVirtualList } from '@vueuse/core'

const props = defineProps<{
  items: any[]
  itemHeight: number
}>()

const containerRef = ref<HTMLElement | null>(null)

const { list, containerProps, wrapperProps } = useVirtualList(
  toRef(props, 'items'),
  {
    itemHeight: props.itemHeight,
  },
)
</script>

<template>
  <div v-bind="containerProps" ref="containerRef" class="h-full overflow-auto">
    <div v-bind="wrapperProps">
      <slot
        v-for="{ data, index } in list"
        :key="index"
        :item="data"
        :index="index"
      />
    </div>
  </div>
</template>
```

### 3.2 Lazy Loading Components

```vue
<!-- Use defineAsyncComponent for heavy components -->
<script setup lang="ts">
const QRScanner = defineAsyncComponent(
  () => import('~/components/send/QRScannerModal.vue'),
)

const ExportModal = defineAsyncComponent(
  () => import('~/components/history/ExportModal.vue'),
)
</script>
```

### 3.3 Image Optimization

```vue
<!-- Use NuxtImg for optimized images -->
<NuxtImg
  :src="avatarUrl"
  :alt="name"
  width="48"
  height="48"
  loading="lazy"
  placeholder
/>
```

---

## 4. Standardized Loading States

### File: `components/ui/AppLoadingState.vue` (Enhanced)

```vue
<script setup lang="ts">
defineProps<{
  message?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'spinner' | 'skeleton' | 'dots'
}>()
</script>

<template>
  <!-- Spinner variant -->
  <div
    v-if="variant === 'spinner' || !variant"
    class="flex flex-col items-center justify-center gap-4 py-12"
  >
    <UIcon
      name="i-lucide-loader-2"
      class="animate-spin text-primary"
      :class="{
        'w-6 h-6': size === 'sm',
        'w-10 h-10': size === 'md' || !size,
        'w-16 h-16': size === 'lg',
      }"
    />
    <p v-if="message" class="text-gray-500 text-sm">{{ message }}</p>
  </div>

  <!-- Skeleton variant -->
  <div v-else-if="variant === 'skeleton'" class="space-y-4">
    <slot name="skeleton">
      <AppSkeleton variant="card" />
      <AppSkeleton variant="card" />
      <AppSkeleton variant="card" />
    </slot>
  </div>

  <!-- Dots variant -->
  <div
    v-else-if="variant === 'dots'"
    class="flex items-center justify-center gap-1 py-4"
  >
    <span
      v-for="i in 3"
      :key="i"
      class="w-2 h-2 rounded-full bg-primary animate-bounce"
      :style="{ animationDelay: `${i * 0.1}s` }"
    />
  </div>
</template>
```

---

## 5. Error Handling Improvements

### File: `components/ui/AppErrorState.vue` (Enhanced)

```vue
<script setup lang="ts">
defineProps<{
  title?: string
  message?: string
  code?: string
  retryLabel?: string
  helpUrl?: string
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <div
      class="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4"
    >
      <UIcon name="i-lucide-alert-circle" class="w-8 h-8 text-red-500" />
    </div>

    <h3 class="text-lg font-semibold mb-2">
      {{ title || 'Something went wrong' }}
    </h3>

    <p class="text-gray-500 mb-4 max-w-md">
      {{ message || 'An unexpected error occurred. Please try again.' }}
    </p>

    <p v-if="code" class="text-xs text-gray-400 font-mono mb-4">
      Error code: {{ code }}
    </p>

    <div class="flex gap-3">
      <UButton color="primary" @click="emit('retry')">
        <UIcon name="i-lucide-refresh-cw" class="w-4 h-4 mr-2" />
        {{ retryLabel || 'Try Again' }}
      </UButton>

      <UButton
        v-if="helpUrl"
        color="neutral"
        variant="soft"
        :href="helpUrl"
        target="_blank"
      >
        <UIcon name="i-lucide-help-circle" class="w-4 h-4 mr-2" />
        Get Help
      </UButton>
    </div>
  </div>
</template>
```

---

## 6. Mobile Optimization

### 6.1 Touch-Friendly Targets

```css
/* Ensure all interactive elements are at least 44x44px */
button,
a,
[role='button'] {
  min-height: 44px;
  min-width: 44px;
}

/* Add touch feedback */
@media (hover: none) {
  button:active,
  a:active {
    transform: scale(0.98);
    opacity: 0.9;
  }
}
```

### 6.2 Swipe Gestures

```ts
// composables/useSwipeGestures.ts
import { useSwipe } from '@vueuse/core'

export function useSwipeNavigation(element: Ref<HTMLElement | null>) {
  const router = useRouter()

  const { direction } = useSwipe(element, {
    onSwipeEnd() {
      if (direction.value === 'left') {
        // Navigate forward in history
        router.forward()
      } else if (direction.value === 'right') {
        // Navigate back
        router.back()
      }
    },
  })
}
```

### 6.3 Pull to Refresh

```vue
<script setup lang="ts">
import { usePullToRefresh } from '~/composables/usePullToRefresh'

const { isPulling, pullDistance, onRefresh } = usePullToRefresh(async () => {
  await walletStore.refresh()
})
</script>

<template>
  <div class="relative">
    <!-- Pull indicator -->
    <div
      v-if="isPulling"
      class="absolute top-0 left-0 right-0 flex items-center justify-center py-4 transition-transform"
      :style="{ transform: `translateY(${pullDistance}px)` }"
    >
      <UIcon name="i-lucide-refresh-cw" class="w-6 h-6 animate-spin" />
    </div>

    <!-- Content -->
    <slot />
  </div>
</template>
```

---

## 7. Implementation Checklist

### Keyboard Navigation

- [ ] Implement global keyboard shortcuts
- [ ] Create shortcuts help modal
- [ ] Add focus management for modals
- [ ] Test tab navigation order

### Accessibility

- [ ] Add skip links
- [ ] Add ARIA labels to all interactive elements
- [ ] Verify color contrast (WCAG AA)
- [ ] Test with screen reader
- [ ] Add focus indicators

### Performance

- [ ] Implement virtual scrolling for long lists
- [ ] Add lazy loading for heavy components
- [ ] Optimize images
- [ ] Add loading skeletons
- [ ] Profile and fix performance bottlenecks

### Error Handling

- [ ] Standardize error states
- [ ] Add retry functionality everywhere
- [ ] Add help links for common errors
- [ ] Improve error messages

### Mobile

- [ ] Ensure touch targets are 44px minimum
- [ ] Add touch feedback
- [ ] Test on various screen sizes
- [ ] Optimize for slow connections

### Testing

- [ ] Run Lighthouse audit
- [ ] Run axe accessibility audit
- [ ] Test all keyboard shortcuts
- [ ] Test on mobile devices
- [ ] Test with screen reader

---

## 8. Final Verification

Before considering the UX implementation complete:

1. **Functionality**: All features work end-to-end
2. **Consistency**: Same patterns used everywhere
3. **Accessibility**: WCAG AA compliant
4. **Performance**: Lighthouse score > 90
5. **Mobile**: Full functionality on mobile
6. **Error Handling**: All errors are actionable
7. **Documentation**: User-facing help is complete

---

## Conclusion

This completes the comprehensive UX implementation plan for the lotus-web-wallet. The 12 phases cover:

1. **Layout & Navigation** - Simplified navigation, mobile support, command palette
2. **Onboarding** - First-time user experience
3. **Wallet Home** - Balance, quick actions, activity
4. **Send & Receive** - QR scanning, payment requests, confirmations
5. **Transaction History** - Search, filter, export
6. **Contacts** - Groups, activity, verification
7. **Explorer** - Search, block/tx/address details
8. **Social/RANK** - Voting, profile search
9. **P2P Network** - Signing requests, peer management
10. **Settings & Security** - PIN, backup verification, privacy
11. **Notifications** - Notification center, preferences
12. **Polish & Accessibility** - Keyboard shortcuts, a11y, performance

Following this plan will transform the wallet into a polished, user-friendly application.
