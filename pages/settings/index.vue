<script setup lang="ts">
/**
 * Settings Page
 *
 * Comprehensive settings page with all configuration options.
 * Consolidates wallet, network, P2P, notifications, security, and appearance settings.
 */
import { useNetworkStore, type NetworkType } from '~/stores/network'
import { useOnboardingStore } from '~/stores/onboarding'
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'
import { useActivityStore } from '~/stores/activity'
import { useWalletStore } from '~/stores/wallet'
import { useSettingsStore } from '~/stores/settings'

definePageMeta({
  title: 'Settings',
})

const route = useRoute()
const colorMode = useColorMode()
const networkStore = useNetworkStore()
const onboardingStore = useOnboardingStore()
const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()
const activityStore = useActivityStore()
const walletStore = useWalletStore()
const settingsStore = useSettingsStore()

// Overlay management via useOverlays
const { openBackupModal, openRestoreWalletModal } = useOverlays()
// PWA install button
const { isInstalled } = usePWAInstall()

// Loading states for async operations
const p2pLoading = ref(false)
const signerLoading = ref(false)

// Watch for query params
watch(() => route.query, async (query) => {
  if (query.backup === 'true') {
    await openBackupModal(true)
  }
}, { immediate: true })

// Computed - read from stores
const isBackedUp = computed(() => onboardingStore.backupComplete)
const isConnected = computed(() => networkStore.initialized)
const p2pConnected = computed(() => p2pStore.connected)
const peerCount = computed(() => p2pStore.peerCount)

const networkDescription = computed(() => {
  return networkStore.isProduction ? 'Lotus Mainnet' : 'Lotus Testnet'
})

const connectionStatus = computed(() => {
  return isConnected.value ? 'Connected' : 'Disconnected'
})

// Network selection - computed with getter/setter
const selectedNetwork = computed({
  get: () => networkStore.currentNetwork,
  set: async (newNetwork: NetworkType) => {
    if (newNetwork !== networkStore.currentNetwork) {
      await networkStore.switchNetwork(newNetwork)
      window.location.reload()
    }
  },
})

// P2P enabled - computed with getter/setter that persists to store
const p2pEnabled = computed({
  get: () => p2pStore.settings.autoConnect,
  set: async (enabled: boolean) => {
    if (p2pLoading.value) return
    p2pLoading.value = true

    try {
      // Update the setting first
      p2pStore.updateSettings({ autoConnect: enabled })

      if (enabled && !p2pStore.initialized) {
        await p2pStore.initialize()
      } else if (!enabled && p2pStore.initialized) {
        await p2pStore.stop()
      }
    } catch (error) {
      console.error('Failed to toggle P2P:', error)
      // Revert the setting on error
      p2pStore.updateSettings({ autoConnect: !enabled })
    } finally {
      p2pLoading.value = false
    }
  },
})

// Signer enabled - computed with getter/setter
const signerEnabled = computed({
  get: () => musig2Store.signerEnabled,
  set: async (enabled: boolean) => {
    if (signerLoading.value) return
    signerLoading.value = true

    try {
      if (enabled) {
        // Ensure P2P is initialized first
        if (!p2pStore.initialized) {
          await p2pStore.initialize()
        }

        // Ensure MuSig2 is initialized
        if (!musig2Store.initialized) {
          await musig2Store.initialize()
        }

        // Now advertise as signer
        await musig2Store.advertiseSigner({
          nickname: 'My Wallet',
          transactionTypes: ['spend'],
        })
      } else {
        await musig2Store.withdrawSigner()
      }
    } catch (error) {
      console.error('Failed to toggle signer:', error)
    } finally {
      signerLoading.value = false
    }
  },
})

// Hide balance - computed with getter/setter
const hideBalance = computed({
  get: () => settingsStore.hideBalance,
  set: (value: boolean) => settingsStore.setHideBalance(value),
})

// Address type - computed with getter/setter
const addressType = computed({
  get: () => walletStore.addressType,
  set: async (newType: typeof walletStore.addressType) => {
    if (walletStore.addressType !== newType) {
      try {
        await walletStore.switchAddressType(newType)
      } catch (error) {
        console.error('Failed to switch address type:', error)
      }
    }
  },
})

const addressTypeOptions = [
  { value: 'p2tr-commitment', label: 'Modern (Taproot)' },
  { value: 'p2pkh', label: 'Legacy (P2PKH)' },
]

// Theme - computed with getter/setter
const selectedTheme = computed({
  get: () => colorMode.preference,
  set: (value: string) => {
    colorMode.preference = value
  },
})

const themeOptions = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const networkOptions = [
  { value: 'livenet', label: 'Mainnet' },
  { value: 'testnet', label: 'Testnet' },
]

// Dismissed prompts
const dismissedPrompts = computed(() => {
  const prompts: { key: string; label: string }[] = []
  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('ux:dismissed:')) {
        prompts.push({
          key,
          label: key.replace('ux:dismissed:', '').replace(/:/g, ' ').replace(/-/g, ' '),
        })
      }
    }
  }
  return prompts
})

// Methods
async function openBackup() {
  await openBackupModal()
}

async function openRestore() {
  await openRestoreWalletModal()
}

function resetPrompt(key: string) {
  localStorage.removeItem(key)
}

function resetAllPrompts() {
  dismissedPrompts.value.forEach(p => localStorage.removeItem(p.key))
  onboardingStore.resetHints()
}

function openLink(url: string) {
  window.open(url, '_blank')
}

function confirmClearActivity() {
  if (confirm('Clear all activity history? This cannot be undone.')) {
    activityStore.clearAll()
  }
}

function confirmResetWallet() {
  if (confirm('Reset wallet? This will delete all data. Make sure you have backed up your recovery phrase!')) {
    // Clear all storage
    localStorage.clear()
    sessionStorage.clear()
    // Reload to trigger fresh onboarding
    window.location.href = '/'
  }
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Settings</h1>

    <!-- Wallet Section -->
    <SettingsSection title="Wallet" icon="i-lucide-wallet">
      <SettingsItem label="Address Type" description="Modern or Legacy">
        <template #right>
          <USelect v-model="addressType" :items="addressTypeOptions" size="sm" class="w-40"
            :disabled="walletStore.loading" />
        </template>
      </SettingsItem>

      <SettingsItem label="Backup Recovery Phrase" description="Secure your wallet with a backup"
        :badge="!isBackedUp ? 'Required' : undefined" badge-color="warning" @click="openBackup">
        <template #right>
          <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-gray-400" />
        </template>
      </SettingsItem>

      <SettingsItem label="Restore Wallet" description="Restore from recovery phrase" @click="openRestore">
        <template #right>
          <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-gray-400" />
        </template>
      </SettingsItem>
    </SettingsSection>

    <!-- Network Section -->
    <SettingsSection title="Network" icon="i-lucide-globe">
      <SettingsItem label="Network" :description="networkDescription">
        <template #right>
          <USelect v-model="selectedNetwork" :items="networkOptions" size="sm" class="w-28" />
        </template>
      </SettingsItem>

      <SettingsItem label="Chronik Server" :description="networkStore.chronikUrl">
        <template #right>
          <span class="w-2 h-2 rounded-full" :class="isConnected ? 'bg-success' : 'bg-error'" />
        </template>
      </SettingsItem>

      <SettingsItem label="Connection Status" :description="connectionStatus">
        <template #right>
          <span class="w-2 h-2 rounded-full" :class="isConnected ? 'bg-success' : 'bg-error'" />
        </template>
      </SettingsItem>
    </SettingsSection>

    <!-- P2P Section -->
    <SettingsSection title="P2P & Discovery" icon="i-lucide-radio">
      <SettingsItem label="Enable P2P Networking" description="Connect to other wallets for real-time features">
        <template #right>
          <USwitch v-model="p2pEnabled" />
        </template>
      </SettingsItem>

      <template v-if="p2pEnabled">
        <SettingsItem label="Advertise as Signer" description="Let others discover you for shared wallets">
          <template #right>
            <USwitch v-model="signerEnabled" />
          </template>
        </SettingsItem>

        <SettingsItem label="P2P Status" :description="`${peerCount} peers connected`">
          <template #right>
            <span class="w-2 h-2 rounded-full" :class="p2pConnected ? 'bg-success' : 'bg-warning'" />
          </template>
        </SettingsItem>
      </template>
    </SettingsSection>

    <!-- Security Section -->
    <SettingsSection title="Security" icon="i-lucide-shield">
      <SettingsItem label="Hide Balance by Default" description="Balance hidden until tapped">
        <template #right>
          <USwitch v-model="hideBalance" />
        </template>
      </SettingsItem>
    </SettingsSection>

    <!-- Appearance Section -->
    <SettingsSection title="Appearance" icon="i-lucide-palette">
      <SettingsItem label="Theme" description="Choose your preferred theme">
        <template #right>
          <USelect v-model="selectedTheme" :items="themeOptions" size="sm" class="w-28" />
        </template>
      </SettingsItem>
    </SettingsSection>

    <!-- App Section -->
    <SettingsSection title="App" icon="i-lucide-download">
      <SettingsItem v-if="!isInstalled" label="Install App" description="Add to home screen for quick access">
        <template #right>
          <UiPWAInstallButton />
        </template>
      </SettingsItem>
      <SettingsItem v-else label="App Installed" description="Launch app from home screen" />
    </SettingsSection>

    <!-- Dismissed Prompts Section -->
    <SettingsSection v-if="dismissedPrompts.length > 0" title="Dismissed Prompts" icon="i-lucide-eye-off">
      <div class="p-4 space-y-3">
        <p class="text-sm text-gray-500">
          You've dismissed some helpful prompts. Re-enable them here.
        </p>

        <div class="space-y-2">
          <div v-for="prompt in dismissedPrompts" :key="prompt.key"
            class="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
            <span class="text-sm capitalize">{{ prompt.label }}</span>
            <UButton size="xs" variant="ghost" @click="resetPrompt(prompt.key)">
              Show again
            </UButton>
          </div>
        </div>

        <UButton variant="ghost" size="sm" @click="resetAllPrompts">
          Reset all prompts
        </UButton>
      </div>
    </SettingsSection>

    <!-- About Section -->
    <SettingsSection title="About" icon="i-lucide-info">
      <SettingsItem label="Version" description="1.0.0" />

      <SettingsItem label="Website" description="lotusia.org" @click="openLink('https://lotusia.org')">
        <template #right>
          <UIcon name="i-lucide-external-link" class="w-5 h-5 text-gray-400" />
        </template>
      </SettingsItem>

      <SettingsItem label="Documentation" description="Learn how to use Lotus"
        @click="openLink('https://lotusia.org/docs')">
        <template #right>
          <UIcon name="i-lucide-external-link" class="w-5 h-5 text-gray-400" />
        </template>
      </SettingsItem>

      <SettingsItem label="Support" description="Get help with issues" @click="openLink('https://lotusia.org/faq')">
        <template #right>
          <UIcon name="i-lucide-external-link" class="w-5 h-5 text-gray-400" />
        </template>
      </SettingsItem>
    </SettingsSection>

    <!-- Danger Zone -->
    <SettingsSection title="Danger Zone" icon="i-lucide-alert-triangle" variant="danger">
      <SettingsItem label="Clear Activity History" description="Remove all activity from this device"
        @click="confirmClearActivity">
        <template #right>
          <UButton color="error" variant="ghost" size="xs">Clear</UButton>
        </template>
      </SettingsItem>

      <SettingsItem label="Reset Wallet" description="Delete wallet and all data" @click="confirmResetWallet">
        <template #right>
          <UButton color="error" variant="ghost" size="xs">Reset</UButton>
        </template>
      </SettingsItem>
    </SettingsSection>

    <!-- All modals are managed by useOverlays composable -->
  </div>
</template>
