<script setup lang="ts">
/**
 * Feed Home Page
 *
 * Primary interface for the RANK social curation system.
 * Three views:
 *   - Activity: Chronological stream of recent votes (the "general feed")
 *   - Profiles: Trending + controversial profile discovery
 *   - Posts: Trending + controversial post discovery
 *
 * Browsable without a wallet; voting requires wallet initialization.
 *
 * @see lotusia-monorepo/strategies/rank/technical/architecture.md — "RANK Feed is the entry point"
 * @see lotusia-monorepo/strategies/rank/research/psychopolitics-and-digital-power.md — R38
 */

definePageMeta({
  title: 'Feed',
})

const activeTab = ref<'activity' | 'profiles' | 'posts'>('activity')

const INTRO_DISMISSED_KEY = 'feed-intro-dismissed'
const showIntro = ref(false)

onMounted(() => {
  showIntro.value = !localStorage.getItem(INTRO_DISMISSED_KEY)
})

function dismissIntro() {
  showIntro.value = false
  localStorage.setItem(INTRO_DISMISSED_KEY, '1')
}
</script>

<template>
  <div class="space-y-4">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold">Curated Feed</h1>
        <p class="text-sm text-gray-500">Community-curated social content</p>
      </div>
      <NuxtLink to="/feed/search"
        class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
        <UIcon name="i-lucide-search" class="w-4 h-4" />
        <span>Search</span>
      </NuxtLink>
    </div>

    <!-- Intro Context (dismissible, for new users) -->
    <div v-if="showIntro"
      class="relative rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 p-4">
      <button class="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        @click="dismissIntro">
        <UIcon name="i-lucide-x" class="w-4 h-4" />
      </button>
      <p class="text-sm text-gray-700 dark:text-gray-300 pr-6">
        Every vote here burns real Lotus — making it a permanent, on-chain record of what you value.
        Unlike traditional social media, votes have real weight and can't be faked.
      </p>
      <NuxtLink to="/feed/search" class="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline">
        Learn how it works
        <UIcon name="i-lucide-arrow-right" class="w-3 h-3" />
      </NuxtLink>
    </div>

    <!-- Tab Selector -->
    <div class="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <button class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors" :class="activeTab === 'activity'
        ? 'bg-white dark:bg-gray-900 text-primary shadow-sm'
        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'" @click="activeTab = 'activity'">
        Activity
      </button>
      <button class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors" :class="activeTab === 'profiles'
        ? 'bg-white dark:bg-gray-900 text-primary shadow-sm'
        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'" @click="activeTab = 'profiles'">
        Profiles
      </button>
      <button class="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors" :class="activeTab === 'posts'
        ? 'bg-white dark:bg-gray-900 text-primary shadow-sm'
        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'" @click="activeTab = 'posts'">
        Posts
      </button>
    </div>

    <!-- Activity Tab (default — the general scrollable feed) -->
    <FeedActivityStream v-if="activeTab === 'activity'" />

    <!-- Profiles Tab (discovery) -->
    <template v-if="activeTab === 'profiles'">
      <FeedTopProfiles title="Trending" :limit="10" />
      <FeedTopProfiles title="Most Controversial" :controversial="true" :limit="5" />
    </template>

    <!-- Posts Tab (discovery) -->
    <template v-if="activeTab === 'posts'">
      <FeedTopPosts title="Trending" :limit="10" />
      <FeedTopPosts title="Most Controversial" :controversial="true" :limit="5" />
    </template>
  </div>
</template>
