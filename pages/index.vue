<script setup lang="ts">
/**
 * Home Page - Command Center
 *
 * The home page provides a quick overview of:
 * - Balance with quick actions
 * - Items needing attention
 * - Online contacts
 * - Recent activity
 * - Getting started checklist (new users)
 */
import { useActivityStore } from '~/stores/activity'
import { useOnboardingStore } from '~/stores/onboarding'
import { resetForChaining } from '~/composables/useOverlays'

definePageMeta({
  title: 'Home',
})

const activityStore = useActivityStore()
const onboardingStore = useOnboardingStore()

// Conditional rendering flags
const hasAttentionItems = computed(() => {
  return !onboardingStore.backupComplete
})

const showGettingStarted = computed(() => !onboardingStore.skipped)

// Overlay management via useOverlays
const {
  openSendModal,
  openReceiveModal,
  openScanModal,
  openAddContactModal,
} = useOverlays()

async function handleBalanceAction(actionId: 'send' | 'receive' | 'scan') {
  switch (actionId) {
    case 'send':
      await openSendModal()
      break
    case 'receive':
      await openReceiveModal()
      break
    case 'scan':
      await handleScanFlow()
      break
  }
}

// Handle scan flow - open scan modal and process result
async function handleScanFlow() {
  const result = await openScanModal()

  if (!result) return

  // Reset overlay state so the next modal can properly take over the history entry
  resetForChaining()

  // Handle manual entry request
  if ('manualEntry' in result && result.manualEntry) {
    await openSendModal()
    return
  }

  // Handle scan results - narrow the type
  const scanResult = result as Exclude<typeof result, { manualEntry: true }>

  if (scanResult.type === 'contact' && scanResult.contact) {
    await openAddContactModal({
      initialAddress: scanResult.contact.address,
      initialName: scanResult.contact.name,
      initialPublicKey: scanResult.contact.publicKeyHex,
    })
  } else if (scanResult.type === 'address' || scanResult.type === 'payment') {
    await openSendModal({
      initialRecipient: scanResult.address,
      initialAmount: scanResult.amount,
    })
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Balance Card -->
    <HomeBalanceCard @action="handleBalanceAction" />

    <!-- Needs Attention (if any) -->
    <HomeNeedsAttentionCard v-if="hasAttentionItems" />

    <!-- Recent Activity -->
    <HomeRecentActivityCard />

    <!-- Getting Started (new users) -->
    <HomeGettingStartedCard v-if="showGettingStarted" />
  </div>
</template>
