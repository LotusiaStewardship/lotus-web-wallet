<script setup lang="ts">
/**
 * Transact Hub Page
 *
 * Landing page for the Transact section with quick access to Send, Receive, and History.
 */
definePageMeta({
  title: 'Transact',
})

const subPages = [
  {
    label: 'Send',
    icon: 'i-lucide-send',
    to: '/transact/send',
    description: 'Send Lotus to any address',
    color: 'primary',
  },
  {
    label: 'Receive',
    icon: 'i-lucide-qr-code',
    to: '/transact/receive',
    description: 'Get your address and QR code',
    color: 'primary',
  },
  {
    label: 'History',
    icon: 'i-lucide-history',
    to: '/transact/history',
    description: 'View your transaction history',
    color: 'primary',
  },
]
</script>

<template>
  <div class="space-y-6">
    <UiAppHeroCard icon="i-lucide-arrow-left-right" title="Transact"
      subtitle="Send, receive, and manage your Lotus transactions" />

    <div class="grid gap-4 md:grid-cols-3">
      <NuxtLink v-for="page in subPages" :key="page.to" :to="page.to"
        class="block p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <UIcon :name="page.icon" class="w-6 h-6 text-primary" />
          </div>
          <div>
            <div class="font-semibold text-lg">{{ page.label }}</div>
            <p class="text-sm text-gray-500">{{ page.description }}</p>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
