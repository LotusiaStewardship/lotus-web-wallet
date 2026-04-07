# Components Directory

Blueprint for IDE coding agents working on the `components/` directory of lotus-web-wallet.

## Purpose

Contains all Vue 3 components organized by feature domain. Components are auto-imported by Nuxt 3 and follow Composition API patterns with TypeScript strict mode.

---

## Directory Organization

| Directory       | Purpose                                    | Key Components                                  |
| --------------- | ------------------------------------------ | ----------------------------------------------- |
| `a11y/`         | Accessibility components                   | `SkipLinks.vue`                                 |
| `actions/`      | Action modals (send, receive, scan)        | `SendModal.vue`, `ReceiveModal.vue`, `ScanModal.vue` |
| `activity/`     | Activity feed items                        | `ActivityItem.vue`, `ActivityItemSkeleton.vue`  |
| `explorer/`     | Block explorer views                       | `AddressDetail.vue`, `BlockDetail.vue`, `TransactionDetail.vue` |
| `feed/`         | RANK protocol feed components              | `PostCard.vue`, `VoteButton.vue`, `CommentThread.vue`, `ActivityStream.vue` |
| `form/`         | Form input components                      | Form fields, inputs, selectors                  |
| `home/`         | Home/dashboard views                       | Dashboard widgets, balance displays             |
| `navigation/`   | Navigation UI                              | `BottomNav.vue`, `ActionSheet.vue`              |
| `people/`       | Contacts and people management             | `PersonCard.vue`, `PersonAvatar.vue`, `AddContactModal.vue`, `ShareContactModal.vue` |
| `settings/`     | Settings pages and panels                  | Settings forms, preference toggles              |
| `ui/`           | Shared base UI elements                    | `LoadingSpinner.vue`, `Skeleton.vue`, `ErrorState.vue`, `OfflineIndicator.vue` |
| `wallets/`      | Shared wallet components                   | `SpendModal.vue`, `SharedWalletCardSkeleton.vue`, `SigningRequestCard.vue` |

---

## Naming Conventions

- **PascalCase filenames**: `PersonCard.vue`, `SendModal.vue`
- **Feature-prefixed when ambiguous**: `SharedWalletCardSkeleton.vue` (not just `CardSkeleton.vue`)
- **Modal suffix**: All modals end with `Modal.vue`
- **Skeleton suffix**: Loading placeholders end with `Skeleton.vue`
- **Auto-imported**: No manual imports needed within the app

---

## Component Patterns

### Script Setup

All components use `<script setup lang="ts">`:

```vue
<script setup lang="ts">
interface Props {
  person: Person
  size?: 'sm' | 'md' | 'lg'
  showActions?: boolean
}

interface Emits {
  (e: 'click', person: Person): void
  (e: 'send', person: Person): void
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showActions: true,
})

const emit = defineEmits<Emits>()
</script>
```

### Props

- Use TypeScript interfaces with `defineProps<{ ... }>()`
- Provide defaults via `withDefaults()` for optional props
- Type complex objects using imported types from `~/types/`

### Emits

- Use TypeScript interfaces with `defineEmits<{ ... }>()`
- Type event payloads explicitly
- Common patterns: `click`, `close`, `success`, `error`, `update`

### Composables Usage

- Access Pinia stores via composable functions: `const walletStore = useWalletStore()`
- Use domain composables: `useAmount()`, `useAddress()`, `useTime()`, `useNotifications()`
- Modal components use `useOverlay()` for programmatic close

---

## Modal / Overlay System

**CRITICAL: All modals use the programmatic overlay system via `useOverlays()` — NO `v-model` modals.**

### Opening Modals

```ts
const { openSendModal, openReceiveModal, openScanModal } = useOverlays()

// Open with props
await openSendModal({ initialRecipient: person, initialAmount: 100 })

// Open without props
await openReceiveModal()
```

### Inside Modal Components

```vue
<script setup lang="ts">
const { close } = useOverlay()

function closeDialog() {
  close()
}
</script>

<template>
  <UModal>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Modal Title</h2>
          <UButton icon="i-lucide-x" variant="ghost" @click="closeDialog" />
        </div>
      </template>
      <!-- Content -->
    </UCard>
  </UModal>
</template>
```

### Modal Chaining

```ts
const { openScanModal, openSendModal, resetForChaining } = useOverlays()

const scanResult = await openScanModal()
if (scanResult?.type === 'address') {
  resetForChaining()
  await openSendModal({ initialRecipient: scanResult.address })
}
```

### Multi-Step Modals

Use a `step` ref for internal navigation. Browser back button support is handled by the overlay system:

```ts
const step = ref<'details' | 'confirm' | 'processing' | 'success'>('details')
```

---

## Nuxt UI Pro Components

Use these components instead of raw HTML where applicable:

| Component     | Use For                              |
| ------------- | ------------------------------------ |
| `<UButton>`   | All buttons and action triggers      |
| `<UBadge>`    | Status labels, tags, counts          |
| `<UIcon>`     | Icons (Lucide: `i-lucide-*`)         |
| `<UModal>`    | Modal wrapper (inside overlay)       |
| `<USlideover>`| Slide-over panels                    |
| `<UCard>`     | Card containers                      |
| `<UInput>`    | Text inputs                          |
| `<UTextarea>` | Multi-line text inputs               |
| `<USelect>`   | Dropdown selects                     |
| `<UCheckbox>` | Checkbox inputs                      |
| `<URadioGroup>`| Radio button groups                 |
| `<UFormField>`| Form field with label and error      |
| `<UAlert>`    | Warning/error/info banners           |
| `<USkeleton>` | Loading placeholder shapes           |
| `<UAvatar>`   | User avatars                         |
| `<UTooltip>`  | Hover tooltips                       |
| `<UDropdown>`  | Dropdown menus                      |
| `<UTabs>`     | Tabbed interfaces                    |
| `<UCommandPalette>` | Search/command interfaces     |

---

## Badge Color Semantics

Use badge colors to convey meaning:

| Color       | Meaning                              | Examples                          |
| ----------- | ------------------------------------ | --------------------------------- |
| `success`   | Positive/completed actions           | Transaction confirmed, upvote     |
| `error`     | Errors/negative actions              | Failed tx, downvote, validation   |
| `warning`   | Caution/pending states               | Pending tx, low balance           |
| `info`      | Informational                        | Network status, feature hints     |
| `primary`   | Primary brand actions                | Main CTAs                         |
| `neutral`   | Default/non-emphasis                 | Tags, categories                  |
| `secondary` | Secondary emphasis                   | Subtle labels                     |

```vue
<UBadge color="success" variant="soft">Confirmed</UBadge>
<UBadge color="warning" variant="subtle">Pending</UBadge>
<UBadge color="error" variant="soft">Failed</UBadge>
```

---

## Avatar Rendering Standards

### PersonAvatar Pattern

- Display avatar image if available
- Fall back to initials (first 2 characters of name, uppercase)
- Show online/offline status indicator when applicable
- Support size variants: `sm`, `md`, `lg`

```vue
<script setup lang="ts">
const initials = computed(() => {
  if (!props.person.name) return '?'
  return props.person.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})
</script>

<template>
  <div class="relative">
    <img
      v-if="person.avatarUrl"
      :src="person.avatarUrl"
      :alt="person.name || 'Avatar'"
      class="rounded-full object-cover"
      @error="$event.target.style.display = 'none'"
    />
    <div
      v-else
      class="rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-medium"
    >
      {{ initials }}
    </div>
    <!-- Status indicator -->
    <div
      v-if="showStatus"
      :class="person.isOnline ? 'bg-green-500' : 'bg-gray-400'"
      class="absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-gray-900"
    />
  </div>
</template>
```

---

## Styling

- **TailwindCSS** for all styling via utility classes
- **Mobile-first** responsive design with breakpoint prefixes (`sm:`, `md:`, `lg:`)
- **Dark mode** support with `dark:` prefix classes
- **Nuxt UI** component classes for consistent theming
- **Scoped styles** only when Tailwind utilities are insufficient

### Responsive Patterns

```vue
<!-- Stack on mobile, row on desktop -->
<div class="flex flex-col sm:flex-row gap-4">

<!-- Full width on mobile, constrained on desktop -->
<div class="w-full md:max-w-lg mx-auto">

<!-- Hide on mobile, show on desktop -->
<div class="hidden md:block">
```

### Touch Targets

Minimum 44px touch targets for mobile:

```vue
<UButton size="lg" class="min-h-[44px]">
```

---

## Anti-Patterns to Avoid

| Anti-Pattern                        | Why                                          | Instead                                      |
| ----------------------------------- | -------------------------------------------- | -------------------------------------------- |
| `v-model` on modals                 | Breaks programmatic overlay system           | Use `useOverlays()` to open/close modals     |
| Inline `style` attributes           | Bypasses Tailwind/dark mode                  | Use Tailwind utility classes                 |
| Direct DOM manipulation             | Breaks Vue reactivity                        | Use `ref()`/`reactive()` and template binding |
| Importing stores directly           | Breaks composable pattern                    | Use `useWalletStore()` etc.                  |
| Hardcoded URLs                      | Breaks network switching                     | Use `useRuntimeConfig().public`              |
| Mutating props                      | Violates Vue one-way data flow               | Emit events or use local state               |
| Missing TypeScript types on props   | Loses type safety                            | Always use `interface Props { ... }`         |
| Non-PascalCase filenames            | Breaks Nuxt auto-import                      | Use `PersonCard.vue` not `person-card.vue`   |
| `<style>` without `scoped`          | Leaks styles globally                        | Add `scoped` attribute                       |
| `any` type usage                    | Defeats TypeScript strict mode               | Use proper type definitions                  |

---

## Related Documentation

- [05_COMPONENTS.md](../../docs/architecture/v2/05_COMPONENTS.md) — Detailed component patterns and examples
- [09_MODAL_OVERLAY_SYSTEM.md](../../docs/architecture/v2/09_MODAL_OVERLAY_SYSTEM.md) — Modal architecture and API
- [Root AGENTS.md](../../AGENTS.md) — Project-wide conventions, stores, composables
- [Nuxt UI Pro Docs](https://ui.nuxt.com) — Component reference
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq) — Vue docs
