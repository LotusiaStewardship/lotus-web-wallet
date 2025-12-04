<script setup lang="ts">
import type { TrendingItem, ProfileListItem, RankTransaction } from '~/composables/useRankApi'

definePageMeta({
  title: 'Social',
})

const { getTopRankedProfiles, getProfiles, getVoteActivity } = useRankApi()
const { preloadAvatars } = useAvatars()

// Tab state
const activeTab = ref('trending')
const tabs = [
  { label: 'Trending', value: 'trending', icon: 'i-lucide-trending-up' },
  { label: 'Activity', value: 'activity', icon: 'i-lucide-activity' },
  { label: 'Profiles', value: 'profiles', icon: 'i-lucide-users' },
]

// Trending data
const trendingProfiles = ref<TrendingItem[]>([])
const trendingLoading = ref(true)

// Activity data
const activityVotes = ref<RankTransaction[]>([])
const activityLoading = ref(true)
const activityPage = ref(1)

// Profiles data
const profiles = ref<ProfileListItem[]>([])
const profilesLoading = ref(true)
const profilesPage = ref(1)
const profilesNumPages = ref(0)

// Fetch trending
const fetchTrending = async () => {
  trendingLoading.value = true
  try {
    const data = await getTopRankedProfiles('today')
    trendingProfiles.value = data
    if (data.length > 0) {
      await preloadAvatars(data.map(p => ({ platform: p.platform, profileId: p.profileId })))
    }
  } catch (e) {
    console.error('Failed to fetch trending:', e)
  } finally {
    trendingLoading.value = false
  }
}

// Fetch activity
const fetchActivity = async () => {
  activityLoading.value = true
  try {
    const data = await getVoteActivity(activityPage.value, 20)
    if (data) {
      activityVotes.value = data.votes
      if (data.votes.length > 0) {
        await preloadAvatars(data.votes.map(v => ({ platform: v.platform, profileId: v.profileId })))
      }
    }
  } catch (e) {
    console.error('Failed to fetch activity:', e)
  } finally {
    activityLoading.value = false
  }
}

// Fetch profiles
const fetchProfiles = async () => {
  profilesLoading.value = true
  try {
    const data = await getProfiles(profilesPage.value, 20)
    if (data) {
      profiles.value = data.profiles
      profilesNumPages.value = data.numPages
      if (data.profiles.length > 0) {
        await preloadAvatars(data.profiles.map(p => ({ platform: p.platform, profileId: p.id })))
      }
    }
  } catch (e) {
    console.error('Failed to fetch profiles:', e)
  } finally {
    profilesLoading.value = false
  }
}

// Auto-refresh activity
let activityInterval: ReturnType<typeof setInterval> | null = null

const startActivityRefresh = () => {
  if (activityInterval) clearInterval(activityInterval)
  activityInterval = setInterval(() => {
    if (activeTab.value === 'activity' && activityPage.value === 1) {
      fetchActivity()
    }
  }, 5000)
}

onMounted(() => {
  fetchTrending()
  fetchActivity()
  fetchProfiles()
  startActivityRefresh()
})

onUnmounted(() => {
  if (activityInterval) clearInterval(activityInterval)
})

// Watch tab changes
watch(activeTab, (tab) => {
  if (tab === 'trending' && trendingProfiles.value.length === 0) fetchTrending()
  if (tab === 'activity' && activityVotes.value.length === 0) fetchActivity()
  if (tab === 'profiles' && profiles.value.length === 0) fetchProfiles()
})

// Watch pagination
watch(activityPage, fetchActivity)
watch(profilesPage, fetchProfiles)
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Header -->
    <UCard>
      <div class="text-center py-4">
        <UIcon name="i-lucide-thumbs-up" class="w-12 h-12 text-primary mx-auto mb-3" />
        <h1 class="text-2xl font-bold mb-1">Lotusia Social</h1>
        <p class="text-muted text-sm">Discover and vote on profiles across the web</p>
      </div>
    </UCard>

    <!-- Tab Navigation -->
    <div class="flex gap-2 overflow-x-auto pb-2">
      <UButton v-for="tab in tabs" :key="tab.value" :color="activeTab === tab.value ? 'primary' : 'neutral'"
        :variant="activeTab === tab.value ? 'solid' : 'ghost'" :icon="tab.icon" size="sm"
        @click="activeTab = tab.value">
        {{ tab.label }}
      </UButton>
    </div>

    <!-- Trending Tab -->
    <template v-if="activeTab === 'trending'">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-flame" class="w-5 h-5 text-warning-500" />
              <span class="font-semibold">Hot Today</span>
            </div>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-refresh-cw" :loading="trendingLoading"
              @click="fetchTrending" />
          </div>
        </template>

        <div v-if="trendingLoading && trendingProfiles.length === 0" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary" />
        </div>

        <div v-else-if="trendingProfiles.length === 0" class="text-center py-8 text-muted">
          No trending profiles today
        </div>

        <div v-else class="divide-y divide-default">
          <SocialProfileCard v-for="profile in trendingProfiles" :key="`${profile.platform}:${profile.profileId}`"
            :platform="profile.platform" :profile-id="profile.profileId" :ranking="profile.total.ranking"
            :votes-positive="profile.total.votesPositive" :votes-negative="profile.total.votesNegative"
            :ranking-change="profile.changed.ranking" />
        </div>
      </UCard>
    </template>

    <!-- Activity Tab -->
    <template v-if="activeTab === 'activity'">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-activity" class="w-5 h-5 text-primary" />
              <span class="font-semibold">Recent Votes</span>
              <UBadge v-if="activityPage === 1" color="success" variant="subtle" size="sm">
                <UIcon name="i-lucide-radio" class="w-3 h-3 mr-1 animate-pulse" />
                Live
              </UBadge>
            </div>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-refresh-cw" :loading="activityLoading"
              @click="fetchActivity" />
          </div>
        </template>

        <div v-if="activityLoading && activityVotes.length === 0" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary" />
        </div>

        <div v-else-if="activityVotes.length === 0" class="text-center py-8 text-muted">
          No recent activity
        </div>

        <div v-else class="divide-y divide-default">
          <SocialActivityItem v-for="vote in activityVotes" :key="vote.txid" :txid="vote.txid" :platform="vote.platform"
            :profile-id="vote.profileId" :post-id="vote.postId" :sentiment="vote.sentiment" :sats="vote.sats"
            :timestamp="vote.firstSeen || vote.timestamp" compact />
        </div>

        <template #footer>
          <div class="flex items-center justify-center gap-2">
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-left"
              :disabled="activityPage <= 1" @click="activityPage--" />
            <span class="text-sm text-muted">Page {{ activityPage }}</span>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-right" @click="activityPage++" />
          </div>
        </template>
      </UCard>
    </template>

    <!-- Profiles Tab -->
    <template v-if="activeTab === 'profiles'">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" class="w-5 h-5 text-primary" />
              <span class="font-semibold">All Profiles</span>
            </div>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-refresh-cw" :loading="profilesLoading"
              @click="fetchProfiles" />
          </div>
        </template>

        <div v-if="profilesLoading && profiles.length === 0" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary" />
        </div>

        <div v-else-if="profiles.length === 0" class="text-center py-8 text-muted">
          No profiles found
        </div>

        <div v-else class="divide-y divide-default">
          <SocialProfileCard v-for="profile in profiles" :key="`${profile.platform}:${profile.id}`"
            :platform="profile.platform" :profile-id="profile.id" :ranking="profile.ranking"
            :sats-positive="profile.satsPositive" :sats-negative="profile.satsNegative" />
        </div>

        <template v-if="profilesNumPages > 1" #footer>
          <div class="flex items-center justify-center gap-2">
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-left"
              :disabled="profilesPage <= 1" @click="profilesPage--" />
            <span class="text-sm text-muted">Page {{ profilesPage }} of {{ profilesNumPages }}</span>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-chevron-right"
              :disabled="profilesPage >= profilesNumPages" @click="profilesPage++" />
          </div>
        </template>
      </UCard>
    </template>
  </div>
</template>
