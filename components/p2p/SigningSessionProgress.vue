<script setup lang="ts">
/**
 * SigningSessionProgress Component
 *
 * Displays the progress of an active MuSig2 signing session.
 * Shows the current step, participants, and allows cancellation.
 * Integrates with the MuSig2 composable for session management.
 */
import {
  useMuSig2,
  SigningSessionPhase,
  type UISigningSession,
} from '~/composables/useMuSig2'

const props = defineProps<{
  session: UISigningSession
}>()

const emit = defineEmits<{
  cancel: [sessionId: string]
  retry: [sessionId: string]
  viewTransaction: [txid: string]
}>()

const musig2 = useMuSig2()
const toast = useToast()

// ============================================================================
// State
// ============================================================================

const cancelling = ref(false)

// ============================================================================
// Computed
// ============================================================================

const isActive = computed(() => {
  return ![
    SigningSessionPhase.COMPLETE,
    SigningSessionPhase.ABORTED,
    SigningSessionPhase.ERROR,
  ].includes(props.session.phase)
})

const isCompleted = computed(() => props.session.phase === SigningSessionPhase.COMPLETE)
const isFailed = computed(() => props.session.phase === SigningSessionPhase.ERROR)
const isAborted = computed(() => props.session.phase === SigningSessionPhase.ABORTED)

const progressPercent = computed(() => {
  if (isCompleted.value) return 100
  if (isFailed.value || isAborted.value) return 0
  // Calculate progress based on phase and participant counts
  const { joinedCount, totalSigners, noncesCollected, partialSigsCollected } = props.session
  if (joinedCount < totalSigners) {
    return Math.round((joinedCount / totalSigners) * 33)
  } else if (noncesCollected < totalSigners) {
    return 33 + Math.round((noncesCollected / totalSigners) * 33)
  } else if (partialSigsCollected < totalSigners) {
    return 66 + Math.round((partialSigsCollected / totalSigners) * 34)
  }
  return 100
})

const phaseLabel = computed(() => {
  switch (props.session.phase) {
    case SigningSessionPhase.WAITING_FOR_PARTICIPANTS:
      return 'Waiting for participants...'
    case SigningSessionPhase.NONCE_EXCHANGE:
      return 'Exchanging nonces (Round 1)'
    case SigningSessionPhase.SIGNATURE_EXCHANGE:
      return 'Exchanging signatures (Round 2)'
    case SigningSessionPhase.COMPLETE:
      return 'Signing complete!'
    case SigningSessionPhase.ABORTED:
      return 'Session aborted'
    case SigningSessionPhase.ERROR:
      return 'Session error'
    default:
      return 'Unknown state'
  }
})

const phaseIcon = computed(() => {
  switch (props.session.phase) {
    case SigningSessionPhase.WAITING_FOR_PARTICIPANTS:
      return 'i-lucide-users'
    case SigningSessionPhase.NONCE_EXCHANGE:
    case SigningSessionPhase.SIGNATURE_EXCHANGE:
      return 'i-lucide-refresh-cw'
    case SigningSessionPhase.COMPLETE:
      return 'i-lucide-check-circle'
    case SigningSessionPhase.ERROR:
      return 'i-lucide-x-circle'
    case SigningSessionPhase.ABORTED:
      return 'i-lucide-ban'
    default:
      return 'i-lucide-loader'
  }
})

const phaseColor = computed(() => {
  switch (props.session.phase) {
    case SigningSessionPhase.COMPLETE:
      return 'success'
    case SigningSessionPhase.ERROR:
      return 'error'
    case SigningSessionPhase.ABORTED:
      return 'neutral'
    default:
      return 'primary'
  }
})

const readyCount = computed(() => props.session.joinedCount)
const totalParticipants = computed(() => props.session.totalSigners)

const elapsedTime = computed(() => {
  const end = props.session.lastActivity || Date.now()
  const elapsed = end - props.session.createdAt
  const seconds = Math.floor(elapsed / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
})

// ============================================================================
// Actions
// ============================================================================

const cancelSession = async () => {
  if (cancelling.value || !isActive.value) return
  cancelling.value = true

  try {
    emit('cancel', props.session.id)
    toast.add({
      title: 'Session Cancelled',
      description: 'The signing session has been cancelled',
      color: 'neutral',
      icon: 'i-lucide-x',
    })
  } catch (err) {
    toast.add({
      title: 'Cancel Failed',
      description: err instanceof Error ? err.message : 'Failed to cancel session',
      color: 'error',
      icon: 'i-lucide-x-circle',
    })
  } finally {
    cancelling.value = false
  }
}

const retrySession = () => {
  emit('retry', props.session.id)
}

const viewSignature = () => {
  if (props.session.finalSignature) {
    // Copy signature to clipboard
    navigator.clipboard.writeText(props.session.finalSignature)
    toast.add({
      title: 'Signature Copied',
      description: 'Final signature copied to clipboard',
      color: 'success',
      icon: 'i-lucide-copy',
    })
  }
}

// Computed step for progress indicator (3 steps: join, nonces, signatures)
const currentStep = computed(() => {
  switch (props.session.phase) {
    case SigningSessionPhase.WAITING_FOR_PARTICIPANTS:
      return 1
    case SigningSessionPhase.NONCE_EXCHANGE:
      return 2
    case SigningSessionPhase.SIGNATURE_EXCHANGE:
      return 3
    case SigningSessionPhase.COMPLETE:
      return 4
    default:
      return 0
  }
})
const totalSteps = 3
</script>

<template>
  <UCard :class="{ 'border-2': isActive }" :style="isActive ? `border-color: var(--color-${phaseColor}-500)` : ''">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon :name="phaseIcon" :class="[
            'w-5 h-5',
            isActive ? 'animate-pulse' : '',
            `text-${phaseColor}-500`
          ]" />
          <span class="font-semibold">MuSig2 Signing Session</span>
        </div>
        <UBadge :color="phaseColor" variant="subtle" size="xs">
          {{ session.isCoordinator ? 'Coordinator' : 'Participant' }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Progress Bar -->
      <div>
        <div class="flex items-center justify-between text-sm mb-2">
          <span class="text-muted">{{ phaseLabel }}</span>
          <span class="font-mono">{{ progressPercent }}%</span>
        </div>
        <UProgress :value="progressPercent" :color="phaseColor" size="md" />
      </div>

      <!-- Step Indicator -->
      <div v-if="isActive" class="flex items-center justify-center gap-2">
        <template v-for="step in totalSteps" :key="step">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium" :class="[
            step < currentStep
              ? 'bg-success-500 text-white'
              : step === currentStep
                ? `bg-${phaseColor}-500 text-white`
                : 'bg-muted text-muted'
          ]">
            <UIcon v-if="step < currentStep" name="i-lucide-check" class="w-4 h-4" />
            <span v-else>{{ step }}</span>
          </div>
          <div v-if="step < totalSteps" class="w-8 h-0.5" :class="[
            step < currentStep ? 'bg-success-500' : 'bg-muted'
          ]" />
        </template>
      </div>

      <!-- Participants Progress -->
      <div>
        <div class="flex items-center justify-between text-sm mb-2">
          <span class="text-muted">Participants</span>
          <span class="font-mono">{{ readyCount }}/{{ totalParticipants }} joined</span>
        </div>
        <div class="grid grid-cols-3 gap-2 text-xs text-center">
          <div class="bg-muted/50 rounded p-2">
            <p class="text-muted">Joined</p>
            <p class="font-mono font-medium">{{ session.joinedCount }}/{{ session.totalSigners }}</p>
          </div>
          <div class="bg-muted/50 rounded p-2">
            <p class="text-muted">Nonces</p>
            <p class="font-mono font-medium">{{ session.noncesCollected }}/{{ session.totalSigners }}</p>
          </div>
          <div class="bg-muted/50 rounded p-2">
            <p class="text-muted">Signatures</p>
            <p class="font-mono font-medium">{{ session.partialSigsCollected }}/{{ session.totalSigners }}</p>
          </div>
        </div>
      </div>

      <!-- Session Details -->
      <div class="grid grid-cols-2 gap-4 text-sm bg-muted/50 rounded-lg p-3">
        <div>
          <p class="text-muted text-xs">Session ID</p>
          <p class="font-mono text-xs truncate">{{ session.id.slice(0, 16) }}...</p>
        </div>
        <div>
          <p class="text-muted text-xs">Elapsed Time</p>
          <p class="font-mono">{{ elapsedTime }}</p>
        </div>
      </div>

      <!-- Error Message -->
      <UAlert v-if="(isFailed || isAborted) && session.error" color="error" variant="subtle"
        icon="i-lucide-alert-circle">
        <template #description>
          {{ session.error }}
        </template>
      </UAlert>

      <!-- Success Message -->
      <UAlert v-if="isCompleted && session.finalSignature" color="success" variant="subtle"
        icon="i-lucide-check-circle">
        <template #description>
          <div class="flex items-center justify-between">
            <span>Signature ready!</span>
            <UButton color="success" variant="link" size="xs" @click="viewSignature">
              Copy Signature
            </UButton>
          </div>
        </template>
      </UAlert>
    </div>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <!-- Active session actions -->
        <template v-if="isActive">
          <UButton color="error" variant="outline" :loading="cancelling" icon="i-lucide-x" @click="cancelSession">
            Cancel
          </UButton>
        </template>

        <!-- Failed session actions -->
        <template v-else-if="isFailed">
          <UButton color="primary" icon="i-lucide-refresh-cw" @click="retrySession">
            Retry
          </UButton>
        </template>

        <!-- Completed session actions -->
        <template v-else-if="isCompleted && session.finalSignature">
          <UButton color="success" icon="i-lucide-copy" @click="viewSignature">
            Copy Signature
          </UButton>
        </template>
      </div>
    </template>
  </UCard>
</template>
