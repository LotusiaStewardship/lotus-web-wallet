<script setup lang="ts">
/**
 * View Phrase Modal Component
 *
 * Shows the recovery phrase with security warning.
 * Requires confirmation before revealing.
 */
import { useWalletStore } from '~/stores/wallet'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const walletStore = useWalletStore()

// Reset state on mount
onMounted(() => {
  revealed.value = false
  copied.value = false
})

const revealed = ref(false)
const copied = ref(false)

const phraseWords = computed(() => {
  const phrase = walletStore.getMnemonic()
  return phrase?.split(' ') || []
})


async function copyPhrase() {
  const phrase = walletStore.getMnemonic()
  if (phrase) {
    await navigator.clipboard.writeText(phrase)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

function close() {
  emit('close')
}
</script>

<template>
  <USlideover :open="true" side="right">
    <template #content>
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Recovery Phrase</h2>
          <UButton variant="ghost" icon="i-lucide-x" @click="close" />
        </div>

        <!-- Warning before reveal -->
        <div v-if="!revealed" class="space-y-4">
          <div class="p-4 rounded-xl bg-warning/10 border border-warning/20">
            <div class="flex gap-3">
              <UIcon name="i-lucide-alert-triangle" class="w-6 h-6 text-warning flex-shrink-0" />
              <div>
                <p class="font-medium">Security Warning</p>
                <p class="text-sm text-gray-500 mt-1">
                  Anyone with your recovery phrase can access your funds. Never share it with anyone.
                </p>
              </div>
            </div>
          </div>

          <p class="text-sm text-gray-500 text-center">
            Make sure no one is watching your screen before revealing your phrase.
          </p>

          <UButton color="primary" block @click="revealed = true">
            Reveal Recovery Phrase
          </UButton>
        </div>

        <!-- Revealed phrase -->
        <div v-else class="space-y-4">
          <p class="text-sm text-gray-500">
            These 12 words are your recovery phrase. Write them down and keep them safe.
          </p>

          <div class="grid grid-cols-3 gap-2 p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
            <div v-for="(word, index) in phraseWords" :key="index"
              class="flex items-center gap-2 p-2 rounded bg-white dark:bg-gray-900">
              <span class="text-xs text-gray-400 w-4">{{ index + 1 }}</span>
              <span class="font-mono text-sm">{{ word }}</span>
            </div>
          </div>

          <div class="flex gap-2">
            <UButton variant="outline" class="flex-1" :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              @click="copyPhrase">
              {{ copied ? 'Copied!' : 'Copy' }}
            </UButton>
            <UButton color="primary" class="flex-1" @click="close">
              Done
            </UButton>
          </div>

          <p class="text-xs text-gray-400 text-center">
            ⚠️ Never share this phrase. Never enter it on any website.
          </p>
        </div>
      </div>
    </template>
  </USlideover>
</template>
