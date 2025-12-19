# 11: Settings Pages

## Overview

This document details the refactoring of the Settings pages. The current implementation has scattered settings and confusing navigation.

---

## Current Problems (from SETTINGS_UX_ANALYSIS.md)

1. **Misleading labels** - "P2P Settings" goes to network page
2. **Missing security settings** - No PIN, no auto-lock
3. **Missing privacy settings** - No analytics opt-out
4. **No backup verification** - Users can skip backup
5. **Scattered P2P settings** - Split across 3 pages

---

## Target Structure

```
/settings
├── Wallet
│   ├── Backup Seed Phrase
│   └── Restore Wallet
├── Security (NEW)
│   ├── PIN/Password
│   ├── Auto-lock
│   └── Require PIN for transactions
├── Network
│   ├── Blockchain Network
│   └── P2P Configuration
├── P2P Services
│   └── Advertise as Signer
├── Appearance
│   └── Theme
└── About
    ├── Documentation
    └── GitHub
```

---

## Page: settings/index.vue

```vue
<!-- pages/settings/index.vue -->
<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <AppHeroCard
      icon="i-lucide-settings"
      title="Settings"
      subtitle="Configure your wallet"
    />

    <!-- Backup Warning -->
    <UAlert
      v-if="!onboardingStore.backupComplete"
      color="warning"
      icon="i-lucide-alert-triangle"
      title="Backup Required"
      description="Your wallet is not backed up. If you lose access to this device, you will lose your funds."
    >
      <template #actions>
        <UButton color="warning" size="sm" to="/settings/backup">
          Backup Now
        </UButton>
      </template>
    </UAlert>

    <!-- Settings Sections -->
    <div class="space-y-4">
      <SettingsSection
        v-for="section in settingsSections"
        :key="section.title"
        :title="section.title"
        :icon="section.icon"
        :items="section.items"
      />
    </div>

    <!-- Version Info -->
    <div class="text-center text-sm text-muted">
      <p>Lotus Web Wallet v{{ version }}</p>
      <p>Network: {{ networkStore.currentNetwork }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const networkStore = useNetworkStore()
const onboardingStore = useOnboardingStore()

const version = '1.0.0' // TODO: Get from package.json

const settingsSections = [
  {
    title: 'Wallet',
    icon: 'i-lucide-wallet',
    items: [
      {
        label: 'Backup Seed Phrase',
        description: 'View and verify your recovery phrase',
        icon: 'i-lucide-key',
        to: '/settings/backup',
        badge: !onboardingStore.backupComplete ? 'Required' : undefined,
        badgeColor: 'warning',
      },
      {
        label: 'Restore Wallet',
        description: 'Restore from seed phrase',
        icon: 'i-lucide-upload',
        to: '/settings/restore',
      },
    ],
  },
  {
    title: 'Security',
    icon: 'i-lucide-shield',
    items: [
      {
        label: 'Wallet Lock',
        description: 'Set up PIN or password protection',
        icon: 'i-lucide-lock',
        to: '/settings/security',
      },
    ],
  },
  {
    title: 'Network',
    icon: 'i-lucide-network',
    items: [
      {
        label: 'Blockchain Network',
        description: 'Switch between mainnet and testnet',
        icon: 'i-lucide-globe',
        to: '/settings/network',
        badge:
          networkStore.currentNetwork === 'testnet' ? 'Testnet' : undefined,
        badgeColor: 'warning',
      },
      {
        label: 'P2P Configuration',
        description: 'Advanced P2P network settings',
        icon: 'i-lucide-radio',
        to: '/settings/p2p',
      },
    ],
  },
  {
    title: 'P2P Services',
    icon: 'i-lucide-users',
    items: [
      {
        label: 'Advertise Services',
        description: 'Become a signer on the P2P network',
        icon: 'i-lucide-megaphone',
        to: '/settings/advertise',
      },
    ],
  },
  {
    title: 'Appearance',
    icon: 'i-lucide-palette',
    items: [
      {
        label: 'Theme',
        description: 'Choose light or dark mode',
        icon: 'i-lucide-sun',
        action: 'theme',
      },
    ],
  },
  {
    title: 'About',
    icon: 'i-lucide-info',
    items: [
      {
        label: 'Documentation',
        description: 'Learn how to use Lotus Wallet',
        icon: 'i-lucide-book-open',
        href: 'https://lotusia.org/docs',
        external: true,
      },
      {
        label: 'GitHub',
        description: 'View source code and report issues',
        icon: 'i-lucide-github',
        href: 'https://github.com/LotusiaStewardship/lotus-web-wallet',
        external: true,
      },
    ],
  },
]
</script>
```

---

## Component: SettingsSection.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  title: string
  icon: string
  items: SettingsItem[]
}>()

interface SettingsItem {
  label: string
  description?: string
  icon: string
  to?: string
  href?: string
  external?: boolean
  action?: string
  badge?: string
  badgeColor?: string
}

const colorMode = useColorMode()

function handleAction(action: string) {
  if (action === 'theme') {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  }
}
</script>

<template>
  <AppCard :title="title" :icon="icon">
    <div class="divide-y divide-default -mx-4">
      <component
        :is="item.to ? 'NuxtLink' : item.href ? 'a' : 'button'"
        v-for="item in items"
        :key="item.label"
        :to="item.to"
        :href="item.href"
        :target="item.external ? '_blank' : undefined"
        class="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors w-full text-left"
        @click="item.action && handleAction(item.action)"
      >
        <!-- Icon -->
        <div
          class="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0"
        >
          <UIcon :name="item.icon" class="w-5 h-5 text-muted" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="font-medium">{{ item.label }}</p>
            <UBadge
              v-if="item.badge"
              :color="item.badgeColor || 'neutral'"
              variant="subtle"
              size="xs"
            >
              {{ item.badge }}
            </UBadge>
          </div>
          <p v-if="item.description" class="text-sm text-muted">
            {{ item.description }}
          </p>
        </div>

        <!-- Arrow -->
        <UIcon
          :name="
            item.external ? 'i-lucide-external-link' : 'i-lucide-chevron-right'
          "
          class="w-5 h-5 text-muted flex-shrink-0"
        />
      </component>
    </div>
  </AppCard>
</template>
```

---

## Page: settings/backup.vue

```vue
<!-- pages/settings/backup.vue -->
<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <SettingsBackButton />

    <AppHeroCard
      icon="i-lucide-key"
      title="Backup Seed Phrase"
      subtitle="Your 12-word recovery phrase"
    />

    <!-- Warning -->
    <UAlert
      color="error"
      icon="i-lucide-alert-triangle"
      title="Keep this secret!"
    >
      <template #description>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>Never share your seed phrase with anyone</li>
          <li>Never enter it on any website</li>
          <li>Write it down and store it securely offline</li>
          <li>Anyone with this phrase can access your funds</li>
        </ul>
      </template>
    </UAlert>

    <!-- Seed Phrase Display -->
    <AppCard v-if="showSeedPhrase">
      <div class="grid grid-cols-3 gap-3 mb-4">
        <div
          v-for="(word, index) in seedWords"
          :key="index"
          class="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
        >
          <span class="text-xs text-muted w-5">{{ index + 1 }}.</span>
          <span class="font-mono font-medium">{{ word }}</span>
        </div>
      </div>

      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-copy"
          @click="copySeedPhrase"
        >
          Copy
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-eye-off"
          @click="showSeedPhrase = false"
        >
          Hide
        </UButton>
      </div>
    </AppCard>

    <!-- Reveal Button -->
    <AppCard v-else>
      <div class="text-center py-8">
        <UIcon
          name="i-lucide-eye-off"
          class="w-12 h-12 text-muted mx-auto mb-4"
        />
        <p class="text-muted mb-4">Your seed phrase is hidden for security</p>
        <UButton color="primary" icon="i-lucide-eye" @click="revealSeedPhrase">
          Reveal Seed Phrase
        </UButton>
      </div>
    </AppCard>

    <!-- Verification -->
    <AppCard
      v-if="!onboardingStore.backupComplete"
      title="Verify Backup"
      icon="i-lucide-check-circle"
    >
      <p class="text-sm text-muted mb-4">
        Confirm you've saved your seed phrase by entering the words below.
      </p>

      <div class="space-y-4">
        <UFormField
          v-for="(wordIndex, i) in verificationIndices"
          :key="i"
          :label="`Word #${wordIndex + 1}`"
        >
          <UInput
            v-model="verificationInputs[i]"
            placeholder="Enter word"
            :color="getVerificationColor(i)"
          />
        </UFormField>

        <UButton
          color="primary"
          block
          :disabled="!canVerify"
          @click="verifyBackup"
        >
          Verify Backup
        </UButton>
      </div>
    </AppCard>

    <!-- Already Verified -->
    <UAlert
      v-else
      color="success"
      icon="i-lucide-check-circle"
      title="Backup Verified"
      description="You have verified your seed phrase backup."
    />
  </div>
</template>

<script setup lang="ts">
const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()
const { copy } = useClipboard()
const { success, error } = useNotifications()

// State
const showSeedPhrase = ref(false)
const verificationInputs = ref(['', '', ''])

// Get seed phrase words
const seedWords = computed(() => {
  // TODO: Get from wallet store securely
  return walletStore.getMnemonic()?.split(' ') || []
})

// Random verification indices
const verificationIndices = computed(() => {
  const indices: number[] = []
  while (indices.length < 3) {
    const idx = Math.floor(Math.random() * 12)
    if (!indices.includes(idx)) {
      indices.push(idx)
    }
  }
  return indices.sort((a, b) => a - b)
})

const canVerify = computed(() => verificationInputs.value.every(v => v.trim()))

function revealSeedPhrase() {
  // TODO: Require PIN if enabled
  showSeedPhrase.value = true
}

function copySeedPhrase() {
  copy(seedWords.value.join(' '), 'Seed phrase')
}

function getVerificationColor(index: number): string {
  const input = verificationInputs.value[index].trim().toLowerCase()
  if (!input) return 'neutral'
  const expected =
    seedWords.value[verificationIndices.value[index]]?.toLowerCase()
  return input === expected ? 'success' : 'error'
}

function verifyBackup() {
  const allCorrect = verificationIndices.value.every((wordIndex, i) => {
    const input = verificationInputs.value[i].trim().toLowerCase()
    const expected = seedWords.value[wordIndex]?.toLowerCase()
    return input === expected
  })

  if (allCorrect) {
    onboardingStore.markBackupComplete()
    success('Backup Verified', 'Your seed phrase has been verified')
  } else {
    error('Verification Failed', 'One or more words are incorrect')
  }
}
</script>
```

---

## Page: settings/security.vue (NEW)

```vue
<!-- pages/settings/security.vue -->
<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <SettingsBackButton />

    <AppHeroCard
      icon="i-lucide-shield"
      title="Security"
      subtitle="Protect your wallet"
    />

    <!-- PIN/Password -->
    <AppCard title="Wallet Lock" icon="i-lucide-lock">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Enable PIN</p>
            <p class="text-sm text-muted">Require PIN to open wallet</p>
          </div>
          <USwitch v-model="pinEnabled" @update:model-value="togglePin" />
        </div>

        <div v-if="pinEnabled" class="flex items-center justify-between">
          <div>
            <p class="font-medium">Change PIN</p>
            <p class="text-sm text-muted">Update your wallet PIN</p>
          </div>
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            @click="openChangePinModal"
          >
            Change
          </UButton>
        </div>
      </div>
    </AppCard>

    <!-- Auto-Lock -->
    <AppCard title="Auto-Lock" icon="i-lucide-timer">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Auto-lock timeout</p>
            <p class="text-sm text-muted">Lock wallet after inactivity</p>
          </div>
          <USelectMenu
            v-model="autoLockTimeout"
            :items="autoLockOptions"
            :disabled="!pinEnabled"
          />
        </div>
      </div>
    </AppCard>

    <!-- Transaction Security -->
    <AppCard title="Transaction Security" icon="i-lucide-shield-check">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Require PIN for transactions</p>
            <p class="text-sm text-muted">Confirm PIN before sending</p>
          </div>
          <USwitch v-model="requirePinForTx" :disabled="!pinEnabled" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Require PIN to view seed phrase</p>
            <p class="text-sm text-muted">Protect backup access</p>
          </div>
          <USwitch v-model="requirePinForBackup" :disabled="!pinEnabled" />
        </div>
      </div>
    </AppCard>

    <!-- Danger Zone -->
    <AppCard title="Danger Zone" icon="i-lucide-alert-triangle">
      <UButton
        color="error"
        variant="outline"
        icon="i-lucide-trash-2"
        @click="confirmClearWallet"
      >
        Clear Wallet Data
      </UButton>
      <p class="text-sm text-muted mt-2">
        This will delete all wallet data from this device. Make sure you have
        backed up your seed phrase.
      </p>
    </AppCard>

    <!-- Set PIN Modal -->
    <SetPinModal
      v-model:open="setPinModalOpen"
      :mode="setPinMode"
      @complete="handlePinSet"
    />
  </div>
</template>

<script setup lang="ts">
const walletStore = useWalletStore()
const { success, error } = useNotifications()

// State
const pinEnabled = ref(false)
const autoLockTimeout = ref('5')
const requirePinForTx = ref(true)
const requirePinForBackup = ref(true)
const setPinModalOpen = ref(false)
const setPinMode = ref<'set' | 'change'>('set')

const autoLockOptions = [
  { label: '1 minute', value: '1' },
  { label: '5 minutes', value: '5' },
  { label: '15 minutes', value: '15' },
  { label: '30 minutes', value: '30' },
  { label: 'Never', value: 'never' },
]

function togglePin(enabled: boolean) {
  if (enabled) {
    setPinMode.value = 'set'
    setPinModalOpen.value = true
  } else {
    // TODO: Require current PIN to disable
    pinEnabled.value = false
  }
}

function openChangePinModal() {
  setPinMode.value = 'change'
  setPinModalOpen.value = true
}

function handlePinSet() {
  pinEnabled.value = true
  success('PIN Set', 'Your wallet is now protected')
}

function confirmClearWallet() {
  // TODO: Show confirmation modal
}
</script>
```

---

## Page: settings/network.vue

```vue
<!-- pages/settings/network.vue -->
<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <SettingsBackButton />

    <AppHeroCard
      icon="i-lucide-globe"
      title="Network Settings"
      subtitle="Configure blockchain connection"
    />

    <!-- Current Network -->
    <AppCard title="Blockchain Network" icon="i-lucide-network">
      <div class="space-y-4">
        <div
          v-for="network in networks"
          :key="network.id"
          class="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors"
          :class="
            networkStore.currentNetwork === network.id
              ? 'border-primary bg-primary-50 dark:bg-primary-900/20'
              : 'border-default hover:border-primary/50'
          "
          @click="selectNetwork(network.id)"
        >
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center"
            :class="network.iconBg"
          >
            <UIcon
              :name="network.icon"
              :class="network.iconColor"
              class="w-5 h-5"
            />
          </div>
          <div class="flex-1">
            <p class="font-medium">{{ network.name }}</p>
            <p class="text-sm text-muted">{{ network.description }}</p>
          </div>
          <UIcon
            v-if="networkStore.currentNetwork === network.id"
            name="i-lucide-check-circle"
            class="w-5 h-5 text-primary"
          />
        </div>
      </div>
    </AppCard>

    <!-- Connection Status -->
    <AppCard title="Connection Status" icon="i-lucide-wifi">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-muted">Chronik</span>
          <UBadge
            :color="walletStore.connected ? 'success' : 'error'"
            variant="subtle"
          >
            {{ walletStore.connected ? 'Connected' : 'Disconnected' }}
          </UBadge>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-muted">Block Height</span>
          <span class="font-mono">{{
            walletStore.tipHeight.toLocaleString()
          }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-muted">Endpoint</span>
          <span class="text-sm font-mono truncate max-w-[200px]">
            {{ networkStore.chronikUrl }}
          </span>
        </div>
      </div>
    </AppCard>

    <!-- Advanced -->
    <AppCard title="Advanced" icon="i-lucide-settings">
      <div class="space-y-4">
        <UFormField label="Custom Chronik URL" hint="Leave empty for default">
          <UInput
            v-model="customChronikUrl"
            placeholder="https://chronik.lotusia.org"
          />
        </UFormField>

        <UButton
          color="neutral"
          variant="outline"
          :disabled="!customChronikUrl"
          @click="saveCustomUrl"
        >
          Save Custom URL
        </UButton>
      </div>
    </AppCard>

    <!-- Network Switch Confirmation -->
    <UModal v-model:open="confirmSwitchOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-alert-triangle"
                class="w-5 h-5 text-warning"
              />
              <span class="font-semibold">Switch Network?</span>
            </div>
          </template>

          <p class="mb-4">
            You are about to switch from
            <strong>{{ networkStore.currentNetwork }}</strong> to
            <strong>{{ pendingNetwork }}</strong
            >.
          </p>

          <UAlert color="warning" icon="i-lucide-info">
            <template #description>
              Your wallet address will change. Make sure you're using the
              correct address for the selected network.
            </template>
          </UAlert>

          <template #footer>
            <div class="flex gap-3">
              <UButton
                class="flex-1"
                color="neutral"
                variant="outline"
                @click="confirmSwitchOpen = false"
              >
                Cancel
              </UButton>
              <UButton class="flex-1" color="primary" @click="confirmSwitch">
                Switch Network
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const networkStore = useNetworkStore()
const walletStore = useWalletStore()
const { success } = useNotifications()

// State
const customChronikUrl = ref('')
const confirmSwitchOpen = ref(false)
const pendingNetwork = ref<'livenet' | 'testnet'>('livenet')

const networks = [
  {
    id: 'livenet',
    name: 'Mainnet',
    description: 'Production network with real XPI',
    icon: 'i-lucide-globe',
    iconBg: 'bg-success-100 dark:bg-success-900/30',
    iconColor: 'text-success',
  },
  {
    id: 'testnet',
    name: 'Testnet',
    description: 'Test network for development',
    icon: 'i-lucide-flask-conical',
    iconBg: 'bg-warning-100 dark:bg-warning-900/30',
    iconColor: 'text-warning',
  },
]

function selectNetwork(network: 'livenet' | 'testnet') {
  if (network === networkStore.currentNetwork) return

  pendingNetwork.value = network
  confirmSwitchOpen.value = true
}

async function confirmSwitch() {
  await networkStore.switchNetwork(pendingNetwork.value)
  confirmSwitchOpen.value = false
  success('Network Switched', `Now connected to ${pendingNetwork.value}`)
}

function saveCustomUrl() {
  networkStore.setCustomChronikUrl(customChronikUrl.value)
  success('URL Saved', 'Custom Chronik URL has been saved')
}
</script>
```

---

_Next: [12_ONBOARDING_FLOW.md](./12_ONBOARDING_FLOW.md)_
