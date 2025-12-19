<script setup lang="ts">
/**
 * Settings Page
 *
 * Phase 6: Added dismissed prompts management section.
 * Main settings hub with links to various settings sections.
 */
import { useWalletStore } from '~/stores/wallet'
import {
  getDismissedPromptsWithInfo,
  resetDismissedPrompt,
  resetAllDismissedPrompts,
  type DismissedPromptInfo,
} from '~/composables/useDismissible'

definePageMeta({
  title: 'Settings',
})

const walletStore = useWalletStore()
const colorMode = useColorMode()
const toast = useToast()
const router = useRouter()

// Reset wallet confirmation
const showResetConfirm = ref(false)
const resetConfirmText = ref('')

// Dismissed prompts management
const dismissedPrompts = ref<DismissedPromptInfo[]>([])

onMounted(() => {
  refreshDismissedPrompts()
})

function refreshDismissedPrompts() {
  dismissedPrompts.value = getDismissedPromptsWithInfo()
}

function handleResetPrompt(key: string) {
  resetDismissedPrompt(key)
  refreshDismissedPrompts()
  toast.add({
    title: 'Prompt Reset',
    description: 'This prompt will show again next time.',
    color: 'success',
  })
}

function handleResetAllPrompts() {
  resetAllDismissedPrompts()
  refreshDismissedPrompts()
  toast.add({
    title: 'All Prompts Reset',
    description: 'All dismissed prompts will show again.',
    color: 'success',
  })
}

async function resetWallet() {
  if (resetConfirmText.value.toLowerCase() !== 'reset') return

  try {
    // Clear local storage
    localStorage.removeItem('lotus-wallet-state')
    localStorage.removeItem('lotus-contacts')
    localStorage.removeItem('lotus-onboarding')

    toast.add({
      title: 'Wallet Reset',
      description: 'All data has been cleared. Reloading...',
      color: 'success',
    })

    // Reload the page to reinitialize
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  } catch (error) {
    toast.add({
      title: 'Reset Failed',
      description: 'Failed to reset wallet',
      color: 'error',
    })
  }
}

const settingsSections = [
  {
    title: 'General',
    items: [
      {
        label: 'Network',
        description: 'Switch between mainnet and testnet',
        icon: 'i-lucide-network',
        to: '/settings/network',
      },
      {
        label: 'Notifications',
        description: 'Configure alerts and browser notifications',
        icon: 'i-lucide-bell',
        to: '/settings/notifications',
      },
      {
        label: 'Appearance',
        description: 'Theme and display preferences',
        icon: 'i-lucide-palette',
        action: 'theme',
      },
    ],
  },
  {
    title: 'Security',
    items: [
      {
        label: 'Backup',
        description: 'View and verify your seed phrase',
        icon: 'i-lucide-shield',
        to: '/settings/backup',
      },
      {
        label: 'Restore',
        description: 'Restore wallet from seed phrase',
        icon: 'i-lucide-upload',
        to: '/settings/restore',
      },
      {
        label: 'Security',
        description: 'PIN, auto-lock, and privacy settings',
        icon: 'i-lucide-lock',
        to: '/settings/security',
      },
    ],
  },
  {
    title: 'Advanced',
    items: [
      {
        label: 'Advertise',
        description: 'Become a signer for multi-signature transactions',
        icon: 'i-lucide-megaphone',
        to: '/settings/advertise',
      },
      {
        label: 'P2P Configuration',
        description: 'Advanced peer-to-peer network settings',
        icon: 'i-lucide-radio',
        to: '/settings/p2p',
      },
      {
        label: 'About',
        description: 'Version info and links',
        icon: 'i-lucide-info',
        to: '/settings/about',
      },
    ],
  },
]

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <div class="space-y-4">
    <div v-for="section in settingsSections" :key="section.title">
      <h3 class="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">
        {{ section.title }}
      </h3>

      <UiAppCard :no-padding="true">
        <div class="divide-y divide-gray-100 dark:divide-gray-800">
          <template v-for="item in section.items" :key="item.label">
            <!-- Link item -->
            <NuxtLink v-if="item.to" :to="item.to"
              class="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <UIcon :name="item.icon" class="w-5 h-5 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm">{{ item.label }}</div>
                <div class="text-xs text-muted truncate">{{ item.description }}</div>
              </div>
              <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted shrink-0" />
            </NuxtLink>

            <!-- Theme toggle -->
            <div v-else-if="item.action === 'theme'" class="flex items-center gap-3 p-3">
              <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <UIcon :name="item.icon" class="w-5 h-5 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm">{{ item.label }}</div>
                <div class="text-xs text-muted truncate">{{ item.description }}</div>
              </div>
              <UButton :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'" color="neutral"
                variant="soft" size="sm" @click="toggleTheme">
                {{ colorMode.value === 'dark' ? 'Light' : 'Dark' }}
              </UButton>
            </div>
          </template>
        </div>
      </UiAppCard>
    </div>

    <!-- Dismissed Prompts Section -->
    <div v-if="dismissedPrompts.length > 0">
      <h3 class="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">
        Dismissed Prompts
      </h3>
      <UiAppCard :no-padding="true">
        <div class="p-3 border-b border-gray-100 dark:border-gray-800">
          <p class="text-sm text-muted">
            You've dismissed some helpful prompts. Re-enable them here if you'd like to see them again.
          </p>
        </div>
        <div class="divide-y divide-gray-100 dark:divide-gray-800">
          <div v-for="prompt in dismissedPrompts" :key="prompt.key" class="flex items-center gap-3 p-3">
            <div class="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-message-circle" class="w-5 h-5 text-info" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm">{{ prompt.label }}</div>
              <div v-if="prompt.description" class="text-xs text-muted truncate">
                {{ prompt.description }}
              </div>
            </div>
            <UButton color="neutral" variant="soft" size="xs" @click="handleResetPrompt(prompt.key)">
              Show again
            </UButton>
          </div>
        </div>
        <div class="p-3 border-t border-gray-100 dark:border-gray-800">
          <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-refresh-cw" @click="handleResetAllPrompts">
            Reset all prompts
          </UButton>
        </div>
      </UiAppCard>
    </div>

    <!-- Danger Zone -->
    <div>
      <h3 class="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2 px-1">
        Danger Zone
      </h3>
      <UiAppCard :no-padding="true">
        <div class="flex items-center gap-3 p-3">
          <div class="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-trash-2" class="w-5 h-5 text-red-500" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm">Reset Wallet</div>
            <div class="text-xs text-muted">Delete all data and start fresh</div>
          </div>
          <UButton color="error" variant="soft" size="sm" @click="showResetConfirm = true">
            Reset
          </UButton>
        </div>
      </UiAppCard>
    </div>

    <!-- Reset Confirmation Modal -->
    <UModal v-model:open="showResetConfirm">
      <template #content>
        <div class="p-6">
          <div class="text-center mb-4">
            <div
              class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <UIcon name="i-lucide-alert-triangle" class="w-8 h-8 text-red-500" />
            </div>
            <h3 class="text-lg font-semibold text-red-600">Reset Wallet?</h3>
            <p class="text-sm text-muted mt-2">
              This will permanently delete your wallet data. Make sure you have backed up your seed phrase!
            </p>
          </div>

          <UAlert color="error" icon="i-lucide-alert-circle" class="mb-4">
            <template #description>
              Without your seed phrase, you will lose access to your funds forever.
            </template>
          </UAlert>

          <UFormField label="Type 'reset' to confirm">
            <UInput v-model="resetConfirmText" placeholder="reset" />
          </UFormField>

          <div class="flex gap-3 mt-4">
            <UButton color="neutral" variant="outline" class="flex-1" @click="showResetConfirm = false">
              Cancel
            </UButton>
            <UButton color="error" class="flex-1" :disabled="resetConfirmText.toLowerCase() !== 'reset'"
              @click="resetWallet">
              Reset Wallet
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
