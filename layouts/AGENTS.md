# Layouts Directory — AGENTS.md

Blueprint for AI coding agents working on the `layouts/` directory of lotus-web-wallet.

## Purpose

The `layouts/` directory contains Nuxt 3 layout components that wrap page content with consistent application chrome. Layouts provide navigation, responsive design, modal orchestration, and global UI integration.

## Directory Contents

| File            | Role                                        |
| --------------- | ------------------------------------------- |
| `default.vue`   | Main responsive layout with navigation      |

## Default Layout Structure

`default.vue` is the sole layout in the application. It provides:

### Desktop (≥768px)

- **Collapsible sidebar** via `UDashboardSidebar` with `UNavigationMenu`
- **Top navbar** via `UDashboardNavbar` showing page title, network badge, and connection status
- **Main content panel** via `UDashboardPanel` with `<slot />` for page content
- **Network indicator** in sidebar footer showing current network status

### Mobile (<768px)

- **Simplified header** with balance display, network badge, connection indicator, and quick-access buttons (People, Explore)
- **Bottom tab navigation** via `NavigationBottomNav` component with 5 items: Home, Feed, Action (+), Activity, Settings
- **Center action button** that triggers the action sheet for Send/Receive/Scan flows
- **Safe area padding** via `env(safe-area-inset-bottom)` for notched devices

### Responsive Breakpoint

- Mobile detection at `768px` via `window.innerWidth`
- State managed by `isMobile` ref, updated on mount and resize
- Automatic layout switching — no manual toggle required

## Navigation Items

Desktop sidebar and mobile bottom nav share these routes:

| Label    | Route       | Icon              | Notes                        |
| -------- | ----------- | ----------------- | ---------------------------- |
| Home     | `/`         | `i-lucide-home`   | Active when path is exactly `/` |
| People   | `/people`   | `i-lucide-users`  | Active when path starts with `/people` |
| Activity | `/activity` | `i-lucide-bell`   | Shows unread badge from `activityStore.unreadCount` |
| Explore  | `/explore`  | `i-lucide-compass`| Active when path starts with `/explore` |
| Settings | `/settings` | `i-lucide-settings`| Active when path starts with `/settings` |

Mobile bottom nav additionally includes `/feed` (`i-lucide-flame`) and replaces People/Explore with header buttons.

## Modal & Overlay Integration

All modal management is handled by the `useOverlays` composable. The layout serves as the central orchestrator:

### Global Modal Triggers

- **URL query params**: `?send=<address>&amount=<number>` opens the send modal on mount
- **Keyboard shortcuts**: `openKeyboardShortcutsModal()` available via overlays API
- **Action sheet**: Center `+` button on mobile opens `openActionSheet()` which chains to Send/Receive/Scan

### Modal Chaining Flows

The layout implements modal chaining via `resetForChaining()` from `~/composables/useOverlays`:

1. **Scan → Send**: Scan QR code, extract address/amount, open send modal with pre-filled data
2. **Scan → Add Contact**: Scan contact QR code, open add contact modal with pre-filled details
3. **Action Sheet → Any**: User selects action from sheet, layout chains to the appropriate modal

### Scan Flow Result Types

```ts
type ScanModalResult =
  | { type: 'address'; address: string }
  | { type: 'payment'; address: string; amount?: number }
  | { type: 'contact'; contact: { address: string; name: string; publicKeyHex: string } }
  | { manualEntry: true }
```

## Network Banner Display

Non-production networks display a warning badge in both desktop navbar and mobile header:

```vue
<UBadge v-if="!networkStore.isProduction" color="warning" variant="subtle">
  <UIcon name="i-lucide-alert-triangle" class="w-3 h-3 mr-1" />
  {{ networkStore.config.displayName }}
</UBadge>
```

## Global Components Rendered by Layout

These components are always present in the default layout:

| Component               | Purpose                              |
| ----------------------- | ------------------------------------ |
| `A11ySkipLinks`         | Accessibility skip navigation        |
| `UiNetworkErrorBanner`  | Network error display                |
| `UiOfflineIndicator`    | Offline state indicator              |
| `UiSWUpdatePrompt`      | Service worker update prompt         |
| `NavigationBottomNav`   | Mobile bottom navigation (mobile only) |

## Stores Used by Layout

| Store             | Usage in Layout                                      |
| ----------------- | ---------------------------------------------------- |
| `walletStore`     | Balance display, connection status, loading state    |
| `networkStore`    | Network config, production check, initialization     |
| `activityStore`   | Unread notification count for badge                  |
| `settingsStore`   | Balance visibility preference                        |

## Best Practices

1. **Use `<slot />` for page content** — never hardcode page-specific UI in layouts
2. **Keep layout logic minimal** — delegate to composables and stores
3. **Use `useOverlays` for all modal interactions** — never import modal components directly into layouts
4. **Call `resetForChaining()` before opening a new modal after one closes** — ensures clean history state
5. **Mobile detection via `window.innerWidth < 768`** — consistent breakpoint across the app
6. **Use Nuxt UI Pro dashboard components** (`UDashboardGroup`, `UDashboardSidebar`, `UDashboardPanel`, `UDashboardNavbar`) for structure
7. **Content max-width** — page content is constrained to `max-w-3xl mx-auto` for readability
8. **Mobile padding** — add `pb-20` class to content wrapper on mobile to avoid bottom nav overlap

## Anti-Patterns to Avoid

1. **Do not add new layout files** — the app uses a single `default.vue` layout. Add conditional rendering instead.
2. **Do not render modal components directly in the layout template** — all modals are managed programmatically via `useOverlays`
3. **Do not duplicate navigation items** — keep sidebar and bottom nav items in sync by referencing a single source of truth
4. **Do not bypass `resetForChaining()`** when opening a modal after another modal closes — this breaks browser history
5. **Do not use SSR-only features** — the app runs in SPA mode (`ssr: false`)
6. **Do not hardcode network URLs** — use `networkStore.config` for all network-dependent values
7. **Do not remove the mobile bottom nav padding** (`pb-20`) — content will be obscured on mobile devices
8. **Do not add heavy computations to the layout** — the layout renders on every route change; keep it lean

## Related Documentation

- **Core Architecture**: `docs/architecture/v2/01_CORE_ARCHITECTURE.md` — layout system overview, Nuxt config, plugin system
- **Modal Overlay System**: `docs/architecture/v2/09_MODAL_OVERLAY_SYSTEM.md` — modal API, chaining, history management, performance
- **Root AGENTS.md**: `AGENTS.md` — project-wide conventions, stores, composables, setup commands

## Code Style

- **TypeScript strict mode** — all layout code must pass type checking
- **Vue 3 Composition API** with `<script setup>` syntax
- **Imports**: Use `~` alias for project root (e.g., `~/composables/useOverlays`)
- **UI Components**: Nuxt UI Pro (`UButton`, `UBadge`, `UIcon`, `UDashboardSidebar`, etc.)
- **TailwindCSS**: Utility classes for all styling
- **Component naming**: PascalCase for component references, kebab-case for template tags
