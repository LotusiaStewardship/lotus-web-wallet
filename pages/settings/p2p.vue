<script setup lang="ts">
/**
 * P2P Settings Page
 *
 * Advanced P2P network configuration including DHT, GossipSub,
 * connection limits, and bootstrap peer management.
 *
 * Uses the P2P store for settings persistence.
 */
import { useP2PStore, DEFAULT_BOOTSTRAP_PEERS } from '~/stores/p2p'

definePageMeta({
  title: 'P2P Settings',
})

const p2pStore = useP2PStore()
const toast = useToast()

// Custom bootstrap peer input
const customBootstrapPeer = ref('')

// Load settings on mount
onMounted(() => {
  p2pStore.loadSettings()
})

// Computed bindings to store settings
const autoConnect = computed({
  get: () => p2pStore.settings.autoConnect,
  set: (value: boolean) => p2pStore.updateSettings({ autoConnect: value }),
})

const maxConnections = computed({
  get: () => p2pStore.settings.maxConnections,
  set: (value: number) => p2pStore.updateSettings({ maxConnections: value }),
})

const enableDHT = computed({
  get: () => p2pStore.settings.enableDHT,
  set: (value: boolean) => p2pStore.updateSettings({ enableDHT: value }),
})

const enableGossipSub = computed({
  get: () => p2pStore.settings.enableGossipSub,
  set: (value: boolean) => p2pStore.updateSettings({ enableGossipSub: value }),
})

const bootstrapPeers = computed(() => p2pStore.settings.bootstrapPeers)

// Add custom bootstrap peer
function addBootstrapPeer() {
  const peer = customBootstrapPeer.value.trim()
  if (!peer) return

  const success = p2pStore.addBootstrapPeer(peer)
  if (success) {
    customBootstrapPeer.value = ''
    toast.add({
      title: 'Peer Added',
      description: 'Bootstrap peer added successfully',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } else if (!peer.startsWith('/')) {
    toast.add({
      title: 'Invalid Peer Address',
      description: 'Multiaddr should start with /',
      color: 'error',
    })
  } else {
    toast.add({
      title: 'Duplicate Peer',
      description: 'This peer is already in the list',
      color: 'warning',
    })
  }
}

// Remove bootstrap peer
function removeBootstrapPeer(peer: string) {
  p2pStore.removeBootstrapPeer(peer)
}

// Reset to defaults
function resetToDefaults() {
  p2pStore.resetSettings()
  toast.add({
    title: 'Settings Reset',
    description: 'P2P settings restored to defaults',
    color: 'info',
    icon: 'i-lucide-refresh-cw',
  })
}

// Reconnect to apply settings immediately
async function reconnectNow() {
  if (!p2pStore.initialized) {
    toast.add({
      title: 'Not Connected',
      description: 'P2P is not currently connected',
      color: 'warning',
    })
    return
  }

  try {
    // Disconnect and reconnect with new settings
    await p2pStore.disconnect()

    // Build config from settings
    const config: Record<string, unknown> = {
      bootstrapNodes: p2pStore.getEffectiveBootstrapPeers(),
      enableDHT: p2pStore.settings.enableDHT,
    }

    await p2pStore.connect(config)

    toast.add({
      title: 'Reconnected',
      description: 'P2P connection restarted with new settings',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (error) {
    toast.add({
      title: 'Reconnection Failed',
      description: error instanceof Error ? error.message : 'Failed to reconnect',
      color: 'error',
    })
  }
}

// Connection status
const isConnected = computed(() => p2pStore.connected && p2pStore.initialized)
const connectionStatus = computed(() => p2pStore.connectionStatusMessage)
</script>

<template>
  <div class="space-y-4">
    <SettingsBackButton />

    <!-- Header -->
    <UiAppCard>
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <UIcon name="i-lucide-radio" class="w-6 h-6 text-primary" />
        </div>
        <div class="flex-1">
          <h2 class="text-lg font-semibold">P2P Configuration</h2>
          <p class="text-sm text-muted">
            Advanced settings for peer-to-peer networking
          </p>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full" :class="isConnected ? 'bg-green-500' : 'bg-gray-400'" />
          <span class="text-xs text-muted">{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
        </div>
      </div>
    </UiAppCard>

    <!-- Connection Status -->
    <UiAppCard v-if="isConnected" title="Connection Status" icon="i-lucide-activity">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-muted">Status</span>
          <span class="text-sm font-medium">{{ connectionStatus }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-muted">Connected Peers</span>
          <span class="text-sm font-medium">{{ p2pStore.peerCount }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-muted">DHT Routing Table</span>
          <span class="text-sm font-medium">{{ p2pStore.routingTableSize }} peers</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-muted">Peer ID</span>
          <code class="text-xs font-mono truncate max-w-[200px]">{{ p2pStore.peerId }}</code>
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
          <USwitch v-model="autoConnect" />
        </div>

        <UFormField label="Maximum connections" hint="Limit the number of peer connections (10-200)">
          <UInput v-model.number="maxConnections" type="number" min="10" max="200" />
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
          <USwitch v-model="enableDHT" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-sm">Enable GossipSub</div>
            <div class="text-xs text-muted">
              Pub/sub messaging for signer discovery
            </div>
          </div>
          <USwitch v-model="enableGossipSub" />
        </div>
      </div>

      <UAlert v-if="!enableDHT || !enableGossipSub" color="warning" icon="i-lucide-alert-triangle" class="mt-4">
        <template #description>
          Disabling DHT or GossipSub may limit P2P functionality including signer discovery.
        </template>
      </UAlert>
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
          <div class="text-xs">
            <strong>Default bootstrap peer:</strong>
            <code class="block mt-1 break-all">{{ DEFAULT_BOOTSTRAP_PEERS[0] }}</code>
          </div>
        </template>
      </UAlert>

      <!-- Custom peers list -->
      <div v-if="bootstrapPeers.length > 0" class="space-y-2 mb-4">
        <div class="text-xs font-medium text-muted mb-2">Custom Peers ({{ bootstrapPeers.length }})</div>
        <div v-for="peer in bootstrapPeers" :key="peer"
          class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <UIcon name="i-lucide-server" class="w-4 h-4 text-muted shrink-0" />
          <code class="text-xs flex-1 truncate">{{ peer }}</code>
          <UButton icon="i-lucide-x" color="error" variant="ghost" size="xs" @click="removeBootstrapPeer(peer)" />
        </div>
      </div>

      <!-- Add peer -->
      <div class="flex gap-2">
        <UInput v-model="customBootstrapPeer" placeholder="/dns4/example.com/tcp/4001/p2p/12D3KooW..." class="flex-1"
          @keyup.enter="addBootstrapPeer" />
        <UButton icon="i-lucide-plus" @click="addBootstrapPeer">Add</UButton>
      </div>
    </UiAppCard>

    <!-- Actions -->
    <div class="flex gap-3">
      <UButton color="neutral" variant="outline" class="flex-1" @click="resetToDefaults">
        <UIcon name="i-lucide-refresh-cw" class="w-4 h-4 mr-2" />
        Reset to Defaults
      </UButton>
    </div>

    <!-- Reconnect Button (only when connected) -->
    <UButton v-if="isConnected" color="warning" variant="soft" block @click="reconnectNow">
      <UIcon name="i-lucide-refresh-cw" class="w-4 h-4 mr-2" />
      Reconnect Now to Apply Changes
    </UButton>

    <!-- Info -->
    <UAlert color="info" variant="subtle" icon="i-lucide-info">
      <template #description>
        Settings are saved automatically. Some changes may require reconnecting to take effect.
      </template>
    </UAlert>
  </div>
</template>
