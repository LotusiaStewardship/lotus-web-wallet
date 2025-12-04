<script setup lang="ts">
import type { ScriptChunkPlatformUTF8 } from 'lotus-sdk/lib/rank'
import type { ProfileData, ProfilePostsResponse, ProfileVoteActivityResponse } from '~/composables/useRankApi'
import { PlatformIcon, PlatformURL } from '~/composables/useRankApi'

definePageMeta({
  title: 'Profile Details',
})

const route = useRoute()
const { getProfileRanking, getProfilePosts, getProfileRankTransactions } = useRankApi()
const { getAvatar, avatarCache } = useAvatars()
const {
  formatTimestamp,
  truncateTxid,
  toMinifiedPercent,
  toPercentColor,
  toMinifiedStatCount,
  toUppercaseFirstLetter,
  getRankingColor,
} = useExplorerFormat()
const { formatXPI } = useLotusUnits()
const { p2pkhHashToAddress, ensureBitcoreLoaded } = useAddressFormat()

// Route params
const platform = computed(() => route.params.platform as ScriptChunkPlatformUTF8)
const profileId = computed(() => route.params.profileId as string)

// State
const profileData = ref<ProfileData | null>(null)
const postsData = ref<ProfilePostsResponse | null>(null)
const votesData = ref<ProfileVoteActivityResponse | null>(null)
const avatarSrc = ref<string | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Pagination
const postsPage = ref(1)
const postsPageSize = ref(10)
const votesPage = ref(1)
const votesPageSize = ref(10)

// Fetch profile data
const fetchProfileData = async () => {
  loading.value = true
  error.value = null
  try {
    const data = await getProfileRanking(platform.value, profileId.value)
    if (data) {
      profileData.value = data
    } else {
      error.value = 'Profile not found'
    }

    // Fetch avatar
    const avatar = await getAvatar(platform.value, profileId.value)
    avatarSrc.value = avatar.src
  } catch (e) {
    error.value = 'Failed to fetch profile data'
    console.error(e)
  } finally {
    loading.value = false
  }
}

// Fetch posts
const fetchPosts = async () => {
  try {
    const data = await getProfilePosts(platform.value, profileId.value, postsPage.value, postsPageSize.value)
    if (data) {
      postsData.value = data
    }
  } catch (e) {
    console.error('Failed to fetch posts:', e)
  }
}

// Fetch vote history
const fetchVotes = async () => {
  try {
    const data = await getProfileRankTransactions(platform.value, profileId.value, votesPage.value, votesPageSize.value)
    if (data) {
      votesData.value = data
    }
  } catch (e) {
    console.error('Failed to fetch votes:', e)
  }
}

// Watch pagination changes
watch([postsPage, postsPageSize], fetchPosts)
watch([votesPage, votesPageSize], fetchVotes)

// Initial fetch
onMounted(async () => {
  await ensureBitcoreLoaded()
  await fetchProfileData()
  await Promise.all([fetchPosts(), fetchVotes()])
})

// Watch route changes
watch([platform, profileId], async () => {
  postsPage.value = 1
  votesPage.value = 1
  await fetchProfileData()
  await Promise.all([fetchPosts(), fetchVotes()])
})

// Computed values
const platformFormatted = computed(() => toUppercaseFirstLetter(platform.value))
const profileUrl = computed(() => {
  const config = PlatformURL[platform.value]
  return config ? config.profile(profileId.value) : '#'
})
const voteRatio = computed(() => {
  if (!profileData.value) return '0'
  return toMinifiedPercent(profileData.value.satsPositive, profileData.value.satsNegative)
})
const percentColor = computed(() => toPercentColor(voteRatio.value))
const formattedRanking = computed(() => {
  if (!profileData.value) return '0'
  return toMinifiedStatCount(Number(profileData.value.ranking))
})

// Get external post URL
const getPostUrl = (postId: string) => {
  const config = PlatformURL[platform.value]
  return config ? config.post(profileId.value, postId) : '#'
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Back Button -->
    <NuxtLink to="/social" class="inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
      <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
      Back to Social
    </NuxtLink>

    <!-- Error State -->
    <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" :title="error">
      <template #actions>
        <UButton color="error" variant="soft" size="xs" @click="fetchProfileData">Retry</UButton>
      </template>
    </UAlert>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <template v-else-if="profileData">
      <!-- Profile Header Card (like Balance Display) -->
      <UCard>
        <div class="text-center py-6">
          <UAvatar :src="avatarSrc || undefined" size="3xl" :alt="`${profileId}'s avatar`" class="mx-auto mb-4" />
          <div class="flex items-center justify-center gap-2 mb-2">
            <h1 class="text-2xl font-bold">@{{ profileId }}</h1>
            <NuxtLink :to="profileUrl" target="_blank" external>
              <UIcon :name="PlatformIcon[platform]" class="w-5 h-5 text-muted hover:text-primary" />
            </NuxtLink>
          </div>
          <p class="text-muted text-sm mb-4">{{ platformFormatted }} Profile</p>

          <!-- Ranking Display (like Balance) -->
          <div class="text-4xl font-bold font-mono mb-2">
            {{ formattedRanking }}
            <span class="text-xl text-muted">XPI</span>
          </div>
          <UBadge :color="percentColor" variant="subtle" size="md">
            {{ voteRatio }}% Positive Sentiment
          </UBadge>
        </div>
      </UCard>

      <!-- Quick Stats (like Network Stats) -->
      <div class="grid grid-cols-3 gap-3">
        <UCard class="text-center py-3">
          <div class="text-xl font-bold text-success-500">{{ toMinifiedStatCount(Number(profileData.satsPositive)) }}
          </div>
          <div class="text-xs text-muted">Upvotes</div>
        </UCard>
        <UCard class="text-center py-3">
          <div class="text-xl font-bold text-error-500">{{ toMinifiedStatCount(Number(profileData.satsNegative)) }}
          </div>
          <div class="text-xs text-muted">Downvotes</div>
        </UCard>
        <UCard class="text-center py-3">
          <div class="text-xl font-bold">{{ profileData.voters.length }}</div>
          <div class="text-xs text-muted">Voters</div>
        </UCard>
      </div>

      <!-- Top Voters -->
      <UCard v-if="profileData.voters.length > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-users" class="w-5 h-5 text-primary" />
            <span class="font-semibold">Top Voters</span>
            <UBadge color="neutral" variant="subtle" size="sm">{{ profileData.voters.length }}</UBadge>
          </div>
        </template>

        <div class="divide-y divide-default">
          <div v-for="voter in profileData.voters.slice(0, 10)" :key="voter.voterId"
            class="flex items-center gap-3 py-3">
            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-user" class="w-5 h-5 text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <ExplorerAddressDisplay v-if="p2pkhHashToAddress(voter.voterId)"
                :address="p2pkhHashToAddress(voter.voterId)!" size="sm" :show-add-contact="true" />
              <span v-else class="font-mono text-sm text-muted">{{ voter.voterId.slice(0, 8) }}...{{
                voter.voterId.slice(-6) }}</span>
              <div class="flex items-center gap-2 text-xs text-muted mt-0.5">
                <span class="text-success-500">+{{ voter.votesPositive }}</span>
                <span>/</span>
                <span class="text-error-500">-{{ voter.votesNegative }}</span>
                <span>votes</span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <div class="font-mono font-medium"
                :class="Number(voter.ranking) >= 0 ? 'text-success-500' : 'text-error-500'">
                {{ toMinifiedStatCount(Number(voter.ranking)) }} XPI
              </div>
            </div>
          </div>
        </div>

        <template v-if="profileData.voters.length > 10" #footer>
          <p class="text-center text-sm text-muted">
            + {{ profileData.voters.length - 10 }} more voters
          </p>
        </template>
      </UCard>

      <!-- Vote History (Activity Feed Style) -->
      <UCard v-if="votesData">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-activity" class="w-5 h-5 text-primary" />
              <span class="font-semibold">Vote History</span>
            </div>
          </div>
        </template>

        <div v-if="votesData.votes.length === 0" class="text-center py-8 text-muted">
          No votes yet
        </div>

        <div v-else class="divide-y divide-default">
          <SocialActivityItem v-for="vote in votesData.votes" :key="vote.txid" :txid="vote.txid" :platform="platform"
            :profile-id="profileId" :post-id="vote.post?.id" :sentiment="vote.sentiment" :sats="vote.sats"
            :timestamp="vote.timestamp" />
        </div>

        <template v-if="votesData.numPages > 1" #footer>
          <div class="flex items-center justify-center gap-2">
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-left" :disabled="votesPage <= 1"
              @click="votesPage--" />
            <span class="text-sm text-muted">{{ votesPage }} / {{ votesData.numPages }}</span>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-right"
              :disabled="votesPage >= votesData.numPages" @click="votesPage++" />
          </div>
        </template>
      </UCard>

      <!-- Posts (if any) -->
      <UCard v-if="postsData && postsData.posts.length > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-file-text" class="w-5 h-5 text-primary" />
            <span class="font-semibold">Rated Posts</span>
            <UBadge color="neutral" variant="subtle" size="sm">{{ postsData.posts.length }}</UBadge>
          </div>
        </template>

        <div class="divide-y divide-default">
          <NuxtLink v-for="post in postsData.posts" :key="post.id" :to="getPostUrl(post.id)" target="_blank" external
            class="flex items-center gap-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-4 px-4 transition-colors">
            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-message-square" class="w-5 h-5 text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-mono text-sm truncate">{{ post.id }}</div>
              <div class="flex items-center gap-2 text-xs text-muted">
                <span class="text-success-500">+{{ toMinifiedStatCount(Number(post.satsPositive)) }}</span>
                <span>/</span>
                <span class="text-error-500">-{{ toMinifiedStatCount(Number(post.satsNegative)) }}</span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <div class="font-mono font-medium">{{ toMinifiedStatCount(Number(post.ranking)) }} XPI</div>
              <UIcon name="i-lucide-external-link" class="w-4 h-4 text-muted" />
            </div>
          </NuxtLink>
        </div>

        <template v-if="postsData.numPages > 1" #footer>
          <div class="flex items-center justify-center gap-2">
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-left" :disabled="postsPage <= 1"
              @click="postsPage--" />
            <span class="text-sm text-muted">{{ postsPage }} / {{ postsData.numPages }}</span>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-right"
              :disabled="postsPage >= postsData.numPages" @click="postsPage++" />
          </div>
        </template>
      </UCard>
    </template>
  </div>
</template>
