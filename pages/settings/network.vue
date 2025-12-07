<script setup lang="ts">
import { useP2PStore } from '~/stores/p2p'
import { useWalletStore } from '~/stores/wallet'
import { useNetworkStore, NETWORK_CONFIGS, type NetworkType } from '~/stores/network'

definePageMeta({
  title: 'Network Settings',
})

const p2pStore = useP2PStore()
const walletStore = useWalletStore()
const networkStore = useNetworkStore()
const toast = useToast()

// Initialize network store
onMounted(() => {
  networkStore.initialize()
})

// Network switching
const switchingNetwork = ref(false)
const showNetworkConfirmModal = ref(false)
const pendingNetwork = ref<NetworkType | null>(null)

const networkOptions = computed(() => {
  return Object.values(NETWORK_CONFIGS).map(config => ({
    label: config.displayName,
    value: config.name,
    description: config.isProduction ? 'Production network' : 'Test network',
    color: config.color,
  }))
})

const openNetworkSwitchConfirm = (network: NetworkType) => {
  if (network === networkStore.currentNetwork) return
  pendingNetwork.value = network
  showNetworkConfirmModal.value = true
}

const confirmNetworkSwitch = async () => {
  if (!pendingNetwork.value) return

  switchingNetwork.value = true
  showNetworkConfirmModal.value = false

  try {
    await walletStore.switchNetwork(pendingNetwork.value)
    toast.add({
      title: 'Network Changed',
      description: `Switched to ${networkStore.displayName}`,
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (err) {
    toast.add({
      title: 'Network Switch Failed',
      description: err instanceof Error ? err.message : 'Failed to switch network',
      color: 'error',
      icon: 'i-lucide-x',
    })
  } finally {
    switchingNetwork.value = false
    pendingNetwork.value = null
  }
}

// P2P connection state
const connecting = ref(false)
const disconnecting = ref(false)

// Bootstrap peers (editable)
const bootstrapPeers = ref<string[]>([
  '/dns4/bootstrap.lotusia.org/tcp/6970/wss/p2p/12D3KooWCsJoL2VW9Fp3Z2s4qUJQRuFkSTFtg144FdACZnu2FoX1',
])
const newPeer = ref('')

// Connect to P2P network
const connectP2P = async () => {
  connecting.value = true
  try {
    await p2pStore.initialize({
      bootstrapPeers: bootstrapPeers.value,
    })
    toast.add({
      title: 'Connected',
      description: 'Successfully connected to P2P network',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (err) {
    toast.add({
      title: 'Connection Failed',
      description: err instanceof Error ? err.message : 'Failed to connect',
      color: 'error',
      icon: 'i-lucide-x',
    })
  } finally {
    connecting.value = false
  }
}

// Disconnect from P2P network
const disconnectP2P = async () => {
  disconnecting.value = true
  try {
    await p2pStore.stop()
    toast.add({
      title: 'Disconnected',
      description: 'Disconnected from P2P network',
      color: 'info',
      icon: 'i-lucide-wifi-off',
    })
  } finally {
    disconnecting.value = false
  }
}

// Add bootstrap peer
const addBootstrapPeer = () => {
  if (newPeer.value && !bootstrapPeers.value.includes(newPeer.value)) {
    bootstrapPeers.value.push(newPeer.value)
    newPeer.value = ''
  }
}

// Remove bootstrap peer
const removeBootstrapPeer = (peer: string) => {
  const index = bootstrapPeers.value.indexOf(peer)
  if (index >= 0) {
    bootstrapPeers.value.splice(index, 1)
  }
}

// Copy peer ID
const copyPeerId = async () => {
  if (p2pStore.peerId) {
    await navigator.clipboard.writeText(p2pStore.peerId)
    toast.add({
      title: 'Copied',
      description: 'Peer ID copied to clipboard',
      color: 'success',
      icon: 'i-lucide-check',
    })
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <!-- Header -->
    <div>
      <SettingsBackButton />
      <h1 class="text-2xl font-bold">Network Settings</h1>
      <p class="text-muted">Configure blockchain network and P2P connections</p>
    </div>

    <!-- Testnet/Regtest Warning Banner -->
    <UAlert v-if="!networkStore.isProduction" :color="networkStore.color" variant="subtle"
      icon="i-lucide-alert-triangle">
      <template #title>{{ networkStore.displayName }} Mode</template>
      <template #description>
        You are connected to {{ networkStore.displayName }}. Coins on this network have no real value.
      </template>
    </UAlert>

    <!-- Network Selection -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-globe" class="w-5 h-5" />
          <span class="font-semibold">Blockchain Network</span>
        </div>
      </template>

      <div class="space-y-4">
        <p class="text-sm text-muted">
          Select which Lotus network to connect to. Your seed phrase works on all networks.
        </p>

        <!-- Network Options -->
        <div class="grid gap-3">
          <button v-for="option in networkOptions" :key="option.value" :class="[
            'flex items-center justify-between p-4 rounded-lg border transition-all text-left',
            networkStore.currentNetwork === option.value
              ? `border-${option.color}-500 bg-${option.color}-50 dark:bg-${option.color}-900/20`
              : 'border-default hover:border-primary/50'
          ]" :disabled="switchingNetwork" @click="openNetworkSwitchConfirm(option.value)">
            <div class="flex items-center gap-3">
              <div :class="[
                'w-3 h-3 rounded-full',
                networkStore.currentNetwork === option.value ? `bg-${option.color}-500` : 'bg-gray-300 dark:bg-gray-600'
              ]" />
              <div>
                <p class="font-medium">{{ option.label }}</p>
                <p class="text-sm text-muted">{{ option.description }}</p>
              </div>
            </div>
            <UIcon v-if="networkStore.currentNetwork === option.value" name="i-lucide-check"
              :class="`w-5 h-5 text-${option.color}-500`" />
          </button>
        </div>
      </div>
    </UCard>

    <!-- Blockchain Connection -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-link" class="w-5 h-5" />
          <span class="font-semibold">Connection Status</span>
        </div>
      </template>

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Chronik Server</p>
            <p class="text-sm text-muted font-mono">{{ networkStore.chronikUrl }}</p>
          </div>
          <UBadge :color="walletStore.connected ? 'success' : 'error'" variant="subtle">
            {{ walletStore.connected ? 'Connected' : 'Disconnected' }}
          </UBadge>
        </div>

        <div class="grid grid-cols-2 gap-4 pt-2 border-t border-default">
          <div>
            <p class="text-sm text-muted">Block Height</p>
            <p class="font-mono font-semibold">{{ walletStore.tipHeight.toLocaleString() }}</p>
          </div>
          <div>
            <p class="text-sm text-muted">Block Hash</p>
            <p class="font-mono text-xs truncate">{{ walletStore.tipHash || 'N/A' }}</p>
          </div>
        </div>

        <div v-if="networkStore.explorerUrl" class="pt-2 border-t border-default">
          <p class="text-sm text-muted mb-1">Block Explorer</p>
          <a :href="networkStore.explorerUrl" target="_blank"
            class="text-sm text-primary hover:underline flex items-center gap-1">
            {{ networkStore.explorerUrl }}
            <UIcon name="i-lucide-external-link" class="w-3 h-3" />
          </a>
        </div>
      </div>
    </UCard>

    <!-- P2P Network -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-radio" class="w-5 h-5" />
            <span class="font-semibold">P2P Network</span>
          </div>
          <UBadge :color="p2pStore.initialized ? 'success' : 'neutral'" variant="subtle">
            {{ p2pStore.initialized ? 'Active' : 'Inactive' }}
          </UBadge>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Connection Controls -->
        <div class="flex gap-2">
          <UButton v-if="!p2pStore.initialized" color="primary" :loading="connecting" icon="i-lucide-wifi"
            @click="connectP2P">
            Connect to P2P
          </UButton>
          <UButton v-else color="error" variant="outline" :loading="disconnecting" icon="i-lucide-wifi-off"
            @click="disconnectP2P">
            Disconnect
          </UButton>
        </div>

        <!-- P2P Stats -->
        <div v-if="p2pStore.initialized" class="space-y-4 pt-4 border-t border-default">
          <div>
            <p class="text-sm text-muted mb-1">Your Peer ID</p>
            <div class="flex items-center gap-2">
              <code class="text-xs bg-muted/50 px-2 py-1 rounded flex-1 truncate">
            {{ p2pStore.peerId }}
          </code>
              <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-copy" @click="copyPeerId" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <StatsCard :value="p2pStore.peerCount" label="Connected Peers" :mono="true" />
            <StatsCard :value="p2pStore.routingTableSize" label="DHT Nodes" :mono="true" />
          </div>

          <div>
            <p class="text-sm text-muted mb-1">DHT Status</p>
            <UBadge :color="p2pStore.dhtReady ? 'success' : 'warning'" variant="subtle">
              {{ p2pStore.dhtReady ? 'Ready' : 'Syncing...' }}
            </UBadge>
          </div>

          <!-- Multiaddrs -->
          <div v-if="p2pStore.multiaddrs.length">
            <p class="text-sm text-muted mb-2">Your Addresses</p>
            <div class="space-y-1">
              <code v-for="addr in p2pStore.multiaddrs" :key="addr"
                class="text-xs bg-muted/50 px-2 py-1 rounded block truncate">
            {{ addr }}
          </code>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Bootstrap Peers -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-server" class="w-5 h-5" />
          <span class="font-semibold">Bootstrap Peers</span>
        </div>
      </template>

      <div class="space-y-4">
        <p class="text-sm text-muted">
          Bootstrap peers help you discover other nodes on the network.
        </p>

        <!-- Add peer -->
        <div class="flex gap-2">
          <UInput v-model="newPeer" placeholder="/ip4/x.x.x.x/tcp/6969/p2p/..." class="flex-1 font-mono text-sm"
            @keyup.enter="addBootstrapPeer" />
          <UButton color="neutral" variant="outline" icon="i-lucide-plus" :disabled="!newPeer"
            @click="addBootstrapPeer">
            Add
          </UButton>
        </div>

        <!-- Peer list -->
        <div class="space-y-2">
          <div v-for="peer in bootstrapPeers" :key="peer" class="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
            <code class="text-xs flex-1 truncate">{{ peer }}</code>
            <UButton color="error" variant="ghost" size="xs" icon="i-lucide-x" @click="removeBootstrapPeer(peer)" />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Connected Peers -->
    <UCard v-if="p2pStore.connectedPeers.length">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-users" class="w-5 h-5" />
          <span class="font-semibold">Connected Peers</span>
          <UBadge color="neutral" variant="subtle" size="xs">
            {{ p2pStore.connectedPeers.length }}
          </UBadge>
        </div>
      </template>

      <div class="divide-y divide-default -my-2">
        <div v-for="peer in p2pStore.connectedPeers" :key="peer.peerId" class="py-3 flex items-center justify-between">
          <div class="min-w-0">
            <code class="text-xs truncate block">{{ peer.peerId }}</code>
            <p v-if="peer.multiaddrs?.length" class="text-xs text-muted truncate">
              {{ peer.multiaddrs[0] }}
            </p>
          </div>
          <UButton color="error" variant="ghost" size="xs" icon="i-lucide-x"
            @click="p2pStore.disconnectFromPeer(peer.peerId)" />
        </div>
      </div>
    </UCard>

    <!-- Network Switch Confirmation Modal -->
    <UModal v-model:open="showNetworkConfirmModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-globe" class="w-5 h-5" />
              <span class="font-semibold">Switch Network</span>
            </div>
          </template>
          <div class="space-y-4">
            <p>
              Are you sure you want to switch to
              <strong>{{ pendingNetwork ? NETWORK_CONFIGS[pendingNetwork].displayName : '' }}</strong>?
            </p>
            <UAlert v-if="pendingNetwork && !NETWORK_CONFIGS[pendingNetwork].isProduction" color="warning"
              variant="subtle" icon="i-lucide-alert-triangle">
              <template #description>
                {{ NETWORK_CONFIGS[pendingNetwork].displayName }} coins have no real value.
                This is for testing purposes only.
              </template>
            </UAlert>
            <p class="text-sm text-muted">
              Your wallet will reconnect to the new network. Your seed phrase remains the same,
              but your address will change to match the network format.
            </p>
            <div class="flex gap-2">
              <UButton block :color="pendingNetwork ? NETWORK_CONFIGS[pendingNetwork].color : 'primary'"
                icon="i-lucide-globe" :loading="switchingNetwork" @click="confirmNetworkSwitch">
                Switch to {{ pendingNetwork ? NETWORK_CONFIGS[pendingNetwork].displayName : '' }}
              </UButton>
              <UButton color="neutral" variant="outline"
                @click="showNetworkConfirmModal = false; pendingNetwork = null">
                Cancel
              </UButton>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
