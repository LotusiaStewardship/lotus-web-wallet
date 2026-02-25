<script setup lang="ts">
/**
 * Profile Detail Page
 *
 * Shows full ranking data for a specific profile including:
 * - Centered avatar hero with platform badge
 * - Controversy details (R2) with explanation when applicable
 * - Ranking score and sentiment breakdown (R1 gated)
 * - Vote button for authenticated users
 * - Ranked posts list
 * - 1st-class RNKC comment section
 *
 * Strategy compliance:
 *   R1: Vote-to-Reveal — sentiment data hidden until user votes
 *   R2: Controversial flag — promoted to body section with explanation
 *   R3: Autonomy-supportive framing — burn shown as informational
 *   R4: Cost symmetry — equal visual weight for up/down
 *   R5: Temporal Diversity — sentiment over time (via SentimentTimeline)
 *   R6: Burn-weighted comment sorting (via CommentThread)
 *   R38: Curation language — "Endorsed/Flagged" not "upvoted/downvoted"
 */
import type { ScriptChunkPlatformUTF8 } from 'xpi-ts/lib/rank'
import type { ProfileData, ProfilePostsResponse, ProfileRankTransaction } from '~/composables/useRankApi'
import { PlatformIcon, PlatformURL } from '~/composables/useRankApi'
import { formatXPI } from '~/utils/formatting'
import { isControversial as checkControversial, controversyScore, bucketVoteCount } from '~/utils/feed'
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Profile',
})

const route = useRoute()
const walletStore = useWalletStore()
const contactsStore = useContactsStore()
const { getProfileRanking, getProfilePosts, getPostRanking, getProfileRankTransactions } = useRankApi()
const { truncateAddress } = useAddress()
const { getAvatar } = useAvatars()
const { pollAfterVote } = usePostVotePolling()
const { useResolve } = useFeedIdentity()
const { openSendModal, openAddContactModal } = useOverlays()
const toast = useToast()

const platform = computed(() => route.params.platform as string)
const profileId = computed(() => route.params.profileId as string)

/**
 * Resolved identity for this profile.
 * For Lotusia: converts scriptPayload → address → contact name
 * For external platforms: uses profileId as-is
 */
const identity = useResolve(platform, profileId)

const profile = ref<ProfileData | null>(null)
const posts = ref<ProfilePostsResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const avatarUrl = ref<string | null>(null)
const avatarError = ref(false)
const profileTab = ref<'posts' | 'comments'>('posts')

// R1 Vote-to-Reveal: derived from voters array returned by the backend
const hasVoted = ref(false)

// R5: Temporal Diversity — profile vote timeline
const timelineTransactions = ref<ProfileRankTransaction[]>([])
const timelineLoading = ref(false)
const timelineFetched = ref(false)

async function fetchTimeline() {
  if (timelineFetched.value) return
  timelineLoading.value = true
  try {
    const result = await getProfileRankTransactions(
      platform.value as any,
      profileId.value,
      1,
      40,
      30,
    )
    timelineTransactions.value = result?.votes ?? []
    timelineFetched.value = true
  } finally {
    timelineLoading.value = false
  }
}
const bucketedVotes = computed(() => bucketVoteCount(totalVotes.value))

const platformIcon = computed(() => PlatformIcon[platform.value] || 'i-lucide-globe')
const platformLabel = computed(() => platform.value.charAt(0).toUpperCase() + platform.value.slice(1))

/**
 * Profile display name: contact name > "You" > truncated address > truncated profileId
 */
const profileDisplayName = computed(() => identity.value.displayName)

/**
 * Profile subtitle: shows Lotus address for Lotusia profiles, platform for external
 */
const profileSubtitle = computed(() => {
  if (platform.value === 'lotusia' && identity.value.lotusAddress) {
    return truncateAddress(identity.value.lotusAddress)
  }
  return platformLabel.value
})

/**
 * Check if this Lotusia profile is already in contacts.
 * Only applicable for Lotusia platform.
 */
const existingContact = computed(() => {
  if (platform.value !== 'lotusia' || !identity.value.lotusAddress) return null
  return contactsStore.findByAddress(identity.value.lotusAddress)
})

/**
 * Whether to show people-first action buttons (Send, Add to People).
 * Only shown for Lotusia profiles with valid addresses that aren't the user's own profile.
 * This enables social interactions like sending XPI or adding the profile to contacts.
 */
const showPeopleActions = computed(() => {
  return platform.value === 'lotusia' && !!identity.value.lotusAddress && !identity.value.isOwn
})

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

const isControversial = computed(() => {
  if (!profile.value) return false
  return checkControversial(profile.value.satsPositive, profile.value.satsNegative, totalVotes.value)
})

// R2: Controversy score for detailed display (0-1 scale)
const controvScore = computed(() => {
  if (!profile.value) return 0
  return controversyScore(profile.value.satsPositive, profile.value.satsNegative)
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

// R38: Aggregate sentiment label
const sentimentLabel = computed(() => {
  if (isPositive.value) return 'Endorsed'
  if (isNegative.value) return 'Flagged'
  return 'Noted'
})

const sentimentColor = computed(() => {
  if (isPositive.value) return 'success'
  if (isNegative.value) return 'error'
  return 'neutral'
})

// Number of unique voters (from voters array if available)
const uniqueVoters = computed(() => {
  if (!profile.value?.voters) return 0
  return profile.value.voters.length
})

// Comment count from profile data
const commentCount = computed(() => {
  if (!profile.value?.comments) return 0
  return profile.value.comments.length
})

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    // Wait for wallet to be initialized before fetching data that requires authentication
    await walletStore.waitForInitialization()

    // Fetch profile and posts first (don't require wallet)
    const [profileData, postsData, avatar] = await Promise.all([
      getProfileRanking(platform.value as ScriptChunkPlatformUTF8, profileId.value, walletStore.scriptPayload),
      getProfilePosts(platform.value as ScriptChunkPlatformUTF8, profileId.value, walletStore.scriptPayload),
      getAvatar(platform.value, profileId.value),
    ])
    profile.value = profileData
    posts.value = postsData
    avatarUrl.value = avatar.src

    // R1: Determine hasVoted for this profile - requires wallet to be initialized
    // Backend API updated to include profileMeta via getProfileRanking
    // Also check if user is viewing their own profile (RNKC: own content is revealed)
    // For Lotusia profiles, profileId is the scriptPayload
    const isOwnProfile = identity.value.isOwn
    hasVoted.value = profileData?.profileMeta?.hasWalletUpvoted || profileData?.profileMeta?.hasWalletDownvoted || isOwnProfile

    // R5: Fetch timeline after reveal state is known
    if (hasVoted.value) {
      fetchTimeline()
    }

  } catch (err: any) {
    error.value = err?.message || 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

async function handleVoted(txid: string, sentiment?: 'positive' | 'negative') {
  // R1: Reveal sentiment after voting
  hasVoted.value = true
  // R5: Fetch timeline on first reveal
  fetchTimeline()

  // Optimistic update: increment local vote count immediately
  if (profile.value && sentiment) {
    if (sentiment === 'positive') {
      profile.value = { ...profile.value, votesPositive: profile.value.votesPositive + 1 }
    } else {
      profile.value = { ...profile.value, votesNegative: profile.value.votesNegative + 1 }
    }
  }

  // Poll API to verify vote was indexed and get updated counts
  // This handles blockchain propagation delays (5-30s typical)
  if (sentiment) {
    const result = await pollAfterVote({
      platform: platform.value as ScriptChunkPlatformUTF8,
      profileId: profileId.value,
      txid,
      sentiment,
      scriptPayload: walletStore.scriptPayload,
    })

    // Update with confirmed data from API
    if (result.confirmed && profile.value) {
      profile.value = {
        ...profile.value,
        votesPositive: result.votesPositive ?? profile.value.votesPositive,
        votesNegative: result.votesNegative ?? profile.value.votesNegative,
        ranking: result.ranking ?? profile.value.ranking,
      }
    } else if (!result.confirmed) {
      console.warn('[ProfilePage] Vote not confirmed after polling, keeping optimistic update')
    }
  }
}

/**
 * Open Send modal with this profile as recipient.
 * Only available for Lotusia profiles.
 */
async function handleSend(): Promise<void> {
  if (!identity.value.lotusAddress) {
    toast.add({
      title: 'Cannot send',
      description: 'No valid address for this profile',
      color: 'error',
    })
    return
  }

  await openSendModal({
    initialRecipient: identity.value.lotusAddress,
  })
}

/**
 * Add this Lotusia profile to contacts.
 * Opens the Add Contact modal with pre-filled address.
 */
async function handleAddToContacts(): Promise<void> {
  if (!identity.value.lotusAddress) return

  await openAddContactModal({
    initialAddress: identity.value.lotusAddress,
    initialName: identity.value.displayName !== identity.value.lotusAddress
      ? identity.value.displayName
      : undefined,
  })
}

/**
 * Navigate to the existing contact detail page.
 */
function viewContact(): void {
  if (existingContact.value) {
    navigateTo(`/people/${existingContact.value.id}`)
  }
}

/**
 * Copy Lotus address to clipboard.
 * Only available for Lotusia profiles.
 */
function copyAddress(): void {
  if (!identity.value.lotusAddress) return

  navigator.clipboard.writeText(identity.value.lotusAddress)
  toast.add({
    title: 'Address copied!',
    description: 'Lotus address copied to clipboard',
    color: 'success',
  })
}

/**
 * Toggle favorite status for this contact.
 * Only available if profile is already in contacts.
 */
function toggleFavorite(): void {
  if (!existingContact.value) return

  const newStatus = contactsStore.toggleFavorite(existingContact.value.id)
  toast.add({
    title: newStatus ? 'Added to favorites' : 'Removed from favorites',
    color: 'success',
  })
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-4">
    <!-- Back Button -->
    <UButton variant="link" color="neutral" size="sm" icon="i-lucide-arrow-left" to="/feed">
      Back to Feed
    </UButton>

    <!-- Loading -->
    <template v-if="loading">
      <UCard>
        <div class="flex flex-col items-center gap-3 py-4">
          <!-- Avatar placeholder -->
          <USkeleton class="h-22 w-22 rounded-full" />
          <!-- Profile name placeholder -->
          <USkeleton class="h-6 w-1/3" />
          <!-- Platform/handle placeholder -->
          <USkeleton class="h-4 w-1/4" />
        </div>
        <!-- Stats/content area placeholder -->
        <USkeleton class="h-20 w-full mt-4" />
      </UCard>
    </template>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-12 px-2">
      <UIcon name="i-lucide-alert-circle" class="w-12 h-12 mx-auto mb-3 text-gray-400" />
      <p class="text-gray-500">{{ error }}</p>
      <UButton variant="link" size="sm" class="mt-3" @click="fetchData">Try again</UButton>
    </div>

    <!-- Profile Detail -->
    <template v-else-if="profile">
      <!-- Profile Hero Card -->
      <UCard>
        <!-- Centered Avatar Hero -->
        <div class="flex flex-col items-center text-center pt-2 pb-4">
          <div class="relative mb-3">
            <UAvatar :src="avatarUrl || undefined" :alt="profileDisplayName" :text="identity.initials" class="w-22 h-22"
              :class="{ 'ring-2 ring-primary': identity.isOwn }" />
            <div
              class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
              <UIcon :name="platformIcon" class="w-5 h-5 text-gray-500 dark:text-gray-100" />
            </div>
          </div>

          <!-- Profile Name + External Link -->
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold" :class="{ 'text-primary': identity.isOwn }"
              :title="identity.lotusAddress || profileId">
              {{ profileDisplayName }}
            </h1>
            <!-- Address with copy button (Lotusia only) -->
            <UButton v-if="platform === 'lotusia' && identity.lotusAddress" variant="ghost" size="xs"
              icon="i-lucide-copy" @click="copyAddress" />
            <!-- Favorite toggle (only for existing contacts) -->
            <UButton v-if="existingContact" variant="ghost" size="xs"
              :icon="existingContact.isFavorite ? 'i-lucide-star' : 'i-lucide-star'"
              :class="existingContact.isFavorite ? 'text-warning' : 'text-gray-400'" @click="toggleFavorite" />
            <!-- External link -->
            <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener"
              class="text-gray-400 hover:text-primary transition-colors">
              <UIcon name="i-lucide-external-link" class="w-4 h-4" />
            </a>
          </div>

          <!-- People-First Actions (Lotusia profiles only) -->
          <div v-if="showPeopleActions" class="w-auto pt-3 border-t border-gray-100 dark:border-gray-800">
            <div class="flex gap-2">
              <UButton color="primary" icon="i-lucide-send" class="flex-1" :disabled="!walletStore.initialized"
                @click="handleSend">
                Send
              </UButton>
              <UButton v-if="!existingContact" variant="outline" icon="i-lucide-user-plus" class="flex-1"
                @click="handleAddToContacts">
                Add
              </UButton>
              <UButton v-else variant="outline" icon="i-lucide-user" class="flex-1" @click="viewContact">
                View Contact
              </UButton>
            </div>
            <p v-if="!walletStore.initialized" class="text-xs text-gray-400 mt-2 text-center">
              Create or import a wallet to send
            </p>
          </div>

          <!-- Platform label (external platforms) -->
          <p v-if="platform !== 'lotusia'" class="text-sm text-gray-500 mt-0.5"> {{ profileSubtitle }}</p>

          <!-- R1: Post-vote sentiment badge (R38 curation language) -->
          <div v-if="hasVoted" class="mt-2">
            <UBadge :color="sentimentColor" size="sm" variant="subtle">
              {{ sentimentLabel }}
            </UBadge>
          </div>
        </div>

        <!-- R2: Controversial Callout (visible regardless of vote status — it's a binary flag, not directional) -->
        <div v-if="isControversial"
          class="mx-0 mb-4 p-3 rounded-lg bg-warning-50 dark:bg-warning-900/10 border border-warning-200 dark:border-warning-800/30">
          <div class="flex items-start gap-2.5">
            <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm text-warning-700 dark:text-warning-400">Controversial Profile</div>
              <p class="text-xs text-warning-600 dark:text-warning-500 mt-0.5">
                This profile has significant engagement from both supporters and critics.
                <!-- R1: Only show the detailed ratio post-vote to avoid leaking directional sentiment -->
                <template v-if="hasVoted">
                  The minority position represents {{ Math.round(controvScore * 100) }}% of the majority burn weight,
                  indicating genuine disagreement rather than one-sided consensus.
                </template>
                <template v-else>
                  Vote to see the full sentiment breakdown.
                </template>
              </p>
            </div>
          </div>
        </div>

        <!-- R1 Vote-to-Reveal: Pre-vote blind state -->
        <Transition name="fade" mode="out-in">
          <div v-if="!hasVoted" key="blind" class="text-center py-5 mb-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <UIcon name="i-lucide-eye-off" class="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <div class="text-lg font-medium text-gray-600 dark:text-gray-400">{{ bucketedVotes }}</div>
            <p class="text-sm text-gray-400 mt-1">Vote to reveal community sentiment</p>
          </div>

          <!-- R1 Vote-to-Reveal: Post-vote revealed state -->
          <div v-else key="revealed" class="space-y-3 mb-4">
            <!-- Ranking Score (Hero) -->
            <div class="text-center py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div class="text-3xl font-mono font-bold"
                :class="isPositive ? 'text-success-500' : isNegative ? 'text-error-500' : 'text-gray-500'">
                {{ isPositive ? '+' : '' }}{{ rankingDisplay }}
              </div>
              <div class="text-sm text-gray-500">XPI sentiment</div>
            </div>

            <!-- Sentiment Breakdown -->
            <div class="grid grid-cols-3 gap-2">
              <div class="text-center p-2.5 rounded-lg bg-success-50 dark:bg-success-900/10">
                <div class="text-base font-bold text-success-600 dark:text-success-400">{{ profile.votesPositive }}
                </div>
                <div class="text-[11px] text-success-500">Endorsed</div>
                <div class="text-[11px] text-gray-500 mt-0.5">{{ satsPositiveDisplay }} XPI</div>
              </div>
              <div class="text-center p-2.5 rounded-lg bg-error-50 dark:bg-error-900/10">
                <div class="text-base font-bold text-error-600 dark:text-error-400">{{ profile.votesNegative }}</div>
                <div class="text-[11px] text-error-500">Flagged</div>
                <div class="text-[11px] text-gray-500 mt-0.5">{{ satsNegativeDisplay }} XPI</div>
              </div>
              <div class="text-center p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div class="text-base font-bold">{{ totalVotes }}</div>
                <div class="text-[11px] text-gray-500">Total Votes</div>
                <div class="text-[11px] text-gray-500 mt-0.5">{{ sentimentRatio }}% positive</div>
              </div>
            </div>

            <!-- Sentiment Bar -->
            <div class="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all"
                :class="sentimentRatio >= 50 ? 'bg-success-500' : 'bg-error-500'"
                :style="{ width: `${sentimentRatio}%` }" />
            </div>

            <!-- R5: Temporal Diversity — sentiment over time -->
            <ClientOnly>
              <FeedSentimentTimeline :transactions="timelineTransactions" :loading="timelineLoading" />
            </ClientOnly>

            <!-- Additional Stats Row -->
            <div v-if="uniqueVoters > 0" class="flex items-center justify-center gap-4 text-xs text-gray-500 pt-1">
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-users" class="w-3.5 h-3.5" />
                {{ uniqueVoters }} voter{{ uniqueVoters !== 1 ? 's' : '' }}
              </span>
              <span v-if="posts && posts.posts.length > 0" class="flex items-center gap-1">
                <UIcon name="i-lucide-file-text" class="w-3.5 h-3.5" />
                {{ posts.posts.length }} post{{ posts.posts.length !== 1 ? 's' : '' }}
              </span>
            </div>
          </div>
        </Transition>

        <!-- Vote Action Row -->
        <div class="pt-3" :class="showPeopleActions ? '' : 'border-t border-gray-100 dark:border-gray-800'">
          <FeedButtonRow :platform="(platform as ScriptChunkPlatformUTF8)" :profile-id="profileId"
            :disabled="!walletStore.initialized" :is-revealed="hasVoted" :votes-positive="profile?.votesPositive"
            :votes-negative="profile?.votesNegative" :bucketed-votes="bucketedVotes" :ranking-display="rankingDisplay"
            @voted="handleVoted" />
          <p v-if="!walletStore.initialized && !showPeopleActions" class="text-xs text-gray-400 mt-2">
            Create or import a wallet to vote
          </p>
        </div>
      </UCard>

      <!-- Posts / Discussion Tabs -->
      <div>
        <!-- Tab Bar -->
        <div class="flex border-b border-gray-200 dark:border-gray-800 mb-3">
          <button class="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors" :class="profileTab === 'posts'
            ? 'border-primary text-primary'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
            @click="profileTab = 'posts'">
            <UIcon name="i-lucide-file-text" class="w-4 h-4" />
            Posts
            <span v-if="posts && posts.posts.length > 0" class="ml-1 text-xs px-1.5 py-0.5 rounded-full"
              :class="profileTab === 'posts' ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'">
              {{ posts.posts.length }}
            </span>
          </button>
          <button class="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors" :class="profileTab === 'comments'
            ? 'border-primary text-primary'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
            @click="profileTab = 'comments'">
            <UIcon name="i-lucide-message-circle" class="w-4 h-4" />
            Discussion
            <span v-if="commentCount > 0" class="ml-1 text-xs px-1.5 py-0.5 rounded-full"
              :class="profileTab === 'comments' ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'">
              {{ commentCount }}
            </span>
          </button>
        </div>

        <!-- Posts Tab -->
        <template v-if="profileTab === 'posts'">
          <div v-if="posts && posts.posts.length > 0">
            <UCard>
              <div class="-mx-4 -my-4 sm:-mx-6 sm:-my-6 divide-y divide-gray-100 dark:divide-gray-800">
                <div v-for="(post, index) in posts.posts" :key="post.id">
                  <FeedPostCard :post="post" :platform="platform as ScriptChunkPlatformUTF8" :profile-id="profileId"
                    :rank="index + 1" :activity="true" />
                </div>
              </div>
            </UCard>
          </div>
          <div v-else class="text-center py-10">
            <UIcon name="i-lucide-file-text" class="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p class="text-sm text-gray-400">No ranked posts yet.</p>
          </div>
        </template>

        <!-- Discussion Tab -->
        <template v-if="profileTab === 'comments'">
          <UCard>
            <FeedCommentThread :platform="(platform as ScriptChunkPlatformUTF8)" :profile-id="profileId"
              :comments="profile.comments || undefined" :has-voted="hasVoted" @commented="fetchData" />
          </UCard>
        </template>
      </div>
    </template>
  </div>
</template>
