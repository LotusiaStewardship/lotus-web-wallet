# Pages Directory

Blueprint for agents working on the `pages/` directory of the Lotus Web Wallet.

## Purpose

The `pages/` directory contains **route-level entry points** for the Lotus Web Wallet. Pages serve as navigation hubs and view orchestrators — they delegate business logic to composables and Pinia stores, and use the `useOverlays` composable for modal-driven actions (send, receive, scan, etc.).

This is a **Nuxt 3 SPA** (`ssr: false`) with **Vue 3 Composition API**, **TypeScript strict mode**, **Pinia stores**, and **Nuxt UI Pro**.

---

## Navigation Structure

| Route | File | Description |
|-------|------|-------------|
| `/` | `index.vue` | Home dashboard — balance, attention items, online contacts, recent activity, getting started |
| `/activity` | `activity/index.vue` | Unified activity feed — transactions, signing requests, social events |
| `/explore/[...slug]` | `explore/[...slug].vue` | Blockchain explorer — tx, address, block details via catch-all slug |
| `/feed` | `feed/index.vue` | RANK social feed — activity stream, profiles, posts |
| `/feed/search` | `feed/search.vue` | Feed search |
| `/feed/[platform]/[profileId]` | `feed/[platform]/[profileId]/index.vue` | Profile view |
| `/feed/[platform]/[profileId]/[postId]` | `feed/[platform]/[profileId]/[postId].vue` | Post detail |
| `/people` | `people/index.vue` | People hub — contacts, favorites, shared wallets |
| `/people/[id]` | `people/[id].vue` | Person detail — profile, stats, activity, notes |
| `/settings` | `settings/index.vue` | App settings — wallet, network, security, appearance, about |

### App Navigation Tabs

- **Home** (`/`)
- **Transact** — Send, Receive, History (modal-driven, no dedicated pages)
- **People** (`/people`) — Contacts, P2P, Shared Wallets
- **Explore** (`/explore`) — Explorer, Social
- **Settings** (`/settings`) — About, Advertise, Backup, Network, Notifications, P2P, Security

---

## File-Based Routing Conventions

### 1. Use `<script setup>` Syntax

All pages use Vue 3 Composition API with `<script setup lang="ts">`:

```vue
<script setup lang="ts">
definePageMeta({
  title: 'Page Title',
})

const store = useSomeStore()
</script>
```

### 2. Define Page Metadata with `definePageMeta()`

Every page must call `definePageMeta()` at the top of `<script setup>`:

```typescript
definePageMeta({
  title: 'Activity',
  // Optional: middleware, layout, etc.
})
```

### 3. Access Route Params via `useRoute()`

```typescript
const route = useRoute()
const personId = computed(() => route.params.id as string)
```

For catch-all routes (`[...slug]`), normalize the param:

```typescript
const slug = computed(() => {
  const s = route.params.slug
  return Array.isArray(s) ? s : s ? [s] : []
})
```

### 4. Programmatic Navigation

Use `navigateTo()` for declarative navigation:

```typescript
navigateTo('/people')
navigateTo(`/explore/tx/${txid}`)
```

Use `useRouter()` when you need query manipulation or replace behavior:

```typescript
const router = useRouter()
await router.replace({ query: { ...route.query, param: undefined } })
```

### 5. Query Parameters for State

Pages use query params to trigger modals or filter views. Always clean query params immediately after consuming them:

```typescript
const route = useRoute()
const router = useRouter()

watch(() => route.query, async (query) => {
  if (query.add === 'true') {
    // Clean query params immediately
    await router.replace({
      query: { ...route.query, add: undefined, address: undefined },
    })

    await openAddContactModal({
      initialAddress: query.address as string,
    })
  }
}, { immediate: true })
```

Common query param patterns:
- `?add=true&address=...&name=...` — Open add contact modal
- `?tab=sessions` — Switch active tab
- `?send=address` — Trigger send flow
- `?contact=id` — Filter activity by contact

### 6. Route Redirects for Legacy Routes

Use `definePageMeta({ redirect: '/new-path' })` or Nuxt route rules for legacy URL redirects.

---

## Page Patterns and Best Practices

### Delegate Business Logic to Composables and Stores

Pages are **thin orchestrators**. They:
- Read state from Pinia stores
- Call composable functions for complex operations
- Use `useOverlays()` for modal actions
- Compose child components for rendering

```vue
<script setup lang="ts">
// ✅ Good: delegate to store/composable
const peopleStore = usePeopleStore()
const { person, send, remove } = usePersonContext(personId)
const { openSendModal } = useOverlays()

// ❌ Bad: inline business logic in page
function buildTransaction() { /* ... */ }
</script>
```

### Modal-Centric Action Pattern

User actions (send, receive, scan, add contact) open modals via `useOverlays()`, not dedicated pages:

```typescript
const { openSendModal, openReceiveModal, openScanModal, openAddContactModal } = useOverlays()

async function handleSend() {
  await openSendModal({ initialRecipient: 'lotus_abc123' })
}
```

### Modal Chaining

When one modal result triggers another (e.g., scan → send), reset overlay state between them:

```typescript
import { resetForChaining } from '~/composables/useOverlays'

async function handleScanFlow() {
  const result = await openScanModal()
  if (!result) return

  resetForChaining()

  if (result.type === 'address') {
    await openSendModal({ initialRecipient: result.address })
  }
}
```

### Conditional Rendering with Computed Flags

Use `computed()` for conditional rendering decisions based on store state:

```typescript
const hasAttentionItems = computed(() => !onboardingStore.backupComplete)
const showGettingStarted = computed(() => !onboardingStore.skipped)
```

### Two-Way Computed for Settings

Use getter/setter computed properties for settings that bind to UI controls:

```typescript
const selectedNetwork = computed({
  get: () => networkStore.currentNetwork,
  set: async (newNetwork: NetworkType) => {
    await networkStore.switchNetwork(newNetwork)
  },
})
```

### Not Found Handling

Dynamic route pages should handle missing data gracefully:

```vue
<template>
  <div v-if="person" class="space-y-6">
    <!-- Person detail content -->
  </div>
  <div v-else class="text-center py-12">
    <h2>Person not found</h2>
    <UButton @click="navigateTo('/people')">Back to People</UButton>
  </div>
</template>
```

### Mobile-First Responsive Layouts

Pages use TailwindCSS utility classes with mobile-first approach:
- Default styles target mobile
- Use `sm:`, `md:`, `lg:` breakpoints for larger screens
- Spacing uses `space-y-*` for vertical stacks
- Scrollable tab bars use `overflow-x-auto` with negative margins

```vue
<div class="flex flex-col sm:flex-row gap-4">
  <UInput class="flex-1" />
  <UButton>Actions</UButton>
</div>
```

---

## Data Loading Patterns

### Store-Driven Data

Pages read reactive data from Pinia stores. No direct API calls in pages:

```typescript
const activityStore = useActivityStore()
const items = computed(() => activityStore.filteredItems)
```

### Context Composables

Complex pages use context composables that bundle related state and actions:

```typescript
const personId = computed(() => route.params.id as string)
const { person, displayName, send, remove, copyAddress } = usePersonContext(personId)
```

### No `useAsyncData` in Pages

Since this is an SPA with client-side stores, pages do **not** use `useAsyncData()` or `useFetch()`. Data loading is handled by store initialization and composables.

### Reactive Store Subscriptions

Watch store state changes when you need to react to updates:

```typescript
watch(() => peopleStore.searchQuery, (query) => {
  // React to search changes
})
```

---

## Navigation Patterns

### `navigateTo()` for Standard Navigation

```typescript
navigateTo('/people')
navigateTo(`/explore/tx/${txid}`)
navigateTo(`/people/${person.id}`)
```

### `useRouter().replace()` for Query Cleanup

```typescript
const router = useRouter()
await router.replace({ query: { ...route.query, param: undefined } })
```

### `<NuxtLink>` / `to` Prop for Declarative Links

```vue
<UButton to="/feed/search">Search</UButton>
<NuxtLink to="/activity">View All</NuxtLink>
```

### Cross-Feature Navigation

Pages frequently navigate between feature areas:
- Activity → Explorer: `navigateTo(\`/explore/tx/${txid}\`)`
- People → Activity: `navigateTo(\`/activity?contact=${person.id}\`)`
- Explorer → People: `navigateTo(\`/people/${contactId}\`)`

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Business logic in pages | Pages should be thin orchestrators | Move to composables or stores |
| Direct API calls in pages | Breaks data flow architecture | Use stores/composables |
| `useAsyncData` / `useFetch` in pages | SPA uses store-driven data | Read from Pinia stores |
| Hardcoded URLs | Breaks with network switching | Use `navigateTo()` with route paths |
| Mutating store state directly in templates | Bypasses store actions | Call store methods |
| Forgetting to clean query params | Leaves stale params in URL | Use `router.replace()` immediately |
| Missing `definePageMeta()` | Breaks page metadata | Always include at top of `<script setup>` |
| Inline modal logic | Duplicates overlay management | Use `useOverlays()` composable |
| Deep component nesting in pages | Makes pages hard to maintain | Extract to child components |

---

## Related Documentation

- **[04_PAGES_AND_ROUTING.md](../docs/architecture/v2/04_PAGES_AND_ROUTING.md)** — Detailed page structure, modal-centric navigation, route guards, SEO
- **[01_CORE_ARCHITECTURE.md](../docs/architecture/v2/01_CORE_ARCHITECTURE.md)** — Layout system, plugin architecture, SPA configuration
- **[08_DATA_FLOW.md](../docs/architecture/v2/08_DATA_FLOW.md)** — Page data loading patterns, event-driven updates, store-service-external API flow
