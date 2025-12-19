# Phase 10: Polish and State Sync

## Overview

This phase implements polish, accessibility improvements, state synchronization, and the crypto worker. It consolidates all remaining polish work from multiple plans into a single comprehensive phase.

**Priority**: P2 (Medium)
**Estimated Effort**: 4-5 days
**Dependencies**: Phase 9 (Contact and Cross-Feature Integration)

---

## Source Phases

| Source Plan               | Phase | Component              |
| ------------------------- | ----- | ---------------------- |
| unified-p2p-musig2-ui     | 6     | Polish & Accessibility |
| unified-remaining-tasks   | 4     | Polish & Accessibility |
| background-service-worker | 5     | State Synchronization  |
| background-service-worker | 6     | Crypto Worker          |

---

## Tasks

### 10.1 Loading States

**Effort**: 0.5 days

#### Skeleton Components

- [ ] Create `components/p2p/SignerListSkeleton.vue`

  ```vue
  <template>
    <div class="space-y-3">
      <div v-for="i in 3" :key="i" class="animate-pulse">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gray-200 rounded-full" />
          <div class="flex-1">
            <div class="h-4 bg-gray-200 rounded w-1/3" />
            <div class="h-3 bg-gray-200 rounded w-1/2 mt-1" />
          </div>
        </div>
      </div>
    </div>
  </template>
  ```

- [ ] Create `components/musig2/SharedWalletListSkeleton.vue`

- [ ] Create `components/common/LoadingOverlay.vue`
  ```vue
  <template>
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <UCard class="w-64">
        <div class="flex flex-col items-center gap-4">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin" />
          <p>{{ message }}</p>
        </div>
      </UCard>
    </div>
  </template>
  ```

#### Loading State Integration

- [ ] Add loading states to all async operations
- [ ] Verify all pages show skeletons while loading
- [ ] Add loading indicators to buttons during actions

---

### 10.2 Empty States

**Effort**: 0.5 days

#### Empty State Components

- [ ] Add empty state to signers list

  ```vue
  <div v-if="signers.length === 0" class="text-center py-8">
    <UIcon name="i-heroicons-users" class="w-12 h-12 text-gray-400 mx-auto" />
    <p class="mt-2 text-gray-500">No signers discovered</p>
    <p class="text-sm text-gray-400">
      Connect to the P2P network to discover signers
    </p>
  </div>
  ```

- [ ] Add empty state to sessions list
- [ ] Add empty state to requests list
- [ ] Add empty state to shared wallets list
- [ ] Add empty state to activity feed

---

### 10.3 Error Handling

**Effort**: 0.5 days

#### Error State Component

- [ ] Create `components/common/ErrorState.vue`

  ```vue
  <script setup lang="ts">
  interface Props {
    title?: string
    message?: string
    retryable?: boolean
  }

  const emit = defineEmits<{
    retry: []
  }>()
  </script>

  <template>
    <div class="text-center py-8">
      <UIcon
        name="i-heroicons-exclamation-triangle"
        class="w-12 h-12 text-red-500 mx-auto"
      />
      <p class="mt-2 font-medium">{{ title || 'Something went wrong' }}</p>
      <p class="text-sm text-gray-500">{{ message }}</p>
      <UButton v-if="retryable" class="mt-4" @click="$emit('retry')">
        Try Again
      </UButton>
    </div>
  </template>
  ```

#### Error Handling Integration

- [ ] Add error handling to all async operations
- [ ] Add retry functionality where appropriate
- [ ] Show user-friendly error messages

---

### 10.4 Success Feedback

**Effort**: 0.25 days

#### Success Animation

- [ ] Create `components/common/SuccessAnimation.vue`

  ```vue
  <template>
    <div class="flex flex-col items-center gap-4">
      <div
        class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center"
      >
        <UIcon name="i-heroicons-check" class="w-8 h-8 text-green-500" />
      </div>
      <p class="font-medium">{{ message }}</p>
    </div>
  </template>
  ```

- [ ] Add success feedback to key actions:
  - Wallet creation
  - Transaction sent
  - Signing complete
  - Contact saved

---

### 10.5 Keyboard Navigation

**Source**: unified-remaining-tasks/04_POLISH_ACCESSIBILITY.md
**Effort**: 0.5 days

#### useKeyboardShortcuts Composable

- [ ] Create `composables/useKeyboardShortcuts.ts`
  ```typescript
  export function useKeyboardShortcuts() {
    const shortcuts: Map<string, () => void> = new Map()

    function register(key: string, callback: () => void) {
      shortcuts.set(key, callback)
    }

    function handleKeydown(event: KeyboardEvent) {
      const key = [
        event.metaKey && 'cmd',
        event.ctrlKey && 'ctrl',
        event.shiftKey && 'shift',
        event.key.toLowerCase(),
      ]
        .filter(Boolean)
        .join('+')

      const callback = shortcuts.get(key)
      if (callback) {
        event.preventDefault()
        callback()
      }
    }

    onMounted(() => {
      window.addEventListener('keydown', handleKeydown)
    })

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeydown)
    })

    return { register }
  }
  ```

#### KeyboardShortcutsModal

- [ ] Create `components/common/KeyboardShortcutsModal.vue`
  ```vue
  <template>
    <UModal v-model="isOpen">
      <UCard>
        <template #header>Keyboard Shortcuts</template>

        <div class="space-y-4">
          <div v-for="group in shortcutGroups" :key="group.name">
            <p class="font-medium text-sm text-gray-500">{{ group.name }}</p>
            <div class="divide-y divide-default">
              <div
                v-for="shortcut in group.shortcuts"
                :key="shortcut.key"
                class="py-2 flex justify-between"
              >
                <span>{{ shortcut.description }}</span>
                <kbd class="px-2 py-1 bg-gray-100 rounded text-sm">{{
                  shortcut.key
                }}</kbd>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </UModal>
  </template>
  ```

#### Global Shortcuts

- [ ] Register global shortcuts in `app.vue`

  ```typescript
  const { register } = useKeyboardShortcuts()
  const router = useRouter()

  register('cmd+k', () => openCommandPalette())
  register('cmd+/', () => openShortcutsModal())
  register('g+h', () => router.push('/'))
  register('g+s', () => router.push('/transact/send'))
  register('g+r', () => router.push('/transact/receive'))
  register('g+c', () => router.push('/people/contacts'))
  ```

---

### 10.6 Accessibility

**Effort**: 0.5 days

#### Skip Links

- [ ] Create `components/common/SkipLinks.vue`

  ```vue
  <template>
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:rounded focus:shadow"
    >
      Skip to main content
    </a>
  </template>
  ```

- [ ] Add to `layouts/default.vue`

#### Focus Management

- [ ] Create `composables/useFocusManagement.ts`
  ```typescript
  export function useFocusManagement() {
    function trapFocus(container: HTMLElement) {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      // Implementation...
    }

    function restoreFocus(element: HTMLElement) {
      element.focus()
    }

    return { trapFocus, restoreFocus }
  }
  ```

#### ARIA Labels

- [ ] Add ARIA labels to interactive elements
- [ ] Implement focus management in modals
- [ ] Run axe accessibility audit
- [ ] Fix any issues found

---

### 10.7 Performance

**Effort**: 0.5 days

#### Virtual Scrolling

- [ ] Add virtual scrolling to history page

  ```vue
  <script setup>
  import { useVirtualList } from '@vueuse/core'

  const { list, containerProps, wrapperProps } = useVirtualList(transactions, {
    itemHeight: 72,
  })
  </script>
  ```

#### Lazy Loading

- [ ] Lazy load heavy components
  ```typescript
  const HeavyComponent = defineAsyncComponent(
    () => import('./HeavyComponent.vue'),
  )
  ```

#### Image Optimization

- [ ] Optimize images (if any)
- [ ] Use appropriate image formats

#### Lighthouse Audit

- [ ] Run Lighthouse audit
- [ ] Address performance issues
- [ ] Target score > 90

---

### 10.8 Mobile Optimization

**Effort**: 0.25 days

#### Touch Targets

- [ ] Audit touch target sizes (minimum 44px)
- [ ] Add touch feedback (active states)

#### Mobile Testing

- [ ] Test on mobile devices
- [ ] Verify responsive layouts
- [ ] Check touch interactions

---

### 10.9 State Synchronization (Service Worker)

**Source**: background-service-worker/05_STATE_SYNCHRONIZATION.md
**Effort**: 1 day

#### IndexedDB Schema

- [ ] Create `service-worker/modules/state-sync.ts`

  ```typescript
  const DB_NAME = 'lotus-wallet-sw'
  const DB_VERSION = 1

  interface CachedState {
    walletBalance: number
    lastKnownUtxos: string[]
    pendingSessions: string[]
    lastSyncTimestamp: number
  }

  class StateSync {
    private db: IDBDatabase | null = null

    async init() {
      this.db = await this.openDatabase()
    }

    private openDatabase(): Promise<IDBDatabase> {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onupgradeneeded = event => {
          const db = (event.target as IDBOpenDBRequest).result
          db.createObjectStore('state', { keyPath: 'key' })
          db.createObjectStore('utxos', { keyPath: 'txid' })
          db.createObjectStore('sessions', { keyPath: 'id' })
        }

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    }
  }
  ```

#### CRUD Operations

- [ ] Implement state caching

  ```typescript
  async cacheState(state: Partial<CachedState>) {
    const tx = this.db!.transaction('state', 'readwrite')
    const store = tx.objectStore('state')

    for (const [key, value] of Object.entries(state)) {
      store.put({ key, value, timestamp: Date.now() })
    }
  }

  async getState(key: string): Promise<unknown> {
    const tx = this.db!.transaction('state', 'readonly')
    const store = tx.objectStore('state')
    const request = store.get(key)

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result?.value)
    })
  }
  ```

#### State Sync with Client

- [ ] Implement sync on tab visibility change
  ```typescript
  // In client
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      const { postMessage, onMessage } = useServiceWorker()

      postMessage({ type: 'GET_CACHED_STATE' })

      onMessage(event => {
        if (event.data?.type === 'CACHED_STATE') {
          // Merge with current state
          walletStore.mergeState(event.data.payload)
        }
      })
    }
  })
  ```

#### Offline Indicator

- [ ] Create offline indicator component
  ```vue
  <template>
    <div v-if="!isOnline" class="fixed bottom-4 left-4 z-50">
      <UBadge color="yellow">
        <UIcon name="i-heroicons-wifi" class="w-4 h-4 mr-1" />
        Offline
      </UBadge>
    </div>
  </template>
  ```

---

### 10.10 Crypto Worker

**Source**: background-service-worker/06_CRYPTO_WORKER.md
**Effort**: 1 day

#### Worker Setup

- [ ] Create `types/crypto-worker.ts`

  ```typescript
  export type CryptoWorkerRequest =
    | { type: 'GENERATE_MNEMONIC'; payload: { strength: number } }
    | { type: 'DERIVE_KEY'; payload: { mnemonic: string; path: string } }
    | { type: 'SIGN_TRANSACTION'; payload: { tx: string; privateKey: string } }
    | { type: 'SIGN_MESSAGE'; payload: { message: string; privateKey: string } }

  export type CryptoWorkerResponse =
    | { type: 'MNEMONIC_GENERATED'; payload: { mnemonic: string } }
    | {
        type: 'KEY_DERIVED'
        payload: { publicKey: string; privateKey: string }
      }
    | { type: 'TRANSACTION_SIGNED'; payload: { signedTx: string } }
    | { type: 'MESSAGE_SIGNED'; payload: { signature: string } }
    | { type: 'ERROR'; payload: { message: string } }
  ```

- [ ] Create `workers/crypto.worker.ts`

  ```typescript
  /// <reference lib="webworker" />

  self.onmessage = async (event: MessageEvent<CryptoWorkerRequest>) => {
    try {
      switch (event.data.type) {
        case 'GENERATE_MNEMONIC':
          const mnemonic = generateMnemonic(event.data.payload.strength)
          self.postMessage({
            type: 'MNEMONIC_GENERATED',
            payload: { mnemonic },
          })
          break
        // ... other cases
      }
    } catch (error) {
      self.postMessage({ type: 'ERROR', payload: { message: error.message } })
    }
  }
  ```

#### Vite Worker Configuration

- [ ] Configure Vite for worker bundling
  ```typescript
  // vite.config.ts or nuxt.config.ts
  vite: {
    worker: {
      format: 'es',
    },
  }
  ```

#### useCryptoWorker Composable

- [ ] Create `composables/useCryptoWorker.ts`
  ```typescript
  export function useCryptoWorker() {
    const worker = ref<Worker | null>(null)
    const pending = new Map<string, { resolve: Function; reject: Function }>()

    function init() {
      worker.value = new Worker(
        new URL('../workers/crypto.worker.ts', import.meta.url),
        { type: 'module' },
      )

      worker.value.onmessage = event => {
        const { requestId, ...response } = event.data
        const handlers = pending.get(requestId)
        if (handlers) {
          if (response.type === 'ERROR') {
            handlers.reject(new Error(response.payload.message))
          } else {
            handlers.resolve(response.payload)
          }
          pending.delete(requestId)
        }
      }
    }

    async function request<T>(message: CryptoWorkerRequest): Promise<T> {
      const requestId = crypto.randomUUID()

      return new Promise((resolve, reject) => {
        pending.set(requestId, { resolve, reject })
        worker.value?.postMessage({ ...message, requestId })
      })
    }

    return { init, request }
  }
  ```

#### Feature Flag

- [ ] Add `USE_CRYPTO_WORKER` feature flag
  ```typescript
  // utils/constants.ts
  export const USE_CRYPTO_WORKER = false // Default off until tested
  ```

#### Integration (Behind Flag)

- [ ] Integrate with wallet store behind feature flag
  ```typescript
  async function generateMnemonic() {
    if (USE_CRYPTO_WORKER) {
      const { request } = useCryptoWorker()
      const result = await request({
        type: 'GENERATE_MNEMONIC',
        payload: { strength: 128 },
      })
      return result.mnemonic
    } else {
      // Existing main thread implementation
      return Mnemonic.generate()
    }
  }
  ```

---

## File Changes Summary

### New Files

| File                                             | Purpose                    |
| ------------------------------------------------ | -------------------------- |
| `components/p2p/SignerListSkeleton.vue`          | Loading skeleton           |
| `components/musig2/SharedWalletListSkeleton.vue` | Loading skeleton           |
| `components/common/LoadingOverlay.vue`           | Full-screen loading        |
| `components/common/ErrorState.vue`               | Error display              |
| `components/common/SuccessAnimation.vue`         | Success feedback           |
| `components/common/SkipLinks.vue`                | Accessibility skip links   |
| `components/common/KeyboardShortcutsModal.vue`   | Shortcuts help             |
| `composables/useKeyboardShortcuts.ts`            | Keyboard shortcut handling |
| `composables/useFocusManagement.ts`              | Focus trap and restore     |
| `composables/useCryptoWorker.ts`                 | Crypto worker interface    |
| `service-worker/modules/state-sync.ts`           | IndexedDB state caching    |
| `workers/crypto.worker.ts`                       | Crypto operations worker   |
| `types/crypto-worker.ts`                         | Worker message types       |

### Modified Files

| File                   | Changes                   |
| ---------------------- | ------------------------- |
| `layouts/default.vue`  | Add SkipLinks             |
| `app.vue`              | Register global shortcuts |
| `service-worker/sw.ts` | Import state sync         |
| `stores/wallet.ts`     | Crypto worker integration |
| `nuxt.config.ts`       | Vite worker config        |

---

## Verification Checklist

### Loading States

- [ ] Skeletons show while loading
- [ ] Loading overlay works
- [ ] Button loading states work

### Empty States

- [ ] All lists show empty states
- [ ] Empty states have helpful guidance

### Error Handling

- [ ] Errors display user-friendly messages
- [ ] Retry functionality works
- [ ] Errors don't crash the app

### Keyboard Navigation

- [ ] All shortcuts work
- [ ] Shortcuts modal shows
- [ ] Focus management works in modals

### Accessibility

- [ ] Skip links work
- [ ] ARIA labels present
- [ ] axe audit passes

### Performance

- [ ] Virtual scrolling works
- [ ] Lighthouse score > 90
- [ ] No jank during interactions

### State Sync

- [ ] State caches to IndexedDB
- [ ] State syncs on visibility change
- [ ] Offline indicator shows

### Crypto Worker

- [ ] Worker loads correctly
- [ ] Operations complete successfully
- [ ] Feature flag works

---

## Notes

- Crypto worker is behind feature flag for safety
- State sync improves reliability but is not critical
- Accessibility is important for all users
- Performance optimizations should not break functionality

---

## Next Phase

After completing Phase 10, proceed to:

- **Phase 11**: Final Verification

---

_Source: unified-p2p-musig2-ui/06_POLISH.md, unified-remaining-tasks/04_POLISH_ACCESSIBILITY.md, background-service-worker/05_STATE_SYNCHRONIZATION.md, background-service-worker/06_CRYPTO_WORKER.md_
