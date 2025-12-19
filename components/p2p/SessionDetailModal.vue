<script setup lang="ts">
/**
 * P2PSessionDetailModal
 *
 * Modal showing detailed information about a signing session.
 * Displays participants, progress, and allows session abort.
 */
import type { WalletSigningSession } from '~/plugins/05.musig2.client'

interface Props {
  modelValue: boolean
  session: WalletSigningSession | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  abort: [sessionId: string]
}>()

const { timeAgo } = useTime()
const { copy } = useClipboard()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

// Session state configuration
const stateConfig = computed(() => {
  if (!props.session) return { label: 'Unknown', color: 'neutral' as const, icon: 'i-lucide-circle' }

  const configs: Record<string, { label: string; color: 'warning' | 'primary' | 'success' | 'error' | 'neutral'; icon: string }> = {
    created: { label: 'Created', color: 'warning', icon: 'i-lucide-clock' },
    key_aggregation: { label: 'Key Aggregation', color: 'primary', icon: 'i-lucide-key' },
    keys_aggregated: { label: 'Keys Aggregated', color: 'primary', icon: 'i-lucide-key' },
    nonce_exchange: { label: 'Nonce Exchange', color: 'primary', icon: 'i-lucide-shuffle' },
    nonces_exchanged: { label: 'Nonces Exchanged', color: 'primary', icon: 'i-lucide-shuffle' },
    signing: { label: 'Signing', color: 'primary', icon: 'i-lucide-pen-tool' },
    completed: { label: 'Completed', color: 'success', icon: 'i-lucide-check-circle' },
    failed: { label: 'Failed', color: 'error', icon: 'i-lucide-x-circle' },
    cancelled: { label: 'Cancelled', color: 'neutral', icon: 'i-lucide-ban' },
  }

  return configs[props.session.state] || { label: props.session.state, color: 'neutral', icon: 'i-lucide-circle' }
})

// Progress calculation
const progress = computed(() => {
  if (!props.session) return 0

  const stateProgress: Record<string, number> = {
    created: 10,
    key_aggregation: 20,
    keys_aggregated: 30,
    nonce_exchange: 50,
    nonces_exchanged: 60,
    signing: 80,
    completed: 100,
    failed: 0,
    cancelled: 0,
  }

  return stateProgress[props.session.state] || 0
})

// Time remaining until expiration
const timeRemaining = computed(() => {
  if (!props.session) return null

  const now = Date.now()
  const remaining = props.session.expiresAt - now

  if (remaining <= 0) return 'Expired'

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
})

// Can abort session
const canAbort = computed(() => {
  if (!props.session) return false
  return props.session.isInitiator &&
    props.session.state !== 'completed' &&
    props.session.state !== 'failed' &&
    props.session.state !== 'cancelled'
})

function handleAbort() {
  if (props.session) {
    emit('abort', props.session.id)
  }
}

function truncate(str: string, length: number = 8): string {
  if (!str) return ''
  if (str.length <= length * 2) return str
  return `${str.slice(0, length)}...${str.slice(-length)}`
}

function copySessionId() {
  if (props.session) {
    copy(props.session.id, 'Session ID')
  }
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <!-- Phase 6: Standardized modal header format -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-layers" class="w-5 h-5 text-primary" />
              <span class="font-semibold">Session Details</span>
            </div>
            <UButton color="neutral" variant="ghost" icon="i-lucide-x" size="sm" @click="isOpen = false" />
          </div>
        </template>

        <div v-if="session" class="space-y-6">
          <!-- Session Status -->
          <div class="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div class="flex items-center gap-3">
              <div :class="[
                'w-10 h-10 rounded-full flex items-center justify-center',
                stateConfig.color === 'success' ? 'bg-success-100 dark:bg-success-900/30' :
                  stateConfig.color === 'error' ? 'bg-error-100 dark:bg-error-900/30' :
                    stateConfig.color === 'warning' ? 'bg-warning-100 dark:bg-warning-900/30' :
                      'bg-primary-100 dark:bg-primary-900/30'
              ]">
                <UIcon :name="stateConfig.icon" :class="[
                  'w-5 h-5',
                  stateConfig.color === 'success' ? 'text-success' :
                    stateConfig.color === 'error' ? 'text-error' :
                      stateConfig.color === 'warning' ? 'text-warning' :
                        'text-primary'
                ]" />
              </div>
              <div>
                <p class="font-medium">{{ stateConfig.label }}</p>
                <p class="text-sm text-muted">{{ timeAgo(session.createdAt) }}</p>
              </div>
            </div>
            <UBadge :color="stateConfig.color" variant="subtle">
              {{ progress }}%
            </UBadge>
          </div>

          <!-- Progress Bar -->
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-muted">Progress</span>
              <span v-if="timeRemaining" class="text-muted">
                <UIcon name="i-lucide-clock" class="w-3 h-3 inline mr-1" />
                {{ timeRemaining }}
              </span>
            </div>
            <UProgress :value="progress" :color="stateConfig.color" size="sm" />
          </div>

          <!-- Session ID -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-muted">Session ID</label>
            <div class="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <code class="flex-1 text-sm font-mono truncate">{{ truncate(session.id, 12) }}</code>
              <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-copy" @click="copySessionId" />
            </div>
          </div>

          <!-- Participants -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-muted">
              Participants ({{ session.participants.length }})
            </label>
            <div class="space-y-2">
              <div v-for="participant in session.participants" :key="participant.peerId"
                class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div
                  class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <UIcon name="i-lucide-user" class="w-4 h-4 text-primary" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-mono truncate">{{ truncate(participant.peerId, 8) }}</p>
                  <p class="text-xs text-muted">Signer #{{ participant.signerIndex + 1 }}</p>
                </div>
                <div class="flex items-center gap-1">
                  <UBadge v-if="participant.hasNonce" color="success" variant="subtle" size="xs">
                    Nonce
                  </UBadge>
                  <UBadge v-if="participant.hasPartialSig" color="success" variant="subtle" size="xs">
                    Sig
                  </UBadge>
                </div>
              </div>
            </div>
          </div>

          <!-- Message Preview (if available) -->
          <div v-if="session.messageHex" class="space-y-2">
            <label class="text-sm font-medium text-muted">Message Hash</label>
            <div class="p-3 bg-muted/50 rounded-lg">
              <code class="text-xs font-mono break-all">{{ session.messageHex.slice(0, 64) }}...</code>
            </div>
          </div>
        </div>

        <!-- Loading/Empty State -->
        <div v-else class="py-8 text-center">
          <UIcon name="i-lucide-layers" class="w-12 h-12 text-muted mx-auto mb-2" />
          <p class="text-muted">No session selected</p>
        </div>

        <template #footer>
          <div class="flex justify-between">
            <UButton color="neutral" variant="outline" @click="isOpen = false">
              Close
            </UButton>
            <UButton v-if="canAbort" color="error" variant="outline" icon="i-lucide-x" @click="handleAbort">
              Abort Session
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
