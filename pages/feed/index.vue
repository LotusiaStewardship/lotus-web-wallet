<script setup lang="ts">
/**
 * Feed Home Page
 *
 * Main RANK feed showing top-ranked profiles and posts.
 * Browsable without a wallet; voting requires wallet initialization.
 */

definePageMeta({
  title: 'Feed',
})

const activeTab = ref<'profiles' | 'posts'>('profiles')
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

    <!-- Tab Selector -->
    <div class="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <button class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors" :class="activeTab === 'profiles'
        ? 'bg-white dark:bg-gray-900 text-primary shadow-sm'
        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'" @click="activeTab = 'profiles'">
        Profiles
      </button>
      <button class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors" :class="activeTab === 'posts'
        ? 'bg-white dark:bg-gray-900 text-primary shadow-sm'
        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'" @click="activeTab = 'posts'">
        Posts
      </button>
    </div>

    <!-- Profiles Tab -->
    <template v-if="activeTab === 'profiles'">
      <FeedTopProfiles title="Trending" :limit="10" />
      <FeedTopProfiles title="Most Controversial" :controversial="true" :limit="5" />
    </template>

    <!-- Posts Tab -->
    <template v-if="activeTab === 'posts'">
      <FeedTopPosts title="Trending" :limit="10" />
      <FeedTopPosts title="Most Controversial" :controversial="true" :limit="5" />
    </template>
  </div>
</template>
