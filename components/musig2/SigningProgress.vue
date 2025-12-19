<script setup lang="ts">
/**
 * SigningProgress
 *
 * Progress indicator for MuSig2 signing sessions.
 */
const props = defineProps<{
  /** Session data */
  session: {
    id: string
    state: 'pending' | 'nonce_exchange' | 'signing' | 'completed' | 'failed' | 'aborted'
    participants: Array<{
      peerId: string
      nickname?: string
      hasNonce?: boolean
      hasSignature?: boolean
    }>
    error?: string
  }
}>()

const emit = defineEmits<{
  abort: []
}>()

// State configuration with full Tailwind classes (JIT-safe)
const stateConfig = computed(() => {
  const configs: Record<string, { label: string; color: 'warning' | 'primary' | 'success' | 'error' | 'neutral'; icon: string; progress: number; textClass: string; bgClass: string }> = {
    pending: { label: 'Waiting for participants', color: 'warning', icon: 'i-lucide-clock', progress: 10, textClass: 'text-warning', bgClass: 'bg-warning-500' },
    nonce_exchange: { label: 'Exchanging nonces', color: 'primary', icon: 'i-lucide-refresh-cw', progress: 40, textClass: 'text-primary', bgClass: 'bg-primary-500' },
    signing: { label: 'Collecting signatures', color: 'primary', icon: 'i-lucide-pen-tool', progress: 70, textClass: 'text-primary', bgClass: 'bg-primary-500' },
    completed: { label: 'Transaction signed', color: 'success', icon: 'i-lucide-check-circle', progress: 100, textClass: 'text-success', bgClass: 'bg-success-500' },
    failed: { label: 'Signing failed', color: 'error', icon: 'i-lucide-x-circle', progress: 0, textClass: 'text-error', bgClass: 'bg-error-500' },
    aborted: { label: 'Session aborted', color: 'neutral', icon: 'i-lucide-ban', progress: 0, textClass: 'text-muted', bgClass: 'bg-muted' },
  }
  return configs[props.session.state] || configs.pending
})

// Count participants with nonces/signatures
const nonceCount = computed(() =>
  props.session.participants.filter(p => p.hasNonce).length,
)

const signatureCount = computed(() =>
  props.session.participants.filter(p => p.hasSignature).length,
)

const totalParticipants = computed(() => props.session.participants.length)

const isActive = computed(() =>
  ['pending', 'nonce_exchange', 'signing'].includes(props.session.state),
)
</script>

<template>
  <div class="p-4 border border-default rounded-lg">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <UIcon :name="stateConfig.icon" :class="[
          'w-5 h-5',
          stateConfig.textClass,
          isActive && 'animate-pulse',
        ]" />
        <span class="font-medium">{{ stateConfig.label }}</span>
      </div>
      <UBadge :color="stateConfig.color" variant="subtle" size="sm">
        {{ session.state.replace('_', ' ') }}
      </UBadge>
    </div>

    <!-- Progress Bar -->
    <div class="h-2 bg-muted rounded-full overflow-hidden mb-4">
      <div :class="[
        'h-full transition-all duration-500',
        stateConfig.bgClass,
      ]" :style="{ width: `${stateConfig.progress}%` }" />
    </div>

    <!-- Participant Progress -->
    <div class="space-y-2 mb-4">
      <div class="flex justify-between text-sm">
        <span class="text-muted">Nonces received</span>
        <span class="font-medium">{{ nonceCount }} / {{ totalParticipants }}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-muted">Signatures received</span>
        <span class="font-medium">{{ signatureCount }} / {{ totalParticipants }}</span>
      </div>
    </div>

    <!-- Participants -->
    <div class="flex flex-wrap gap-2 mb-4">
      <div v-for="participant in session.participants" :key="participant.peerId"
        class="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-full text-xs">
        <span :class="[
          'w-2 h-2 rounded-full',
          participant.hasSignature ? 'bg-success-500' :
            participant.hasNonce ? 'bg-warning-500' : 'bg-muted',
        ]" />
        <span>{{ participant.nickname || 'Anonymous' }}</span>
      </div>
    </div>

    <!-- Error -->
    <UAlert v-if="session.error" color="error" icon="i-lucide-alert-circle" class="mb-4">
      <template #description>
        {{ session.error }}
      </template>
    </UAlert>

    <!-- Abort Button -->
    <UButton v-if="isActive" color="error" variant="ghost" size="sm" icon="i-lucide-x" @click="emit('abort')">
      Abort Session
    </UButton>
  </div>
</template>
