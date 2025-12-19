<script setup lang="ts">
/**
 * SocialVoteModal
 *
 * Modal for voting on a social profile with confirmation step.
 */
import { useWalletStore } from '~/stores/wallet'
import { PlatformIcon } from '~/composables/useRankApi'

const props = defineProps<{
  /** Whether modal is open */
  open: boolean
  /** Profile to vote on */
  profile: {
    id: string
    platform: string
    profileId: string
    displayName: string
    avatarUrl?: string
  } | null
  /** Vote type */
  voteType: 'up' | 'down'
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  vote: [amount: bigint]
}>()

const walletStore = useWalletStore()
const { formatXPI, xpiToSats } = useAmount()
const { success, error } = useNotifications()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

// Step state: 'configure' | 'confirm' | 'success'
const step = ref<'configure' | 'confirm' | 'success'>('configure')

// Form state
const amountInput = ref('')
const sending = ref(false)
const resultTxid = ref<string | null>(null)

// Convert input to satoshis
const amountSats = computed(() => {
  if (!amountInput.value) return 0n
  try {
    return xpiToSats(amountInput.value)
  } catch {
    return 0n
  }
})

// Validation
const canVote = computed(() => {
  return (
    amountSats.value > 0n &&
    BigInt(walletStore.balance.total) >= amountSats.value
  )
})

// Estimated fee (placeholder - would be calculated from actual tx)
const estimatedFee = computed(() => {
  return 1000n // 0.00001 XPI minimum fee
})

// Preset amounts
const presetAmounts = ['10', '50', '100', '500', '1000']

// Platform icon
const platformIcon = computed(() => {
  if (!props.profile) return 'i-lucide-user'
  return PlatformIcon[props.profile.platform] || 'i-lucide-user'
})

// Go to confirm step
function goToConfirm() {
  if (canVote.value) {
    step.value = 'confirm'
  }
}

// Go back to configure
function goBack() {
  step.value = 'configure'
}

// Handle vote submission
async function submitVote() {
  if (!props.profile || !canVote.value) return

  sending.value = true
  try {
    // TODO: Implement actual RANK vote transaction
    // const txid = await walletStore.sendRankVote(
    //   props.profile.platform,
    //   props.profile.profileId,
    //   amountSats.value,
    //   props.voteType === 'up',
    // )

    // Simulate success for now
    await new Promise(resolve => setTimeout(resolve, 1000))
    resultTxid.value = 'simulated_txid_' + Date.now()

    step.value = 'success'
    emit('vote', amountSats.value)

    success(
      props.voteType === 'up' ? 'Upvote Sent!' : 'Downvote Sent!',
      `You voted ${formatXPI(amountSats.value)} for ${props.profile.displayName}`,
    )
  } catch (e: any) {
    error('Vote Failed', e.message || 'Failed to send vote')
  } finally {
    sending.value = false
  }
}

// Close and reset
function closeModal() {
  isOpen.value = false
}

// Reset on open
watch(isOpen, open => {
  if (open) {
    step.value = 'configure'
    amountInput.value = ''
    resultTxid.value = null
  }
})
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon v-if="step === 'success'" name="i-lucide-check-circle" class="w-5 h-5 text-success" />
        <UIcon v-else :name="voteType === 'up' ? 'i-lucide-thumbs-up' : 'i-lucide-thumbs-down'"
          :class="voteType === 'up' ? 'text-success' : 'text-error'" class="w-5 h-5" />
        <span class="font-semibold">
          <template v-if="step === 'success'">Vote Submitted!</template>
          <template v-else-if="step === 'confirm'">Confirm Vote</template>
          <template v-else>
            {{ voteType === 'up' ? 'Upvote' : 'Downvote' }}
            {{ profile?.displayName }}
          </template>
        </span>
      </div>
    </template>

    <template #body>
      <div v-if="profile" class="space-y-4">
        <!-- Step 1: Configure -->
        <template v-if="step === 'configure'">
          <!-- Profile Preview -->
          <div class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              <img v-if="profile.avatarUrl" :src="profile.avatarUrl" :alt="profile.displayName"
                class="w-full h-full object-cover" />
              <UIcon v-else :name="platformIcon" class="w-5 h-5" />
            </div>
            <div>
              <p class="font-medium">{{ profile.displayName }}</p>
              <p class="text-sm text-muted capitalize">{{ profile.platform }}</p>
            </div>
          </div>

          <!-- Amount Input -->
          <UFormField label="Vote Amount" :hint="`Available: ${formatXPI(walletStore.balance.total)}`">
            <UInput v-model="amountInput" type="number" inputmode="decimal" placeholder="0.00" size="lg">
              <template #trailing>
                <span class="text-muted">XPI</span>
              </template>
            </UInput>
          </UFormField>

          <!-- Preset Amounts -->
          <div class="flex flex-wrap gap-2">
            <UButton v-for="preset in presetAmounts" :key="preset" size="sm" color="neutral" variant="outline"
              @click="amountInput = preset">
              {{ preset }} XPI
            </UButton>
          </div>

          <!-- Info Alert -->
          <UAlert :color="voteType === 'up' ? 'success' : 'error'"
            :icon="voteType === 'up' ? 'i-lucide-info' : 'i-lucide-alert-triangle'">
            <template #description>
              <span v-if="voteType === 'up'">
                Your XPI will be burned to increase {{ profile.displayName }}'s rank.
              </span>
              <span v-else>
                Your XPI will be burned to decrease {{ profile.displayName }}'s rank.
              </span>
            </template>
          </UAlert>
        </template>

        <!-- Step 2: Confirm -->
        <template v-else-if="step === 'confirm'">
          <div class="text-center py-4">
            <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
              :class="voteType === 'up' ? 'bg-success-100 dark:bg-success-900/30' : 'bg-error-100 dark:bg-error-900/30'">
              <UIcon :name="voteType === 'up' ? 'i-lucide-thumbs-up' : 'i-lucide-thumbs-down'"
                :class="voteType === 'up' ? 'text-success' : 'text-error'" class="w-8 h-8" />
            </div>

            <p class="text-lg font-medium mb-2">
              {{ voteType === 'up' ? 'Upvote' : 'Downvote' }} {{ profile.displayName }}
            </p>

            <div class="space-y-2 text-sm">
              <div class="flex justify-between py-2 border-b border-default">
                <span class="text-muted">Amount</span>
                <span class="font-mono font-medium">{{ formatXPI(amountSats) }}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-default">
                <span class="text-muted">Network Fee</span>
                <span class="font-mono text-muted">~{{ formatXPI(estimatedFee) }}</span>
              </div>
              <div class="flex justify-between py-2">
                <span class="font-medium">Total</span>
                <span class="font-mono font-medium">{{ formatXPI(amountSats + estimatedFee) }}</span>
              </div>
            </div>
          </div>

          <UAlert color="warning" icon="i-lucide-alert-triangle">
            <template #description>
              This action is irreversible. The XPI will be permanently burned.
            </template>
          </UAlert>
        </template>

        <!-- Step 3: Success -->
        <template v-else-if="step === 'success'">
          <div class="text-center py-6">
            <div
              class="w-20 h-20 mx-auto rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-4">
              <UIcon name="i-lucide-check" class="w-10 h-10 text-success" />
            </div>

            <p class="text-lg font-medium mb-2">Vote Submitted!</p>
            <p class="text-muted mb-4">
              Your {{ voteType === 'up' ? 'upvote' : 'downvote' }} of {{ formatXPI(amountSats) }} has been recorded.
            </p>

            <div v-if="resultTxid" class="p-3 bg-muted/50 rounded-lg">
              <p class="text-xs text-muted mb-1">Transaction ID</p>
              <p class="font-mono text-sm break-all">{{ resultTxid }}</p>
            </div>
          </div>
        </template>
      </div>
    </template>

    <template #footer>
      <!-- Configure Step Footer -->
      <div v-if="step === 'configure'" class="flex gap-3">
        <UButton class="flex-1" color="neutral" variant="outline" @click="closeModal">
          Cancel
        </UButton>
        <UButton class="flex-1" :color="voteType === 'up' ? 'success' : 'error'" :disabled="!canVote"
          @click="goToConfirm">
          Continue
        </UButton>
      </div>

      <!-- Confirm Step Footer -->
      <div v-else-if="step === 'confirm'" class="flex gap-3">
        <UButton class="flex-1" color="neutral" variant="outline" :disabled="sending" @click="goBack">
          Back
        </UButton>
        <UButton class="flex-1" :color="voteType === 'up' ? 'success' : 'error'" :loading="sending" @click="submitVote">
          Confirm {{ voteType === 'up' ? 'Upvote' : 'Downvote' }}
        </UButton>
      </div>

      <!-- Success Step Footer -->
      <div v-else-if="step === 'success'" class="flex gap-3">
        <UButton v-if="resultTxid" class="flex-1" color="neutral" variant="outline"
          :to="`/explore/explorer/tx/${resultTxid}`" @click="closeModal">
          View Transaction
        </UButton>
        <UButton class="flex-1" color="primary" @click="closeModal">
          Done
        </UButton>
      </div>
    </template>
  </UModal>
</template>
