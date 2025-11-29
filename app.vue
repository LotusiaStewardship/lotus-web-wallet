<script setup lang="ts">
import { useWalletStore } from '~/stores/wallet'
import { useP2PStore } from '~/stores/p2p'

const walletStore = useWalletStore()
const p2pStore = useP2PStore()
const colorMode = useColorMode()

// Initialize wallet on app mount
onMounted(async () => {
  await walletStore.initialize()
})

// Provide color mode to components
provide('colorMode', colorMode)
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<style>
/* Global styles */
html, body, #__nuxt {
  height: 100%;
  margin: 0;
  padding: 0;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgb(var(--color-gray-300));
  border-radius: 4px;
}

.dark ::-webkit-scrollbar-thumb {
  background: rgb(var(--color-gray-700));
}
</style>
