# Phase 5: Transaction History Export

## Overview

Add export functionality to the transaction history page, allowing users to download their transaction history in various formats.

**Priority**: P2
**Estimated Effort**: 0.5 days
**Dependencies**: Wallet Store, Transaction History

---

## Problem Statement

Users cannot export their transaction history for record-keeping, tax reporting, or personal accounting. The history page is view-only with no export capability.

---

## Implementation

### Task 5.1: Create Export Composable

**File**: `composables/useExport.ts`

```typescript
/**
 * useExport
 *
 * Utilities for exporting data in various formats.
 */
export function useExport() {
  /**
   * Export data as CSV
   */
  function exportCSV(data: Record<string, any>[], filename: string) {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers
          .map(header => {
            const value = row[header]
            // Escape quotes and wrap in quotes if contains comma
            if (
              typeof value === 'string' &&
              (value.includes(',') || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value ?? ''
          })
          .join(','),
      ),
    ].join('\n')

    downloadFile(csvContent, `${filename}.csv`, 'text/csv')
  }

  /**
   * Export data as JSON
   */
  function exportJSON(data: any, filename: string) {
    const jsonContent = JSON.stringify(data, null, 2)
    downloadFile(jsonContent, `${filename}.json`, 'application/json')
  }

  /**
   * Download file helper
   */
  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return {
    exportCSV,
    exportJSON,
    downloadFile,
  }
}
```

---

### Task 5.2: Add Export to History Page

**File**: `pages/transact/history.vue`

Add export functionality:

```vue
<script setup lang="ts">
// Add to existing script
const { exportCSV, exportJSON } = useExport()

// Export modal state
const showExportModal = ref(false)
const exportFormat = ref<'csv' | 'json'>('csv')
const exportDateRange = ref<'all' | '30d' | '90d' | '1y' | 'custom'>('all')
const customStartDate = ref('')
const customEndDate = ref('')

// Filter transactions by date range
const filteredForExport = computed(() => {
  let txs = [...transactions.value]

  if (exportDateRange.value === 'all') return txs

  const now = Date.now()
  let startTime = 0

  switch (exportDateRange.value) {
    case '30d':
      startTime = now - 30 * 24 * 60 * 60 * 1000
      break
    case '90d':
      startTime = now - 90 * 24 * 60 * 60 * 1000
      break
    case '1y':
      startTime = now - 365 * 24 * 60 * 60 * 1000
      break
    case 'custom':
      startTime = customStartDate.value
        ? new Date(customStartDate.value).getTime()
        : 0
      const endTime = customEndDate.value
        ? new Date(customEndDate.value).getTime()
        : now
      return txs.filter(tx => {
        const txTime = tx.timestamp * 1000
        return txTime >= startTime && txTime <= endTime
      })
  }

  return txs.filter(tx => tx.timestamp * 1000 >= startTime)
})

// Format transactions for export
function formatForExport(txs: any[]) {
  return txs.map(tx => ({
    date: new Date(tx.timestamp * 1000).toISOString(),
    txid: tx.txid,
    type: tx.type,
    amount: tx.amount,
    fee: tx.fee || 0,
    confirmations: tx.confirmations,
    address: tx.address || '',
    note: tx.note || '',
  }))
}

// Perform export
function performExport() {
  const data = formatForExport(filteredForExport.value)
  const filename = `lotus-transactions-${
    new Date().toISOString().split('T')[0]
  }`

  if (exportFormat.value === 'csv') {
    exportCSV(data, filename)
  } else {
    exportJSON(data, filename)
  }

  showExportModal.value = false

  toast.add({
    title: 'Export Complete',
    description: `Exported ${data.length} transactions`,
    color: 'success',
  })
}
</script>

<template>
  <!-- Add export button to header -->
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold">Transaction History</h2>
    <UButton
      icon="i-lucide-download"
      color="neutral"
      variant="outline"
      size="sm"
      @click="showExportModal = true"
    >
      Export
    </UButton>
  </div>

  <!-- Export Modal -->
  <UModal v-model:open="showExportModal">
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4">Export Transactions</h3>

        <!-- Format Selection -->
        <UFormField label="Format" class="mb-4">
          <URadioGroup
            v-model="exportFormat"
            :items="[
              { label: 'CSV (Spreadsheet)', value: 'csv' },
              { label: 'JSON (Data)', value: 'json' },
            ]"
          />
        </UFormField>

        <!-- Date Range -->
        <UFormField label="Date Range" class="mb-4">
          <USelect
            v-model="exportDateRange"
            :items="[
              { label: 'All Time', value: 'all' },
              { label: 'Last 30 Days', value: '30d' },
              { label: 'Last 90 Days', value: '90d' },
              { label: 'Last Year', value: '1y' },
              { label: 'Custom Range', value: 'custom' },
            ]"
          />
        </UFormField>

        <!-- Custom Date Range -->
        <div
          v-if="exportDateRange === 'custom'"
          class="grid grid-cols-2 gap-4 mb-4"
        >
          <UFormField label="Start Date">
            <UInput v-model="customStartDate" type="date" />
          </UFormField>
          <UFormField label="End Date">
            <UInput v-model="customEndDate" type="date" />
          </UFormField>
        </div>

        <!-- Preview -->
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
          <div class="text-sm text-muted">
            {{ filteredForExport.length }} transactions will be exported
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <UButton
            color="neutral"
            variant="outline"
            class="flex-1"
            @click="showExportModal = false"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            class="flex-1"
            :disabled="filteredForExport.length === 0"
            @click="performExport"
          >
            <UIcon name="i-lucide-download" class="w-4 h-4 mr-2" />
            Export
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
```

---

## Verification Checklist

- [ ] Export button appears on history page
- [ ] Export modal opens with format options
- [ ] CSV export generates valid CSV file
- [ ] JSON export generates valid JSON file
- [ ] Date range filtering works
- [ ] Custom date range works
- [ ] File downloads with correct filename
- [ ] Empty state handled gracefully

---

## CSV Format

```csv
date,txid,type,amount,fee,confirmations,address,note
2024-12-11T10:30:00.000Z,abc123...,send,-100.5,0.001,6,lotus_16PSJ...,Payment to Alice
2024-12-10T15:45:00.000Z,def456...,receive,500.0,0,10,lotus_16PSJ...,
```

---

## Notes

- Consider adding PDF export for formal records
- Future: Add contact names to export if available
- Future: Add fiat value at time of transaction

---

_Phase 5 of Critical Gaps Remediation Plan_
