# Phase 2: BIP44 Multi-Address Architecture

**Version**: 1.0.0  
**Date**: December 18, 2025  
**Status**: Pending  
**Estimated Effort**: 2-3 weeks  
**Dependencies**: Phase 1 (Foundation)

---

## Overview

This phase implements BIP44 multi-address support, enabling the wallet to derive multiple keys from a single seed phrase for different purposes. A dedicated MuSig2 signing key is added for improved security, isolated from the spending key.

---

## Goals

1. Refactor wallet store to support multiple accounts
2. Update crypto worker for account-aware key derivation
3. Isolate MuSig2 signing key from spending key
4. Clean implementation without legacy compatibility concerns

---

## BIP44 Path Structure

```
m / purpose' / coin_type' / account' / change / address_index
m / 44'      / 10605'     / 0'       / 0      / 0
```

| Account | Path                  | Purpose                          |
| ------- | --------------------- | -------------------------------- |
| PRIMARY | `m/44'/10605'/0'/0/0` | Main wallet, receiving, identity |
| MUSIG2  | `m/44'/10605'/1'/0/0` | MuSig2 signing (isolated)        |
| SWAP    | `m/44'/10605'/2'/0/0` | Future: Atomic swaps             |
| PRIVACY | `m/44'/10605'/3'/0/0` | Future: Privacy features         |

---

## Tasks

### 2.1 Update Wallet Store State

**File**: `stores/wallet.ts` (MODIFY)

Add multi-account structure while maintaining legacy compatibility:

```typescript
import {
  AccountPurpose,
  type AccountConfig,
  type DerivedAddress,
} from '~/types/accounts'

interface AccountState {
  config: AccountConfig
  addresses: DerivedAddress[]
  keys: Map<number, RuntimeKeyData>
  utxos: Map<string, UtxoData>
  balance: WalletBalance
}

interface WalletState {
  // Multi-account structure
  accounts: Map<AccountPurpose, AccountState>
  seedPhrase: string
  addressType: AddressType
  tipHeight: number
  tipHash: string
}
```

| Task                                                       | Priority | Status         |
| ---------------------------------------------------------- | -------- | -------------- |
| Add `accounts: Map<AccountPurpose, AccountState>` to state | P0       | ⬜ Not Started |
| Add AccountState interface                                 | P0       | ⬜ Not Started |
| Remove legacy single-address fields                        | P0       | ⬜ Not Started |

---

### 2.2 Refactor buildWalletFromMnemonic

**File**: `stores/wallet.ts` (MODIFY)

Update to derive keys for all enabled accounts:

```typescript
async buildWalletFromMnemonic(seedPhrase: string) {
  const networkStore = useNetworkStore()

  // Initialize accounts map
  this.accounts = new Map()

  // Derive keys for each enabled account
  for (const config of DEFAULT_ACCOUNTS) {
    if (!config.enabled) continue

    const accountState: AccountState = {
      config,
      addresses: [],
      keys: new Map(),
      utxos: new Map(),
      balance: { total: '0', spendable: '0' },
    }

    // Derive primary address for this account
    const derivedAddress = await this._deriveAddress(
      seedPhrase,
      config.purpose,
      0, // addressIndex
      false, // isChange
      networkStore.currentNetwork,
    )

    accountState.addresses.push(derivedAddress)
    this.accounts.set(config.purpose, accountState)
  }

  this.seedPhrase = seedPhrase
}
```

| Task                                                   | Priority | Status         |
| ------------------------------------------------------ | -------- | -------------- |
| Refactor `buildWalletFromMnemonic()` for multi-account | P0       | ⬜ Not Started |
| Implement `_deriveAddress()` helper                    | P0       | ⬜ Not Started |

---

### 2.3 Add Account-Aware Getters

**File**: `stores/wallet.ts` (MODIFY)

```typescript
// Account-aware key retrieval
getPrivateKeyHex(
  accountPurpose: AccountPurpose = AccountPurpose.PRIMARY,
  addressIndex: number = 0,
): string | null {
  const account = this.accounts.get(accountPurpose)
  if (!account) return null
  const keyData = account.keys.get(addressIndex)
  return keyData?.privateKey?.toString() ?? null
}

getPublicKeyHex(
  accountPurpose: AccountPurpose = AccountPurpose.PRIMARY,
  addressIndex: number = 0,
): string | null {
  const account = this.accounts.get(accountPurpose)
  if (!account) return null
  const addr = account.addresses[addressIndex]
  return addr?.publicKeyHex ?? null
}

getAddress(
  accountPurpose: AccountPurpose = AccountPurpose.PRIMARY,
  addressIndex: number = 0,
): string | null {
  const account = this.accounts.get(accountPurpose)
  if (!account) return null
  return account.addresses[addressIndex]?.address ?? null
}

getAccount(accountPurpose: AccountPurpose): AccountState | undefined {
  return this.accounts.get(accountPurpose)
}

getTotalBalance(): WalletBalance {
  let total = 0n
  let spendable = 0n

  for (const account of this.accounts.values()) {
    total += BigInt(account.balance.total)
    spendable += BigInt(account.balance.spendable)
  }

  return {
    total: total.toString(),
    spendable: spendable.toString(),
  }
}
```

| Task                                          | Priority | Status         |
| --------------------------------------------- | -------- | -------------- |
| Add `getPrivateKeyHex(accountPurpose, index)` | P0       | ⬜ Not Started |
| Add `getPublicKeyHex(accountPurpose, index)`  | P0       | ⬜ Not Started |
| Add `getAddress(accountPurpose, index)`       | P0       | ⬜ Not Started |
| Add `getAccount(accountPurpose)`              | P0       | ⬜ Not Started |
| Add `getTotalBalance()`                       | P1       | ⬜ Not Started |

---

### 2.4 Update Crypto Worker

**File**: `workers/crypto.worker.ts` (MODIFY)

Add account parameters to key derivation:

```typescript
async function handleDeriveKeys(
  sdk: BitcoreSDK,
  requestId: string,
  mnemonicPhrase: string,
  addressType: AddressType,
  networkName: string,
  accountIndex: number = 0, // NEW
  addressIndex: number = 0, // NEW
  isChange: boolean = false, // NEW
): Promise<void> {
  const { Mnemonic, HDPrivateKey, Networks, Address, Script } = sdk

  const network = Networks.get(networkName)
  const mnemonic = new Mnemonic(mnemonicPhrase)
  const hdPrivkey = HDPrivateKey.fromSeed(mnemonic.toSeed())

  // Derive using full BIP44 path with parameters
  const change = isChange ? 1 : 0
  const signingKey = hdPrivkey
    .deriveChild(BIP44_PURPOSE, true)
    .deriveChild(BIP44_COINTYPE, true)
    .deriveChild(accountIndex, true) // Account from parameter
    .deriveChild(change) // Change from parameter
    .deriveChild(addressIndex).privateKey // Index from parameter

  // ... rest of address generation logic unchanged
}
```

**File**: `types/crypto-worker.ts` (MODIFY)

```typescript
export interface DeriveKeysPayload {
  mnemonic: string
  addressType: AddressType
  network: string
  // NEW parameters
  accountIndex?: number
  addressIndex?: number
  isChange?: boolean
}
```

| Task                                           | Priority | Status         |
| ---------------------------------------------- | -------- | -------------- |
| Add account parameters to `handleDeriveKeys()` | P0       | ⬜ Not Started |
| Update `DeriveKeysPayload` interface           | P0       | ⬜ Not Started |
| Update `useCryptoWorker.ts` to pass parameters | P0       | ⬜ Not Started |

---

### 2.5 Update Chronik Subscriptions

**File**: `services/chronik.ts` (MODIFY)

Support subscribing to multiple addresses:

```typescript
interface ChronikSubscription {
  scriptType: ChronikScriptType
  scriptPayload: string
  accountPurpose: AccountPurpose
}

export async function subscribeToAddresses(
  subscriptions: ChronikSubscription[],
  callbacks: ChronikCallbacks,
): Promise<void> {
  for (const sub of subscriptions) {
    await chronik
      .script(sub.scriptType, sub.scriptPayload)
      .subscribe(msg => handleMessage(msg, sub.accountPurpose, callbacks))
  }
}
```

| Task                                          | Priority | Status         |
| --------------------------------------------- | -------- | -------------- |
| Add ChronikSubscription interface             | P0       | ⬜ Not Started |
| Implement `subscribeToAddresses()`            | P0       | ⬜ Not Started |
| Update wallet store to subscribe all accounts | P0       | ⬜ Not Started |

---

## Testing Checklist

### Key Derivation

- [ ] PRIMARY account derives to `m/44'/10605'/0'/0/0`
- [ ] MUSIG2 account derives to `m/44'/10605'/1'/0/0`
- [ ] Same seed produces same addresses
- [ ] Different accounts produce different keys

### Multi-Account

- [ ] `getPublicKeyHex(MUSIG2)` returns different key
- [ ] `getAddress(MUSIG2)` returns different address
- [ ] Both accounts subscribe to Chronik

---

## Files Summary

| File                             | Change Type | Description                     |
| -------------------------------- | ----------- | ------------------------------- |
| `stores/wallet.ts`               | MODIFY      | Multi-account state and actions |
| `workers/crypto.worker.ts`       | MODIFY      | Account-aware derivation        |
| `types/crypto-worker.ts`         | MODIFY      | Add account parameters          |
| `composables/useCryptoWorker.ts` | MODIFY      | Pass account parameters         |
| `services/chronik.ts`            | MODIFY      | Multi-address subscriptions     |

---

## Success Criteria

- [ ] Multiple accounts derived from single seed
- [ ] PRIMARY and MUSIG2 accounts have different keys
- [ ] All tests pass
- [ ] Clean codebase without legacy compatibility code

---

## Dependencies

- **Phase 1**: Account types and utilities

## Dependents

- **Phase 5**: Uses MUSIG2 account key for signing

---

_Created: December 18, 2025_  
_Status: Pending_
