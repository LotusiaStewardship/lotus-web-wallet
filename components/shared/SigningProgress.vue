<script setup lang="ts">
/**
 * Shared SigningProgress Component
 *
 * Unified signing progress indicator for both P2P and MuSig2 features.
 * Shows participant status, progress bar, and timeout countdown.
 */

type ParticipantStatus = 'pending' | 'committed' | 'signed' | 'failed'
type SessionStep = 'waiting' | 'committing' | 'signing' | 'complete' | 'failed'

interface Participant {
  publicKey: string
  name?: string
  status: ParticipantStatus
}

const props = defineProps<{
  /** List of participants with their status */
  participants: Participant[]
  /** Current signing step */
  currentStep: SessionStep
  /** Session timeout timestamp */
  timeoutAt?: Date | number
  /** Error message if failed */
  error?: string
}>()

const emit = defineEmits<{
  abort: []
}>()

// Step configuration
const stepConfig = computed(() => {
  const configs: Record<SessionStep, {
    label: string
    color: 'warning' | 'primary' | 'success' | 'error'
    icon: string
    progress: number
  }> = {
    waiting: {
      label: 'Waiting for participants',
      color: 'warning',
      icon: 'i-lucide-clock',
      progress: 10,
    },
    committing: {
      label: 'Collecting commitments',
      color: 'primary',
      icon: 'i-lucide-refresh-cw',
      progress: 40,
    },
    signing: {
      label: 'Collecting signatures',
      color: 'primary',
      icon: 'i-lucide-pen-tool',
      progress: 70,
    },
    complete: {
      label: 'Transaction signed',
      color: 'success',
      icon: 'i-lucide-check-circle',
      progress: 100,
    },
    failed: {
      label: 'Signing failed',
      color: 'error',
      icon: 'i-lucide-x-circle',
      progress: 0,
    },
  }
  return configs[props.currentStep]
})

// Status counts
const committedCount = computed(() =>
  props.participants.filter(p => p.status === 'committed' || p.status === 'signed').length
)

const signedCount = computed(() =>
  props.participants.filter(p => p.status === 'signed').length
)

const totalParticipants = computed(() => props.participants.length)

// Progress percentage based on actual progress
const progressPercent = computed(() => {
  if (props.currentStep === 'complete') return 100
  if (props.currentStep === 'failed') return 0
  if (props.currentStep === 'waiting') return 10

  const commitProgress = (committedCount.value / totalParticipants.value) * 30
  const signProgress = (signedCount.value / totalParticipants.value) * 60

  return Math.min(10 + commitProgress + signProgress, 99)
})

// Timeout countdown
const timeRemaining = ref('')
let countdownInterval: ReturnType<typeof setInterval> | null = null

const updateCountdown = () => {
  if (!props.timeoutAt) {
    timeRemaining.value = ''
    return
  }

  const timeout = typeof props.timeoutAt === 'number'
    ? props.timeoutAt
    : props.timeoutAt.getTime()

  const remaining = timeout - Date.now()

  if (remaining <= 0) {
    timeRemaining.value = 'Expired'
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
    return
  }

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  timeRemaining.value = `${minutes}:${seconds.toString().padStart(2, '0')}`
}

onMounted(() => {
  updateCountdown()
  if (props.timeoutAt) {
    countdownInterval = setInterval(updateCountdown, 1000)
  }
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})

watch(() => props.timeoutAt, () => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
  updateCountdown()
  if (props.timeoutAt) {
    countdownInterval = setInterval(updateCountdown, 1000)
  }
})

// Is session active (can be aborted)
const isActive = computed(() =>
  ['waiting', 'committing', 'signing'].includes(props.currentStep)
)

// Phase 6: Status indicator color with semantic classes
const getStatusColor = (status: ParticipantStatus) => {
  switch (status) {
    case 'signed':
      return 'bg-success'
    case 'committed':
      return 'bg-warning'
    case 'failed':
      return 'bg-error'
    default:
      return 'bg-muted'
  }
}
</script>

<template>
  <div class="p-4 border border-default rounded-lg">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <UIcon :name="stepConfig.icon" :class="[
          'w-5 h-5',
          `text-${stepConfig.color}`,
          isActive && 'animate-pulse',
        ]" />
        <span class="font-medium">{{ stepConfig.label }}</span>
      </div>
      <UBadge :color="stepConfig.color" variant="subtle" size="sm">
        {{ currentStep.replace('_', ' ') }}
      </UBadge>
    </div>

    <!-- Progress Bar -->
    <div class="h-2 bg-muted rounded-full overflow-hidden mb-4">
      <div class="h-full transition-all duration-500" :class="`bg-${stepConfig.color}-500`"
        :style="{ width: `${progressPercent}%` }" />
    </div>

    <!-- Progress Stats -->
    <div class="space-y-2 mb-4">
      <div class="flex justify-between text-sm">
        <span class="text-muted">Commitments</span>
        <span class="font-medium">{{ committedCount }} / {{ totalParticipants }}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-muted">Signatures</span>
        <span class="font-medium">{{ signedCount }} / {{ totalParticipants }}</span>
      </div>
    </div>

    <!-- Participants -->
    <div class="flex flex-wrap gap-2 mb-4">
      <div v-for="participant in participants" :key="participant.publicKey"
        class="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-full text-xs">
        <span class="w-2 h-2 rounded-full" :class="getStatusColor(participant.status)" />
        <span>{{ participant.name || 'Anonymous' }}</span>
      </div>
    </div>

    <!-- Timeout -->
    <div v-if="timeRemaining" class="flex items-center gap-2 text-sm text-muted mb-4">
      <UIcon name="i-lucide-timer" class="w-4 h-4" />
      <span>Session expires in {{ timeRemaining }}</span>
    </div>

    <!-- Error -->
    <UAlert v-if="error" color="error" icon="i-lucide-alert-circle" class="mb-4">
      <template #description>
        {{ error }}
      </template>
    </UAlert>

    <!-- Abort Button -->
    <UButton v-if="isActive" color="error" variant="ghost" size="sm" icon="i-lucide-x" @click="emit('abort')">
      Abort Session
    </UButton>
  </div>
</template>
