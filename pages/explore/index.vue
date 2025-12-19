<script setup lang="ts">
/**
 * Explore Hub Page
 *
 * Landing page for the Explore section with access to Explorer and Social.
 */
definePageMeta({
  title: 'Explore',
})

const subPages = [
  {
    label: 'Explorer',
    icon: 'i-lucide-blocks',
    to: '/explore/explorer',
    description: 'Browse blocks, transactions, and addresses',
    color: 'primary',
  },
  {
    label: 'Social',
    icon: 'i-lucide-thumbs-up',
    to: '/explore/social',
    description: 'Vote on social profiles with RANK',
    color: 'primary',
  },
]
</script>

<template>
  <div class="space-y-6">
    <UiAppHeroCard icon="i-lucide-compass" title="Explore"
      subtitle="Discover the Lotus blockchain and social ecosystem" />

    <div class="grid gap-4 md:grid-cols-2">
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
