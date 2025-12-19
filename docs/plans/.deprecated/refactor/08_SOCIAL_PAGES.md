# 08: Social/RANK Pages

## Overview

This document details the refactoring of the Social/RANK pages. The current implementation lacks inline voting, profile search, and feels disconnected from the wallet.

---

## Current Problems

1. **No voting from social page** - Must navigate to profile to vote
2. **No profile search** - Can only see trending
3. **No profile claiming** - Can't link your social profiles
4. **Activity feed is basic** - No voter information
5. **Disconnected from wallet** - Voting should be integrated

---

## Target Design

### Social Index

```
┌─────────────────────────────────────────────────────────────────────┐
│  🏆 Social Rankings                                                  │
│  ─────────────────────────────────────────────────────────────────  │
│  [🔍 Search profiles...]                                             │
│                                                                      │
│  [Trending] [Activity] [My Votes]                                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  🔥 Trending Profiles                                                │
│  ─────────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 1. @alice (Twitter)                    ▲ +12.5%              │   │
│  │    Rank: 95.2 | 1,234 votes | 89% positive                  │   │
│  │    [👍 Upvote]  [👎 Downvote]  [View Profile]               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 2. @bob (YouTube)                      ▼ -3.2%               │   │
│  │    Rank: 87.1 | 892 votes | 76% positive                    │   │
│  │    [👍 Upvote]  [👎 Downvote]  [View Profile]               │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  📊 Recent Activity                                                  │
│  ─────────────────────────────────────────────────────────────────  │
│  👍 lotus_abc... voted +100 XPI for @alice      2 min ago           │
│  👎 lotus_def... voted -50 XPI for @carol       5 min ago           │
│  👍 lotus_ghi... voted +200 XPI for @bob        12 min ago          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Page: social/index.vue

```vue
<!-- pages/social/index.vue -->
<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Hero -->
    <AppHeroCard
      icon="i-lucide-trophy"
      title="Social Rankings"
      subtitle="Vote on social media profiles with RANK"
    >
      <template #actions>
        <SocialSearchBar
          v-model="searchQuery"
          @search="handleSearch"
          class="max-w-md mx-auto"
        />
      </template>
    </AppHeroCard>

    <!-- Tabs -->
    <UTabs v-model="activeTab" :items="tabs" />

    <!-- Trending Tab -->
    <template v-if="activeTab === 'trending'">
      <AppCard title="Trending Profiles" icon="i-lucide-trending-up">
        <div
          v-if="trendingProfiles.length"
          class="divide-y divide-default -mx-4"
        >
          <SocialProfileCard
            v-for="(profile, index) in trendingProfiles"
            :key="profile.id"
            :profile="profile"
            :rank="index + 1"
            @vote="openVoteModal(profile, $event)"
            @view="navigateToProfile(profile)"
          />
        </div>
        <AppLoadingState v-else-if="loading" message="Loading profiles..." />
        <AppEmptyState
          v-else
          icon="i-lucide-users"
          title="No profiles found"
          description="Be the first to vote on a social profile"
        />
      </AppCard>
    </template>

    <!-- Activity Tab -->
    <template v-else-if="activeTab === 'activity'">
      <AppCard title="Recent Votes" icon="i-lucide-activity">
        <div v-if="recentActivity.length" class="divide-y divide-default -mx-4">
          <SocialActivityItem
            v-for="activity in recentActivity"
            :key="activity.txid"
            :activity="activity"
            @click="navigateToTx(activity.txid)"
          />
        </div>
        <AppLoadingState v-else-if="loading" message="Loading activity..." />
        <AppEmptyState
          v-else
          icon="i-lucide-activity"
          title="No recent activity"
        />
      </AppCard>
    </template>

    <!-- My Votes Tab -->
    <template v-else-if="activeTab === 'my-votes'">
      <AppCard title="Your Votes" icon="i-lucide-heart">
        <div v-if="myVotes.length" class="divide-y divide-default -mx-4">
          <SocialActivityItem
            v-for="vote in myVotes"
            :key="vote.txid"
            :activity="vote"
            show-profile
          />
        </div>
        <AppEmptyState
          v-else
          icon="i-lucide-heart"
          title="No votes yet"
          description="Vote on profiles to support creators you like"
        />
      </AppCard>
    </template>

    <!-- Vote Modal -->
    <SocialVoteModal
      v-model:open="voteModalOpen"
      :profile="selectedProfile"
      :vote-type="selectedVoteType"
      @vote="handleVote"
    />
  </div>
</template>

<script setup lang="ts">
const { fetchTrendingProfiles, fetchRecentActivity, fetchMyVotes } = useRank()
const router = useRouter()
const walletStore = useWalletStore()

// State
const searchQuery = ref('')
const activeTab = ref('trending')
const loading = ref(true)
const trendingProfiles = ref<RankProfile[]>([])
const recentActivity = ref<RankActivity[]>([])
const myVotes = ref<RankActivity[]>([])

// Vote modal
const voteModalOpen = ref(false)
const selectedProfile = ref<RankProfile | null>(null)
const selectedVoteType = ref<'up' | 'down'>('up')

const tabs = [
  { label: 'Trending', value: 'trending', icon: 'i-lucide-trending-up' },
  { label: 'Activity', value: 'activity', icon: 'i-lucide-activity' },
  { label: 'My Votes', value: 'my-votes', icon: 'i-lucide-heart' },
]

// Load data based on active tab
watch(
  activeTab,
  async tab => {
    loading.value = true
    try {
      if (tab === 'trending') {
        trendingProfiles.value = await fetchTrendingProfiles()
      } else if (tab === 'activity') {
        recentActivity.value = await fetchRecentActivity()
      } else if (tab === 'my-votes' && walletStore.address) {
        myVotes.value = await fetchMyVotes(walletStore.address)
      }
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

// Actions
function handleSearch(query: string) {
  router.push({
    path: '/social/search',
    query: { q: query },
  })
}

function openVoteModal(profile: RankProfile, type: 'up' | 'down') {
  selectedProfile.value = profile
  selectedVoteType.value = type
  voteModalOpen.value = true
}

function navigateToProfile(profile: RankProfile) {
  router.push(`/social/${profile.platform}/${profile.profileId}`)
}

function navigateToTx(txid: string) {
  router.push(`/explorer/tx/${txid}`)
}

async function handleVote(amount: bigint) {
  // Vote logic handled in modal
  voteModalOpen.value = false
  // Refresh data
  trendingProfiles.value = await fetchTrendingProfiles()
}
</script>
```

---

## Component: SocialProfileCard.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  profile: RankProfile
  rank?: number
  compact?: boolean
}>()

const emit = defineEmits<{
  vote: ['up' | 'down']
  view: []
}>()

const { formatXPI } = useAmount()

const positivePercent = computed(() => {
  const total = props.profile.positiveVotes + props.profile.negativeVotes
  if (total === 0n) return 0
  return Number((props.profile.positiveVotes * 100n) / total)
})

const percentColor = computed(() => {
  if (positivePercent.value >= 75) return 'success'
  if (positivePercent.value >= 50) return 'warning'
  return 'error'
})

const changeColor = computed(() => {
  if (props.profile.rankChange > 0) return 'text-success'
  if (props.profile.rankChange < 0) return 'text-error'
  return 'text-muted'
})

const platformIcon = computed(() => {
  const icons: Record<string, string> = {
    twitter: 'i-lucide-twitter',
    youtube: 'i-lucide-youtube',
    twitch: 'i-lucide-twitch',
    github: 'i-lucide-github',
    instagram: 'i-lucide-instagram',
  }
  return icons[props.profile.platform] || 'i-lucide-user'
})
</script>

<template>
  <div class="px-4 py-4 hover:bg-muted/50 transition-colors">
    <div class="flex items-start gap-3">
      <!-- Rank Number -->
      <div
        v-if="rank"
        class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0"
      >
        <span class="text-sm font-bold text-primary">{{ rank }}</span>
      </div>

      <!-- Avatar -->
      <div
        class="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0"
      >
        <img
          v-if="profile.avatarUrl"
          :src="profile.avatarUrl"
          :alt="profile.displayName"
          class="w-full h-full rounded-full object-cover"
        />
        <UIcon v-else :name="platformIcon" class="w-6 h-6 text-muted" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <p class="font-medium truncate">{{ profile.displayName }}</p>
          <UIcon
            :name="platformIcon"
            class="w-4 h-4 text-muted flex-shrink-0"
          />
          <span :class="changeColor" class="text-sm flex-shrink-0">
            {{
              profile.rankChange > 0 ? '▲' : profile.rankChange < 0 ? '▼' : '–'
            }}
            {{ Math.abs(profile.rankChange).toFixed(1) }}%
          </span>
        </div>

        <div class="flex items-center gap-3 text-sm text-muted">
          <span>Rank: {{ profile.rank.toFixed(1) }}</span>
          <span>{{ profile.totalVotes.toLocaleString() }} votes</span>
          <UBadge :color="percentColor" variant="subtle" size="xs">
            {{ positivePercent }}% positive
          </UBadge>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1 flex-shrink-0">
        <UButton
          color="success"
          variant="ghost"
          size="sm"
          icon="i-lucide-thumbs-up"
          @click.stop="emit('vote', 'up')"
        />
        <UButton
          color="error"
          variant="ghost"
          size="sm"
          icon="i-lucide-thumbs-down"
          @click.stop="emit('vote', 'down')"
        />
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-chevron-right"
          @click.stop="emit('view')"
        />
      </div>
    </div>
  </div>
</template>
```

---

## Component: SocialVoteModal.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  profile: RankProfile | null
  voteType: 'up' | 'down'
}>()

const open = defineModel<boolean>('open')

const emit = defineEmits<{
  vote: [amount: bigint]
}>()

const walletStore = useWalletStore()
const { formatXPI, xpiToSats } = useAmount()
const { success, error } = useNotifications()

// State
const amountInput = ref('')
const sending = ref(false)

const amountSats = computed(() => {
  if (!amountInput.value) return 0n
  try {
    return xpiToSats(amountInput.value)
  } catch {
    return 0n
  }
})

const canVote = computed(() => {
  return amountSats.value > 0n && amountSats.value <= walletStore.balance.total
})

const presetAmounts = ['10', '50', '100', '500']

async function handleVote() {
  if (!props.profile || !canVote.value) return

  sending.value = true
  try {
    // Build and send RANK vote transaction
    const txid = await walletStore.sendRankVote(
      props.profile.platform,
      props.profile.profileId,
      amountSats.value,
      props.voteType === 'up',
    )

    success(
      props.voteType === 'up' ? 'Upvote Sent!' : 'Downvote Sent!',
      `You voted ${formatXPI(amountSats.value)} for ${
        props.profile.displayName
      }`,
    )

    emit('vote', amountSats.value)
    open.value = false
    amountInput.value = ''
  } catch (e) {
    error('Vote Failed', e.message)
  } finally {
    sending.value = false
  }
}

// Reset on open
watch(open, isOpen => {
  if (isOpen) {
    amountInput.value = ''
  }
})
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard v-if="profile">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              :name="
                voteType === 'up'
                  ? 'i-lucide-thumbs-up'
                  : 'i-lucide-thumbs-down'
              "
              :class="voteType === 'up' ? 'text-success' : 'text-error'"
              class="w-5 h-5"
            />
            <span class="font-semibold">
              {{ voteType === 'up' ? 'Upvote' : 'Downvote' }}
              {{ profile.displayName }}
            </span>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Profile Preview -->
          <div class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div
              class="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <img
                v-if="profile.avatarUrl"
                :src="profile.avatarUrl"
                class="w-full h-full rounded-full object-cover"
              />
              <UIcon v-else name="i-lucide-user" class="w-5 h-5" />
            </div>
            <div>
              <p class="font-medium">{{ profile.displayName }}</p>
              <p class="text-sm text-muted">{{ profile.platform }}</p>
            </div>
          </div>

          <!-- Amount Input -->
          <UFormField
            label="Vote Amount"
            :hint="`Available: ${formatXPI(walletStore.balance.total)}`"
          >
            <UInput
              v-model="amountInput"
              type="number"
              placeholder="0.00"
              size="lg"
            >
              <template #trailing>
                <span class="text-muted">XPI</span>
              </template>
            </UInput>
          </UFormField>

          <!-- Preset Amounts -->
          <div class="flex gap-2">
            <UButton
              v-for="preset in presetAmounts"
              :key="preset"
              size="sm"
              color="neutral"
              variant="outline"
              @click="amountInput = preset"
            >
              {{ preset }} XPI
            </UButton>
          </div>

          <!-- Info -->
          <UAlert
            :color="voteType === 'up' ? 'success' : 'error'"
            :icon="
              voteType === 'up' ? 'i-lucide-info' : 'i-lucide-alert-triangle'
            "
          >
            <template #description>
              <span v-if="voteType === 'up'">
                Your XPI will be burned to increase {{ profile.displayName }}'s
                rank.
              </span>
              <span v-else>
                Your XPI will be burned to decrease {{ profile.displayName }}'s
                rank.
              </span>
            </template>
          </UAlert>
        </div>

        <template #footer>
          <div class="flex gap-3">
            <UButton
              class="flex-1"
              color="neutral"
              variant="outline"
              @click="open = false"
            >
              Cancel
            </UButton>
            <UButton
              class="flex-1"
              :color="voteType === 'up' ? 'success' : 'error'"
              :disabled="!canVote"
              :loading="sending"
              @click="handleVote"
            >
              {{ voteType === 'up' ? 'Upvote' : 'Downvote' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
```

---

## Component: SocialActivityItem.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  activity: RankActivity
  showProfile?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const { formatXPI } = useAmount()
const { timeAgo } = useTime()
const { toFingerprint } = useAddress()
const contactStore = useContactStore()

const voterContact = computed(() =>
  contactStore.findByAddress(props.activity.voterAddress),
)

const isUpvote = computed(() => props.activity.isPositive)
</script>

<template>
  <div
    class="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
    @click="emit('click')"
  >
    <!-- Icon -->
    <div
      class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
      :class="
        isUpvote
          ? 'bg-success-100 dark:bg-success-900/30'
          : 'bg-error-100 dark:bg-error-900/30'
      "
    >
      <UIcon
        :name="isUpvote ? 'i-lucide-thumbs-up' : 'i-lucide-thumbs-down'"
        :class="isUpvote ? 'text-success' : 'text-error'"
        class="w-5 h-5"
      />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p class="text-sm">
        <span class="font-medium">
          {{ voterContact?.name || toFingerprint(activity.voterAddress) }}
        </span>
        <span class="text-muted">
          voted {{ isUpvote ? '+' : '-' }}{{ formatXPI(activity.amount) }} for
        </span>
        <NuxtLink
          v-if="showProfile"
          :to="`/social/${activity.platform}/${activity.profileId}`"
          class="font-medium hover:text-primary"
          @click.stop
        >
          @{{ activity.profileName }}
        </NuxtLink>
        <span v-else class="font-medium">@{{ activity.profileName }}</span>
      </p>
    </div>

    <!-- Time -->
    <div class="text-right flex-shrink-0">
      <p class="text-xs text-muted">{{ timeAgo(activity.timestamp) }}</p>
    </div>
  </div>
</template>
```

---

## Page: social/[platform]/[profileId].vue

```vue
<!-- pages/social/[platform]/[profileId].vue -->
<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Back Link -->
    <NuxtLink
      to="/social"
      class="text-sm text-muted hover:text-foreground flex items-center gap-1"
    >
      <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
      Back to Rankings
    </NuxtLink>

    <!-- Loading -->
    <AppLoadingState v-if="loading" message="Loading profile..." />

    <!-- Error -->
    <AppErrorState v-else-if="error" :message="error" @retry="fetchProfile" />

    <!-- Profile Detail -->
    <template v-else-if="profile">
      <!-- Hero Card -->
      <AppHeroCard gradient>
        <template #icon>
          <div
            class="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center mx-auto"
          >
            <img
              v-if="profile.avatarUrl"
              :src="profile.avatarUrl"
              :alt="profile.displayName"
              class="w-full h-full rounded-full object-cover"
            />
            <UIcon v-else :name="platformIcon" class="w-10 h-10 text-muted" />
          </div>
        </template>

        <h1 class="text-2xl font-bold mb-1">{{ profile.displayName }}</h1>
        <p class="text-muted mb-4">
          <UIcon :name="platformIcon" class="w-4 h-4 inline" />
          {{ profile.platform }}
        </p>

        <div class="text-4xl font-bold mb-2">
          {{ profile.rank.toFixed(1) }}
          <span class="text-lg text-muted">rank</span>
        </div>

        <template #actions>
          <div class="flex justify-center gap-3 mt-4">
            <UButton
              color="success"
              icon="i-lucide-thumbs-up"
              @click="openVoteModal('up')"
            >
              Upvote
            </UButton>
            <UButton
              color="error"
              variant="outline"
              icon="i-lucide-thumbs-down"
              @click="openVoteModal('down')"
            >
              Downvote
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-external-link"
              :href="profile.profileUrl"
              target="_blank"
            >
              View Profile
            </UButton>
          </div>
        </template>
      </AppHeroCard>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <UCard>
          <AppStatCard
            :value="profile.totalVotes.toLocaleString()"
            label="Total Votes"
            icon="i-lucide-vote"
          />
        </UCard>
        <UCard>
          <AppStatCard
            :value="formatXPI(profile.positiveVotes)"
            label="Upvotes"
            icon="i-lucide-thumbs-up"
          />
        </UCard>
        <UCard>
          <AppStatCard
            :value="formatXPI(profile.negativeVotes)"
            label="Downvotes"
            icon="i-lucide-thumbs-down"
          />
        </UCard>
        <UCard>
          <AppStatCard
            :value="`${positivePercent}%`"
            label="Positive"
            :trend="positivePercent >= 50 ? 'up' : 'down'"
          />
        </UCard>
      </div>

      <!-- Vote History -->
      <AppCard title="Recent Votes" icon="i-lucide-history" :no-padding="true">
        <div v-if="voteHistory.length" class="divide-y divide-default">
          <SocialActivityItem
            v-for="vote in voteHistory"
            :key="vote.txid"
            :activity="vote"
            @click="navigateToTx(vote.txid)"
          />
        </div>
        <AppEmptyState
          v-else
          icon="i-lucide-history"
          title="No votes yet"
          description="Be the first to vote on this profile"
        />

        <div v-if="hasMoreVotes" class="p-4 text-center">
          <UButton
            color="neutral"
            variant="ghost"
            :loading="loadingMore"
            @click="loadMoreVotes"
          >
            Load More
          </UButton>
        </div>
      </AppCard>
    </template>

    <!-- Vote Modal -->
    <SocialVoteModal
      v-model:open="voteModalOpen"
      :profile="profile"
      :vote-type="voteType"
      @vote="handleVote"
    />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { fetchProfile: fetchProfileApi, fetchProfileVotes } = useRank()
const { formatXPI } = useAmount()

const platform = computed(() => route.params.platform as string)
const profileId = computed(() => route.params.profileId as string)

// State
const loading = ref(true)
const error = ref<string | null>(null)
const profile = ref<RankProfile | null>(null)
const voteHistory = ref<RankActivity[]>([])
const hasMoreVotes = ref(false)
const loadingMore = ref(false)

// Vote modal
const voteModalOpen = ref(false)
const voteType = ref<'up' | 'down'>('up')

// Computed
const positivePercent = computed(() => {
  if (!profile.value) return 0
  const total = profile.value.positiveVotes + profile.value.negativeVotes
  if (total === 0n) return 0
  return Number((profile.value.positiveVotes * 100n) / total)
})

const platformIcon = computed(() => {
  const icons: Record<string, string> = {
    twitter: 'i-lucide-twitter',
    youtube: 'i-lucide-youtube',
    twitch: 'i-lucide-twitch',
    github: 'i-lucide-github',
  }
  return icons[platform.value] || 'i-lucide-user'
})

// Fetch
async function fetchProfile() {
  loading.value = true
  error.value = null

  try {
    profile.value = await fetchProfileApi(platform.value, profileId.value)

    const votesResult = await fetchProfileVotes(
      platform.value,
      profileId.value,
      0,
      20,
    )
    voteHistory.value = votesResult.votes
    hasMoreVotes.value = votesResult.hasMore
  } catch (e) {
    error.value = e.message || 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

async function loadMoreVotes() {
  loadingMore.value = true
  try {
    const page = Math.floor(voteHistory.value.length / 20)
    const votesResult = await fetchProfileVotes(
      platform.value,
      profileId.value,
      page,
      20,
    )
    voteHistory.value.push(...votesResult.votes)
    hasMoreVotes.value = votesResult.hasMore
  } finally {
    loadingMore.value = false
  }
}

function openVoteModal(type: 'up' | 'down') {
  voteType.value = type
  voteModalOpen.value = true
}

function navigateToTx(txid: string) {
  router.push(`/explorer/tx/${txid}`)
}

async function handleVote() {
  // Refresh profile data
  await fetchProfile()
}

// Initial fetch
onMounted(fetchProfile)
</script>
```

---

_Next: [09_P2P_SYSTEM.md](./09_P2P_SYSTEM.md)_
