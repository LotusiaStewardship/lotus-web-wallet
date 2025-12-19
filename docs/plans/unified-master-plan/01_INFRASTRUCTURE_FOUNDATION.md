# Phase 1: Infrastructure Foundation

## Overview

This phase establishes the foundational infrastructure required for all subsequent work. It combines quick wins (useUtils deprecation) with critical setup (service worker, notification settings) that other phases depend on.

**Priority**: P0 (Critical Path)
**Estimated Effort**: 2-3 days
**Dependencies**: None (starting point)

---

## Source Phases

| Source Plan               | Phase | Component                 |
| ------------------------- | ----- | ------------------------- |
| background-service-worker | 1     | Service Worker Foundation |
| notification-system       | 1     | Settings Page             |
| unified-remaining-tasks   | 3     | Deprecate useUtils        |

---

## Tasks

### 1.1 Deprecate useUtils.ts (Quick Win)

**Source**: unified-remaining-tasks/03_DEPRECATE_USEUTILS.md
**Effort**: 0.5 days

#### Migration Tasks

- [ ] Update `components/contacts/ContactCard.vue` to use new composables
- [ ] Update `components/contacts/ContactForm.vue` to use new composables
- [ ] Update `components/contacts/ContactSearch.vue` to use new composables
- [ ] Update `pages/transact/receive.vue` to use new composables

#### Cleanup Tasks

- [ ] Verify no remaining `useUtils` imports in codebase
- [ ] Delete `composables/useUtils.ts`
- [ ] Run `nuxt prepare` to verify no errors
- [ ] Run TypeScript check (`npx nuxi typecheck`)

#### Verification

```bash
# Check for remaining imports
grep -r "useUtils" --include="*.vue" --include="*.ts" .

# Should return no results after cleanup
```

---

### 1.2 Service Worker Foundation

**Source**: background-service-worker/01_SERVICE_WORKER_FOUNDATION.md
**Effort**: 1-2 days

#### Setup Tasks

- [ ] Install `@vite-pwa/nuxt` module

  ```bash
  npx nuxi module add @vite-pwa/nuxt
  ```

- [ ] Configure PWA in `nuxt.config.ts`

  ```typescript
  export default defineNuxtConfig({
    modules: ['@vite-pwa/nuxt'],
    pwa: {
      strategies: 'injectManifest',
      srcDir: 'service-worker',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      manifest: {
        name: 'Lotus Web Wallet',
        short_name: 'Lotus Wallet',
        theme_color: '#000000',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    },
  })
  ```

- [ ] Update `tsconfig.json` with WebWorker lib
  ```json
  {
    "compilerOptions": {
      "lib": ["ESNext", "DOM", "DOM.Iterable", "WebWorker"]
    }
  }
  ```

#### Service Worker Files

- [ ] Create `service-worker/sw.ts` (TypeScript service worker)

  ```typescript
  /// <reference lib="webworker" />
  import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

  declare let self: ServiceWorkerGlobalScope

  // Precache static assets
  precacheAndRoute(self.__WB_MANIFEST)
  cleanupOutdatedCaches()

  // Message handling
  self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') {
      self.skipWaiting()
    }
  })

  // Placeholder for future modules
  // - Network Monitor (Phase 3)
  // - Session Monitor (Phase 5)
  // - Push Notifications (Phase 8)
  ```

- [ ] Create `types/service-worker.ts` (message type definitions)

  ```typescript
  export type SWMessageType =
    | 'SKIP_WAITING'
    | 'GET_STATUS'
    | 'BALANCE_CHANGED'
    | 'TRANSACTION_DETECTED'
    | 'SESSION_EXPIRING'
    | 'SIGNING_REQUEST'

  export interface SWMessage {
    type: SWMessageType
    payload?: unknown
  }

  export interface SWStatusResponse {
    registered: boolean
    active: boolean
    version: string
  }
  ```

- [ ] Create `composables/useServiceWorker.ts` (client-side composable)

  ```typescript
  export function useServiceWorker() {
    const isSupported = computed(() => 'serviceWorker' in navigator)
    const registration = ref<ServiceWorkerRegistration | null>(null)
    const isReady = ref(false)

    async function register() {
      if (!isSupported.value) return
      // Registration handled by @vite-pwa/nuxt
    }

    function postMessage(message: SWMessage) {
      registration.value?.active?.postMessage(message)
    }

    function onMessage(callback: (event: MessageEvent) => void) {
      navigator.serviceWorker?.addEventListener('message', callback)
      return () =>
        navigator.serviceWorker?.removeEventListener('message', callback)
    }

    return {
      isSupported,
      registration,
      isReady,
      register,
      postMessage,
      onMessage,
    }
  }
  ```

#### Integration Tasks

- [ ] Setup message listener in `app.vue` or plugin
- [ ] Test SW registration in development
- [ ] Test message passing between SW and client
- [ ] Verify SW survives page refresh

---

### 1.3 Notification Settings Page

**Source**: notification-system/01_SETTINGS_PAGE.md
**Effort**: 0.5 days

#### Page Creation

- [ ] Create `pages/settings/notifications.vue`

  ```vue
  <script setup lang="ts">
  const notificationStore = useNotificationStore()
  const { preferences, updatePreferences } = notificationStore

  const browserPermission = ref<NotificationPermission>('default')

  onMounted(() => {
    if ('Notification' in window) {
      browserPermission.value = Notification.permission
    }
  })

  async function requestBrowserPermission() {
    if ('Notification' in window) {
      browserPermission.value = await Notification.requestPermission()
    }
  }
  </script>
  ```

#### Settings Features

- [ ] Add browser notification permission request button
- [ ] Add notification type toggles:
  - Incoming transactions
  - Sent transaction confirmations
  - Signing requests
  - Session timeouts
  - P2P peer events (optional)
  - RANK activity (optional)
- [ ] Add notification history management:
  - Mark all as read
  - Clear all notifications
- [ ] Add sound toggle (future)

#### Navigation

- [ ] Add link to notifications in `pages/settings/index.vue`
  ```vue
  <UButton to="/settings/notifications" variant="ghost" block>
    <UIcon name="i-heroicons-bell" />
    Notifications
  </UButton>
  ```

---

## File Changes Summary

### New Files

| File                               | Purpose                       |
| ---------------------------------- | ----------------------------- |
| `service-worker/sw.ts`             | TypeScript service worker     |
| `types/service-worker.ts`          | SW message type definitions   |
| `composables/useServiceWorker.ts`  | Client-side SW composable     |
| `pages/settings/notifications.vue` | Notification preferences page |

### Modified Files

| File                                    | Changes                          |
| --------------------------------------- | -------------------------------- |
| `nuxt.config.ts`                        | Add @vite-pwa/nuxt configuration |
| `tsconfig.json`                         | Add WebWorker lib                |
| `pages/settings/index.vue`              | Add notifications link           |
| `components/contacts/ContactCard.vue`   | Replace useUtils                 |
| `components/contacts/ContactForm.vue`   | Replace useUtils                 |
| `components/contacts/ContactSearch.vue` | Replace useUtils                 |
| `pages/transact/receive.vue`            | Replace useUtils                 |

### Deleted Files

| File                      | Reason                                  |
| ------------------------- | --------------------------------------- |
| `composables/useUtils.ts` | Deprecated, replaced by new composables |

---

## Verification Checklist

### useUtils Deprecation

- [ ] No grep results for `useUtils` in codebase
- [ ] `nuxt prepare` succeeds
- [ ] TypeScript check passes
- [ ] All contact-related pages still work

### Service Worker

- [ ] SW registers in dev mode
- [ ] SW activates and controls page
- [ ] Message passing works (test with console)
- [ ] SW survives page refresh
- [ ] No console errors related to SW

### Notification Settings

- [ ] Settings page accessible at `/settings/notifications`
- [ ] Browser permission request works
- [ ] Toggles update preferences in store
- [ ] Preferences persist across page refresh
- [ ] Link visible in settings index

---

## Notes

- Service worker setup uses `injectManifest` strategy for custom logic
- @vite-pwa/nuxt handles registration automatically
- Notification settings page uses existing `stores/notifications.ts`
- useUtils deprecation is a quick win that cleans up technical debt

---

## Next Phase

After completing Phase 1, proceed to:

- **Phase 2**: P2P/MuSig2 Foundation (navigation, shared components, routes)

---

_Source: background-service-worker/01, notification-system/01, unified-remaining-tasks/03_
