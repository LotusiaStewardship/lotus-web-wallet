<script setup lang="ts">
/**
 * Shared Wallets Preview Component
 *
 * Shows a preview of shared wallets on the home page.
 */
import { usePeopleStore } from '~/stores/people'
import { formatXPI } from '~/utils/formatting'

const peopleStore = usePeopleStore()

const MAX_DISPLAY = 3

const displayedWallets = computed(() =>
  peopleStore.allWallets.slice(0, MAX_DISPLAY),
)
</script>

<template>
  <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
        <span class="font-semibold">Shared Wallets</span>
      </div>
      <NuxtLink to="/people/wallets" class="text-sm text-primary hover:underline">
        View All
      </NuxtLink>
    </div>

    <div class="divide-y divide-gray-100 dark:divide-gray-800">
      <NuxtLink v-for="wallet in displayedWallets" :key="wallet.id" :to="`/people/wallets/${wallet.id}`"
        class="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon name="i-lucide-shield" class="w-5 h-5 text-primary" />
          </div>
          <div>
            <p class="font-medium">{{ wallet.name }}</p>
            <p class="text-xs text-gray-500">
              {{ wallet.participantIds.length }} participants
            </p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-mono text-sm">
            {{ formatXPI(wallet.balanceSats, { minDecimals: 2 }) }}
          </p>
          <p class="text-xs text-gray-500">XPI</p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
