<script setup lang="ts">
import { useP2PStore } from '~/stores/p2p'
import { useWalletStore } from '~/stores/wallet'

definePageMeta({
  title: 'Network Settings',
})

const p2pStore = useP2PStore()
const walletStore = useWalletStore()
const toast = useToast()

// P2P connection state
const connecting = ref(false)
const disconnecting = ref(false)

// Bootstrap peers (editable)
const bootstrapPeers = ref<string[]>([
  //'/dns4/bootstrap.lotusia.org/tcp/6970/ws/p2p/12D3KooWCsJoL2VW9Fp3Z2s4qUJQRuFkSTFtg144FdACZnu2FoX1',
  '/ip4/172.16.2.20/tcp/6970/ws/p2p/12D3KooWCsJoL2VW9Fp3Z2s4qUJQRuFkSTFtg144FdACZnu2FoX1'
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
      <NuxtLink to="/settings" class="text-sm text-muted hover:text-foreground flex items-center gap-1 mb-4">
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        Back to Settings
      </NuxtLink>
      <h1 class="text-2xl font-bold">Network Settings</h1>
      <p class="text-muted">Configure P2P network and blockchain connections</p>
    </div>

    <!-- Blockchain Connection -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-link" class="w-5 h-5" />
          <span class="font-semibold">Blockchain Connection</span>
        </div>
      </template>

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium">Chronik Server</p>
            <p class="text-sm text-muted">https://chronik.lotusia.org</p>
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
  </div>
</template>
