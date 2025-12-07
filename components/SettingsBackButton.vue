<script setup lang="ts">
/**
 * SettingsBackButton - Contextual back navigation for settings pages
 *
 * This component provides context-aware back navigation by reading the `from`
 * query parameter. When users navigate to settings from an interactive page,
 * the back button returns them to their original context instead of always
 * going to the root settings page.
 *
 * Usage:
 *   <SettingsBackButton />
 *
 * The component automatically determines the return path and label based on
 * the `from` query parameter in the current route.
 */

const route = useRoute()

// Map of paths to their display labels
const pathLabels: Record<string, string> = {
  '/': 'Wallet',
  '/p2p': 'P2P Network',
  '/send': 'Send',
  '/receive': 'Receive',
  '/history': 'History',
  '/contacts': 'Contacts',
  '/explorer': 'Explorer',
  '/social': 'Social',
  '/settings': 'Settings',
}

// Determine return path from query parameter
const returnPath = computed(() => {
  const from = route.query.from as string
  // Validate the path is a known route to prevent open redirects
  if (from && pathLabels[from]) {
    return from
  }
  return '/settings'
})

// Generate contextual label
const returnLabel = computed(() => {
  const from = route.query.from as string
  if (from && pathLabels[from]) {
    return `Back to ${pathLabels[from]}`
  }
  return 'Back to Settings'
})
</script>

<template>
  <NuxtLink :to="returnPath" class="text-sm text-muted hover:text-foreground flex items-center gap-1 mb-4">
    <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
    {{ returnLabel }}
  </NuxtLink>
</template>
