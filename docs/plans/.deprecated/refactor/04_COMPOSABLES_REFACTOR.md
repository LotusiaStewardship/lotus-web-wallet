# 04: Composables Refactor

## Overview

This document details the refactoring of composables. The current composables mix concerns and are too large. We'll split them into focused, reusable utilities.

---

## Current Problems

### useUtils.ts (18KB, ~500 lines)

- Mixes address formatting, amount formatting, time formatting, color utilities
- Contains SDK-dependent and SDK-independent code together
- Hard to tree-shake unused utilities

### useMuSig2.ts (28KB, ~700 lines)

- Mixes UI state management with SDK interaction
- Duplicates some store functionality
- Complex event handling mixed with state

### useBitcore.ts (3.6KB)

- Good pattern, keep mostly as-is
- Minor cleanup needed

### useExplorerApi.ts (15KB) & useRankApi.ts (13KB)

- Good separation, minor updates needed
- Add better error handling

---

## New Composable Structure

```
composables/
├── useWallet.ts         # Wallet utilities (formatting, validation)
├── useAddress.ts        # Address parsing, formatting, validation
├── useTransaction.ts    # Transaction utilities
├── useAmount.ts         # Amount formatting (XPI, sats, fiat)
├── useTime.ts           # Time formatting utilities
├── useChronik.ts        # Chronik API wrapper
├── useP2P.ts            # P2P utilities
├── useMuSig2.ts         # MuSig2 utilities (simplified)
├── useRank.ts           # RANK API wrapper
├── useClipboard.ts      # Clipboard operations
├── useQRCode.ts         # QR code generation/scanning
├── useNotifications.ts  # Toast/notification helpers
├── useBitcore.ts        # SDK access (existing, minor updates)
└── useAvatars.ts        # Avatar generation (existing, keep as-is)
```

---

## Composable: useAddress.ts

### Purpose

Address parsing, formatting, and validation utilities.

```typescript
// composables/useAddress.ts
import { useBitcore } from './useBitcore'

export function useAddress() {
  const { Bitcore, isReady } = useBitcore()

  /**
   * Validate a Lotus address
   */
  function isValidAddress(
    address: string,
    network?: 'livenet' | 'testnet',
  ): boolean {
    if (!isReady.value || !Bitcore.value?.Address) return false
    try {
      const addr = new Bitcore.value.Address(address)
      if (network) {
        return addr.network.name === network
      }
      return true
    } catch {
      return false
    }
  }

  /**
   * Parse address and extract components
   */
  function parseAddress(address: string): AddressInfo | null {
    if (!isReady.value || !Bitcore.value?.XAddress) return null
    try {
      const xaddr = new Bitcore.value.XAddress(address)
      return {
        address: xaddr.toString(),
        type: xaddr.type,
        network: xaddr.network.name,
        hash: xaddr.hashBuffer.toString('hex'),
      }
    } catch {
      return null
    }
  }

  /**
   * Format address as fingerprint (e.g., "Lk9W·oSb8")
   */
  function toFingerprint(address: string, length: number = 4): string {
    if (!address || address.length < length * 2 + 6) return address
    const prefix = address.slice(6, 6 + length)
    const suffix = address.slice(-length)
    return `${prefix}·${suffix}`
  }

  /**
   * Truncate address for display
   */
  function truncateAddress(
    address: string,
    startChars: number = 12,
    endChars: number = 8,
  ): string {
    if (!address || address.length <= startChars + endChars + 3) return address
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
  }

  /**
   * Get address from public key
   */
  function publicKeyToAddress(
    publicKeyHex: string,
    network: 'livenet' | 'testnet' = 'livenet',
  ): string | null {
    if (!isReady.value || !Bitcore.value?.PublicKey) return null
    try {
      const pubKey = new Bitcore.value.PublicKey(publicKeyHex)
      const addr = pubKey.toAddress(network)
      return addr.toString()
    } catch {
      return null
    }
  }

  /**
   * Convert P2PKH hash to address
   */
  function hashToAddress(
    hash: string,
    network: 'livenet' | 'testnet' = 'livenet',
  ): string | null {
    if (!isReady.value || !Bitcore.value?.Address) return null
    try {
      const hashBuffer = Buffer.from(hash, 'hex')
      const addr = new Bitcore.value.Address(hashBuffer, network, 'pubkeyhash')
      return addr.toString()
    } catch {
      return null
    }
  }

  return {
    isValidAddress,
    parseAddress,
    toFingerprint,
    truncateAddress,
    publicKeyToAddress,
    hashToAddress,
  }
}

interface AddressInfo {
  address: string
  type: string
  network: string
  hash: string
}
```

---

## Composable: useAmount.ts

### Purpose

Amount formatting and conversion utilities.

```typescript
// composables/useAmount.ts

const SATS_PER_XPI = 1_000_000n
const DECIMALS = 6

export function useAmount() {
  /**
   * Convert satoshis to XPI string
   */
  function satsToXPI(sats: bigint | string | number): string {
    const satsBigInt = typeof sats === 'bigint' ? sats : BigInt(sats)
    const whole = satsBigInt / SATS_PER_XPI
    const fraction = satsBigInt % SATS_PER_XPI

    if (fraction === 0n) {
      return whole.toString()
    }

    const fractionStr = fraction.toString().padStart(DECIMALS, '0')
    const trimmed = fractionStr.replace(/0+$/, '')
    return `${whole}.${trimmed}`
  }

  /**
   * Convert XPI string to satoshis
   */
  function xpiToSats(xpi: string | number): bigint {
    const str = xpi.toString()
    const [whole, fraction = ''] = str.split('.')
    const wholeSats = BigInt(whole || '0') * SATS_PER_XPI
    const fractionPadded = fraction.padEnd(DECIMALS, '0').slice(0, DECIMALS)
    const fractionSats = BigInt(fractionPadded)
    return wholeSats + fractionSats
  }

  /**
   * Format XPI amount for display with locale formatting
   */
  function formatXPI(
    sats: bigint | string | number,
    options?: FormatOptions,
  ): string {
    const xpi = satsToXPI(typeof sats === 'bigint' ? sats : BigInt(sats))
    const num = parseFloat(xpi)

    const formatted = num.toLocaleString(undefined, {
      minimumFractionDigits: options?.minDecimals ?? 0,
      maximumFractionDigits: options?.maxDecimals ?? DECIMALS,
    })

    if (options?.showUnit !== false) {
      return `${formatted} XPI`
    }
    return formatted
  }

  /**
   * Format satoshis for display
   */
  function formatSats(sats: bigint | string | number): string {
    const satsBigInt = typeof sats === 'bigint' ? sats : BigInt(sats)
    return `${satsBigInt.toLocaleString()} sats`
  }

  /**
   * Format amount with sign (+ or -)
   */
  function formatSignedAmount(sats: bigint, isIncoming: boolean): string {
    const formatted = formatXPI(sats, { showUnit: false })
    return isIncoming ? `+${formatted}` : `-${formatted}`
  }

  /**
   * Check if amount is dust
   */
  function isDust(sats: bigint): boolean {
    return sats < 546n
  }

  /**
   * Get color class for amount
   */
  function getAmountColor(sats: bigint, isIncoming: boolean): string {
    if (sats === 0n) return 'text-muted'
    return isIncoming ? 'text-success' : 'text-error'
  }

  return {
    satsToXPI,
    xpiToSats,
    formatXPI,
    formatSats,
    formatSignedAmount,
    isDust,
    getAmountColor,
    SATS_PER_XPI,
    DECIMALS,
  }
}

interface FormatOptions {
  minDecimals?: number
  maxDecimals?: number
  showUnit?: boolean
}
```

---

## Composable: useTime.ts

### Purpose

Time formatting utilities.

```typescript
// composables/useTime.ts

export function useTime() {
  /**
   * Format timestamp as relative time (e.g., "2 minutes ago")
   */
  function timeAgo(timestamp: number | Date): string {
    const now = Date.now()
    const time =
      timestamp instanceof Date ? timestamp.getTime() : timestamp * 1000
    const diff = now - time

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)
    const years = Math.floor(days / 365)

    if (seconds < 60) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    if (weeks < 4) return `${weeks}w ago`
    if (months < 12) return `${months}mo ago`
    return `${years}y ago`
  }

  /**
   * Format timestamp as full date/time
   */
  function formatDateTime(timestamp: number | Date): string {
    const date =
      timestamp instanceof Date ? timestamp : new Date(timestamp * 1000)
    return date.toLocaleString()
  }

  /**
   * Format timestamp as date only
   */
  function formatDate(timestamp: number | Date): string {
    const date =
      timestamp instanceof Date ? timestamp : new Date(timestamp * 1000)
    return date.toLocaleDateString()
  }

  /**
   * Format timestamp as time only
   */
  function formatTime(timestamp: number | Date): string {
    const date =
      timestamp instanceof Date ? timestamp : new Date(timestamp * 1000)
    return date.toLocaleTimeString()
  }

  /**
   * Format duration in seconds to human readable
   */
  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    return `${Math.floor(seconds / 86400)}d`
  }

  return {
    timeAgo,
    formatDateTime,
    formatDate,
    formatTime,
    formatDuration,
  }
}
```

---

## Composable: useClipboard.ts

### Purpose

Clipboard operations with feedback.

```typescript
// composables/useClipboard.ts

export function useClipboard() {
  const toast = useToast()

  /**
   * Copy text to clipboard with toast feedback
   */
  async function copy(text: string, label?: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      toast.add({
        title: 'Copied',
        description: label
          ? `${label} copied to clipboard`
          : 'Copied to clipboard',
        icon: 'i-lucide-check',
        color: 'success',
        timeout: 2000,
      })
      return true
    } catch (error) {
      toast.add({
        title: 'Copy Failed',
        description: 'Could not copy to clipboard',
        icon: 'i-lucide-x',
        color: 'error',
        timeout: 3000,
      })
      return false
    }
  }

  /**
   * Read text from clipboard
   */
  async function paste(): Promise<string | null> {
    try {
      return await navigator.clipboard.readText()
    } catch {
      return null
    }
  }

  /**
   * Check if clipboard API is available
   */
  const isSupported = computed(() => {
    return typeof navigator !== 'undefined' && 'clipboard' in navigator
  })

  return {
    copy,
    paste,
    isSupported,
  }
}
```

---

## Composable: useNotifications.ts

### Purpose

Centralized notification/toast helpers.

```typescript
// composables/useNotifications.ts

export function useNotifications() {
  const toast = useToast()

  function success(title: string, description?: string) {
    toast.add({
      title,
      description,
      icon: 'i-lucide-check-circle',
      color: 'success',
      timeout: 3000,
    })
  }

  function error(title: string, description?: string) {
    toast.add({
      title,
      description,
      icon: 'i-lucide-alert-circle',
      color: 'error',
      timeout: 5000,
    })
  }

  function warning(title: string, description?: string) {
    toast.add({
      title,
      description,
      icon: 'i-lucide-alert-triangle',
      color: 'warning',
      timeout: 4000,
    })
  }

  function info(title: string, description?: string) {
    toast.add({
      title,
      description,
      icon: 'i-lucide-info',
      color: 'primary',
      timeout: 3000,
    })
  }

  function loading(title: string, description?: string) {
    return toast.add({
      title,
      description,
      icon: 'i-lucide-loader-2',
      color: 'neutral',
      timeout: 0, // Don't auto-dismiss
      ui: {
        icon: 'animate-spin',
      },
    })
  }

  function txSent(txid: string) {
    toast.add({
      title: 'Transaction Sent',
      description: 'Your transaction has been broadcast to the network',
      icon: 'i-lucide-check-circle',
      color: 'success',
      timeout: 5000,
      actions: [
        {
          label: 'View',
          click: () => navigateTo(`/explorer/tx/${txid}`),
        },
      ],
    })
  }

  function txReceived(amount: string) {
    toast.add({
      title: 'Payment Received',
      description: `You received ${amount} XPI`,
      icon: 'i-lucide-arrow-down-left',
      color: 'success',
      timeout: 5000,
    })
  }

  return {
    success,
    error,
    warning,
    info,
    loading,
    txSent,
    txReceived,
  }
}
```

---

## Composable: useQRCode.ts

### Purpose

QR code generation and scanning.

```typescript
// composables/useQRCode.ts
import QRCode from 'qrcode'

export function useQRCode() {
  /**
   * Generate QR code as data URL
   */
  async function generate(
    data: string,
    options?: QRCodeOptions,
  ): Promise<string> {
    return await QRCode.toDataURL(data, {
      width: options?.size ?? 256,
      margin: options?.margin ?? 2,
      color: {
        dark: options?.darkColor ?? '#000000',
        light: options?.lightColor ?? '#ffffff',
      },
    })
  }

  /**
   * Generate payment URI
   */
  function createPaymentURI(
    address: string,
    options?: PaymentURIOptions,
  ): string {
    let uri = `lotus:${address}`
    const params: string[] = []

    if (options?.amount) {
      params.push(`amount=${options.amount}`)
    }
    if (options?.label) {
      params.push(`label=${encodeURIComponent(options.label)}`)
    }
    if (options?.message) {
      params.push(`message=${encodeURIComponent(options.message)}`)
    }

    if (params.length > 0) {
      uri += `?${params.join('&')}`
    }

    return uri
  }

  /**
   * Parse payment URI
   */
  function parsePaymentURI(uri: string): PaymentURIData | null {
    try {
      const match = uri.match(/^lotus:([a-zA-Z0-9_]+)(\?.*)?$/)
      if (!match) return null

      const address = match[1]
      const params = new URLSearchParams(match[2]?.slice(1) || '')

      return {
        address,
        amount: params.get('amount') || undefined,
        label: params.get('label') || undefined,
        message: params.get('message') || undefined,
      }
    } catch {
      return null
    }
  }

  return {
    generate,
    createPaymentURI,
    parsePaymentURI,
  }
}

interface QRCodeOptions {
  size?: number
  margin?: number
  darkColor?: string
  lightColor?: string
}

interface PaymentURIOptions {
  amount?: string
  label?: string
  message?: string
}

interface PaymentURIData {
  address: string
  amount?: string
  label?: string
  message?: string
}
```

---

## Composable: useMuSig2.ts (Simplified)

### Purpose

MuSig2 utilities - simplified from current version.

```typescript
// composables/useMuSig2.ts

export function useMuSig2() {
  const musig2Store = useMuSig2Store()
  const { formatXPI } = useAmount()
  const { timeAgo } = useTime()

  /**
   * Format signer for display
   */
  function formatSigner(signer: SignerAdvertisement): FormattedSigner {
    return {
      ...signer,
      displayName: signer.nickname || 'Anonymous',
      feeDisplay: signer.fee ? formatXPI(signer.fee) : 'Free',
      lastSeenDisplay: timeAgo(signer.lastSeen),
      transactionTypesDisplay: signer.transactionTypes.map(
        formatTransactionType,
      ),
    }
  }

  /**
   * Format transaction type for display
   */
  function formatTransactionType(type: TransactionType): TransactionTypeInfo {
    const info: Record<TransactionType, TransactionTypeInfo> = {
      [TransactionType.SPEND]: {
        label: 'Spend',
        icon: 'i-lucide-send',
        description: 'Standard spending transaction',
      },
      [TransactionType.SWAP]: {
        label: 'Atomic Swap',
        icon: 'i-lucide-repeat',
        description: 'Cross-chain atomic swap',
      },
      [TransactionType.COINJOIN]: {
        label: 'CoinJoin',
        icon: 'i-lucide-shuffle',
        description: 'Privacy-enhancing transaction',
      },
      [TransactionType.CUSTODY]: {
        label: 'Custody',
        icon: 'i-lucide-shield',
        description: 'Custodial arrangement',
      },
      [TransactionType.ESCROW]: {
        label: 'Escrow',
        icon: 'i-lucide-lock',
        description: 'Escrow transaction',
      },
      [TransactionType.CHANNEL]: {
        label: 'Channel',
        icon: 'i-lucide-git-branch',
        description: 'Payment channel',
      },
    }
    return info[type]
  }

  /**
   * Format session state for display
   */
  function formatSessionState(state: SessionState): SessionStateInfo {
    const info: Record<SessionState, SessionStateInfo> = {
      created: { label: 'Created', color: 'neutral', icon: 'i-lucide-circle' },
      waiting_for_participants: {
        label: 'Waiting',
        color: 'warning',
        icon: 'i-lucide-clock',
      },
      nonce_exchange: {
        label: 'Exchanging Nonces',
        color: 'primary',
        icon: 'i-lucide-refresh-cw',
      },
      signing: {
        label: 'Signing',
        color: 'primary',
        icon: 'i-lucide-pen-tool',
      },
      completed: {
        label: 'Completed',
        color: 'success',
        icon: 'i-lucide-check-circle',
      },
      failed: { label: 'Failed', color: 'error', icon: 'i-lucide-x-circle' },
      aborted: { label: 'Aborted', color: 'error', icon: 'i-lucide-x' },
    }
    return info[state]
  }

  /**
   * Check if signer matches criteria
   */
  function signerMatchesCriteria(
    signer: SignerAdvertisement,
    criteria: SignerCriteria,
  ): boolean {
    if (criteria.transactionTypes?.length) {
      const hasMatchingType = criteria.transactionTypes.some(type =>
        signer.transactionTypes.includes(type),
      )
      if (!hasMatchingType) return false
    }

    if (
      criteria.minReputation &&
      (signer.reputation ?? 0) < criteria.minReputation
    ) {
      return false
    }

    if (criteria.maxFee && signer.fee && signer.fee > criteria.maxFee) {
      return false
    }

    return true
  }

  return {
    formatSigner,
    formatTransactionType,
    formatSessionState,
    signerMatchesCriteria,
  }
}
```

---

## Migration from useUtils.ts

The current `useUtils.ts` will be split as follows:

| Current Function                                   | New Location    |
| -------------------------------------------------- | --------------- |
| `formatXPI`, `satsToXPI`, `xpiToSats`              | `useAmount.ts`  |
| `toFingerprint`, `truncateAddress`, `parseAddress` | `useAddress.ts` |
| `timeAgo`, `formatDateTime`                        | `useTime.ts`    |
| `toMinifiedPercent`, `toPercentColor`              | `useRank.ts`    |
| `getRankingColor`, `formatRate`                    | `useRank.ts`    |
| `p2pkhHashToAddress`                               | `useAddress.ts` |

---

## Usage Examples

### In Components

```vue
<script setup lang="ts">
const { formatXPI, getAmountColor } = useAmount()
const { toFingerprint } = useAddress()
const { timeAgo } = useTime()
const { copy } = useClipboard()

const props = defineProps<{
  transaction: WalletTransaction
}>()

const amountDisplay = computed(() => formatXPI(props.transaction.amount))
const amountColor = computed(() =>
  getAmountColor(props.transaction.amount, props.transaction.isIncoming),
)
const addressDisplay = computed(() => toFingerprint(props.transaction.address))
const timeDisplay = computed(() => timeAgo(props.transaction.timestamp))
</script>
```

### In Stores

```typescript
// stores/draft.ts
import { useAddress } from '~/composables/useAddress'

export const useDraftStore = defineStore('draft', () => {
  const { isValidAddress } = useAddress()

  function validateRecipient(recipient: DraftRecipient) {
    if (!recipient.address) {
      return { isValid: false, error: 'Address required' }
    }
    if (!isValidAddress(recipient.address)) {
      return { isValid: false, error: 'Invalid address' }
    }
    return { isValid: true, error: null }
  }
})
```

---

_Next: [05_WALLET_CORE.md](./05_WALLET_CORE.md)_
