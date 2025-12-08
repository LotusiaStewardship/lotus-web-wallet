<script setup lang="ts">
/**
 * P2P Settings Page
 *
 * Provides detailed configuration for the P2PCoordinator including:
 * - DHT settings (enable/disable, server mode, protocol)
 * - GossipSub settings
 * - NAT traversal (Relay, AutoNAT, DCUTR, UPnP)
 * - Connection limits
 * - Security settings
 * - Relay monitoring
 */
import { useP2PStore } from '~/stores/p2p'

definePageMeta({
  title: 'P2P Settings',
})

const p2pStore = useP2PStore()
const toast = useToast()

// ============================================================================
// P2P Configuration State
// ============================================================================

// DHT Settings
const enableDHT = ref(true)
const enableDHTServer = ref(false)
const dhtProtocol = ref('/lotus/kad/1.0.0')

// GossipSub Settings
const enableGossipSub = ref(true)

// NAT Traversal Settings
const enableRelay = ref(true)
const enableRelayServer = ref(false)
const enableAutoNAT = ref(true)
const enableDCUTR = ref(true)
const enableUPnP = ref(false)

// Connection Settings
const maxConnections = ref(20)

// Relay Monitoring
const enableRelayMonitoring = ref(false)
const relayCheckInterval = ref(10000)
const bootstrapOnly = ref(true)

// Security Settings
const disableRateLimiting = ref(false)

// Advanced
const showAdvanced = ref(false)

// ============================================================================
// Computed
// ============================================================================

const hasUnsavedChanges = computed(() => {
  // Compare current values with store config
  // For now, always show save button when connected
  return p2pStore.initialized
})

const isUPnPWarningVisible = computed(() => enableUPnP.value)

// ============================================================================
// Actions
// ============================================================================

const saveSettings = async () => {
  // Settings will be applied on next connection
  // Store in localStorage for persistence
  const config = {
    enableDHT: enableDHT.value,
    enableDHTServer: enableDHTServer.value,
    dhtProtocol: dhtProtocol.value,
    enableGossipSub: enableGossipSub.value,
    enableRelay: enableRelay.value,
    enableRelayServer: enableRelayServer.value,
    enableAutoNAT: enableAutoNAT.value,
    enableDCUTR: enableDCUTR.value,
    enableUPnP: enableUPnP.value,
    maxConnections: maxConnections.value,
    relayMonitoring: {
      enabled: enableRelayMonitoring.value,
      checkInterval: relayCheckInterval.value,
      bootstrapOnly: bootstrapOnly.value,
    },
    securityConfig: {
      disableRateLimiting: disableRateLimiting.value,
    },
  }

  // Save to localStorage for persistence
  // These settings will be read on next P2P initialization
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('p2p-config', JSON.stringify(config))
  }

  toast.add({
    title: 'Settings Saved',
    description: 'P2P settings will be applied on next connection',
    color: 'success',
    icon: 'i-lucide-check',
  })
}

const resetToDefaults = () => {
  enableDHT.value = true
  enableDHTServer.value = false
  dhtProtocol.value = '/lotus/kad/1.0.0'
  enableGossipSub.value = true
  enableRelay.value = true
  enableRelayServer.value = false
  enableAutoNAT.value = true
  enableDCUTR.value = true
  enableUPnP.value = false
  maxConnections.value = 100
  enableRelayMonitoring.value = false
  relayCheckInterval.value = 10000
  bootstrapOnly.value = true
  disableRateLimiting.value = false

  toast.add({
    title: 'Reset to Defaults',
    description: 'Settings have been reset to default values',
    color: 'info',
    icon: 'i-lucide-refresh-cw',
  })
}

// Load saved settings on mount
onMounted(() => {
  const saved = localStorage.getItem('p2p-config')
  if (saved) {
    try {
      const config = JSON.parse(saved)
      enableDHT.value = config.enableDHT ?? true
      enableDHTServer.value = config.enableDHTServer ?? false
      dhtProtocol.value = config.dhtProtocol ?? '/lotus/kad/1.0.0'
      enableGossipSub.value = config.enableGossipSub ?? true
      enableRelay.value = config.enableRelay ?? true
      enableRelayServer.value = config.enableRelayServer ?? false
      enableAutoNAT.value = config.enableAutoNAT ?? true
      enableDCUTR.value = config.enableDCUTR ?? true
      enableUPnP.value = config.enableUPnP ?? false
      maxConnections.value = config.maxConnections ?? 100
      enableRelayMonitoring.value = config.relayMonitoring?.enabled ?? false
      relayCheckInterval.value = config.relayMonitoring?.checkInterval ?? 10000
      bootstrapOnly.value = config.relayMonitoring?.bootstrapOnly ?? true
      disableRateLimiting.value = config.securityConfig?.disableRateLimiting ?? false
    } catch {
      // Ignore parse errors
    }
  }
})
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <!-- Header -->
    <div>
      <SettingsBackButton />
      <h1 class="text-2xl font-bold">P2P Settings</h1>
      <p class="text-muted">Configure advanced P2P network options</p>
    </div>

    <!-- Connection Status -->
    <UAlert v-if="p2pStore.initialized" color="success" variant="subtle" icon="i-lucide-wifi">
      <template #title>P2P Network Active</template>
      <template #description>
        Changes will take effect on next connection. Disconnect and reconnect to apply.
      </template>
    </UAlert>

    <!-- DHT Settings -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-database" class="w-5 h-5" />
          <span class="font-semibold">DHT (Distributed Hash Table)</span>
        </div>
      </template>

      <div class="space-y-4">
        <p class="text-sm text-muted">
          The DHT enables peer discovery and resource lookup across the network.
        </p>

        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Enable DHT</p>
            <p class="text-sm text-muted">Required for peer discovery</p>
          </div>
          <USwitch v-model="enableDHT" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">DHT Server Mode</p>
            <p class="text-sm text-muted">Participate in routing and storing DHT data</p>
          </div>
          <USwitch v-model="enableDHTServer" :disabled="!enableDHT" />
        </div>

        <div>
          <label class="text-sm font-medium">DHT Protocol</label>
          <UInput v-model="dhtProtocol" class="mt-1 font-mono" :disabled="!enableDHT" />
          <p class="text-xs text-muted mt-1">Protocol identifier for DHT network</p>
        </div>
      </div>
    </UCard>

    <!-- GossipSub Settings -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-radio" class="w-5 h-5" />
          <span class="font-semibold">GossipSub (Pub/Sub)</span>
        </div>
      </template>

      <div class="space-y-4">
        <p class="text-sm text-muted">
          GossipSub enables real-time event-driven discovery and notifications.
        </p>

        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Enable GossipSub</p>
            <p class="text-sm text-muted">Required for real-time updates</p>
          </div>
          <USwitch v-model="enableGossipSub" />
        </div>
      </div>
    </UCard>

    <!-- NAT Traversal Settings -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-shield" class="w-5 h-5" />
          <span class="font-semibold">NAT Traversal</span>
        </div>
      </template>

      <div class="space-y-4">
        <p class="text-sm text-muted">
          NAT traversal helps peers behind firewalls connect to each other.
        </p>

        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Circuit Relay</p>
            <p class="text-sm text-muted">Connect via relay nodes when direct connection fails</p>
          </div>
          <USwitch v-model="enableRelay" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Relay Server Mode</p>
            <p class="text-sm text-muted">Allow others to relay through you (for public nodes)</p>
          </div>
          <USwitch v-model="enableRelayServer" :disabled="!enableRelay" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">AutoNAT</p>
            <p class="text-sm text-muted">Automatically detect NAT type and public address</p>
          </div>
          <USwitch v-model="enableAutoNAT" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">DCUTR (Direct Connection Upgrade)</p>
            <p class="text-sm text-muted">Upgrade relay connections to direct P2P</p>
          </div>
          <USwitch v-model="enableDCUTR" :disabled="!enableRelay" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">UPnP/NAT-PMP</p>
            <p class="text-sm text-muted">Automatic port forwarding (use with caution)</p>
          </div>
          <USwitch v-model="enableUPnP" />
        </div>

        <UAlert v-if="isUPnPWarningVisible" color="warning" variant="subtle" icon="i-lucide-alert-triangle">
          <template #title>Security Warning</template>
          <template #description>
            UPnP can expose security risks by automatically opening ports. Only enable on trusted networks.
          </template>
        </UAlert>
      </div>
    </UCard>

    <!-- Connection Settings -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-link" class="w-5 h-5" />
          <span class="font-semibold">Connection Limits</span>
        </div>
      </template>

      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium">Maximum Connections</label>
          <UInput v-model.number="maxConnections" type="number" min="10" max="1000" class="mt-1" />
          <p class="text-xs text-muted mt-1">Maximum number of peer connections (10-1000)</p>
        </div>
      </div>
    </UCard>

    <!-- Advanced Settings -->
    <UCard>
      <template #header>
        <button class="flex items-center justify-between w-full" @click="showAdvanced = !showAdvanced">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-settings-2" class="w-5 h-5" />
            <span class="font-semibold">Advanced Settings</span>
          </div>
          <UIcon :name="showAdvanced ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="w-5 h-5" />
        </button>
      </template>

      <div v-if="showAdvanced" class="space-y-6">
        <!-- Relay Monitoring -->
        <div class="space-y-4">
          <h4 class="font-medium text-sm">Relay Monitoring</h4>

          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm">Enable Relay Monitoring</p>
              <p class="text-xs text-muted">Monitor relay address changes</p>
            </div>
            <USwitch v-model="enableRelayMonitoring" />
          </div>

          <div v-if="enableRelayMonitoring" class="space-y-3 pl-4 border-l-2 border-default">
            <div>
              <label class="text-sm">Check Interval (ms)</label>
              <UInput v-model.number="relayCheckInterval" type="number" min="1000" max="60000" class="mt-1" />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm">Bootstrap Only</p>
                <p class="text-xs text-muted">Only monitor bootstrap relay connections</p>
              </div>
              <USwitch v-model="bootstrapOnly" />
            </div>
          </div>
        </div>

        <!-- Security Settings -->
        <div class="space-y-4 pt-4 border-t border-default">
          <h4 class="font-medium text-sm">Security</h4>

          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm">Disable Rate Limiting</p>
              <p class="text-xs text-muted text-error-500">⚠️ TESTING ONLY - Removes DoS protection</p>
            </div>
            <USwitch v-model="disableRateLimiting" />
          </div>

          <UAlert v-if="disableRateLimiting" color="error" variant="subtle" icon="i-lucide-alert-octagon">
            <template #title>Danger Zone</template>
            <template #description>
              Disabling rate limiting removes protection against denial-of-service attacks.
              Never use this in production!
            </template>
          </UAlert>
        </div>
      </div>
    </UCard>

    <!-- Actions -->
    <div class="flex gap-2">
      <UButton color="primary" icon="i-lucide-save" @click="saveSettings">
        Save Settings
      </UButton>
      <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" @click="resetToDefaults">
        Reset to Defaults
      </UButton>
    </div>

    <!-- Current Configuration Display -->
    <UCard v-if="p2pStore.initialized">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-info" class="w-5 h-5" />
          <span class="font-semibold">Current Session Info</span>
        </div>
      </template>

      <div class="space-y-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-muted">Peer ID</span>
          <code class="text-xs truncate max-w-[200px]">{{ p2pStore.peerId }}</code>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-muted">Connected Peers</span>
          <span class="font-mono">{{ p2pStore.peerCount }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-muted">DHT Status</span>
          <UBadge :color="p2pStore.dhtReady ? 'success' : 'warning'" variant="subtle" size="md">
            {{ p2pStore.dhtReady ? 'Ready' : 'Initializing' }}
          </UBadge>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-muted">Routing Table Size</span>
          <span class="font-mono">{{ p2pStore.routingTableSize }}</span>
        </div>
        <div v-if="p2pStore.multiaddrs.length" class="pt-2 border-t border-default">
          <p class="text-muted mb-2">Listen Addresses</p>
          <div class="space-y-1">
            <code v-for="addr in p2pStore.multiaddrs" :key="addr"
              class="text-xs bg-muted/50 px-2 py-1 rounded block truncate">
          {{ addr }}
        </code>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
