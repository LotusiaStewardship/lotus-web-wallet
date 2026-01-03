# Phase 7: Settings

## Overview

The Settings page is the **single configuration hub** for the entire wallet. All configuration lives here—no more scattered settings across P2P, Network, and Notifications pages.

**Prerequisites**: Phase 1-6  
**Estimated Effort**: 3-4 days  
**Priority**: P1

---

## Goals

1. Build comprehensive settings page
2. Consolidate all configuration in one place
3. Implement clear section organization
4. Add backup/restore functionality
5. Include security settings

---

## Settings Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    SETTINGS ORGANIZATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  WALLET                                                          │
│  ──────                                                          │
│  • Backup recovery phrase                                        │
│  • View recovery phrase                                          │
│  • Export wallet                                                 │
│                                                                  │
│  NETWORK                                                         │
│  ───────                                                         │
│  • Network selection (Mainnet/Testnet)                           │
│  • Chronik server                                                │
│  • Connection status                                             │
│                                                                  │
│  P2P & DISCOVERY                                                 │
│  ───────────────                                                 │
│  • Enable P2P networking                                         │
│  • Advertise as signer                                           │
│  • Signer settings (fee, transaction types)                      │
│  • Bootstrap nodes                                               │
│                                                                  │
│  NOTIFICATIONS                                                   │
│  ─────────────                                                   │
│  • Browser notifications                                         │
│  • Transaction alerts                                            │
│  • Signing request alerts                                        │
│  • Social/RANK alerts                                            │
│                                                                  │
│  SECURITY                                                        │
│  ────────                                                        │
│  • App lock (PIN/biometric)                                      │
│  • Auto-lock timeout                                             │
│  • Hide balance by default                                       │
│                                                                  │
│  APPEARANCE                                                      │
│  ──────────                                                      │
│  • Theme (Light/Dark/System)                                     │
│  • Currency display                                              │
│                                                                  │
│  ABOUT                                                           │
│  ─────                                                           │
│  • Version                                                       │
│  • Links (Website, Docs, Support)                                │
│  • Reset wallet                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Settings Page Implementation

```vue
<!-- pages/settings/index.vue -->
<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Settings</h1>

    <!-- Wallet Section -->
    <SettingsSection title="Wallet" icon="i-lucide-wallet">
      <SettingsItem
        label="Backup Recovery Phrase"
        description="Secure your wallet with a backup"
        :badge="!isBackedUp ? 'Required' : undefined"
        badge-color="warning"
        @click="openBackup"
      >
        <template #right>
          <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-muted" />
        </template>
      </SettingsItem>

      <SettingsItem
        label="View Recovery Phrase"
        description="Show your 12-word phrase"
        @click="openViewPhrase"
      >
        <template #right>
          <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-muted" />
        </template>
      </SettingsItem>

      <SettingsItem
        label="Export Wallet"
        description="Download wallet data"
        @click="exportWallet"
      >
        <template #right>
          <UIcon name="i-lucide-download" class="w-5 h-5 text-muted" />
        </template>
      </SettingsItem>
    </SettingsSection>

    <!-- Network Section -->
    <SettingsSection title="Network" icon="i-lucide-globe">
      <SettingsItem label="Network" :description="networkDescription">
        <template #right>
          <USelect
            v-model="settings.network"
            :items="networkOptions"
            size="sm"
          />
        </template>
      </SettingsItem>

      <SettingsItem label="Chronik Server" :description="settings.chronikUrl">
        <template #right>
          <UButton variant="ghost" size="xs" @click="openChronikSettings">
            Edit
          </UButton>
        </template>
      </SettingsItem>

      <SettingsItem label="Connection Status" :description="connectionStatus">
        <template #right>
          <span
            class="w-2 h-2 rounded-full"
            :class="isConnected ? 'bg-success' : 'bg-error'"
          />
        </template>
      </SettingsItem>
    </SettingsSection>

    <!-- P2P Section -->
    <SettingsSection title="P2P & Discovery" icon="i-lucide-radio">
      <SettingsItem
        label="Enable P2P Networking"
        description="Connect to other wallets for real-time features"
      >
        <template #right>
          <USwitch v-model="settings.p2pEnabled" />
        </template>
      </SettingsItem>

      <template v-if="settings.p2pEnabled">
        <SettingsItem
          label="Advertise as Signer"
          description="Let others discover you for shared wallets"
        >
          <template #right>
            <USwitch v-model="settings.advertiseAsSigner" />
          </template>
        </SettingsItem>

        <template v-if="settings.advertiseAsSigner">
          <SettingsItem
            label="Signer Fee"
            description="Fee charged per signature (in sats)"
          >
            <template #right>
              <UInput
                v-model="settings.signerFee"
                type="number"
                size="sm"
                class="w-24"
              />
            </template>
          </SettingsItem>

          <SettingsItem
            label="Transaction Types"
            description="Types of transactions you'll sign"
            @click="openTransactionTypes"
          >
            <template #right>
              <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-muted" />
            </template>
          </SettingsItem>
        </template>

        <SettingsItem
          label="P2P Status"
          :description="`${peerCount} peers connected`"
        >
          <template #right>
            <span
              class="w-2 h-2 rounded-full"
              :class="p2pConnected ? 'bg-success' : 'bg-warning'"
            />
          </template>
        </SettingsItem>
      </template>
    </SettingsSection>

    <!-- Notifications Section -->
    <SettingsSection title="Notifications" icon="i-lucide-bell">
      <SettingsItem
        label="Browser Notifications"
        description="Show notifications in your browser"
      >
        <template #right>
          <USwitch
            v-model="settings.browserNotifications"
            @update:model-value="handleNotificationToggle"
          />
        </template>
      </SettingsItem>

      <template v-if="settings.browserNotifications">
        <SettingsItem
          label="Transaction Alerts"
          description="Notify on incoming/outgoing transactions"
        >
          <template #right>
            <USwitch v-model="settings.notifyTransactions" />
          </template>
        </SettingsItem>

        <SettingsItem
          label="Signing Requests"
          description="Notify when signature is requested"
        >
          <template #right>
            <USwitch v-model="settings.notifySigningRequests" />
          </template>
        </SettingsItem>

        <SettingsItem
          label="Social Updates"
          description="Notify on RANK votes and profile updates"
        >
          <template #right>
            <USwitch v-model="settings.notifySocial" />
          </template>
        </SettingsItem>
      </template>
    </SettingsSection>

    <!-- Security Section -->
    <SettingsSection title="Security" icon="i-lucide-shield">
      <SettingsItem
        label="App Lock"
        description="Require PIN or biometric to open"
      >
        <template #right>
          <USwitch v-model="settings.appLockEnabled" />
        </template>
      </SettingsItem>

      <template v-if="settings.appLockEnabled">
        <SettingsItem
          label="Auto-Lock Timeout"
          description="Lock after inactivity"
        >
          <template #right>
            <USelect
              v-model="settings.autoLockTimeout"
              :items="timeoutOptions"
              size="sm"
            />
          </template>
        </SettingsItem>
      </template>

      <SettingsItem
        label="Hide Balance by Default"
        description="Balance hidden until tapped"
      >
        <template #right>
          <USwitch v-model="settings.hideBalanceByDefault" />
        </template>
      </SettingsItem>
    </SettingsSection>

    <!-- Appearance Section -->
    <SettingsSection title="Appearance" icon="i-lucide-palette">
      <SettingsItem label="Theme" description="Choose your preferred theme">
        <template #right>
          <USelect v-model="settings.theme" :items="themeOptions" size="sm" />
        </template>
      </SettingsItem>

      <SettingsItem label="Currency Display" description="Show fiat equivalent">
        <template #right>
          <USelect
            v-model="settings.currency"
            :items="currencyOptions"
            size="sm"
          />
        </template>
      </SettingsItem>
    </SettingsSection>

    <!-- Dismissed Prompts Section -->
    <SettingsSection
      v-if="dismissedPrompts.length > 0"
      title="Dismissed Prompts"
      icon="i-lucide-eye-off"
    >
      <p class="text-sm text-muted mb-3">
        You've dismissed some helpful prompts. Re-enable them here.
      </p>

      <div class="space-y-2">
        <div
          v-for="prompt in dismissedPrompts"
          :key="prompt.key"
          class="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-gray-800"
        >
          <span class="text-sm">{{ prompt.label }}</span>
          <UButton size="xs" variant="ghost" @click="resetPrompt(prompt.key)">
            Show again
          </UButton>
        </div>
      </div>

      <UButton variant="ghost" size="sm" class="mt-3" @click="resetAllPrompts">
        Reset all prompts
      </UButton>
    </SettingsSection>

    <!-- About Section -->
    <SettingsSection title="About" icon="i-lucide-info">
      <SettingsItem label="Version" :description="appVersion" />

      <SettingsItem
        label="Website"
        description="lotusia.org"
        @click="openLink('https://lotusia.org')"
      >
        <template #right>
          <UIcon name="i-lucide-external-link" class="w-5 h-5 text-muted" />
        </template>
      </SettingsItem>

      <SettingsItem
        label="Documentation"
        description="Learn how to use Lotus"
        @click="openLink('https://lotusia.org/docs')"
      >
        <template #right>
          <UIcon name="i-lucide-external-link" class="w-5 h-5 text-muted" />
        </template>
      </SettingsItem>

      <SettingsItem
        label="Support"
        description="Get help with issues"
        @click="openLink('https://lotusia.org/faq')"
      >
        <template #right>
          <UIcon name="i-lucide-external-link" class="w-5 h-5 text-muted" />
        </template>
      </SettingsItem>
    </SettingsSection>

    <!-- Danger Zone -->
    <SettingsSection
      title="Danger Zone"
      icon="i-lucide-alert-triangle"
      variant="danger"
    >
      <SettingsItem
        label="Clear Activity History"
        description="Remove all activity from this device"
        @click="confirmClearActivity"
      >
        <template #right>
          <UButton color="error" variant="ghost" size="xs">Clear</UButton>
        </template>
      </SettingsItem>

      <SettingsItem
        label="Reset Wallet"
        description="Delete wallet and all data"
        @click="confirmResetWallet"
      >
        <template #right>
          <UButton color="error" variant="ghost" size="xs">Reset</UButton>
        </template>
      </SettingsItem>
    </SettingsSection>

    <!-- Modals -->
    <BackupModal v-model:open="backupOpen" />
    <ViewPhraseModal v-model:open="viewPhraseOpen" />
    <ChronikSettingsModal v-model:open="chronikOpen" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Settings',
})

const route = useRoute()
const settingsStore = useSettingsStore()
const networkStore = useNetworkStore()
const p2pStore = useP2PStore()
const onboardingStore = useOnboardingStore()
const activityStore = useActivityStore()

// Modal states
const backupOpen = ref(false)
const viewPhraseOpen = ref(false)
const chronikOpen = ref(false)

// Check for query params
onMounted(() => {
  if (route.query.backup === 'true') {
    backupOpen.value = true
  }
})

// Settings reactive object
const settings = reactive({
  network: settingsStore.network,
  chronikUrl: settingsStore.chronikUrl,
  p2pEnabled: settingsStore.p2pEnabled,
  advertiseAsSigner: settingsStore.advertiseAsSigner,
  signerFee: settingsStore.signerFee,
  browserNotifications: settingsStore.browserNotifications,
  notifyTransactions: settingsStore.notifyTransactions,
  notifySigningRequests: settingsStore.notifySigningRequests,
  notifySocial: settingsStore.notifySocial,
  appLockEnabled: settingsStore.appLockEnabled,
  autoLockTimeout: settingsStore.autoLockTimeout,
  hideBalanceByDefault: settingsStore.hideBalanceByDefault,
  theme: settingsStore.theme,
  currency: settingsStore.currency,
})

// Watch for changes and persist
watch(
  settings,
  newSettings => {
    settingsStore.updateSettings(newSettings)
  },
  { deep: true },
)

// Computed
const isBackedUp = computed(() => onboardingStore.isBackedUp)
const isConnected = computed(() => networkStore.isConnected)
const p2pConnected = computed(() => p2pStore.connected)
const peerCount = computed(() => p2pStore.peerCount)
const appVersion = computed(() => '1.0.0') // TODO: Get from package.json

const networkDescription = computed(() => {
  return settings.network === 'mainnet' ? 'Lotus Mainnet' : 'Lotus Testnet'
})

const connectionStatus = computed(() => {
  return isConnected.value ? 'Connected' : 'Disconnected'
})

const dismissedPrompts = computed(() => {
  // Get list of dismissed prompts from localStorage
  const prompts: { key: string; label: string }[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('ux:dismissed:')) {
      prompts.push({
        key,
        label: key
          .replace('ux:dismissed:', '')
          .replace(/:/g, ' ')
          .replace(/-/g, ' '),
      })
    }
  }
  return prompts
})

// Options
const networkOptions = [
  { value: 'mainnet', label: 'Mainnet' },
  { value: 'testnet', label: 'Testnet' },
]

const timeoutOptions = [
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
  { value: 900, label: '15 minutes' },
  { value: 3600, label: '1 hour' },
]

const themeOptions = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const currencyOptions = [
  { value: 'none', label: 'None' },
  { value: 'usd', label: 'USD' },
  { value: 'eur', label: 'EUR' },
]

// Methods
function openBackup() {
  backupOpen.value = true
}

function openViewPhrase() {
  viewPhraseOpen.value = true
}

function exportWallet() {
  // Implement wallet export
}

function openChronikSettings() {
  chronikOpen.value = true
}

function openTransactionTypes() {
  // Open transaction types modal
}

async function handleNotificationToggle(enabled: boolean) {
  if (enabled) {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      settings.browserNotifications = false
    }
  }
}

function resetPrompt(key: string) {
  localStorage.removeItem(key)
}

function resetAllPrompts() {
  dismissedPrompts.value.forEach(p => localStorage.removeItem(p.key))
}

function openLink(url: string) {
  window.open(url, '_blank')
}

function confirmClearActivity() {
  // Show confirmation dialog
  if (confirm('Clear all activity history? This cannot be undone.')) {
    activityStore.clearAll()
  }
}

function confirmResetWallet() {
  // Show confirmation dialog with warning
  if (
    confirm(
      'Reset wallet? This will delete all data. Make sure you have backed up your recovery phrase!',
    )
  ) {
    // Reset wallet
  }
}
</script>
```

---

## Settings Section Component

```vue
<!-- components/settings/SettingsSection.vue -->
<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2 px-1">
      <UIcon
        :name="icon"
        :class="['w-5 h-5', variant === 'danger' ? 'text-error' : 'text-muted']"
      />
      <h2
        :class="[
          'text-sm font-semibold',
          variant === 'danger' ? 'text-error' : 'text-muted',
        ]"
      >
        {{ title }}
      </h2>
    </div>

    <div
      :class="[
        'rounded-xl border divide-y',
        variant === 'danger'
          ? 'border-error/20 divide-error/10 bg-error/5'
          : 'border-gray-200 dark:border-gray-800 divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900',
      ]"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    icon: string
    variant?: 'default' | 'danger'
  }>(),
  {
    variant: 'default',
  },
)
</script>
```

---

## Settings Item Component

```vue
<!-- components/settings/SettingsItem.vue -->
<template>
  <div
    :class="[
      'flex items-center justify-between p-4',
      clickable &&
        'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
    ]"
    @click="handleClick"
  >
    <div class="flex-1 min-w-0 mr-4">
      <div class="flex items-center gap-2">
        <p class="font-medium">{{ label }}</p>
        <UBadge v-if="badge" :color="badgeColor" size="xs">
          {{ badge }}
        </UBadge>
      </div>
      <p v-if="description" class="text-sm text-muted truncate">
        {{ description }}
      </p>
    </div>

    <div class="flex-shrink-0">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  description?: string
  badge?: string
  badgeColor?: string
}>()

const emit = defineEmits<{
  click: []
}>()

const attrs = useAttrs()
const clickable = computed(() => !!attrs.onClick)

function handleClick() {
  emit('click')
}
</script>
```

---

## Backup Modal

```vue
<!-- components/settings/BackupModal.vue -->
<template>
  <UModal v-model:open="open" :ui="{ width: 'max-w-md' }">
    <!-- Step 1: Warning -->
    <template v-if="step === 'warning'">
      <div class="p-6 space-y-4">
        <div class="text-center">
          <div
            class="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4"
          >
            <UIcon name="i-lucide-shield-alert" class="w-8 h-8 text-warning" />
          </div>
          <h2 class="text-xl font-bold">Backup Your Wallet</h2>
          <p class="text-muted mt-2">
            Your recovery phrase is the only way to restore your wallet if you
            lose access.
          </p>
        </div>

        <div
          class="p-4 rounded-xl bg-warning/10 border border-warning/20 space-y-2"
        >
          <div class="flex gap-2">
            <UIcon
              name="i-lucide-alert-triangle"
              class="w-5 h-5 text-warning flex-shrink-0"
            />
            <div class="text-sm">
              <p class="font-medium">Important</p>
              <ul class="list-disc list-inside text-muted mt-1 space-y-1">
                <li>Write down your phrase on paper</li>
                <li>Never share it with anyone</li>
                <li>Never store it digitally</li>
                <li>Keep it in a safe place</li>
              </ul>
            </div>
          </div>
        </div>

        <UButton color="primary" block @click="step = 'phrase'">
          I Understand, Show Phrase
        </UButton>
      </div>
    </template>

    <!-- Step 2: Show Phrase -->
    <template v-else-if="step === 'phrase'">
      <div class="p-6 space-y-4">
        <div class="flex items-center gap-3">
          <UButton
            variant="ghost"
            icon="i-lucide-arrow-left"
            @click="step = 'warning'"
          />
          <h2 class="text-lg font-semibold">Recovery Phrase</h2>
        </div>

        <p class="text-sm text-muted">
          Write down these 12 words in order. You'll need them to restore your
          wallet.
        </p>

        <div
          class="grid grid-cols-3 gap-2 p-4 rounded-xl bg-gray-100 dark:bg-gray-800"
        >
          <div
            v-for="(word, index) in phraseWords"
            :key="index"
            class="flex items-center gap-2 p-2 rounded bg-white dark:bg-gray-900"
          >
            <span class="text-xs text-muted w-4">{{ index + 1 }}</span>
            <span class="font-mono text-sm">{{ word }}</span>
          </div>
        </div>

        <UButton color="primary" block @click="step = 'verify'">
          I've Written It Down
        </UButton>
      </div>
    </template>

    <!-- Step 3: Verify -->
    <template v-else-if="step === 'verify'">
      <div class="p-6 space-y-4">
        <div class="flex items-center gap-3">
          <UButton
            variant="ghost"
            icon="i-lucide-arrow-left"
            @click="step = 'phrase'"
          />
          <h2 class="text-lg font-semibold">Verify Backup</h2>
        </div>

        <p class="text-sm text-muted">
          Enter word #{{ verifyWordIndex + 1 }} from your recovery phrase:
        </p>

        <UInput
          v-model="verifyInput"
          placeholder="Enter word..."
          autofocus
          :error="verifyError"
          @keyup.enter="verifyWord"
        />

        <UButton
          color="primary"
          block
          :disabled="!verifyInput.trim()"
          @click="verifyWord"
        >
          Verify
        </UButton>
      </div>
    </template>

    <!-- Step 4: Success -->
    <template v-else-if="step === 'success'">
      <div class="p-6 text-center space-y-4">
        <div
          class="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto"
        >
          <UIcon name="i-lucide-check" class="w-8 h-8 text-success" />
        </div>

        <div>
          <h2 class="text-xl font-bold">Backup Complete!</h2>
          <p class="text-muted mt-2">
            Your wallet is now backed up. Keep your recovery phrase safe.
          </p>
        </div>

        <UButton color="primary" block @click="close"> Done </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>('open')

const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()

const step = ref<'warning' | 'phrase' | 'verify' | 'success'>('warning')
const verifyInput = ref('')
const verifyError = ref('')
const verifyWordIndex = ref(0)

const phraseWords = computed(() => {
  return walletStore.mnemonic?.split(' ') || []
})

// Pick random words to verify
onMounted(() => {
  verifyWordIndex.value = Math.floor(Math.random() * 12)
})

function verifyWord() {
  const correctWord = phraseWords.value[verifyWordIndex.value]
  if (verifyInput.value.toLowerCase().trim() === correctWord.toLowerCase()) {
    onboardingStore.markBackedUp()
    step.value = 'success'
  } else {
    verifyError.value = 'Incorrect word. Please try again.'
  }
}

function close() {
  open.value = false
  setTimeout(() => {
    step.value = 'warning'
    verifyInput.value = ''
    verifyError.value = ''
  }, 300)
}
</script>
```

---

## Tasks Checklist

### Page

- [ ] Create `pages/settings/index.vue`

### Components

- [ ] Create `components/settings/SettingsSection.vue`
- [ ] Create `components/settings/SettingsItem.vue`
- [ ] Create `components/settings/BackupModal.vue`
- [ ] Create `components/settings/ViewPhraseModal.vue`
- [ ] Create `components/settings/ChronikSettingsModal.vue`

### Store

- [ ] Create `stores/settings.ts` with all settings
- [ ] Implement persistence
- [ ] Add settings migration for existing users

### Integration

- [ ] Wire network settings to network store
- [ ] Wire P2P settings to P2P store
- [ ] Wire notification settings to notification system
- [ ] Wire theme settings to color mode

---

## Verification

- [ ] All settings sections display correctly
- [ ] Settings persist across page reloads
- [ ] Backup flow works end-to-end
- [ ] Network switching works
- [ ] P2P toggle works
- [ ] Notification permissions requested correctly
- [ ] Theme switching works
- [ ] Dismissed prompts can be reset
- [ ] Danger zone actions require confirmation

---

_Next: [08_EXPLORER.md](./08_EXPLORER.md)_
