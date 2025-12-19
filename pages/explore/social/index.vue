<script setup lang="ts">
/**
 * Social Page
 *
 * Vote on social profiles with RANK.
 */
import {
  useRankApi,
  type ProfileListItem,
  type TrendingItem,
  type RankTransaction,
  PlatformIcon,
} from '~/composables/useRankApi'

definePageMeta({
  title: 'Social',
})

const rankApi = useRankApi()
const { timeAgo } = useTime()
const { formatXPI } = useAmount()

// State
const searchQuery = ref('')
const searchResults = ref<ProfileListItem[]>([])
const searching = ref(false)
const loading = ref(true)
const profiles = ref<ProfileListItem[]>([])
const trending = ref<TrendingItem[]>([])
const recentVotes = ref<RankTransaction[]>([])
const selectedTimespan = ref<'day' | 'week' | 'month' | 'all'>('week')

// Fetch initial data
async function fetchData() {
  loading.value = true
  try {
    const [profilesResult, trendingResult, votesResult] = await Promise.all([
      rankApi.getProfiles(1, 10),
      rankApi.getTopRankedProfiles(selectedTimespan.value),
      rankApi.getVoteActivity(1, 10),
    ])

    if (profilesResult) {
      profiles.value = profilesResult.profiles
    }
    if (trendingResult) {
      trending.value = trendingResult
    }
    if (votesResult) {
      recentVotes.value = votesResult.votes
    }
  } catch (err) {
    console.error('Failed to fetch social data:', err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

// Watch timespan changes
watch(selectedTimespan, async () => {
  try {
    const result = await rankApi.getTopRankedProfiles(selectedTimespan.value)
    if (result) {
      trending.value = result
    }
  } catch (err) {
    console.error('Failed to fetch trending:', err)
  }
})

// Search handler with debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null

function handleSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout)

  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  searchTimeout = setTimeout(async () => {
    searching.value = true
    try {
      const results = await rankApi.searchProfiles(searchQuery.value)
      searchResults.value = results
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      searching.value = false
    }
  }, 300)
}

function handleSearch() {
  if (!searchQuery.value.trim()) return
  handleSearchInput()
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
}

// Navigate to profile
function viewProfile(platform: string, profileId: string) {
  navigateTo(`/explore/social/${platform}/${profileId}`)
}

// Format rank for display
function formatRank(ranking: string): string {
  const num = parseFloat(ranking)
  if (isNaN(num)) return '0'
  return num.toFixed(2)
}

// Get platform icon
function getPlatformIcon(platform: string): string {
  return PlatformIcon[platform] || 'i-lucide-user'
}

// Timespan options
const timespanOptions = [
  { label: 'Today', value: 'day' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
]
</script>

<template>
  <div class="space-y-6">
    <UiAppHeroCard icon="i-lucide-thumbs-up" title="Social" subtitle="Vote on profiles with RANK" />

    <!-- Search -->
    <UiAppCard>
      <form @submit.prevent="handleSearch" class="flex gap-2">
        <UInput v-model="searchQuery" placeholder="Search profiles by @username..." icon="i-lucide-search" size="lg"
          class="flex-1" @input="handleSearchInput" />
        <UButton v-if="searchQuery" type="button" color="neutral" variant="ghost" icon="i-lucide-x"
          @click="clearSearch" />
        <UButton type="submit" color="primary" :disabled="!searchQuery.trim()" :loading="searching">
          Search
        </UButton>
      </form>

      <!-- Search Results -->
      <div v-if="searchResults.length > 0" class="mt-4 border-t border-default pt-4">
        <p class="text-sm text-muted mb-3">{{ searchResults.length }} result{{ searchResults.length !== 1 ? 's' : '' }}
        </p>
        <div class="divide-y divide-default -mx-4">
          <div v-for="profile in searchResults" :key="`${profile.platform}-${profile.id}`"
            class="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
            @click="viewProfile(profile.platform, profile.id)">
            <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <UIcon :name="getPlatformIcon(profile.platform)" class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">@{{ profile.id }}</p>
              <p class="text-sm text-muted capitalize">{{ profile.platform }}</p>
            </div>
            <div class="text-right">
              <p class="font-mono font-medium">{{ formatRank(profile.ranking) }}</p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted" />
          </div>
        </div>
      </div>

      <!-- No Results -->
      <div v-else-if="searchQuery && !searching && searchResults.length === 0" class="mt-4 text-center py-4">
        <p class="text-muted">No profiles found for "{{ searchQuery }}"</p>
      </div>
    </UiAppCard>

    <!-- Loading State -->
    <UiAppCard v-if="loading">
      <div class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-muted" />
      </div>
    </UiAppCard>

    <!-- Content -->
    <template v-else>
      <!-- Trending Profiles -->
      <UiAppCard title="Trending Profiles" icon="i-lucide-trending-up">
        <template #header-badge>
          <div class="flex gap-1">
            <UButton v-for="option in timespanOptions" :key="option.value" size="xs"
              :color="selectedTimespan === option.value ? 'primary' : 'neutral'"
              :variant="selectedTimespan === option.value ? 'soft' : 'ghost'"
              @click="selectedTimespan = option.value as typeof selectedTimespan">
              {{ option.label }}
            </UButton>
          </div>
        </template>

        <template v-if="trending.length > 0">
          <div class="divide-y divide-default -mx-4">
            <div v-for="(item, index) in trending.slice(0, 5)" :key="`${item.platform}-${item.profileId}`"
              class="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
              @click="viewProfile(item.platform, item.profileId)">
              <!-- Rank Number -->
              <div
                class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {{ index + 1 }}
              </div>

              <!-- Platform Icon -->
              <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <UIcon :name="getPlatformIcon(item.platform)" class="w-5 h-5" />
              </div>

              <!-- Profile Info -->
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">@{{ item.profileId }}</p>
                <p class="text-sm text-muted capitalize">{{ item.platform }}</p>
              </div>

              <!-- Rank Score -->
              <div class="text-right">
                <p class="font-mono font-medium">{{ formatRank(item.total.ranking) }}</p>
                <p class="text-xs text-muted">
                  {{ item.total.votesPositive + item.total.votesNegative }} votes
                </p>
              </div>

              <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted" />
            </div>
          </div>
        </template>
        <UiAppEmptyState v-else icon="i-lucide-trending-up" title="No trending profiles"
          description="Be the first to vote on a profile!" />
      </UiAppCard>

      <!-- Recent Activity -->
      <UiAppCard title="Recent Activity" icon="i-lucide-activity">
        <template v-if="recentVotes.length > 0">
          <div class="divide-y divide-default -mx-4">
            <div v-for="vote in recentVotes.slice(0, 5)" :key="vote.txid"
              class="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
              @click="viewProfile(vote.platform, vote.profileId)">
              <!-- Vote Icon -->
              <div class="w-10 h-10 rounded-full flex items-center justify-center"
                :class="vote.sentiment === 'positive' ? 'bg-success-100 dark:bg-success-900/30' : 'bg-error-100 dark:bg-error-900/30'">
                <UIcon :name="vote.sentiment === 'positive' ? 'i-lucide-thumbs-up' : 'i-lucide-thumbs-down'"
                  :class="vote.sentiment === 'positive' ? 'text-success' : 'text-error'" class="w-5 h-5" />
              </div>

              <!-- Vote Info -->
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">
                  {{ vote.sentiment === 'positive' ? 'Upvoted' : 'Downvoted' }} @{{ vote.profileId }}
                </p>
                <p class="text-sm text-muted capitalize">{{ vote.platform }}</p>
              </div>

              <!-- Amount & Time -->
              <div class="text-right">
                <p class="font-mono font-medium" :class="vote.sentiment === 'positive' ? 'text-success' : 'text-error'">
                  {{ formatXPI(vote.sats) }}
                </p>
                <p class="text-xs text-muted">{{ timeAgo(Number(vote.timestamp)) }}</p>
              </div>
            </div>
          </div>
        </template>
        <UiAppEmptyState v-else icon="i-lucide-activity" title="No recent activity"
          description="Vote activity will appear here" />
      </UiAppCard>

      <!-- Top Ranked Profiles -->
      <UiAppCard title="Top Ranked Profiles" icon="i-lucide-award">
        <template v-if="profiles.length > 0">
          <div class="divide-y divide-default -mx-4">
            <div v-for="profile in profiles.slice(0, 5)" :key="`${profile.platform}-${profile.id}`"
              class="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
              @click="viewProfile(profile.platform, profile.id)">
              <!-- Platform Icon -->
              <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <UIcon :name="getPlatformIcon(profile.platform)" class="w-5 h-5" />
              </div>

              <!-- Profile Info -->
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">@{{ profile.id }}</p>
                <p class="text-sm text-muted capitalize">{{ profile.platform }}</p>
              </div>

              <!-- Stats -->
              <div class="text-right">
                <p class="font-mono font-medium">{{ formatRank(profile.ranking) }}</p>
                <div class="flex items-center gap-2 text-xs">
                  <span class="text-success">+{{ profile.votesPositive }}</span>
                  <span class="text-error">-{{ profile.votesNegative }}</span>
                </div>
              </div>

              <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted" />
            </div>
          </div>
        </template>
        <UiAppEmptyState v-else icon="i-lucide-users" title="No profiles found"
          description="Profiles will appear here once people start voting" />
      </UiAppCard>

      <!-- How It Works -->
      <UiAppCard title="How RANK Works" icon="i-lucide-info">
        <div class="space-y-3 text-sm text-muted">
          <p>
            <strong class="text-foreground">RANK</strong> is a decentralized reputation system built on the Lotus
            blockchain.
          </p>
          <ul class="list-disc list-inside space-y-1">
            <li>Vote on social media profiles by burning XPI</li>
            <li>Upvotes increase a profile's rank, downvotes decrease it</li>
            <li>All votes are permanently recorded on the blockchain</li>
            <li>Rankings are calculated in real-time from on-chain data</li>
          </ul>
        </div>
      </UiAppCard>
    </template>
  </div>
</template>
