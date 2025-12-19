# 22: Send Page Refactor

## Overview

The Send page (`pages/send.vue`) is 32KB and still uses old patterns. This phase refactors it to use the new design system components and composables.

---

## Current Problems

1. **Uses old composables** - `useAddressFormat` from `useUtils` instead of `useAddress`
2. **Inline implementations** - All UI is inline instead of using `components/send/` components
3. **No design system** - Uses raw `UCard` instead of `AppCard`, `AppHeroCard`
4. **Large file** - 825 lines, hard to maintain
5. **Direct store access** - Should use `useDraftStore` instead of `walletStore.draftTx`

---

## Target State

Refactor to use:

- `SendRecipientInput.vue` - Address input with contact picker
- `SendAmountInput.vue` - Amount input with max button
- `SendFeeSection.vue` - Fee display and presets
- `SendAdvancedOptions.vue` - Coin control, OP_RETURN, locktime
- `SendConfirmationModal.vue` - Review before sending
- `SendSuccess.vue` - Success state with TXID
- New composables: `useAddress`, `useAmount`, `useClipboard`

---

## Implementation Steps

### Step 1: Update Imports

Replace:

```typescript
import { useAddressFormat } from '~/composables/useUtils'
const { formatFingerprint, getNetworkName, isValidAddress } = useAddressFormat()
```

With:

```typescript
const { toFingerprint, isValidAddress } = useAddress()
const { formatXPI, xpiToSats, satsToXPI } = useAmount()
const { copy } = useClipboard()
```

### Step 2: Use Draft Store

Replace `walletStore.draftTx` with `useDraftStore()`:

```typescript
const draftStore = useDraftStore()
const { recipients, feeRate, selectedUtxos, opReturn } = storeToRefs(draftStore)
```

### Step 3: Replace Template with Components

Replace inline recipient section with:

```vue
<SendRecipientInput
  v-for="recipient in draftStore.recipients"
  :key="recipient.id"
  :recipient="recipient"
  :show-remove="draftStore.recipients.length > 1"
  @update:address="draftStore.updateRecipientAddress(recipient.id, $event)"
  @update:amount="draftStore.updateRecipientAmount(recipient.id, $event)"
  @remove="draftStore.removeRecipient(recipient.id)"
  @pick-contact="openContactPicker(recipient.id)"
/>
```

### Step 4: Add Confirmation Modal

```vue
<SendConfirmationModal
  v-model:open="showConfirmation"
  :recipients="draftStore.recipients"
  :fee="draftStore.estimatedFee"
  :total="draftStore.totalAmount"
  @confirm="handleSend"
  @cancel="showConfirmation = false"
/>
```

### Step 5: Add Success State

```vue
<SendSuccess
  v-if="sendSuccess"
  :txid="lastTxid"
  @new-transaction="resetForm"
  @view-history="navigateTo('/history')"
/>
```

---

## Files to Modify

| File             | Change                                 |
| ---------------- | -------------------------------------- |
| `pages/send.vue` | Complete refactor using new components |

## Files to Use (Already Created)

| Component                               | Purpose          |
| --------------------------------------- | ---------------- |
| `components/send/RecipientInput.vue`    | Address input    |
| `components/send/AmountInput.vue`       | Amount input     |
| `components/send/FeeSection.vue`        | Fee display      |
| `components/send/AdvancedOptions.vue`   | Advanced options |
| `components/send/ConfirmationModal.vue` | Confirmation     |
| `components/send/Success.vue`           | Success state    |

---

## Verification

After refactoring:

1. Send page loads without errors
2. Can add/remove recipients
3. Contact picker works
4. Fee estimation works
5. Advanced options work (coin control, OP_RETURN)
6. Confirmation modal shows correct data
7. Transaction sends successfully
8. Success state shows TXID

---

_Next: [23_PAGE_RECEIVE.md](./23_PAGE_RECEIVE.md)_
