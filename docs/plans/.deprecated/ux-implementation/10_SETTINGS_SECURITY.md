# Phase 10: Settings & Security

## Overview

The settings pages need reorganization with proper security settings, privacy controls, and backup verification. This phase creates a comprehensive settings experience.

**Priority**: P2 (Medium)
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 9 (P2P), existing settings components

---

## Goals

1. Settings hub with logical organization
2. Security settings (PIN, auto-lock)
3. Privacy settings
4. Backup verification flow
5. Network settings
6. Notification preferences
7. About/Help page

---

## 1. Settings Hub Page

### File: `pages/settings/index.vue`

```vue
<script setup lang="ts">
import { useOnboardingStore } from '~/stores/onboarding'

definePageMeta({
  title: 'Settings',
})

const onboardingStore = useOnboardingStore()

const settingsGroups = [
  {
    title: 'Wallet',
    items: [
      {
        label: 'Backup & Recovery',
        icon: 'i-lucide-shield',
        to: '/settings/backup',
        description: 'View seed phrase and verify backup',
        badge: !onboardingStore.backupVerified ? 'Action needed' : undefined,
        badgeColor: 'warning',
      },
      {
        label: 'Security',
        icon: 'i-lucide-lock',
        to: '/settings/security',
        description: 'PIN, auto-lock, and authentication',
      },
    ],
  },
  {
    title: 'Preferences',
    items: [
      {
        label: 'Privacy',
        icon: 'i-lucide-eye-off',
        to: '/settings/privacy',
        description: 'Balance visibility, analytics',
      },
      {
        label: 'Notifications',
        icon: 'i-lucide-bell',
        to: '/settings/notifications',
        description: 'Manage notification preferences',
      },
      {
        label: 'Appearance',
        icon: 'i-lucide-palette',
        to: '/settings/appearance',
        description: 'Theme and display options',
      },
    ],
  },
  {
    title: 'Network',
    items: [
      {
        label: 'Blockchain',
        icon: 'i-lucide-network',
        to: '/settings/network',
        description: 'Network selection and connection',
      },
      {
        label: 'P2P Settings',
        icon: 'i-lucide-globe',
        to: '/settings/p2p',
        description: 'Peer-to-peer network configuration',
      },
    ],
  },
  {
    title: 'About',
    items: [
      {
        label: 'Help & Support',
        icon: 'i-lucide-help-circle',
        to: '/settings/help',
        description: 'Documentation and support',
      },
      {
        label: 'About',
        icon: 'i-lucide-info',
        to: '/settings/about',
        description: 'Version info and credits',
      },
    ],
  },
]
</script>

<template>
  <div class="space-y-6">
    <AppHeroCard
      icon="i-lucide-settings"
      title="Settings"
      subtitle="Manage your wallet preferences"
    />

    <div v-for="group in settingsGroups" :key="group.title" class="space-y-3">
      <h2
        class="text-sm font-semibold text-gray-500 uppercase tracking-wider px-1"
      >
        {{ group.title }}
      </h2>
      <AppCard no-padding>
        <div class="divide-y divide-gray-200 dark:divide-gray-700">
          <NuxtLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div
              class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"
            >
              <UIcon :name="item.icon" class="w-5 h-5 text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ item.label }}</span>
                <UBadge
                  v-if="item.badge"
                  :color="item.badgeColor || 'primary'"
                  variant="soft"
                  size="xs"
                >
                  {{ item.badge }}
                </UBadge>
              </div>
              <p class="text-sm text-gray-500">{{ item.description }}</p>
            </div>
            <UIcon
              name="i-lucide-chevron-right"
              class="w-5 h-5 text-gray-400 shrink-0"
            />
          </NuxtLink>
        </div>
      </AppCard>
    </div>
  </div>
</template>
```

---

## 2. Security Settings Page

### File: `pages/settings/security.vue`

```vue
<script setup lang="ts">
import { useSecurityStore } from '~/stores/security'

definePageMeta({
  title: 'Security',
})

const securityStore = useSecurityStore()

// PIN setup modal
const showPinSetup = ref(false)
const showPinChange = ref(false)

// Auto-lock options
const autoLockOptions = [
  { value: 0, label: 'Never' },
  { value: 1, label: '1 minute' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
]

// Toggle PIN
async function togglePin() {
  if (securityStore.pinEnabled) {
    // Disable PIN - require current PIN
    showPinChange.value = true
  } else {
    // Enable PIN
    showPinSetup.value = true
  }
}

// Handle PIN setup
async function handlePinSetup(pin: string) {
  await securityStore.setPin(pin)
  showPinSetup.value = false
}

// Handle PIN disable
async function handlePinDisable(currentPin: string) {
  const valid = await securityStore.verifyPin(currentPin)
  if (valid) {
    await securityStore.removePin()
    showPinChange.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <AppHeroCard
      icon="i-lucide-lock"
      title="Security"
      subtitle="Protect your wallet with additional security"
    />

    <!-- PIN Protection -->
    <AppCard title="PIN Protection" icon="i-lucide-key">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Enable PIN</div>
            <p class="text-sm text-gray-500">
              Require a PIN to access your wallet
            </p>
          </div>
          <UToggle
            :model-value="securityStore.pinEnabled"
            @update:model-value="togglePin"
          />
        </div>

        <div
          v-if="securityStore.pinEnabled"
          class="pt-4 border-t border-gray-200 dark:border-gray-700"
        >
          <UButton color="neutral" variant="soft" @click="showPinChange = true">
            Change PIN
          </UButton>
        </div>
      </div>
    </AppCard>

    <!-- Auto-Lock -->
    <AppCard title="Auto-Lock" icon="i-lucide-timer">
      <div class="space-y-4">
        <p class="text-sm text-gray-500">
          Automatically lock your wallet after a period of inactivity.
        </p>
        <USelectMenu
          v-model="securityStore.autoLockTimeout"
          :items="autoLockOptions"
          value-key="value"
          :disabled="!securityStore.pinEnabled"
        />
        <p v-if="!securityStore.pinEnabled" class="text-sm text-warning-600">
          Enable PIN protection to use auto-lock.
        </p>
      </div>
    </AppCard>

    <!-- Transaction Signing -->
    <AppCard title="Transaction Signing" icon="i-lucide-pen-tool">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Require PIN for transactions</div>
            <p class="text-sm text-gray-500">
              Ask for PIN before sending any transaction
            </p>
          </div>
          <UToggle
            v-model="securityStore.requirePinForTx"
            :disabled="!securityStore.pinEnabled"
          />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Confirm large transactions</div>
            <p class="text-sm text-gray-500">
              Extra confirmation for transactions over 10,000 XPI
            </p>
          </div>
          <UToggle v-model="securityStore.confirmLargeTx" />
        </div>
      </div>
    </AppCard>

    <!-- Security Tips -->
    <AppCard title="Security Tips" icon="i-lucide-shield-check">
      <div class="space-y-3 text-sm text-gray-600 dark:text-gray-400">
        <div class="flex items-start gap-2">
          <UIcon
            name="i-lucide-check"
            class="w-4 h-4 text-green-500 mt-0.5 shrink-0"
          />
          <span>Never share your seed phrase with anyone</span>
        </div>
        <div class="flex items-start gap-2">
          <UIcon
            name="i-lucide-check"
            class="w-4 h-4 text-green-500 mt-0.5 shrink-0"
          />
          <span>Store your backup in a secure, offline location</span>
        </div>
        <div class="flex items-start gap-2">
          <UIcon
            name="i-lucide-check"
            class="w-4 h-4 text-green-500 mt-0.5 shrink-0"
          />
          <span>Use a strong, unique PIN</span>
        </div>
        <div class="flex items-start gap-2">
          <UIcon
            name="i-lucide-check"
            class="w-4 h-4 text-green-500 mt-0.5 shrink-0"
          />
          <span>Enable auto-lock when not using your wallet</span>
        </div>
      </div>
    </AppCard>

    <!-- PIN Setup Modal -->
    <PinSetupModal v-model:open="showPinSetup" @complete="handlePinSetup" />

    <!-- PIN Change/Disable Modal -->
    <PinChangeModal v-model:open="showPinChange" @disable="handlePinDisable" />
  </div>
</template>
```

---

## 3. Backup Page with Verification

### File: `pages/settings/backup.vue`

```vue
<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { useOnboardingStore } from '~/stores/onboarding'
import { useSecurityStore } from '~/stores/security'

definePageMeta({
  title: 'Backup & Recovery',
})

const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()
const securityStore = useSecurityStore()

// View state
const currentView = ref<'menu' | 'view' | 'verify' | 'restore'>('menu')

// PIN verification (if enabled)
const pinVerified = ref(!securityStore.pinEnabled)
const showPinModal = ref(false)

// Seed phrase
const seedPhrase = ref<string[]>([])

// Verification state
const verificationWords = ref<{ index: number; word: string }[]>([])
const userAnswers = ref<string[]>(['', '', ''])
const verificationError = ref(false)

// View seed phrase
async function viewSeedPhrase() {
  if (securityStore.pinEnabled && !pinVerified.value) {
    showPinModal.value = true
    return
  }

  seedPhrase.value = walletStore.seedPhrase?.split(' ') || []
  currentView.value = 'view'
}

// Handle PIN verification
async function handlePinVerify(pin: string) {
  const valid = await securityStore.verifyPin(pin)
  if (valid) {
    pinVerified.value = true
    showPinModal.value = false
    viewSeedPhrase()
  }
}

// Start verification
function startVerification() {
  // Pick 3 random words
  const indices: number[] = []
  while (indices.length < 3) {
    const idx = Math.floor(Math.random() * seedPhrase.value.length)
    if (!indices.includes(idx)) indices.push(idx)
  }
  indices.sort((a, b) => a - b)

  verificationWords.value = indices.map(i => ({
    index: i,
    word: seedPhrase.value[i],
  }))
  userAnswers.value = ['', '', '']
  verificationError.value = false
  currentView.value = 'verify'
}

// Verify backup
function verifyBackup() {
  const correct = verificationWords.value.every(
    (v, i) =>
      userAnswers.value[i].toLowerCase().trim() === v.word.toLowerCase(),
  )

  if (correct) {
    onboardingStore.verifyBackup()
    currentView.value = 'menu'
  } else {
    verificationError.value = true
  }
}

// Copy seed phrase
const copied = ref(false)
function copySeedPhrase() {
  navigator.clipboard.writeText(seedPhrase.value.join(' '))
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div class="space-y-6">
    <AppHeroCard
      icon="i-lucide-shield"
      title="Backup & Recovery"
      subtitle="Secure your wallet with a backup"
    />

    <!-- Menu View -->
    <template v-if="currentView === 'menu'">
      <!-- Backup Status -->
      <AppCard>
        <div class="flex items-center gap-4">
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center"
            :class="
              onboardingStore.backupVerified
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-warning-100 dark:bg-warning-900/30'
            "
          >
            <UIcon
              :name="
                onboardingStore.backupVerified
                  ? 'i-lucide-shield-check'
                  : 'i-lucide-shield-alert'
              "
              class="w-6 h-6"
              :class="
                onboardingStore.backupVerified
                  ? 'text-green-600'
                  : 'text-warning-600'
              "
            />
          </div>
          <div class="flex-1">
            <div class="font-semibold">
              {{
                onboardingStore.backupVerified
                  ? 'Backup Verified'
                  : 'Backup Not Verified'
              }}
            </div>
            <p class="text-sm text-gray-500">
              {{
                onboardingStore.backupVerified
                  ? 'Your wallet backup has been verified'
                  : 'Verify your backup to ensure you can recover your wallet'
              }}
            </p>
          </div>
        </div>
      </AppCard>

      <!-- Actions -->
      <div class="grid gap-4 md:grid-cols-2">
        <AppCard
          class="cursor-pointer hover:shadow-md transition-shadow"
          @click="viewSeedPhrase"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <UIcon name="i-lucide-eye" class="w-6 h-6 text-primary" />
            </div>
            <div>
              <div class="font-semibold">View Seed Phrase</div>
              <p class="text-sm text-gray-500">
                Show your 12-word recovery phrase
              </p>
            </div>
          </div>
        </AppCard>

        <AppCard
          v-if="!onboardingStore.backupVerified"
          class="cursor-pointer hover:shadow-md transition-shadow border-warning-200 dark:border-warning-800"
          @click="viewSeedPhrase"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-lucide-check-circle"
                class="w-6 h-6 text-warning-600"
              />
            </div>
            <div>
              <div class="font-semibold">Verify Backup</div>
              <p class="text-sm text-gray-500">
                Confirm you've saved your seed phrase
              </p>
            </div>
          </div>
        </AppCard>

        <AppCard
          class="cursor-pointer hover:shadow-md transition-shadow"
          @click="currentView = 'restore'"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <UIcon name="i-lucide-download" class="w-6 h-6 text-primary" />
            </div>
            <div>
              <div class="font-semibold">Restore Wallet</div>
              <p class="text-sm text-gray-500">
                Restore from an existing seed phrase
              </p>
            </div>
          </div>
        </AppCard>
      </div>

      <!-- Warning -->
      <UAlert color="warning" icon="i-lucide-alert-triangle">
        <template #title>Important</template>
        <template #description>
          Your seed phrase is the only way to recover your wallet. Never share
          it with anyone and store it in a secure location.
        </template>
      </UAlert>
    </template>

    <!-- View Seed Phrase -->
    <template v-else-if="currentView === 'view'">
      <AppCard title="Your Seed Phrase" icon="i-lucide-key">
        <UAlert color="error" icon="i-lucide-alert-triangle" class="mb-4">
          <template #description>
            Never share your seed phrase. Anyone with these words can access
            your funds.
          </template>
        </UAlert>

        <div
          class="grid grid-cols-3 gap-2 mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <div
            v-for="(word, index) in seedPhrase"
            :key="index"
            class="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
          >
            <span class="text-xs text-gray-400 w-5">{{ index + 1 }}.</span>
            <span class="font-mono font-medium">{{ word }}</span>
          </div>
        </div>

        <div class="flex gap-3">
          <UButton color="neutral" variant="soft" @click="copySeedPhrase">
            <UIcon
              :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              class="w-4 h-4 mr-2"
            />
            {{ copied ? 'Copied!' : 'Copy' }}
          </UButton>
          <UButton
            v-if="!onboardingStore.backupVerified"
            color="primary"
            @click="startVerification"
          >
            Verify Backup
          </UButton>
        </div>
      </AppCard>

      <UButton color="neutral" variant="ghost" @click="currentView = 'menu'">
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4 mr-2" />
        Back
      </UButton>
    </template>

    <!-- Verify Backup -->
    <template v-else-if="currentView === 'verify'">
      <AppCard title="Verify Your Backup" icon="i-lucide-shield-check">
        <p class="text-gray-500 mb-6">
          Enter the following words from your seed phrase to confirm you've
          saved it correctly.
        </p>

        <div class="space-y-4 mb-6">
          <div v-for="(item, i) in verificationWords" :key="item.index">
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Word #{{ item.index + 1 }}
            </label>
            <input
              v-model="userAnswers[i]"
              type="text"
              :placeholder="`Enter word ${item.index + 1}`"
              class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
              autocomplete="off"
              autocapitalize="none"
            />
          </div>
        </div>

        <UAlert
          v-if="verificationError"
          color="error"
          icon="i-lucide-x-circle"
          class="mb-4"
        >
          One or more words are incorrect. Please check your backup and try
          again.
        </UAlert>

        <div class="flex gap-3">
          <UButton color="neutral" variant="soft" @click="currentView = 'view'">
            Back
          </UButton>
          <UButton color="primary" @click="verifyBackup"> Verify </UButton>
        </div>
      </AppCard>
    </template>

    <!-- Restore Wallet -->
    <template v-else-if="currentView === 'restore'">
      <OnboardingRestore
        @restore="
          walletStore.restoreFromSeed($event)
          currentView = 'menu'
        "
        @back="currentView = 'menu'"
      />
    </template>

    <!-- PIN Modal -->
    <PinEntryModal
      v-model:open="showPinModal"
      title="Enter PIN"
      description="Enter your PIN to view the seed phrase"
      @verify="handlePinVerify"
    />
  </div>
</template>
```

---

## 4. Privacy Settings Page

### File: `pages/settings/privacy.vue`

```vue
<script setup lang="ts">
import { useSettingsStore } from '~/stores/settings'

definePageMeta({
  title: 'Privacy',
})

const settingsStore = useSettingsStore()
</script>

<template>
  <div class="space-y-6">
    <AppHeroCard
      icon="i-lucide-eye-off"
      title="Privacy"
      subtitle="Control your privacy settings"
    />

    <!-- Balance Privacy -->
    <AppCard title="Balance Display" icon="i-lucide-wallet">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Hide balance by default</div>
            <p class="text-sm text-gray-500">
              Show balance as ••••• until you tap to reveal
            </p>
          </div>
          <UToggle v-model="settingsStore.hideBalanceByDefault" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Show fiat equivalent</div>
            <p class="text-sm text-gray-500">
              Display approximate USD value alongside XPI
            </p>
          </div>
          <UToggle v-model="settingsStore.showFiatBalance" />
        </div>
      </div>
    </AppCard>

    <!-- Transaction Privacy -->
    <AppCard title="Transactions" icon="i-lucide-file-text">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Hide transaction amounts</div>
            <p class="text-sm text-gray-500">
              Blur amounts in transaction history
            </p>
          </div>
          <UToggle v-model="settingsStore.hideTransactionAmounts" />
        </div>
      </div>
    </AppCard>

    <!-- Analytics -->
    <AppCard title="Analytics" icon="i-lucide-bar-chart">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">Anonymous usage analytics</div>
            <p class="text-sm text-gray-500">
              Help improve the wallet by sharing anonymous usage data
            </p>
          </div>
          <UToggle v-model="settingsStore.analyticsEnabled" />
        </div>

        <p class="text-xs text-gray-400">
          We never collect personal information, wallet addresses, or
          transaction data. Analytics help us understand which features are used
          most.
        </p>
      </div>
    </AppCard>

    <!-- Privacy Info -->
    <AppCard title="Your Privacy" icon="i-lucide-shield">
      <div class="space-y-3 text-sm text-gray-600 dark:text-gray-400">
        <div class="flex items-start gap-2">
          <UIcon
            name="i-lucide-check"
            class="w-4 h-4 text-green-500 mt-0.5 shrink-0"
          />
          <span>Your seed phrase never leaves your device</span>
        </div>
        <div class="flex items-start gap-2">
          <UIcon
            name="i-lucide-check"
            class="w-4 h-4 text-green-500 mt-0.5 shrink-0"
          />
          <span>All wallet operations happen locally in your browser</span>
        </div>
        <div class="flex items-start gap-2">
          <UIcon
            name="i-lucide-check"
            class="w-4 h-4 text-green-500 mt-0.5 shrink-0"
          />
          <span>We don't track your transactions or addresses</span>
        </div>
        <div class="flex items-start gap-2">
          <UIcon
            name="i-lucide-check"
            class="w-4 h-4 text-green-500 mt-0.5 shrink-0"
          />
          <span>P2P connections are direct, not through our servers</span>
        </div>
      </div>
    </AppCard>
  </div>
</template>
```

---

## 5. Implementation Checklist

### Pages

- [ ] Create `pages/settings/index.vue`
- [ ] Create `pages/settings/security.vue`
- [ ] Create `pages/settings/backup.vue`
- [ ] Create `pages/settings/privacy.vue`
- [ ] Create `pages/settings/notifications.vue`
- [ ] Create `pages/settings/appearance.vue`
- [ ] Create `pages/settings/network.vue`
- [ ] Create `pages/settings/p2p.vue`
- [ ] Create `pages/settings/help.vue`
- [ ] Create `pages/settings/about.vue`

### Components

- [ ] Create `components/settings/PinSetupModal.vue`
- [ ] Create `components/settings/PinChangeModal.vue`
- [ ] Create `components/settings/PinEntryModal.vue`

### Stores

- [ ] Create `stores/security.ts` for PIN and security settings
- [ ] Create `stores/settings.ts` for general settings

### Features

- [ ] PIN setup and management
- [ ] Auto-lock functionality
- [ ] Backup verification flow
- [ ] Privacy toggles
- [ ] Network selection
- [ ] Theme selection

### Testing

- [ ] Test PIN setup flow
- [ ] Test PIN verification
- [ ] Test auto-lock
- [ ] Test backup verification
- [ ] Test settings persistence

---

## Next Phase

Once this phase is complete, proceed to [11_NOTIFICATIONS.md](./11_NOTIFICATIONS.md) to implement the notification system.
