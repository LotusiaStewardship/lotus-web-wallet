<script setup lang="ts">
/**
 * About Page
 *
 * Version info and links.
 */
definePageMeta({
  title: 'About',
})

const config = useRuntimeConfig()

// Version info
const version = '1.0.0'
const buildDate = new Date().toISOString().split('T')[0]

// Links
const links = [
  {
    label: 'Website',
    url: 'https://lotusia.org',
    icon: 'i-lucide-globe',
  },
  {
    label: 'Documentation',
    url: 'https://lotusia.org/docs',
    icon: 'i-lucide-book-open',
  },
  {
    label: 'GitHub',
    url: 'https://github.com/LotusiaStewardship',
    icon: 'i-lucide-github',
  },
  {
    label: 'Discord',
    url: 'https://discord.gg/lotusia',
    icon: 'i-lucide-message-circle',
  },
]

// Open link
function openLink(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="space-y-4">
    <!-- Logo and Version -->
    <UiAppCard>
      <div class="text-center py-4">
        <div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
          <UIcon name="i-lucide-wallet" class="w-10 h-10 text-primary" />
        </div>
        <h2 class="text-xl font-bold mb-1">Lotus Web Wallet</h2>
        <p class="text-muted text-sm">Version {{ version }}</p>
        <p class="text-muted text-xs">Built {{ buildDate }}</p>
      </div>
    </UiAppCard>

    <!-- Links -->
    <UiAppCard title="Links" icon="i-lucide-link" :no-padding="true">
      <div class="divide-y divide-default">
        <button v-for="link in links" :key="link.url"
          class="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
          @click="openLink(link.url)">
          <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <UIcon :name="link.icon" class="w-5 h-5 text-primary" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm">{{ link.label }}</div>
            <div class="text-xs text-muted truncate">{{ link.url }}</div>
          </div>
          <UIcon name="i-lucide-external-link" class="w-4 h-4 text-muted shrink-0" />
        </button>
      </div>
    </UiAppCard>

    <!-- Credits -->
    <UiAppCard title="Credits" icon="i-lucide-heart">
      <p class="text-sm text-muted mb-3">
        Built with love by the Lotusia Stewardship team and community contributors.
      </p>
      <div class="flex flex-wrap gap-2">
        <UBadge color="primary" variant="subtle">Vue 3</UBadge>
        <UBadge color="primary" variant="subtle">Nuxt 3</UBadge>
        <UBadge color="primary" variant="subtle">Nuxt UI</UBadge>
        <UBadge color="primary" variant="subtle">Pinia</UBadge>
        <UBadge color="primary" variant="subtle">Chronik</UBadge>
      </div>
    </UiAppCard>

    <!-- License -->
    <UiAppCard>
      <div class="text-center text-sm text-muted">
        <p>Open source under the MIT License</p>
        <p class="mt-1">© {{ new Date().getFullYear() }} Lotusia Stewardship</p>
      </div>
    </UiAppCard>
  </div>
</template>
