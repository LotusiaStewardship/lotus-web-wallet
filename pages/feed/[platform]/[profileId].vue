<script setup lang="ts">
/**
 * Profile Detail Page
 *
 * Shows full ranking data for a specific profile including:
 * - Ranking score and sentiment breakdown
 * - Vote button for authenticated users
 * - Post list for this profile
 * - Vote history
 */
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'
import type { ProfileData, ProfilePostsResponse } from '~/composables/useRankApi'
import { PlatformIcon, PlatformURL } from '~/composables/useRankApi'
import { formatXPI } from '~/utils/formatting'
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Profile',
})

const route = useRoute()
const walletStore = useWalletStore()
const { getProfileRanking, getProfilePosts } = useRankApi()

const platform = computed(() => route.params.platform as string)
const profileId = computed(() => route.params.profileId as string)

const profile = ref<ProfileData | null>(null)
const posts = ref<ProfilePostsResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const platformIcon = computed(() => PlatformIcon[platform.value] || 'i-lucide-globe')

const externalUrl = computed(() => {
  const urlHelper = PlatformURL[platform.value]
  if (!urlHelper) return null
  return urlHelper.profile(profileId.value)
})

const rankingDisplay = computed(() => {
  if (!profile.value) return '0'
  return formatXPI(profile.value.ranking, { minDecimals: 0, maxDecimals: 2 })
})

const isPositive = computed(() => profile.value && BigInt(profile.value.ranking) > 0n)
const isNegative = computed(() => profile.value && BigInt(profile.value.ranking) < 0n)

const totalVotes = computed(() => {
  if (!profile.value) return 0
  return profile.value.votesPositive + profile.value.votesNegative
})

const sentimentRatio = computed(() => {
  if (!profile.value || totalVotes.value === 0) return 50
  return Math.round((profile.value.votesPositive / totalVotes.value) * 100)
})

const satsPositiveDisplay = computed(() => {
  if (!profile.value) return '0'
  return formatXPI(profile.value.satsPositive, { minDecimals: 0, maxDecimals: 2 })
})

const satsNegativeDisplay = computed(() => {
  if (!profile.value) return '0'
  return formatXPI(profile.value.satsNegative, { minDecimals: 0, maxDecimals: 2 })
})

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const [profileData, postsData] = await Promise.all([
      getProfileRanking(platform.value as ScriptChunkPlatformUTF8, profileId.value),
      getProfilePosts(platform.value as ScriptChunkPlatformUTF8, profileId.value),
    ])
    profile.value = profileData
    posts.value = postsData
  } catch (err: any) {
    error.value = err?.message || 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

function handleVoted(_txid: string) {
  // Refresh data after voting
  fetchData()
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-4">
    <!-- Back Button -->
    <NuxtLink to="/feed"
      class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors">
      <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
      Back to Feed
    </NuxtLink>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 animate-pulse">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div class="space-y-2 flex-1">
            <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          </div>
        </div>
        <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-12">
      <UIcon name="i-lucide-alert-circle" class="w-12 h-12 mx-auto mb-3 text-gray-400" />
      <p class="text-gray-500">{{ error }}</p>
      <button class="mt-3 text-primary hover:underline text-sm" @click="fetchData">Try again</button>
    </div>

    <!-- Profile Detail -->
    <template v-else-if="profile">
      <!-- Profile Header Card -->
      <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <div class="flex items-start gap-4 mb-4">
          <!-- Platform Icon -->
          <div
            class="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
            <UIcon :name="platformIcon" class="w-7 h-7 text-gray-600 dark:text-gray-400" />
          </div>

          <!-- Profile Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-bold truncate">{{ profileId }}</h1>
              <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener"
                class="text-gray-400 hover:text-primary transition-colors">
                <UIcon name="i-lucide-external-link" class="w-4 h-4" />
              </a>
            </div>
            <p class="text-sm text-gray-500 capitalize">{{ platform }}</p>
          </div>

          <!-- Ranking Score -->
          <div class="text-right flex-shrink-0">
            <div class="text-2xl font-mono font-bold"
              :class="isPositive ? 'text-success-500' : isNegative ? 'text-error-500' : 'text-gray-500'">
              {{ isPositive ? '+' : '' }}{{ rankingDisplay }}
            </div>
            <div class="text-xs text-gray-500">XPI ranking</div>
          </div>
        </div>

        <!-- Sentiment Breakdown -->
        <div class="grid grid-cols-3 gap-4 mb-4">
          <div class="text-center p-3 rounded-lg bg-success-50 dark:bg-success-900/10">
            <div class="text-lg font-bold text-success-600 dark:text-success-400">{{ profile.votesPositive }}</div>
            <div class="text-xs text-success-500">Upvotes</div>
            <div class="text-xs text-gray-500 mt-0.5">{{ satsPositiveDisplay }} XPI</div>
          </div>
          <div class="text-center p-3 rounded-lg bg-error-50 dark:bg-error-900/10">
            <div class="text-lg font-bold text-error-600 dark:text-error-400">{{ profile.votesNegative }}</div>
            <div class="text-xs text-error-500">Downvotes</div>
            <div class="text-xs text-gray-500 mt-0.5">{{ satsNegativeDisplay }} XPI</div>
          </div>
          <div class="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div class="text-lg font-bold">{{ totalVotes }}</div>
            <div class="text-xs text-gray-500">Total Votes</div>
            <div class="text-xs text-gray-500 mt-0.5">{{ sentimentRatio }}% positive</div>
          </div>
        </div>

        <!-- Sentiment Bar -->
        <div class="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div class="h-full bg-success-500 rounded-full transition-all" :style="{ width: `${sentimentRatio}%` }" />
        </div>

        <!-- Vote Button -->
        <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <FeedVoteButton :platform="(platform as ScriptChunkPlatformUTF8)" :profile-id="profileId"
            :disabled="!walletStore.initialized" @voted="handleVoted" />
          <p v-if="!walletStore.initialized" class="text-xs text-gray-400 mt-2">
            Create or import a wallet to vote
          </p>
        </div>
      </div>

      <!-- Posts for this Profile -->
      <div v-if="posts && posts.posts.length > 0"
        class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-file-text" class="w-5 h-5" />
            <span class="font-semibold">Ranked Posts</span>
            <UBadge color="neutral" size="xs">{{ posts.posts.length }}</UBadge>
          </div>
        </div>
        <div class="divide-y divide-gray-100 dark:divide-gray-800">
          <div v-for="(post, index) in posts.posts" :key="post.id" class="px-3 py-2">
            <FeedPostCard :post="post" :platform="platform" :profile-id="profileId" :rank="index + 1" />
          </div>
        </div>
      </div>

      <!-- Comment Thread -->
      <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <FeedCommentThread :platform="(platform as ScriptChunkPlatformUTF8)" :profile-id="profileId"
          @commented="fetchData" />
      </div>
    </template>
  </div>
</template>
