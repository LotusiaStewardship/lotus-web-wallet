<script setup lang="ts">
import { useWalletStore, type AddressType } from '~/stores/wallet'
import { useP2PStore } from '~/stores/p2p'
import { useAddressFormat } from '~/composables/useUtils'

// Settings item types
interface SettingsItem {
  label: string
  icon: string
  to?: string
  href?: string
  external?: boolean
  action?: () => void
  description?: string
}

interface SettingsSection {
  title: string
  icon: string
  items: SettingsItem[]
}

definePageMeta({
  title: 'Settings',
})

const walletStore = useWalletStore()
const p2pStore = useP2PStore()
const toast = useToast()
const colorMode = useColorMode()
const { formatFingerprint, getAddressTypeLabel } = useAddressFormat()

// Address display toggle
const displayAddress = computed(() => walletStore.address)
const fingerprint = computed(() => formatFingerprint(walletStore.address))

// Address type info
const addressTypeInfo = computed(() => getAddressTypeLabel(walletStore.address))

// Address type options for the switcher
const addressTypeOptions = [
  { value: 'p2tr' as AddressType, label: 'Modern (Taproot)', description: 'Enhanced privacy and features' },
  { value: 'p2pkh' as AddressType, label: 'Classic', description: 'Traditional address format' },
]

// Handle address type change
const handleAddressTypeChange = async (newType: AddressType) => {
  if (newType === walletStore.addressType) return

  try {
    await walletStore.switchAddressType(newType)
    toast.add({
      title: 'Address Type Changed',
      description: `Switched to ${newType === 'p2tr' ? 'Modern (Taproot)' : 'Classic'} address`,
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (err) {
    toast.add({
      title: 'Failed to Switch',
      description: 'Could not change address type',
      color: 'error',
      icon: 'i-lucide-x',
    })
  }
}

// Settings sections - organized by logical grouping
const settingsSections: SettingsSection[] = [
  {
    title: 'Wallet',
    icon: 'i-lucide-wallet',
    items: [
      { label: 'Backup Seed Phrase', icon: 'i-lucide-key', to: '/settings/backup' },
      { label: 'Restore Wallet', icon: 'i-lucide-upload', to: '/settings/restore' },
    ],
  },
  {
    title: 'Network',
    icon: 'i-lucide-network',
    items: [
      { label: 'Blockchain Network', icon: 'i-lucide-globe', to: '/settings/network', description: 'Switch networks, view connection status' },
      { label: 'P2P Configuration', icon: 'i-lucide-radio', to: '/settings/p2p', description: 'DHT, GossipSub, NAT traversal' },
      { label: 'Advertise Services', icon: 'i-lucide-megaphone', to: '/settings/advertise', description: 'Become a signer, set presence' },
    ],
  },
  {
    title: 'Appearance',
    icon: 'i-lucide-palette',
    items: [
      {
        label: colorMode.value === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        icon: colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon',
        action: () => colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark',
      },
    ],
  },
  {
    title: 'About',
    icon: 'i-lucide-info',
    items: [
      { label: 'Documentation', icon: 'i-lucide-book-open', href: 'https://lotusia.org/docs', external: true },
      { label: 'GitHub', icon: 'i-lucide-github', href: 'https://github.com/LotusiaStewardship', external: true },
    ],
  },
]

// Show seed phrase modal
const showSeedPhrase = ref(false)
const seedPhraseVisible = ref(false)

const toggleSeedPhrase = () => {
  seedPhraseVisible.value = !seedPhraseVisible.value
}

// Copy seed phrase
const copySeedPhrase = async () => {
  try {
    await navigator.clipboard.writeText(walletStore.seedPhrase)
    toast.add({
      title: 'Copied',
      description: 'Seed phrase copied to clipboard',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (err) {
    toast.add({
      title: 'Copy Failed',
      color: 'error',
      icon: 'i-lucide-x',
    })
  }
}

// Copy address to clipboard
const copyAddress = async () => {
  try {
    await navigator.clipboard.writeText(walletStore.address)
    toast.add({
      title: 'Address Copied',
      description: 'Full address copied to clipboard',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (err) {
    toast.add({
      title: 'Copy Failed',
      color: 'error',
      icon: 'i-lucide-x',
    })
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold">Settings</h1>
      <p class="text-muted">Manage your wallet and preferences</p>
    </div>

    <!-- Wallet Info Card -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-wallet" class="w-5 h-5" />
          <span class="font-semibold">Wallet Information</span>
        </div>
      </template>

      <div class="space-y-4">
        <div>
          <div class="flex items-center gap-2">
            <code class="text-sm bg-muted/50 px-2 py-1 rounded flex-1 truncate cursor-pointer">
        {{ displayAddress }}
      </code>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-copy" @click="copyAddress" />
          </div>
          <div class="flex items-center gap-1.5 mt-1.5">
            <span class="text-xs text-muted">ID:</span>
            <UBadge color="neutral" variant="subtle" size="md" class="font-mono">
              {{ fingerprint }}
            </UBadge>
            <!-- Address type badge -->
            <UTooltip :text="addressTypeInfo.full">
              <UBadge :color="addressTypeInfo.color as any" variant="subtle" size="md" class="gap-1">
                <UIcon :name="addressTypeInfo.icon" class="w-3 h-3" />
                {{ addressTypeInfo.short }}
              </UBadge>
            </UTooltip>
          </div>
        </div>

        <!-- Address Type Selector -->
        <div>
          <p class="text-sm text-muted mb-2">Address Type</p>
          <div class="flex gap-2">
            <UButton v-for="option in addressTypeOptions" :key="option.value"
              :color="walletStore.addressType === option.value ? 'primary' : 'neutral'"
              :variant="walletStore.addressType === option.value ? 'solid' : 'outline'" size="sm"
              :disabled="walletStore.loading" @click="handleAddressTypeChange(option.value)">
              <UIcon :name="option.value === 'p2tr' ? 'i-lucide-shield-check' : 'i-lucide-key'" class="w-4 h-4 mr-1" />
              {{ option.label }}
            </UButton>
          </div>
          <p class="text-xs text-muted mt-1.5">
            {{ walletStore.addressType === 'p2tr'
              ? 'Modern addresses offer enhanced privacy and advanced scripting capabilities.'
              : 'Classic addresses use the traditional format compatible with all wallets.'
            }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-muted mb-1">Balance</p>
            <p class="font-mono font-semibold">{{ walletStore.formattedBalance }} XPI</p>
          </div>
          <div>
            <p class="text-sm text-muted mb-1">UTXOs</p>
            <p class="font-mono font-semibold">{{ walletStore.utxoCount }}</p>
          </div>
        </div>

        <div>
          <p class="text-sm text-muted mb-1">Network Status</p>
          <div class="flex items-center gap-2">
            <UBadge :color="walletStore.connected ? 'success' : 'error'" variant="subtle">
              {{ walletStore.connected ? 'Connected' : 'Disconnected' }}
            </UBadge>
            <span class="text-sm text-muted">Block {{ walletStore.tipHeight.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Settings Sections -->
    <UCard v-for="section in settingsSections" :key="section.title">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon :name="section.icon" class="w-5 h-5" />
          <span class="font-semibold">{{ section.title }}</span>
        </div>
      </template>

      <div class="divide-y divide-default -my-2">
        <template v-for="item in section.items" :key="item.label">
          <!-- Link item -->
          <NuxtLink v-if="item.to" :to="item.to"
            class="flex items-center justify-between py-3 hover:bg-muted/50 -mx-4 px-4 transition-colors">
            <div class="flex items-center gap-3">
              <UIcon :name="item.icon" class="w-5 h-5 text-muted" />
              <div>
                <span>{{ item.label }}</span>
                <p v-if="item.description" class="text-xs text-muted">{{ item.description }}</p>
              </div>
            </div>
            <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-muted" />
          </NuxtLink>

          <!-- External link -->
          <a v-else-if="item.href" :href="item.href" target="_blank"
            class="flex items-center justify-between py-3 hover:bg-muted/50 -mx-4 px-4 transition-colors">
            <div class="flex items-center gap-3">
              <UIcon :name="item.icon" class="w-5 h-5 text-muted" />
              <span>{{ item.label }}</span>
            </div>
            <UIcon name="i-lucide-external-link" class="w-5 h-5 text-muted" />
          </a>

          <!-- Action item -->
          <button v-else-if="item.action"
            class="flex items-center justify-between py-3 hover:bg-muted/50 -mx-4 px-4 transition-colors w-full text-left"
            @click="item.action">
            <div class="flex items-center gap-3">
              <UIcon :name="item.icon" class="w-5 h-5 text-muted" />
              <span>{{ item.label }}</span>
            </div>
          </button>
        </template>
      </div>
    </UCard>

    <!-- P2P Status -->
    <UCard v-if="p2pStore.initialized">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-radio" class="w-5 h-5" />
          <span class="font-semibold">P2P Network</span>
        </div>
      </template>

      <div class="space-y-3">
        <div>
          <p class="text-sm text-muted mb-1">Peer ID</p>
          <code class="text-xs bg-muted/50 px-2 py-1 rounded block truncate">
        {{ p2pStore.peerId }}
      </code>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <StatsCard :value="p2pStore.peerCount" label="Connected Peers" />
          <StatsCard :value="p2pStore.dhtReady ? 'Ready' : 'Syncing'" label="DHT Status" />
          <StatsCard :value="`${p2pStore.signerCount}`" label="Signers discovered" />
        </div>
      </div>
    </UCard>

    <!-- Version Info -->
    <div class="text-center text-sm text-muted py-4">
      <p>Lotus Web Wallet v0.1.0</p>
      <p class="text-xs">Built with Nuxt UI Pro</p>
    </div>
  </div>
</template>
