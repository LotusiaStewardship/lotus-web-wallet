<script setup lang="ts">
/**
 * Social Profile Detail Page
 *
 * Display detailed information about a social profile and allow voting.
 */
import {
  useRankApi,
  type ProfileData,
  type ProfileRankTransaction,
  PlatformIcon,
  PlatformURL,
} from '~/composables/useRankApi'
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Profile',
})

const route = useRoute()
const rankApi = useRankApi()
const walletStore = useWalletStore()
const { copy } = useClipboard()
const { formatXPI } = useAmount()
const { timeAgo, formatDate } = useTime()
const { share, canShare } = useShare()

const platform = computed(() => route.params.platform as string)
const profileId = computed(() => route.params.profileId as string)

// State
const loading = ref(true)
const error = ref<string | null>(null)
const profile = ref<ProfileData | null>(null)
const voteHistory = ref<ProfileRankTransaction[]>([])
const loadingVotes = ref(false)
const votesPage = ref(1)
const votesNumPages = ref(0)

// Vote modal state
const showVoteModal = ref(false)
const voteType = ref<'up' | 'down'>('up')

// Fetch profile data
async function fetchProfile() {
  loading.value = true
  error.value = null
  try {
    const result = await rankApi.getProfileRanking(platform.value as any, profileId.value)
    if (result) {
      profile.value = result
      // Also fetch vote history
      fetchVoteHistory()
    } else {
      error.value = 'Profile not found'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

// Fetch vote history
async function fetchVoteHistory() {
  loadingVotes.value = true
  try {
    const result = await rankApi.getProfileRankTransactions(
      platform.value as any,
      profileId.value,
      votesPage.value,
      10,
    )
    if (result) {
      voteHistory.value = result.votes
      votesNumPages.value = result.numPages
    }
  } catch (err) {
    console.error('Failed to fetch vote history:', err)
  } finally {
    loadingVotes.value = false
  }
}

onMounted(fetchProfile)

// Watch for route changes
watch([platform, profileId], fetchProfile)

// Format rank for display
function formatRank(ranking: string): string {
  const num = parseFloat(ranking)
  if (isNaN(num)) return '0'
  return num.toFixed(2)
}

// Get platform icon
function getPlatformIcon(plat: string): string {
  return PlatformIcon[plat] || 'i-lucide-user'
}

// Get profile URL
function getProfileUrl(): string | null {
  const platformConfig = PlatformURL[platform.value]
  if (!platformConfig) return null
  return platformConfig.profile(profileId.value)
}

// Vote percentage
const votePercentage = computed(() => {
  if (!profile.value) return 0
  const total = profile.value.votesPositive + profile.value.votesNegative
  if (total === 0) return 50
  return Math.round((profile.value.votesPositive / total) * 100)
})

// Total burned on profile
const totalBurned = computed(() => {
  if (!profile.value) return '0'
  const positive = BigInt(profile.value.satsPositive || '0')
  const negative = BigInt(profile.value.satsNegative || '0')
  return (positive + negative).toString()
})

// Copy and share functions
function copyProfileHandle() {
  copy(`@${profileId.value}`, 'Profile Handle')
}

function shareProfile() {
  share({
    title: `@${profileId.value} on ${platform.value}`,
    text: `View @${profileId.value}'s RANK profile`,
    url: window.location.href,
  })
}

// Vote handlers
function openVoteModal(type: 'up' | 'down') {
  voteType.value = type
  showVoteModal.value = true
}

function handleVote(amount: bigint) {
  // Refresh profile after vote
  fetchProfile()
}

// Retry on error
function retry() {
  fetchProfile()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back Button -->
    <div class="flex items-center gap-2">
      <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" to="/explore/social">
        Back to Social
      </UButton>
    </div>

    <!-- Loading State -->
    <template v-if="loading">
      <UiAppCard>
        <div class="flex items-center justify-center py-12">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-muted" />
        </div>
      </UiAppCard>
    </template>

    <!-- Error State -->
    <template v-else-if="error">
      <UAlert color="error" variant="subtle" icon="i-lucide-alert-circle" :title="error">
        <template #actions>
          <UButton color="error" variant="soft" size="sm" @click="retry">
            Retry
          </UButton>
        </template>
      </UAlert>
    </template>

    <!-- Profile Content -->
    <template v-else-if="profile">
      <!-- Profile Header Card -->
      <UiAppCard>
        <div class="flex items-start gap-4">
          <!-- Platform Icon -->
          <div class="w-16 h-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <UIcon :name="getPlatformIcon(platform)" class="w-8 h-8" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-xl font-bold">@{{ profileId }}</h2>
              <UBadge color="neutral" variant="subtle" class="capitalize">
                {{ platform }}
              </UBadge>
            </div>

            <!-- Rank Display -->
            <div class="mt-2">
              <p class="text-3xl font-bold font-mono">{{ formatRank(profile.ranking) }}</p>
              <p class="text-sm text-muted">RANK Score</p>
            </div>

            <!-- Vote Bar -->
            <div class="mt-3">
              <div class="flex items-center justify-between text-sm mb-1">
                <span class="text-success">{{ votePercentage }}% positive</span>
                <span class="text-muted">{{ profile.votesPositive + profile.votesNegative }} votes</span>
              </div>
              <div class="h-2 bg-muted rounded-full overflow-hidden">
                <div class="h-full bg-success transition-all" :style="{ width: `${votePercentage}%` }" />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 flex-shrink-0">
            <UButton color="neutral" variant="ghost" icon="i-lucide-copy" @click="copyProfileHandle" />
            <UButton v-if="canShare" color="neutral" variant="ghost" icon="i-lucide-share-2" @click="shareProfile" />
            <UButton v-if="getProfileUrl()" color="neutral" variant="ghost" icon="i-lucide-external-link"
              :href="getProfileUrl()!" target="_blank" />
          </div>
        </div>
      </UiAppCard>

      <!-- Vote Actions -->
      <UiAppCard>
        <div class="flex gap-4">
          <UButton class="flex-1" color="success" size="lg" icon="i-lucide-thumbs-up" @click="openVoteModal('up')">
            Upvote
          </UButton>
          <UButton class="flex-1" color="error" size="lg" icon="i-lucide-thumbs-down" @click="openVoteModal('down')">
            Downvote
          </UButton>
        </div>
        <p class="text-center text-xs text-muted mt-3">
          Burn XPI to vote. Your vote is permanently recorded on the blockchain.
        </p>
      </UiAppCard>

      <!-- Stats Grid -->
      <div class="grid gap-4 grid-cols-2 md:grid-cols-4">
        <ExplorerStatCard :value="formatXPI(totalBurned)" label="Total Burned" icon="i-lucide-flame" mono />
        <ExplorerStatCard :value="profile.voters?.length?.toString() || '0'" label="Unique Voters" icon="i-lucide-users"
          mono />
        <ExplorerStatCard :value="profile.votesPositive.toString()" label="Upvotes" icon="i-lucide-thumbs-up" mono />
        <ExplorerStatCard :value="profile.votesNegative.toString()" label="Downvotes" icon="i-lucide-thumbs-down"
          mono />
      </div>

      <!-- Vote History -->
      <UiAppCard title="Vote History" icon="i-lucide-history">
        <div v-if="loadingVotes" class="flex items-center justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-muted" />
        </div>

        <div v-else-if="voteHistory.length" class="divide-y divide-default -mx-4">
          <NuxtLink v-for="vote in voteHistory" :key="vote.txid" :to="`/explore/explorer/tx/${vote.txid}`"
            class="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
            <!-- Vote Icon -->
            <div class="w-10 h-10 rounded-full flex items-center justify-center"
              :class="vote.sentiment === 'positive' ? 'bg-success-100 dark:bg-success-900/30' : 'bg-error-100 dark:bg-error-900/30'">
              <UIcon :name="vote.sentiment === 'positive' ? 'i-lucide-thumbs-up' : 'i-lucide-thumbs-down'"
                :class="vote.sentiment === 'positive' ? 'text-success' : 'text-error'" class="w-5 h-5" />
            </div>

            <!-- Vote Info -->
            <div class="flex-1 min-w-0">
              <p class="font-medium">
                {{ vote.sentiment === 'positive' ? 'Upvote' : 'Downvote' }}
              </p>
              <p class="text-sm text-muted font-mono truncate">
                {{ vote.txid.slice(0, 8) }}...{{ vote.txid.slice(-8) }}
              </p>
            </div>

            <!-- Amount & Time -->
            <div class="text-right flex-shrink-0">
              <p class="font-mono font-medium" :class="vote.sentiment === 'positive' ? 'text-success' : 'text-error'">
                {{ formatXPI(vote.sats) }}
              </p>
              <p class="text-xs text-muted">{{ timeAgo(Number(vote.timestamp)) }}</p>
            </div>

            <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted flex-shrink-0" />
          </NuxtLink>
        </div>

        <UiAppEmptyState v-else icon="i-lucide-history" title="No vote history"
          description="Be the first to vote on this profile!" />
      </UiAppCard>

      <!-- Top Voters -->
      <UiAppCard v-if="profile.voters && profile.voters.length > 0" title="Top Voters" icon="i-lucide-users">
        <div class="divide-y divide-default -mx-4">
          <div v-for="(voter, index) in profile.voters.slice(0, 5)" :key="voter.voterId"
            class="flex items-center gap-3 px-4 py-3">
            <!-- Rank -->
            <div
              class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {{ index + 1 }}
            </div>

            <!-- Voter Info -->
            <div class="flex-1 min-w-0">
              <p class="font-mono text-sm truncate">{{ voter.voterId.slice(0, 8) }}...{{ voter.voterId.slice(-8) }}</p>
              <p class="text-xs text-muted">{{ voter.votesPositive + voter.votesNegative }} votes</p>
            </div>

            <!-- Stats -->
            <div class="text-right text-sm">
              <span class="text-success">+{{ voter.votesPositive }}</span>
              <span class="mx-1 text-muted">/</span>
              <span class="text-error">-{{ voter.votesNegative }}</span>
            </div>
          </div>
        </div>
      </UiAppCard>
    </template>

    <!-- Not Found -->
    <UiAppCard v-else>
      <UiAppEmptyState icon="i-lucide-user-x" title="Profile Not Found"
        description="This profile hasn't been voted on yet. Be the first to vote!" />
      <div class="text-center mt-4">
        <UButton color="primary" @click="openVoteModal('up')">
          Vote on this Profile
        </UButton>
      </div>
    </UiAppCard>

    <!-- Vote Modal -->
    <SocialVoteModal v-model:open="showVoteModal" :profile="profile ? {
      id: profile.id,
      platform: profile.platform,
      profileId: profileId,
      displayName: `@${profileId}`,
    } : null" :vote-type="voteType" @vote="handleVote" />
  </div>
</template>
