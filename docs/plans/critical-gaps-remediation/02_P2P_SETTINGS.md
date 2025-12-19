# Phase 2: P2P Settings Page

## Overview

Create the `/settings/p2p` page for advanced P2P network configuration. This provides power users with control over DHT, GossipSub, and connection settings.

**Priority**: P1
**Estimated Effort**: 0.5 days
**Dependencies**: P2P Store

---

## Problem Statement

The analysis documents reference a `/settings/p2p` page for advanced P2P configuration, but it does not exist. While the `/settings/network` page handles basic network switching, advanced P2P settings have no home.

---

## Implementation

### Task 2.1: Create P2P Settings Page

**File**: `pages/settings/p2p.vue`

```vue
<script setup lang="ts">
/**
 * P2P Settings Page
 *
 * Advanced P2P network configuration.
 */
import { useP2PStore } from '~/stores/p2p'

definePageMeta({
  title: 'P2P Settings',
})

const p2pStore = useP2PStore()
const toast = useToast()

// Settings state
const autoConnect = ref(true)
const maxConnections = ref(50)
const enableDHT = ref(true)
const enableGossipSub = ref(true)
const bootstrapPeers = ref<string[]>([])
const customBootstrapPeer = ref('')

// Default bootstrap peers
const defaultBootstrapPeers = [
  '/dns4/bootstrap1.lotusia.org/tcp/4001/p2p/12D3KooW...',
  '/dns4/bootstrap2.lotusia.org/tcp/4001/p2p/12D3KooW...',
]

// Load settings
onMounted(() => {
  const saved = localStorage.getItem('lotus-p2p-settings')
  if (saved) {
    try {
      const settings = JSON.parse(saved)
      autoConnect.value = settings.autoConnect ?? true
      maxConnections.value = settings.maxConnections ?? 50
      enableDHT.value = settings.enableDHT ?? true
      enableGossipSub.value = settings.enableGossipSub ?? true
      bootstrapPeers.value = settings.bootstrapPeers ?? []
    } catch {
      // Use defaults
    }
  }
})

// Save settings
function saveSettings() {
  const settings = {
    autoConnect: autoConnect.value,
    maxConnections: maxConnections.value,
    enableDHT: enableDHT.value,
    enableGossipSub: enableGossipSub.value,
    bootstrapPeers: bootstrapPeers.value,
  }

  localStorage.setItem('lotus-p2p-settings', JSON.stringify(settings))

  toast.add({
    title: 'Settings Saved',
    description: 'P2P settings will apply on next connection',
    color: 'success',
  })
}

// Add custom bootstrap peer
function addBootstrapPeer() {
  if (!customBootstrapPeer.value.trim()) return
  if (bootstrapPeers.value.includes(customBootstrapPeer.value)) {
    toast.add({
      title: 'Duplicate Peer',
      description: 'This peer is already in the list',
      color: 'warning',
    })
    return
  }
  bootstrapPeers.value.push(customBootstrapPeer.value.trim())
  customBootstrapPeer.value = ''
}

// Remove bootstrap peer
function removeBootstrapPeer(peer: string) {
  bootstrapPeers.value = bootstrapPeers.value.filter(p => p !== peer)
}

// Reset to defaults
function resetToDefaults() {
  autoConnect.value = true
  maxConnections.value = 50
  enableDHT.value = true
  enableGossipSub.value = true
  bootstrapPeers.value = []
  saveSettings()
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
          <UIcon name="i-lucide-radio" class="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">P2P Configuration</h2>
          <p class="text-sm text-muted">
            Advanced settings for peer-to-peer networking
          </p>
        </div>
      </div>
    </UiAppCard>

    <!-- Connection Settings -->
    <UiAppCard title="Connection" icon="i-lucide-plug">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-sm">Auto-connect on startup</div>
            <div class="text-xs text-muted">
              Automatically connect to P2P network when app loads
            </div>
          </div>
          <UToggle v-model="autoConnect" />
        </div>

        <UFormField
          label="Maximum connections"
          hint="Limit the number of peer connections"
        >
          <UInput
            v-model.number="maxConnections"
            type="number"
            min="10"
            max="200"
          />
        </UFormField>
      </div>
    </UiAppCard>

    <!-- Protocol Settings -->
    <UiAppCard title="Protocols" icon="i-lucide-network">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-sm">Enable DHT</div>
            <div class="text-xs text-muted">
              Distributed Hash Table for peer discovery
            </div>
          </div>
          <UToggle v-model="enableDHT" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-sm">Enable GossipSub</div>
            <div class="text-xs text-muted">
              Pub/sub messaging for signer discovery
            </div>
          </div>
          <UToggle v-model="enableGossipSub" />
        </div>
      </div>
    </UiAppCard>

    <!-- Bootstrap Peers -->
    <UiAppCard title="Bootstrap Peers" icon="i-lucide-server">
      <p class="text-sm text-muted mb-3">
        Initial peers to connect to for network discovery. Leave empty to use
        defaults.
      </p>

      <!-- Default peers info -->
      <UAlert color="info" icon="i-lucide-info" class="mb-4">
        <template #description>
          Default bootstrap peers are used when no custom peers are configured.
        </template>
      </UAlert>

      <!-- Custom peers list -->
      <div v-if="bootstrapPeers.length > 0" class="space-y-2 mb-4">
        <div
          v-for="peer in bootstrapPeers"
          :key="peer"
          class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <UIcon name="i-lucide-server" class="w-4 h-4 text-muted shrink-0" />
          <code class="text-xs flex-1 truncate">{{ peer }}</code>
          <UButton
            icon="i-lucide-x"
            color="error"
            variant="ghost"
            size="xs"
            @click="removeBootstrapPeer(peer)"
          />
        </div>
      </div>

      <!-- Add peer -->
      <div class="flex gap-2">
        <UInput
          v-model="customBootstrapPeer"
          placeholder="/dns4/example.com/tcp/4001/p2p/12D3KooW..."
          class="flex-1"
          @keyup.enter="addBootstrapPeer"
        />
        <UButton icon="i-lucide-plus" @click="addBootstrapPeer">Add</UButton>
      </div>
    </UiAppCard>

    <!-- Actions -->
    <div class="flex gap-3">
      <UButton
        color="neutral"
        variant="outline"
        class="flex-1"
        @click="resetToDefaults"
      >
        Reset to Defaults
      </UButton>
      <UButton color="primary" class="flex-1" @click="saveSettings">
        Save Settings
      </UButton>
    </div>
  </div>
</template>
```

---

### Task 2.2: Add Link to Settings Index

**File**: `pages/settings/index.vue`

Add P2P Configuration to the Advanced section:

```javascript
{
  label: 'P2P Configuration',
  description: 'Advanced peer-to-peer network settings',
  icon: 'i-lucide-radio',
  to: '/settings/p2p',
},
```

---

## Verification Checklist

- [ ] `/settings/p2p` page loads without errors
- [ ] Settings persist across page reloads
- [ ] Bootstrap peers can be added and removed
- [ ] Reset to defaults works
- [ ] Link appears in settings index

---

## Notes

- These settings may require P2P reconnection to take effect
- Consider adding a "Reconnect Now" button
- Future: Add NAT traversal settings, relay configuration

---

_Phase 2 of Critical Gaps Remediation Plan_
