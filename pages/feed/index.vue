<script setup lang="ts">
/**
 * Feed Home Page
 *
 * Primary interface for the RANK social curation system.
 * Three views:
 *   - Activity: Chronological stream of recent votes (the "general feed")
 *   - Profiles: Trending + controversial profile discovery
 *   - Posts: Trending + controversial post discovery
 *
 * Browsable without a wallet; voting requires wallet initialization.
 *
 * @see lotusia-monorepo/strategies/rank/technical/architecture.md — "RANK Feed is the entry point"
 * @see lotusia-monorepo/strategies/rank/research/psychopolitics-and-digital-power.md — R38
 */
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Feed',
})

const walletStore = useWalletStore()
const { openNewPostSlideover } = useOverlays()

const activeTab = ref('activity')

const tabItems = [
  { label: 'Activity', value: 'activity' },
  { label: 'Profiles', value: 'profiles' },
  { label: 'Posts', value: 'posts' },
]

const INTRO_DISMISSED_KEY = 'feed-intro-dismissed'
const showIntro = ref(false)

const walletReady = computed(() => walletStore.isReadyForSigning())
const isSlideoverOpen = ref(false)

/** The wallet's own Lotusia identity (scriptPayload used as profileId for native posts) */
const lotusiaProfileId = computed(() => walletStore.scriptPayload || '')

onMounted(() => {
  showIntro.value = !localStorage.getItem(INTRO_DISMISSED_KEY)
})

function dismissIntro() {
  showIntro.value = false
  localStorage.setItem(INTRO_DISMISSED_KEY, '1')
}

async function openCompose() {
  if (!lotusiaProfileId.value) return
  isSlideoverOpen.value = true
  await openNewPostSlideover({
    platform: 'lotusia',
    profileId: lotusiaProfileId.value,
  })
  isSlideoverOpen.value = false
}
</script>

<template>
  <div class="space-y-4">
    <!-- Page Header -->
    <div class="flex items-center gap-3 justify-between">
      <div>
        <h1 class="text-xl font-bold">Social Feed</h1>
        <p class="text-sm text-gray-500">Community-curated social content, sourced from across the Internet</p>
      </div>
      <UButton icon="i-lucide-search" variant="soft" color="neutral" size="md" to="/feed/search">
        Search
      </UButton>
    </div>

    <!-- Intro Context (dismissible, for new users) -->
    <UAlert v-if="showIntro" icon="i-lucide-info" title="Every vote here burns real Lotus"
      description="Making it a permanent, on-chain record of what you value. Unlike traditional social media, votes have real weight and can't be faked."
      color="primary" variant="subtle" close @update:open="dismissIntro" />

    <!-- Tab Selector -->
    <!-- <UTabs v-model="activeTab" :items="tabItems" :content="false" class="w-full" variant="pill" :ui="{
    }" /> -->

    <!-- Activity Tab (default — the general scrollable feed) -->
    <FeedActivityStream v-if="activeTab === 'activity'" :scriptPayload="lotusiaProfileId" />

    <!-- Profiles Tab (discovery) -->
    <template v-if="activeTab === 'profiles'">
      <FeedTopProfiles title="Trending" :limit="10" />
      <FeedTopProfiles title="Most Controversial" :controversial="true" :limit="5" />
    </template>

    <!-- Posts Tab (discovery) -->
    <template v-if="activeTab === 'posts'">
      <FeedTopPosts title="Trending" :limit="10" />
      <FeedTopPosts title="Most Controversial" :controversial="true" :limit="5" />
    </template>

    <!-- FAB: Compose a Lotusia post (only when wallet is ready) -->
    <Teleport to="body">
      <Transition name="fab">
        <button v-if="walletReady && lotusiaProfileId && !isSlideoverOpen"
          class="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-primary shadow-lg flex items-center justify-center text-white hover:bg-primary/90 active:scale-95 transition-all"
          title="Write a post" @click="openCompose">
          <UIcon name="i-lucide-pencil" class="w-6 h-6" />
        </button>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fab-enter-active,
.fab-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fab-enter-from,
.fab-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
