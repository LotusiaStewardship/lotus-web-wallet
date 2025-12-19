<script setup lang="ts">
import type { ExplorerTx } from '~/composables/useExplorerApi'

const props = defineProps<{
  txs: ExplorerTx[]
  loading?: boolean
  tipHeight?: number
}>()

const { formatXPI } = useAmount()
const { formatDateTime } = useTime()

// Utility functions
function truncateTxid(txid: string): string {
  if (!txid || txid.length < 16) return txid
  return `${txid.slice(0, 8)}...${txid.slice(-8)}`
}

function formatTimestamp(timestamp: number | string | undefined): string {
  if (!timestamp) return 'Pending'
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
  return formatDateTime(ts)
}
</script>

<template>
  <div class="overflow-x-auto">
    <div v-if="loading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary" />
    </div>

    <table v-else class="w-full text-sm">
      <!-- Phase 6: Semantic color classes -->
      <thead>
        <tr class="border-b border-default">
          <th class="text-left py-3 px-4 font-medium text-muted">Transaction ID</th>
          <th class="text-left py-3 px-4 font-medium text-muted">Time</th>
          <th class="text-center py-3 px-4 font-medium text-muted">Inputs</th>
          <th class="text-center py-3 px-4 font-medium text-muted">Outputs</th>
          <th class="text-right py-3 px-4 font-medium text-muted">Burned</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tx in txs" :key="tx.txid" class="border-b border-default/50 hover:bg-muted/30">
          <td class="py-3 px-4">
            <NuxtLink :to="`/explorer/tx/${tx.txid}`" class="font-mono text-primary hover:underline">
              {{ truncateTxid(tx.txid) }}
            </NuxtLink>
            <UBadge v-if="tx.isCoinbase" color="success" variant="subtle" size="xs" class="ml-2">
              Coinbase
            </UBadge>
          </td>
          <td class="py-3 px-4 text-muted">
            {{ formatTimestamp(tx.block?.timestamp || tx.timeFirstSeen) }}
          </td>
          <td class="py-3 px-4 text-center font-mono">{{ tx.inputs.length }}</td>
          <td class="py-3 px-4 text-center font-mono">{{ tx.outputs.length }}</td>
          <td class="py-3 px-4 text-right">
            <span v-if="Number(tx.sumBurnedSats) > 0" class="font-mono text-warning-500">
              {{ formatXPI(tx.sumBurnedSats) }}
            </span>
            <span v-else class="text-muted">-</span>
          </td>
        </tr>
        <tr v-if="txs.length === 0">
          <td colspan="5" class="py-8 text-center text-muted">No transactions found</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
