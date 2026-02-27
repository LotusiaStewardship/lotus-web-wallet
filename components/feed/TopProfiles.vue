<script setup lang="ts">
/**
 * Top Profiles Component
 *
 * Ranked profile list with sentiment indicators and timespan selector.
 * Fetches data from rank-backend-ts trending endpoints.
 */
import type { ScriptChunkSentimentUTF8 } from 'xpi-ts/lib/rank';
import type { TrendingItem, Timespan } from '~/composables/useRankApi'
import { controversyScore } from '~/utils/feed'

const props = withDefaults(defineProps<{
  /** Title for the section */
  title?: string
  /** Show most controversial instead of top-ranked (R2) */
  controversial?: boolean
  /** Maximum items to display */
  limit?: number
}>(), {
  title: 'Trending Profiles',
  controversial: false,
  limit: 10,
})

const { getTopRankedProfiles } = useRankApi()
const { pollAfterVote } = usePostVotePolling()
const walletStore = useWalletStore()

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
    const result = await getTopRankedProfiles(timespan.value)
    if (props.controversial) {
      // R2: Sort by burn-weighted controversy score, filter to min 5 votes
      profiles.value = result
        .filter(p => (p.total.votesPositive + p.total.votesNegative) >= 5)
        .sort((a, b) => {
          const scoreA = 'satsPositive' in a ? controversyScore((a as any).satsPositive || '0', (a as any).satsNegative || '0') : 0
          const scoreB = 'satsPositive' in b ? controversyScore((b as any).satsPositive || '0', (b as any).satsNegative || '0') : 0
          return scoreB - scoreA
        })
        .slice(0, props.limit)
    } else {
      profiles.value = result.slice(0, props.limit)
    }
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

async function handleProfileVoted(txid: string, sentiment?: ScriptChunkSentimentUTF8, profileId?: string, platform?: string) {
  if (!sentiment || !profileId || !platform) return

  // Find the profile in the array
  const profileIndex = profiles.value.findIndex(p => p.profileId === profileId && p.platform === platform)
  if (profileIndex === -1) return

  // Optimistic update
  const profile = profiles.value[profileIndex]
  profiles.value[profileIndex] = {
    ...profile,
    total: {
      ...profile.total,
      votesPositive: sentiment === 'positive' ? profile.total.votesPositive + 1 : profile.total.votesPositive,
      votesNegative: sentiment === 'negative' ? profile.total.votesNegative + 1 : profile.total.votesNegative,
    },
  }

  // Poll for verification
  const result = await pollAfterVote({
    platform: platform as any,
    profileId,
    txid,
    sentiment,
    scriptPayload: walletStore.scriptPayload,
  })

  // Update with confirmed data
  if (result.confirmed) {
    const currentProfile = profiles.value[profileIndex]
    profiles.value[profileIndex] = {
      ...currentProfile,
      total: {
        ...currentProfile.total,
        votesPositive: result.votesPositive ?? currentProfile.total.votesPositive,
        votesNegative: result.votesNegative ?? currentProfile.total.votesNegative,
        ranking: result.ranking ?? currentProfile.total.ranking,
      },
    }
  }
}

onMounted(fetchProfiles)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon :name="controversial ? 'i-lucide-scale' : 'i-lucide-trending-up'" class="w-5 h-5" />
          <span class="font-semibold">{{ title }}</span>
        </div>
        <UButton variant="link" size="xs" to="/feed">
          View All
        </UButton>
      </div>
    </template>

    <!-- Timespan Selector -->
    <div class="flex items-center gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-800/50">
      <UButton v-for="opt in timespanOptions" :key="opt.value" size="xs"
        :variant="timespan === opt.value ? 'soft' : 'ghost'" :color="timespan === opt.value ? 'primary' : 'neutral'"
        @click="changeTimespan(opt.value)">
        {{ opt.label }}
      </UButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="i in 5" :key="i" class="p-4">
        <div class="flex items-center gap-3">
          <USkeleton class="h-8 w-8 rounded-full" />
          <USkeleton class="h-10 w-10 rounded-full" />
          <div class="flex-1 space-y-2">
            <USkeleton class="h-4 w-1/3" />
            <USkeleton class="h-2 w-2/3" />
          </div>
          <USkeleton class="h-8 w-16" />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8 text-gray-500">
      <UIcon name="i-lucide-alert-circle" class="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p class="text-sm">{{ error }}</p>
      <UButton variant="link" size="xs" class="mt-2" @click="fetchProfiles">
        Try again
      </UButton>
    </div>

    <!-- Empty State -->
    <div v-else-if="profiles.length === 0" class="text-center py-8 text-gray-500">
      <UIcon name="i-lucide-inbox" class="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p class="text-sm">No ranked profiles yet</p>
    </div>

    <!-- Profile List -->
    <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="(profile, index) in profiles" :key="`${profile.platform}-${profile.profileId}`" class="px-3 py-2">
        <FeedProfileCard :profile="profile" :rank="index + 1" compact
          @voted="(txid, sentiment) => handleProfileVoted(txid, sentiment, profile.profileId, profile.platform)" />
      </div>
    </div>
  </UCard>
</template>
