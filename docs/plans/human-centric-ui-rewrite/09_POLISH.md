# Phase 9: Polish

## Overview

The Polish phase ensures the application feels **complete, professional, and delightful**. This includes animations, loading states, error handling, accessibility, and edge cases.

**Prerequisites**: Phase 1-8  
**Estimated Effort**: 4-5 days  
**Priority**: P2

---

## Goals

1. Add loading states and skeletons
2. Implement error states with recovery
3. Add success animations
4. Ensure accessibility compliance
5. Handle edge cases
6. Add keyboard shortcuts
7. Implement offline support

---

## Loading States

### Skeleton Components

```vue
<!-- components/ui/Skeleton.vue -->
<template>
  <div
    :class="['animate-pulse bg-gray-200 dark:bg-gray-800 rounded', className]"
    :style="{ width, height }"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string
    height?: string
    className?: string
  }>(),
  {
    width: '100%',
    height: '1rem',
  },
)
</script>
```

### Person Card Skeleton

```vue
<!-- components/people/PersonCardSkeleton.vue -->
<template>
  <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
    <div class="flex items-center gap-3">
      <Skeleton width="40px" height="40px" class="rounded-full" />
      <div class="flex-1 space-y-2">
        <Skeleton width="120px" height="16px" />
        <Skeleton width="180px" height="12px" />
      </div>
    </div>
  </div>
</template>
```

### Activity Item Skeleton

```vue
<!-- components/activity/ActivityItemSkeleton.vue -->
<template>
  <div class="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
    <div class="flex items-start gap-3">
      <Skeleton width="40px" height="40px" class="rounded-full" />
      <div class="flex-1 space-y-2">
        <Skeleton width="60%" height="16px" />
        <Skeleton width="40%" height="12px" />
        <Skeleton width="80px" height="12px" />
      </div>
    </div>
  </div>
</template>
```

---

## Error States

### Error State Component

```vue
<!-- components/ui/ErrorState.vue -->
<template>
  <div class="text-center py-8">
    <div
      class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4"
    >
      <UIcon :name="icon" class="w-8 h-8 text-error" />
    </div>

    <h3 class="text-lg font-semibold mb-1">{{ title }}</h3>
    <p class="text-muted text-sm mb-4 max-w-xs mx-auto">{{ message }}</p>

    <div class="flex justify-center gap-2">
      <UButton
        v-if="retryable"
        color="primary"
        :loading="retrying"
        @click="handleRetry"
      >
        Try Again
      </UButton>
      <UButton v-if="dismissable" variant="ghost" @click="emit('dismiss')">
        Dismiss
      </UButton>
    </div>

    <!-- Technical Details (expandable) -->
    <details v-if="details" class="mt-4 text-left max-w-sm mx-auto">
      <summary class="text-xs text-muted cursor-pointer hover:text-primary">
        Technical details
      </summary>
      <pre
        class="mt-2 p-2 rounded bg-gray-100 dark:bg-gray-800 text-xs overflow-auto"
        >{{ details }}</pre
      >
    </details>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string
    message?: string
    icon?: string
    retryable?: boolean
    dismissable?: boolean
    details?: string
  }>(),
  {
    title: 'Something went wrong',
    message: 'An error occurred. Please try again.',
    icon: 'i-lucide-alert-circle',
    retryable: true,
    dismissable: false,
  },
)

const emit = defineEmits<{
  retry: []
  dismiss: []
}>()

const retrying = ref(false)

async function handleRetry() {
  retrying.value = true
  emit('retry')
  // Parent should set retrying to false when done
  setTimeout(() => {
    retrying.value = false
  }, 2000)
}
</script>
```

### Network Error Banner

```vue
<!-- components/ui/NetworkErrorBanner.vue -->
<template>
  <Transition
    enter-active-class="transition-all duration-300"
    enter-from-class="-translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-300"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-full opacity-0"
  >
    <div
      v-if="!isConnected"
      class="fixed top-0 inset-x-0 z-50 bg-error text-white px-4 py-2 text-center text-sm"
    >
      <div class="flex items-center justify-center gap-2">
        <UIcon name="i-lucide-wifi-off" class="w-4 h-4" />
        <span>No internet connection</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const isConnected = ref(true)

onMounted(() => {
  isConnected.value = navigator.onLine

  window.addEventListener('online', () => {
    isConnected.value = true
  })

  window.addEventListener('offline', () => {
    isConnected.value = false
  })
})
</script>
```

---

## Success Animations

### Success Checkmark Animation

```vue
<!-- components/ui/SuccessAnimation.vue -->
<template>
  <div class="relative w-20 h-20">
    <svg class="w-full h-full" viewBox="0 0 100 100">
      <!-- Circle -->
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="currentColor"
        stroke-width="4"
        class="text-success"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="circleOffset"
        style="transition: stroke-dashoffset 0.5s ease-out"
      />

      <!-- Checkmark -->
      <path
        d="M30 50 L45 65 L70 35"
        fill="none"
        stroke="currentColor"
        stroke-width="5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-success"
        :stroke-dasharray="checkLength"
        :stroke-dashoffset="checkOffset"
        style="transition: stroke-dashoffset 0.3s ease-out 0.3s"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    animate?: boolean
  }>(),
  {
    animate: true,
  },
)

const circumference = 2 * Math.PI * 45
const checkLength = 60

const circleOffset = ref(props.animate ? circumference : 0)
const checkOffset = ref(props.animate ? checkLength : 0)

onMounted(() => {
  if (props.animate) {
    requestAnimationFrame(() => {
      circleOffset.value = 0
      checkOffset.value = 0
    })
  }
})
</script>
```

### Confetti Animation

```vue
<!-- components/ui/Confetti.vue -->
<template>
  <canvas ref="canvas" class="fixed inset-0 pointer-events-none z-50" />
</template>

<script setup lang="ts">
const canvas = ref<HTMLCanvasElement>()

const props = withDefaults(
  defineProps<{
    particleCount?: number
    duration?: number
  }>(),
  {
    particleCount: 100,
    duration: 3000,
  },
)

const emit = defineEmits<{
  complete: []
}>()

onMounted(() => {
  if (!canvas.value) return

  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  canvas.value.width = window.innerWidth
  canvas.value.height = window.innerHeight

  const particles: Particle[] = []
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

  interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    color: string
    size: number
    rotation: number
    rotationSpeed: number
  }

  // Create particles
  for (let i = 0; i < props.particleCount; i++) {
    particles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 20,
      vy: Math.random() * -15 - 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
    })
  }

  const startTime = Date.now()

  function animate() {
    const elapsed = Date.now() - startTime
    if (elapsed > props.duration) {
      emit('complete')
      return
    }

    ctx!.clearRect(0, 0, canvas.value!.width, canvas.value!.height)

    const opacity = 1 - elapsed / props.duration

    particles.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.3 // gravity
      p.rotation += p.rotationSpeed

      ctx!.save()
      ctx!.translate(p.x, p.y)
      ctx!.rotate((p.rotation * Math.PI) / 180)
      ctx!.fillStyle = p.color
      ctx!.globalAlpha = opacity
      ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
      ctx!.restore()
    })

    requestAnimationFrame(animate)
  }

  animate()
})
</script>
```

---

## Accessibility

### Skip Links

```vue
<!-- components/a11y/SkipLinks.vue -->
<template>
  <div class="sr-only focus-within:not-sr-only">
    <a
      href="#main-content"
      class="fixed top-4 left-4 z-50 px-4 py-2 bg-primary text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      Skip to main content
    </a>
  </div>
</template>
```

### Focus Management Composable

```typescript
// composables/useFocusManagement.ts

export function useFocusManagement() {
  const previousFocus = ref<HTMLElement | null>(null)

  function trapFocus(container: HTMLElement) {
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }

  function saveFocus() {
    previousFocus.value = document.activeElement as HTMLElement
  }

  function restoreFocus() {
    previousFocus.value?.focus()
    previousFocus.value = null
  }

  return {
    trapFocus,
    saveFocus,
    restoreFocus,
  }
}
```

### Announce for Screen Readers

```typescript
// composables/useAnnounce.ts

export function useAnnounce() {
  const announcer = ref<HTMLElement | null>(null)

  onMounted(() => {
    // Create or find announcer element
    let el = document.getElementById('sr-announcer')
    if (!el) {
      el = document.createElement('div')
      el.id = 'sr-announcer'
      el.setAttribute('aria-live', 'polite')
      el.setAttribute('aria-atomic', 'true')
      el.className = 'sr-only'
      document.body.appendChild(el)
    }
    announcer.value = el
  })

  function announce(
    message: string,
    priority: 'polite' | 'assertive' = 'polite',
  ) {
    if (!announcer.value) return

    announcer.value.setAttribute('aria-live', priority)
    announcer.value.textContent = ''

    // Small delay to ensure screen readers pick up the change
    setTimeout(() => {
      if (announcer.value) {
        announcer.value.textContent = message
      }
    }, 100)
  }

  return { announce }
}
```

---

## Keyboard Shortcuts

### Keyboard Shortcuts Composable

```typescript
// composables/useKeyboardShortcuts.ts

interface Shortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  handler: () => void
  description: string
}

export function useKeyboardShortcuts() {
  const shortcuts = ref<Shortcut[]>([])
  const enabled = ref(true)

  function register(shortcut: Shortcut) {
    shortcuts.value.push(shortcut)
  }

  function unregister(key: string) {
    shortcuts.value = shortcuts.value.filter(s => s.key !== key)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!enabled.value) return

    // Don't trigger shortcuts when typing in inputs
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement).isContentEditable
    ) {
      return
    }

    for (const shortcut of shortcuts.value) {
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
      const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey)
      const shiftMatch = !!shortcut.shift === e.shiftKey
      const altMatch = !!shortcut.alt === e.altKey

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        e.preventDefault()
        shortcut.handler()
        return
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    shortcuts: readonly(shortcuts),
    enabled,
    register,
    unregister,
  }
}
```

### Global Shortcuts Setup

```typescript
// plugins/shortcuts.client.ts

export default defineNuxtPlugin(() => {
  const shortcuts = useKeyboardShortcuts()
  const router = useRouter()

  // Navigation shortcuts
  shortcuts.register({
    key: 'h',
    handler: () => router.push('/'),
    description: 'Go to Home',
  })

  shortcuts.register({
    key: 'p',
    handler: () => router.push('/people'),
    description: 'Go to People',
  })

  shortcuts.register({
    key: 'a',
    handler: () => router.push('/activity'),
    description: 'Go to Activity',
  })

  shortcuts.register({
    key: 's',
    handler: () => router.push('/settings'),
    description: 'Go to Settings',
  })

  // Action shortcuts
  shortcuts.register({
    key: 'n',
    handler: () => {
      // Open send modal
    },
    description: 'New transaction (Send)',
  })

  shortcuts.register({
    key: '/',
    handler: () => {
      // Focus search
    },
    description: 'Focus search',
  })

  shortcuts.register({
    key: '?',
    shift: true,
    handler: () => {
      // Show shortcuts modal
    },
    description: 'Show keyboard shortcuts',
  })
})
```

### Keyboard Shortcuts Modal

```vue
<!-- components/ui/KeyboardShortcutsModal.vue -->
<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-sm' }">
    <div class="p-4">
      <h2 class="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>

      <div class="space-y-4">
        <div>
          <h3 class="text-sm font-medium text-muted mb-2">Navigation</h3>
          <div class="space-y-2">
            <ShortcutItem key-combo="H" description="Go to Home" />
            <ShortcutItem key-combo="P" description="Go to People" />
            <ShortcutItem key-combo="A" description="Go to Activity" />
            <ShortcutItem key-combo="S" description="Go to Settings" />
          </div>
        </div>

        <div>
          <h3 class="text-sm font-medium text-muted mb-2">Actions</h3>
          <div class="space-y-2">
            <ShortcutItem key-combo="N" description="New transaction" />
            <ShortcutItem key-combo="/" description="Focus search" />
            <ShortcutItem key-combo="?" description="Show shortcuts" />
          </div>
        </div>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>('open')
</script>
```

---

## Offline Support

### Offline Indicator

```vue
<!-- components/ui/OfflineIndicator.vue -->
<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-300"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="!isOnline" class="fixed bottom-20 inset-x-4 z-40">
      <div
        class="bg-warning text-warning-foreground rounded-lg p-3 shadow-lg flex items-center gap-3"
      >
        <UIcon name="i-lucide-wifi-off" class="w-5 h-5" />
        <div class="flex-1">
          <p class="font-medium text-sm">You're offline</p>
          <p class="text-xs opacity-80">Some features may be unavailable</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const isOnline = ref(true)

onMounted(() => {
  isOnline.value = navigator.onLine

  window.addEventListener('online', () => {
    isOnline.value = true
  })

  window.addEventListener('offline', () => {
    isOnline.value = false
  })
})
</script>
```

---

## Edge Cases

### Empty States Checklist

| Location            | Empty State Message   | Action                   |
| ------------------- | --------------------- | ------------------------ |
| People list         | "No contacts yet"     | Add Contact button       |
| Activity feed       | "No activity yet"     | Explain what will appear |
| Shared wallets      | "No shared wallets"   | Create Wallet button     |
| Transaction history | "No transactions"     | Receive button           |
| Search results      | "No results found"    | Suggest alternatives     |
| Signing requests    | "No pending requests" | Explain what they are    |

### Error Handling Checklist

| Error Type            | User Message             | Recovery Action    |
| --------------------- | ------------------------ | ------------------ |
| Network error         | "Connection failed"      | Retry button       |
| Transaction failed    | "Transaction failed"     | Retry with details |
| Invalid address       | "Invalid address format" | Show format hint   |
| Insufficient balance  | "Not enough XPI"         | Show balance       |
| Session expired       | "Session expired"        | Refresh/reconnect  |
| P2P connection failed | "Couldn't connect"       | Retry or skip      |

---

## Tasks Checklist

### Loading States

- [ ] Create `Skeleton.vue` base component
- [ ] Create `PersonCardSkeleton.vue`
- [ ] Create `ActivityItemSkeleton.vue`
- [ ] Create `SharedWalletCardSkeleton.vue`
- [ ] Add loading states to all data-fetching pages

### Error States

- [ ] Create `ErrorState.vue` component
- [ ] Create `NetworkErrorBanner.vue`
- [ ] Add error handling to all async operations
- [ ] Implement retry logic

### Success States

- [ ] Create `SuccessAnimation.vue`
- [ ] Create `Confetti.vue`
- [ ] Add success feedback to all actions

### Accessibility

- [ ] Create `SkipLinks.vue`
- [ ] Create `useFocusManagement.ts`
- [ ] Create `useAnnounce.ts`
- [ ] Add ARIA labels throughout
- [ ] Test with screen reader
- [ ] Ensure color contrast compliance

### Keyboard Shortcuts

- [ ] Create `useKeyboardShortcuts.ts`
- [ ] Create `KeyboardShortcutsModal.vue`
- [ ] Register global shortcuts
- [ ] Add shortcut hints to UI

### Offline Support

- [ ] Create `OfflineIndicator.vue`
- [ ] Handle offline state in stores
- [ ] Queue actions for when online

### Edge Cases

- [ ] Implement all empty states
- [ ] Handle all error scenarios
- [ ] Test with slow network
- [ ] Test with no network

---

## Verification

- [ ] All loading states display correctly
- [ ] Error states show with retry option
- [ ] Success animations play
- [ ] Screen reader announces important changes
- [ ] Keyboard navigation works throughout
- [ ] Shortcuts work as documented
- [ ] Offline indicator appears when offline
- [ ] App remains usable offline (cached data)
- [ ] All empty states have helpful messages
- [ ] All errors have recovery paths

---

_Next: [10_VERIFICATION.md](./10_VERIFICATION.md)_
