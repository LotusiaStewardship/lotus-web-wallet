# Phase 1: Advertise Page

## Overview

Create the `/settings/advertise` page that allows users to configure their P2P signer advertisement. This is the **most critical gap** as it blocks all P2P/MuSig2 functionality.

**Priority**: P0 (Blocker)
**Estimated Effort**: 1-2 days
**Dependencies**: P2P Store, MuSig2 Store

---

## Problem Statement

The P2P/MuSig2 system is designed around users being able to:

1. Discover other signers on the network
2. Become a signer themselves to help others

Currently, users can discover signers, but **cannot become signers** because the `/settings/advertise` page does not exist. Every "Become a Signer" CTA in the app leads to a 404.

### Affected Components

| Component                          | Reference                      | Impact    |
| ---------------------------------- | ------------------------------ | --------- |
| `pages/settings/index.vue`         | Links to `/settings/advertise` | 404 error |
| `components/p2p/SignerList.vue`    | Empty state CTA                | 404 error |
| `components/p2p/QuickActions.vue`  | "Become a Signer" action       | 404 error |
| `components/p2p/SettingsPanel.vue` | Configure signer button        | 404 error |

---

## Implementation

### Task 1.1: Create Advertise Page

**File**: `pages/settings/advertise.vue`

```vue
<script setup lang="ts">
/**
 * Advertise Settings Page
 *
 * Configure P2P signer advertisement settings.
 */
import { useP2PStore } from '~/stores/p2p'
import { useMuSig2Store } from '~/stores/musig2'

definePageMeta({
  title: 'Advertise',
})

const p2pStore = useP2PStore()
const musig2Store = useMuSig2Store()
const toast = useToast()

// Form state
const signerEnabled = ref(false)
const nickname = ref('')
const transactionTypes = ref<string[]>(['spend'])
const fee = ref('0.001')
const minAmount = ref('')
const maxAmount = ref('')

// Transaction type options
const txTypeOptions = [
  {
    label: 'Spend',
    value: 'spend',
    description: 'Help sign spending transactions',
  },
  {
    label: 'CoinJoin',
    value: 'coinjoin',
    description: 'Participate in privacy-enhancing transactions',
  },
  { label: 'Escrow', value: 'escrow', description: 'Act as escrow for trades' },
  { label: 'Swap', value: 'swap', description: 'Facilitate atomic swaps' },
]

// Load existing settings
onMounted(() => {
  // Load from store or localStorage
  const saved = localStorage.getItem('lotus-signer-settings')
  if (saved) {
    try {
      const settings = JSON.parse(saved)
      signerEnabled.value = settings.enabled ?? false
      nickname.value = settings.nickname ?? ''
      transactionTypes.value = settings.transactionTypes ?? ['spend']
      fee.value = settings.fee ?? '0.001'
      minAmount.value = settings.minAmount ?? ''
      maxAmount.value = settings.maxAmount ?? ''
    } catch {
      // Invalid saved settings, use defaults
    }
  }
})

// Save settings
async function saveSettings() {
  const settings = {
    enabled: signerEnabled.value,
    nickname: nickname.value,
    transactionTypes: transactionTypes.value,
    fee: fee.value,
    minAmount: minAmount.value,
    maxAmount: maxAmount.value,
  }

  // Save to localStorage
  localStorage.setItem('lotus-signer-settings', JSON.stringify(settings))

  // If enabled, publish advertisement
  if (signerEnabled.value) {
    try {
      await publishAdvertisement()
      toast.add({
        title: 'Signer Published',
        description: 'Your signer advertisement is now live on the network',
        color: 'success',
      })
    } catch (error) {
      toast.add({
        title: 'Publish Failed',
        description: 'Failed to publish signer advertisement',
        color: 'error',
      })
      return
    }
  } else {
    // Unpublish if disabled
    try {
      await unpublishAdvertisement()
      toast.add({
        title: 'Settings Saved',
        description: 'Signer advertisement disabled',
        color: 'info',
      })
    } catch {
      // Ignore unpublish errors
    }
  }
}

async function publishAdvertisement() {
  // Use P2P store to publish signer advertisement
  // This integrates with the lotus-sdk P2P coordinator
  await p2pStore.publishSignerAdvertisement({
    nickname: nickname.value || undefined,
    transactionTypes: transactionTypes.value,
    fee: parseFloat(fee.value) || 0,
    amountRange: {
      min: minAmount.value ? parseFloat(minAmount.value) : undefined,
      max: maxAmount.value ? parseFloat(maxAmount.value) : undefined,
    },
  })
}

async function unpublishAdvertisement() {
  await p2pStore.unpublishSignerAdvertisement()
}

// Toggle handler
function handleToggle(enabled: boolean) {
  signerEnabled.value = enabled
  if (!enabled) {
    // Auto-save when disabling
    saveSettings()
  }
}
</script>

<template>
  <div class="space-y-4">
    <SettingsBackButton />

    <!-- Header -->
    <UiAppCard>
      <div class="flex items-center gap-4">
        <div
          class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"
        >
          <UIcon name="i-lucide-megaphone" class="w-6 h-6 text-primary" />
        </div>
        <div class="flex-1">
          <h2 class="text-lg font-semibold">Signer Advertisement</h2>
          <p class="text-sm text-muted">
            Advertise yourself as a signer to help others with multi-signature
            transactions
          </p>
        </div>
        <UToggle v-model="signerEnabled" @update:model-value="handleToggle" />
      </div>
    </UiAppCard>

    <!-- Settings (only shown when enabled) -->
    <template v-if="signerEnabled">
      <!-- Identity -->
      <UiAppCard title="Identity" icon="i-lucide-user">
        <UFormField
          label="Nickname"
          hint="Optional display name for other users"
        >
          <UInput v-model="nickname" placeholder="Anonymous" />
        </UFormField>
      </UiAppCard>

      <!-- Transaction Types -->
      <UiAppCard title="Transaction Types" icon="i-lucide-list-checks">
        <p class="text-sm text-muted mb-3">
          Select the types of transactions you're willing to sign
        </p>
        <div class="space-y-2">
          <label
            v-for="option in txTypeOptions"
            :key="option.value"
            class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
            :class="{
              'border-primary bg-primary/5': transactionTypes.includes(
                option.value,
              ),
            }"
          >
            <UCheckbox
              :model-value="transactionTypes.includes(option.value)"
              @update:model-value="
                checked => {
                  if (checked) {
                    transactionTypes.push(option.value)
                  } else {
                    transactionTypes = transactionTypes.filter(
                      t => t !== option.value,
                    )
                  }
                }
              "
            />
            <div>
              <div class="font-medium text-sm">{{ option.label }}</div>
              <div class="text-xs text-muted">{{ option.description }}</div>
            </div>
          </label>
        </div>
      </UiAppCard>

      <!-- Fee Structure -->
      <UiAppCard title="Fee Structure" icon="i-lucide-coins">
        <div class="space-y-4">
          <UFormField
            label="Fee per signature"
            hint="Amount in XPI you charge per signature"
          >
            <UInput
              v-model="fee"
              type="number"
              step="0.001"
              min="0"
              placeholder="0.001"
            >
              <template #trailing>
                <span class="text-muted text-sm">XPI</span>
              </template>
            </UInput>
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Minimum amount" hint="Optional">
              <UInput
                v-model="minAmount"
                type="number"
                min="0"
                placeholder="No minimum"
              >
                <template #trailing>
                  <span class="text-muted text-sm">XPI</span>
                </template>
              </UInput>
            </UFormField>
            <UFormField label="Maximum amount" hint="Optional">
              <UInput
                v-model="maxAmount"
                type="number"
                min="0"
                placeholder="No maximum"
              >
                <template #trailing>
                  <span class="text-muted text-sm">XPI</span>
                </template>
              </UInput>
            </UFormField>
          </div>
        </div>
      </UiAppCard>

      <!-- Save Button -->
      <UButton color="primary" block size="lg" @click="saveSettings">
        <UIcon name="i-lucide-save" class="w-4 h-4 mr-2" />
        Save & Publish
      </UButton>
    </template>

    <!-- Info when disabled -->
    <UiAppCard v-else>
      <div class="text-center py-4">
        <UIcon name="i-lucide-info" class="w-8 h-8 text-muted mx-auto mb-2" />
        <p class="text-sm text-muted">
          Enable signer advertisement to help others with multi-signature
          transactions and earn fees for your service.
        </p>
      </div>
    </UiAppCard>
  </div>
</template>
```

---

### Task 1.2: Add P2P Store Methods

**File**: `stores/p2p.ts`

Add the following methods if they don't exist:

```typescript
// Publish signer advertisement
async publishSignerAdvertisement(config: {
  nickname?: string
  transactionTypes: string[]
  fee: number
  amountRange?: { min?: number; max?: number }
}) {
  if (!this.p2pService) return

  try {
    await this.p2pService.publishSignerAdvertisement({
      publicKeyHex: this.walletStore.publicKeyHex,
      nickname: config.nickname,
      transactionTypes: config.transactionTypes,
      fee: config.fee,
      amountRange: config.amountRange,
    })

    this.isAdvertising = true
  } catch (error) {
    console.error('Failed to publish signer advertisement:', error)
    throw error
  }
}

// Unpublish signer advertisement
async unpublishSignerAdvertisement() {
  if (!this.p2pService) return

  try {
    await this.p2pService.unpublishSignerAdvertisement()
    this.isAdvertising = false
  } catch (error) {
    console.error('Failed to unpublish signer advertisement:', error)
    throw error
  }
}
```

---

### Task 1.3: Update QuickActions Handler

**File**: `pages/people/p2p.vue`

Ensure the `becomeSigner` event navigates correctly:

```typescript
function handleBecomeSigner() {
  navigateTo('/settings/advertise?from=/people/p2p')
}
```

---

## Verification Checklist

- [ ] `/settings/advertise` page loads without errors
- [ ] Toggle enables/disables signer mode
- [ ] Transaction types can be selected/deselected
- [ ] Fee and amount range inputs work
- [ ] Settings persist across page reloads
- [ ] "Save & Publish" publishes to P2P network (when connected)
- [ ] All "Become a Signer" CTAs navigate to this page
- [ ] Back button returns to correct origin page

---

## Testing Scenarios

### Scenario 1: First-time Signer Setup

1. Navigate to `/settings/advertise`
2. Enable signer toggle
3. Set nickname, select transaction types, set fee
4. Click "Save & Publish"
5. Verify toast shows success
6. Navigate away and back - settings should persist

### Scenario 2: Disable Signer

1. With signer enabled, toggle off
2. Verify settings are saved
3. Verify advertisement is unpublished

### Scenario 3: Navigation from P2P Page

1. Go to `/people/p2p`
2. Click "Become a Signer" in empty state
3. Verify navigation to `/settings/advertise?from=/people/p2p`
4. Click back button
5. Verify return to `/people/p2p`

---

## Notes

- The P2P store methods may need adjustment based on actual lotus-sdk API
- Consider adding a "Preview" of how the signer card will appear to others
- Future enhancement: Add reputation display and history
- Consider auto-publishing on app start if previously enabled

---

_Phase 1 of Critical Gaps Remediation Plan_
