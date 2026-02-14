<script setup lang="ts">
/**
 * Top Profiles Component
 *
 * Ranked profile list with sentiment indicators and timespan selector.
 * Fetches data from rank-backend-ts trending endpoints.
 */
import type { TrendingItem, Timespan } from '~/composables/useRankApi'

const props = withDefaults(defineProps<{
  /** Title for the section */
  title?: string
  /** Whether to show lowest-ranked instead of top-ranked */
  lowest?: boolean
  /** Maximum items to display */
  limit?: number
}>(), {
  title: 'Top Ranked Profiles',
  lowest: false,
  limit: 10,
})

const { getTopRankedProfiles, getLowestRankedProfiles } = useRankApi()

const timespan = ref<Timespan>('today')
const profiles = ref<TrendingItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const timespanOptions: Array<{ label: string; value: Timespan }> = [
  { label: 'Now', value: 'now' },
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'All', value: 'all' },
]

async function fetchProfiles() {
  loading.value = true
  error.value = null
  try {
    const fetcher = props.lowest ? getLowestRankedProfiles : getTopRankedProfiles
    const result = await fetcher(timespan.value)
    profiles.value = result.slice(0, props.limit)
  } catch (err: any) {
    error.value = err?.message || 'Failed to load profiles'
    console.error('[TopProfiles] fetch error:', err)
  } finally {
    loading.value = false
  }
}

function changeTimespan(ts: Timespan) {
  timespan.value = ts
  fetchProfiles()
}

onMounted(fetchProfiles)
</script>

<template>
  <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <UIcon :name="lowest ? 'i-lucide-trending-down' : 'i-lucide-trending-up'" class="w-5 h-5" />
        <span class="font-semibold">{{ title }}</span>
      </div>
      <NuxtLink to="/feed" class="text-sm text-primary hover:underline">
        View All
      </NuxtLink>
    </div>

    <!-- Timespan Selector -->
    <div class="flex items-center gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-800/50">
      <button v-for="opt in timespanOptions" :key="opt.value"
        class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
        :class="timespan === opt.value
          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary'
          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
        @click="changeTimespan(opt.value)">
        {{ opt.label }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="i in 5" :key="i" class="p-4">
        <div class="flex items-center gap-3 animate-pulse">
          <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          </div>
          <div class="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8 text-gray-500">
      <UIcon name="i-lucide-alert-circle" class="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p class="text-sm">{{ error }}</p>
      <button class="mt-2 text-sm text-primary hover:underline" @click="fetchProfiles">
        Try again
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="profiles.length === 0" class="text-center py-8 text-gray-500">
      <UIcon name="i-lucide-inbox" class="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p class="text-sm">No ranked profiles yet</p>
    </div>

    <!-- Profile List -->
    <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="(profile, index) in profiles" :key="`${profile.platform}-${profile.profileId}`" class="px-3 py-2">
        <FeedProfileCard :profile="profile" :rank="index + 1" compact />
      </div>
    </div>
  </div>
</template>
