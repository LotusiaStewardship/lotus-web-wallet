# Phase 8: Social/RANK Voting

## Overview

The social pages need inline voting capabilities, profile search, and a clear voting flow. This phase makes RANK voting a first-class feature with proper UX.

**Priority**: P2 (Medium)
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 7 (Explorer), existing social components

---

## Goals

1. Social home with trending profiles and activity
2. Profile search functionality
3. Inline voting on profile cards
4. Vote modal with amount selection
5. Profile detail page with vote action
6. Vote history and receipts

---

## 1. Social Index Page

### File: `pages/explore/social/index.vue`

```vue
<script setup lang="ts">
import { useRankApi } from '~/composables/useRankApi'
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Social',
})

const { getTrendingProfiles, getRecentActivity, searchProfiles } = useRankApi()
const walletStore = useWalletStore()

// Search
const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)

// Data
const trendingProfiles = ref([])
const recentActivity = ref([])
const loading = ref(true)

// Vote modal
const showVoteModal = ref(false)
const selectedProfile = ref(null)

// Load data
onMounted(async () => {
  try {
    const [trending, activity] = await Promise.all([
      getTrendingProfiles(),
      getRecentActivity(),
    ])
    trendingProfiles.value = trending
    recentActivity.value = activity
  } catch (e) {
    console.error('Failed to load social data:', e)
  } finally {
    loading.value = false
  }
})

// Search handler
async function handleSearch() {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  searching.value = true
  try {
    searchResults.value = await searchProfiles(searchQuery.value)
  } finally {
    searching.value = false
  }
}

// Debounced search
let searchTimeout: NodeJS.Timeout
watch(searchQuery, query => {
  clearTimeout(searchTimeout)
  if (query.trim()) {
    searchTimeout = setTimeout(handleSearch, 300)
  } else {
    searchResults.value = []
  }
})

// Open vote modal
function openVoteModal(profile: any) {
  selectedProfile.value = profile
  showVoteModal.value = true
}

// Platform icons
const platformIcons = {
  twitter: 'i-lucide-twitter',
  youtube: 'i-lucide-youtube',
  twitch: 'i-lucide-twitch',
  github: 'i-lucide-github',
}
</script>

<template>
  <div class="space-y-6">
    <AppHeroCard
      icon="i-lucide-thumbs-up"
      title="Social"
      subtitle="Vote on content creators with RANK"
    />

    <!-- Search -->
    <AppCard>
      <div class="relative">
        <UIcon
          name="i-lucide-search"
          class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search profiles by username or platform..."
          class="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <UIcon
          v-if="searching"
          name="i-lucide-loader-2"
          class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin"
        />
      </div>

      <!-- Search Results -->
      <div v-if="searchResults.length > 0" class="mt-4 space-y-2">
        <h3 class="text-sm font-semibold text-gray-500">Search Results</h3>
        <div class="grid gap-3 md:grid-cols-2">
          <SocialProfileCard
            v-for="profile in searchResults"
            :key="`${profile.platform}-${profile.profileId}`"
            :profile="profile"
            @vote="openVoteModal(profile)"
          />
        </div>
      </div>

      <!-- No Results -->
      <div
        v-else-if="searchQuery && !searching"
        class="mt-4 text-center py-4 text-gray-500"
      >
        No profiles found for "{{ searchQuery }}"
      </div>
    </AppCard>

    <!-- Loading -->
    <AppLoadingState v-if="loading" message="Loading social data..." />

    <template v-else>
      <!-- Trending Profiles -->
      <AppCard title="Trending" icon="i-lucide-trending-up">
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SocialProfileCard
            v-for="profile in trendingProfiles"
            :key="`${profile.platform}-${profile.profileId}`"
            :profile="profile"
            show-rank
            @vote="openVoteModal(profile)"
          />
        </div>
      </AppCard>

      <!-- Recent Activity -->
      <AppCard title="Recent Votes" icon="i-lucide-activity">
        <div v-if="recentActivity.length > 0" class="space-y-3">
          <SocialActivityItem
            v-for="activity in recentActivity"
            :key="activity.txid"
            :activity="activity"
          />
        </div>
        <AppEmptyState
          v-else
          icon="i-lucide-inbox"
          title="No recent activity"
          description="Vote activity will appear here"
        />
      </AppCard>
    </template>

    <!-- Vote Modal -->
    <VoteModal v-model:open="showVoteModal" :profile="selectedProfile" />
  </div>
</template>
```

---

## 2. Profile Detail Page

### File: `pages/explore/social/[platform]/[profileId].vue`

```vue
<script setup lang="ts">
import { useRankApi } from '~/composables/useRankApi'
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Profile',
})

const route = useRoute()
const { getProfile, getProfileVoters, getProfileHistory } = useRankApi()
const walletStore = useWalletStore()

const platform = computed(() => route.params.platform as string)
const profileId = computed(() => route.params.profileId as string)

// Data
const profile = ref(null)
const voters = ref([])
const history = ref([])
const loading = ref(true)
const error = ref('')

// Vote modal
const showVoteModal = ref(false)

// Load data
onMounted(async () => {
  try {
    const [profileData, voterData, historyData] = await Promise.all([
      getProfile(platform.value, profileId.value),
      getProfileVoters(platform.value, profileId.value),
      getProfileHistory(platform.value, profileId.value),
    ])
    profile.value = profileData
    voters.value = voterData
    history.value = historyData
  } catch (e) {
    error.value = 'Profile not found'
  } finally {
    loading.value = false
  }
})

// Platform display name
const platformName = computed(() => {
  const names = {
    twitter: 'Twitter/X',
    youtube: 'YouTube',
    twitch: 'Twitch',
    github: 'GitHub',
  }
  return names[platform.value] || platform.value
})

// External profile URL
const externalUrl = computed(() => {
  if (!profile.value) return null
  const urls = {
    twitter: `https://twitter.com/${profileId.value}`,
    youtube: `https://youtube.com/@${profileId.value}`,
    twitch: `https://twitch.tv/${profileId.value}`,
    github: `https://github.com/${profileId.value}`,
  }
  return urls[platform.value]
})
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <AppLoadingState v-if="loading" message="Loading profile..." />

    <!-- Error -->
    <AppErrorState v-else-if="error" :message="error" @retry="$router.go(0)" />

    <template v-else-if="profile">
      <!-- Profile Header -->
      <div
        class="bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-600 dark:to-primary-900 rounded-2xl p-6 text-white"
      >
        <div class="flex items-start gap-4">
          <!-- Avatar -->
          <img
            v-if="profile.avatar"
            :src="profile.avatar"
            :alt="profile.name"
            class="w-20 h-20 rounded-full border-4 border-white/20"
          />
          <div
            v-else
            class="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center"
          >
            <UIcon name="i-lucide-user" class="w-10 h-10" />
          </div>

          <!-- Info -->
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold">
                {{ profile.name || profileId }}
              </h1>
              <UBadge color="white" variant="soft">{{ platformName }}</UBadge>
            </div>
            <div class="text-primary-200 mt-1">@{{ profileId }}</div>
            <a
              v-if="externalUrl"
              :href="externalUrl"
              target="_blank"
              class="inline-flex items-center gap-1 text-sm text-primary-200 hover:text-white mt-2"
            >
              <UIcon name="i-lucide-external-link" class="w-4 h-4" />
              View on {{ platformName }}
            </a>
          </div>

          <!-- Vote Button -->
          <UButton color="white" size="lg" @click="showVoteModal = true">
            <UIcon name="i-lucide-thumbs-up" class="w-5 h-5 mr-2" />
            Vote
          </UButton>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
          <div class="text-center">
            <div class="text-3xl font-bold">{{ profile.rank || '—' }}</div>
            <div class="text-sm text-primary-200">RANK Score</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold">{{ profile.upvotes || 0 }}</div>
            <div class="text-sm text-primary-200">Upvotes</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold">{{ profile.downvotes || 0 }}</div>
            <div class="text-sm text-primary-200">Downvotes</div>
          </div>
        </div>
      </div>

      <!-- Top Voters -->
      <AppCard title="Top Voters" icon="i-lucide-users">
        <div v-if="voters.length > 0" class="space-y-3">
          <div
            v-for="(voter, i) in voters.slice(0, 10)"
            :key="voter.address"
            class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div
              class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary"
            >
              {{ i + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-mono text-sm truncate">
                {{ voter.address.slice(0, 12) }}...{{ voter.address.slice(-6) }}
              </div>
            </div>
            <div class="font-mono font-medium">
              {{ (voter.amount / 1e6).toFixed(2) }} XPI
            </div>
          </div>
        </div>
        <AppEmptyState
          v-else
          icon="i-lucide-users"
          title="No voters yet"
          description="Be the first to vote on this profile!"
        >
          <template #action>
            <UButton color="primary" @click="showVoteModal = true">
              Vote Now
            </UButton>
          </template>
        </AppEmptyState>
      </AppCard>

      <!-- Vote History -->
      <AppCard title="Vote History" icon="i-lucide-history">
        <div v-if="history.length > 0" class="space-y-2">
          <SocialActivityItem
            v-for="vote in history"
            :key="vote.txid"
            :activity="vote"
          />
        </div>
        <AppEmptyState
          v-else
          icon="i-lucide-inbox"
          title="No vote history"
          description="Vote history will appear here"
        />
      </AppCard>
    </template>

    <!-- Vote Modal -->
    <VoteModal v-model:open="showVoteModal" :profile="profile" />
  </div>
</template>
```

---

## 3. Vote Modal

### File: `components/social/VoteModal.vue`

```vue
<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { useRankApi } from '~/composables/useRankApi'

const props = defineProps<{
  profile: any
}>()

const open = defineModel<boolean>('open', { default: false })

const walletStore = useWalletStore()
const { submitVote } = useRankApi()

// Vote type
const voteType = ref<'upvote' | 'downvote'>('upvote')

// Amount
const amount = ref('10')
const customAmount = ref(false)

// Preset amounts
const presetAmounts = ['10', '50', '100', '500']

// Loading state
const submitting = ref(false)
const error = ref('')
const success = ref(false)
const successTxid = ref('')

// Amount in sats
const amountSats = computed(() => {
  const num = parseFloat(amount.value)
  if (isNaN(num) || num <= 0) return 0
  return Math.floor(num * 1e6)
})

// Can vote?
const canVote = computed(() => {
  return amountSats.value > 0 && amountSats.value <= walletStore.balanceSats
})

// Submit vote
async function submitVoteAction() {
  if (!canVote.value || submitting.value) return

  submitting.value = true
  error.value = ''

  try {
    const txid = await submitVote({
      platform: props.profile.platform,
      profileId: props.profile.profileId,
      type: voteType.value,
      amount: amountSats.value,
    })

    successTxid.value = txid
    success.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to submit vote'
  } finally {
    submitting.value = false
  }
}

// Reset on close
watch(open, isOpen => {
  if (!isOpen) {
    voteType.value = 'upvote'
    amount.value = '10'
    customAmount.value = false
    error.value = ''
    success.value = false
    successTxid.value = ''
  }
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-md' }">
    <div class="p-6">
      <!-- Success State -->
      <div v-if="success" class="text-center">
        <div
          class="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4"
        >
          <UIcon
            name="i-lucide-check-circle"
            class="w-10 h-10 text-green-600"
          />
        </div>
        <h2 class="text-xl font-bold mb-2">Vote Submitted!</h2>
        <p class="text-gray-500 mb-6">
          Your {{ voteType }} of {{ amount }} XPI has been recorded.
        </p>
        <div class="flex gap-3">
          <UButton
            color="neutral"
            variant="soft"
            class="flex-1"
            :to="`/explore/explorer/tx/${successTxid}`"
          >
            View Transaction
          </UButton>
          <UButton color="primary" class="flex-1" @click="open = false">
            Done
          </UButton>
        </div>
      </div>

      <!-- Vote Form -->
      <template v-else>
        <h2 class="text-xl font-bold mb-2">Vote on Profile</h2>
        <p class="text-gray-500 mb-6">
          Support <strong>@{{ profile?.profileId }}</strong> with a RANK vote
        </p>

        <!-- Vote Type -->
        <div class="mb-6">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Vote Type
          </label>
          <div class="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
            <button
              class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
              :class="
                voteType === 'upvote'
                  ? 'bg-green-500 text-white shadow'
                  : 'text-gray-500 hover:text-gray-700'
              "
              @click="voteType = 'upvote'"
            >
              <UIcon name="i-lucide-thumbs-up" class="w-4 h-4" />
              Upvote
            </button>
            <button
              class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
              :class="
                voteType === 'downvote'
                  ? 'bg-red-500 text-white shadow'
                  : 'text-gray-500 hover:text-gray-700'
              "
              @click="voteType = 'downvote'"
            >
              <UIcon name="i-lucide-thumbs-down" class="w-4 h-4" />
              Downvote
            </button>
          </div>
        </div>

        <!-- Amount -->
        <div class="mb-6">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Amount (XPI)
          </label>

          <!-- Preset Amounts -->
          <div v-if="!customAmount" class="grid grid-cols-4 gap-2 mb-2">
            <button
              v-for="preset in presetAmounts"
              :key="preset"
              class="py-2 px-3 rounded-lg text-sm font-medium transition-colors"
              :class="
                amount === preset
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'
              "
              @click="amount = preset"
            >
              {{ preset }}
            </button>
          </div>

          <!-- Custom Amount -->
          <div v-if="customAmount" class="relative">
            <input
              v-model="amount"
              type="number"
              step="0.000001"
              min="0"
              placeholder="Enter amount"
              class="w-full px-4 py-2 pr-16 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
            />
            <span
              class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            >
              XPI
            </span>
          </div>

          <!-- Toggle Custom -->
          <button
            class="text-sm text-primary hover:underline mt-2"
            @click="customAmount = !customAmount"
          >
            {{ customAmount ? 'Use preset amounts' : 'Enter custom amount' }}
          </button>

          <!-- Balance -->
          <div class="text-sm text-gray-500 mt-2">
            Available: {{ walletStore.formattedBalance }} XPI
          </div>
        </div>

        <!-- Error -->
        <UAlert
          v-if="error"
          color="error"
          icon="i-lucide-alert-circle"
          class="mb-4"
        >
          {{ error }}
        </UAlert>

        <!-- Actions -->
        <div class="flex gap-3">
          <UButton
            color="neutral"
            variant="soft"
            class="flex-1"
            @click="open = false"
          >
            Cancel
          </UButton>
          <UButton
            :color="voteType === 'upvote' ? 'success' : 'error'"
            class="flex-1"
            :disabled="!canVote"
            :loading="submitting"
            @click="submitVoteAction"
          >
            <UIcon
              :name="
                voteType === 'upvote'
                  ? 'i-lucide-thumbs-up'
                  : 'i-lucide-thumbs-down'
              "
              class="w-4 h-4 mr-2"
            />
            {{ voteType === 'upvote' ? 'Upvote' : 'Downvote' }}
          </UButton>
        </div>
      </template>
    </div>
  </UModal>
</template>
```

---

## 4. Social Profile Card

### File: `components/social/SocialProfileCard.vue`

```vue
<script setup lang="ts">
const props = defineProps<{
  profile: any
  showRank?: boolean
}>()

const emit = defineEmits<{
  vote: []
}>()

const router = useRouter()

// Platform icon
const platformIcon = computed(() => {
  const icons = {
    twitter: 'i-lucide-twitter',
    youtube: 'i-lucide-youtube',
    twitch: 'i-lucide-twitch',
    github: 'i-lucide-github',
  }
  return icons[props.profile.platform] || 'i-lucide-globe'
})

// Navigate to profile
function viewProfile() {
  router.push(
    `/explore/social/${props.profile.platform}/${props.profile.profileId}`,
  )
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
    @click="viewProfile"
  >
    <div class="flex items-start gap-3">
      <!-- Avatar -->
      <img
        v-if="profile.avatar"
        :src="profile.avatar"
        :alt="profile.name"
        class="w-12 h-12 rounded-full"
      />
      <div
        v-else
        class="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
      >
        <UIcon :name="platformIcon" class="w-6 h-6 text-gray-500" />
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="font-semibold truncate">
            {{ profile.name || profile.profileId }}
          </h3>
          <UIcon :name="platformIcon" class="w-4 h-4 text-gray-400 shrink-0" />
        </div>
        <div class="text-sm text-gray-500">@{{ profile.profileId }}</div>
      </div>

      <!-- Rank Badge -->
      <div v-if="showRank && profile.rank" class="text-right">
        <div class="text-lg font-bold text-primary">{{ profile.rank }}</div>
        <div class="text-xs text-gray-500">RANK</div>
      </div>
    </div>

    <!-- Vote Button -->
    <div class="mt-4 flex gap-2">
      <UButton
        color="success"
        variant="soft"
        size="sm"
        class="flex-1"
        @click.stop="emit('vote')"
      >
        <UIcon name="i-lucide-thumbs-up" class="w-4 h-4 mr-1" />
        {{ profile.upvotes || 0 }}
      </UButton>
      <UButton
        color="error"
        variant="soft"
        size="sm"
        class="flex-1"
        @click.stop="emit('vote')"
      >
        <UIcon name="i-lucide-thumbs-down" class="w-4 h-4 mr-1" />
        {{ profile.downvotes || 0 }}
      </UButton>
    </div>
  </div>
</template>
```

---

## 5. Implementation Checklist

### Pages

- [ ] Create `pages/explore/social/index.vue`
- [ ] Create `pages/explore/social/[platform]/[profileId].vue`

### Components

- [ ] Create `components/social/VoteModal.vue`
- [ ] Create/update `components/social/SocialProfileCard.vue`
- [ ] Create/update `components/social/SocialActivityItem.vue`

### Composables

- [ ] Update `useRankApi` with all needed methods
- [ ] Add `submitVote` method

### Features

- [ ] Profile search
- [ ] Trending profiles
- [ ] Inline voting on cards
- [ ] Vote modal with amount selection
- [ ] Profile detail page
- [ ] Vote history
- [ ] External profile links

### Testing

- [ ] Test profile search
- [ ] Test upvote flow
- [ ] Test downvote flow
- [ ] Test vote with custom amount
- [ ] Test insufficient balance handling

---

## Next Phase

Once this phase is complete, proceed to [09_P2P_NETWORK.md](./09_P2P_NETWORK.md) to implement the P2P network pages.
