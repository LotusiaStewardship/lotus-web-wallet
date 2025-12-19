# 16: Type Alignment

## Overview

This document details the TypeScript type alignment needed between components, stores, and composables. Many components were scaffolded with expected types that don't match current implementations.

**Phase 16 Scope:** Fix critical type errors in composables and core files. Scaffolded component type errors are expected and will be resolved as components are integrated.

**Note:** The scaffolded components (Phase 5-12) were created with ideal APIs. Type mismatches between scaffolded components and existing stores are intentional - they document the target API. These will be resolved incrementally as each component is integrated.

---

## Type Error Categories

### 1. Store Property/Method Mismatches

### 2. Component Prop Type Mismatches

### 3. Nuxt UI Component Type Issues

### 4. Missing Type Definitions

---

## Detailed Type Errors

### Category 1: Onboarding Store Mismatches

#### Error: `shouldShowOnboarding` does not exist

**Location**: `components/onboarding/Modal.vue:24`

**Current Store Type**:

```typescript
// stores/onboarding.ts exports
{
  isOnboarding(): boolean
  // ... but NOT shouldShowOnboarding
}
```

**Expected by Component**:

```typescript
shouldShowOnboarding: ComputedRef<boolean>
```

**Fix**:

```typescript
// Add to stores/onboarding.ts
const shouldShowOnboarding = computed(
  () => isFirstTime.value && !onboardingComplete.value,
)

// Export it
return {
  // ...existing exports
  shouldShowOnboarding,
}
```

---

#### Error: `skipStep` does not exist

**Location**: `components/onboarding/Modal.vue:94-95`

**Current Store Type**:

```typescript
// stores/onboarding.ts has completeStep but not skipStep
{
  completeStep(step: OnboardingStep): void
}
```

**Expected by Component**:

```typescript
skipStep(step: OnboardingStep): void
```

**Fix**:

```typescript
// Add to stores/onboarding.ts
function skipStep(step: OnboardingStep) {
  if (step === 'backup_seed') {
    backupSkippedCount.value++
  }
  completeStep(step)
}

return {
  // ...existing exports
  skipStep,
}
```

---

#### Error: `'quick_tour'` not assignable to `OnboardingStep`

**Location**: `components/onboarding/Modal.vue:120`

**Current Type**:

```typescript
type OnboardingStep = 'welcome' | 'backup' | 'complete'
```

**Expected Type**:

```typescript
type OnboardingStep =
  | 'welcome'
  | 'create_or_restore'
  | 'backup_seed'
  | 'verify_backup'
  | 'quick_tour'
  | 'complete'
```

**Fix**: Update `types/onboarding.ts` or `stores/onboarding.ts` with full step list.

---

### Category 2: Wallet Store Mismatches

#### Error: `getMnemonic` does not exist

**Location**: `components/onboarding/Modal.vue:51`

**Current Store**: Has `seedPhrase` state but no getter method.

**Expected by Component**:

```typescript
getMnemonic(): string | null
```

**Fix**:

```typescript
// Add to stores/wallet.ts
function getMnemonic(): string | null {
  return seedPhrase.value || null
}

return {
  // ...existing exports
  getMnemonic,
}
```

---

### Category 3: Contact Store Mismatches

#### Error: `publicKey` does not exist on Contact type

**Location**: `components/musig2/CreateSharedWalletModal.vue:42,68`

**Current Contact Type**:

```typescript
interface Contact {
  id: string
  name: string
  address: string
  addresses?: { livenet?: string; testnet?: string; regtest?: string }
  notes?: string
  // ... but NO publicKey
}
```

**Expected by Component**:

```typescript
interface Contact {
  // ...existing
  publicKey?: string
  peerId?: string
}
```

**Fix**: Update `types/contacts.ts`:

```typescript
export interface Contact {
  id: string
  name: string
  address: string
  addresses?: {
    livenet?: string
    testnet?: string
    regtest?: string
  }
  notes?: string
  tags?: string[]
  isFavorite?: boolean
  createdAt: number
  updatedAt: number

  // P2P/MuSig2 fields
  publicKey?: string
  peerId?: string
}
```

---

### Category 4: Nuxt UI Color Type Issues

#### Error: `string` not assignable to color type

**Locations**:

- `components/p2p/SessionList.vue:70`
- `components/musig2/SigningProgress.vue:67`

**Issue**: Dynamic color binding returns `string` but Nuxt UI expects literal union.

**Current Code**:

```vue
<UBadge :color="getStatusColor(session.state)" />
```

Where `getStatusColor` returns `string`.

**Fix Option 1**: Type assertion

```vue
<UBadge :color="getStatusColor(session.state) as any" />
```

**Fix Option 2**: Typed return

```typescript
type BadgeColor = 'primary' | 'success' | 'warning' | 'error' | 'neutral'

function getStatusColor(state: string): BadgeColor {
  const colors: Record<string, BadgeColor> = {
    pending: 'warning',
    completed: 'success',
    failed: 'error',
  }
  return colors[state] || 'neutral'
}
```

**Fix Option 3**: Static mapping in template

```vue
<UBadge
  :color="
    session.state === 'completed'
      ? 'success'
      : session.state === 'failed'
      ? 'error'
      : session.state === 'pending'
      ? 'warning'
      : 'neutral'
  "
/>
```

---

### Category 5: Element Focus Type Issues

#### Error: `focus` does not exist on type `Element`

**Location**: `components/settings/SetPinModal.vue:150,154,166,170,186,190`

**Issue**: `nextElementSibling` returns `Element | null`, not `HTMLElement`.

**Current Code**:

```typescript
;(e.target as HTMLInputElement).nextElementSibling?.focus()
```

**Fix**:

```typescript
const nextInput = (e.target as HTMLInputElement)
  .nextElementSibling as HTMLInputElement | null
nextInput?.focus()
```

Or use refs:

```typescript
const pinInputs = ref<HTMLInputElement[]>([])

function focusNext(index: number) {
  if (index < pinInputs.value.length - 1) {
    pinInputs.value[index + 1]?.focus()
  }
}
```

---

### Category 6: USelect Emit Type Issues

#### Error: Type mismatch on USelect update event

**Location**: `components/settings/SelectItem.vue:32`

**Issue**: USelect emits `AcceptableValue | undefined`, component expects `string`.

**Fix**:

```typescript
// Update emit handler
@update:model-value="(val) => emit('update:modelValue', String(val ?? ''))"
```

---

### Category 7: FeatureHint Type Issues

#### Error: `string` not assignable to `FeatureHint`

**Location**: `components/onboarding/ContextualHint.vue:22,25`

**Current Store Type**:

```typescript
shouldShowHint(hint: FeatureHint): boolean
dismissHint(hint: FeatureHint): void

type FeatureHint = 'send' | 'receive' | 'p2p' | 'social'
```

**Component Usage**:

```typescript
// Uses arbitrary string IDs
onboardingStore.shouldShowHint(props.id) // props.id is string
```

**Fix Option 1**: Expand FeatureHint type

```typescript
type FeatureHint = string // Allow any string
```

**Fix Option 2**: Update store methods to accept string

```typescript
function shouldShowHint(hintId: string): boolean {
  return !dismissedHints.value.has(hintId)
}

function dismissHint(hintId: string): void {
  dismissedHints.value.add(hintId)
  saveState()
}
```

---

## Type Definition Files to Create/Update

### 1. `types/onboarding.ts`

```typescript
export type OnboardingStep =
  | 'welcome'
  | 'create_or_restore'
  | 'backup_seed'
  | 'verify_backup'
  | 'quick_tour'
  | 'complete'

export interface OnboardingState {
  isFirstTime: boolean
  onboardingComplete: boolean
  currentStep: OnboardingStep | null
  completedSteps: Set<OnboardingStep>
  dismissedHints: Set<string>
  backupComplete: boolean
  backupRemindedAt: number | null
  backupSkippedCount: number
}
```

### 2. `types/contacts.ts`

```typescript
export interface Contact {
  id: string
  name: string
  address: string
  addresses?: {
    livenet?: string
    testnet?: string
    regtest?: string
  }
  notes?: string
  tags?: string[]
  isFavorite?: boolean
  createdAt: number
  updatedAt: number

  // P2P/MuSig2 fields
  publicKey?: string
  peerId?: string

  // Social fields
  socialProfiles?: SocialProfile[]
}

export interface SocialProfile {
  platform: string
  profileId: string
  username?: string
}
```

### 3. `types/p2p.ts`

```typescript
export type P2PConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'dht_ready'
  | 'fully_operational'
  | 'error'

export interface Peer {
  peerId: string
  nickname?: string
  address?: string
  isOnline?: boolean
  lastSeen?: number
}

export interface ActivityEvent {
  id: string
  type: ActivityEventType
  peerId?: string
  nickname?: string
  message?: string
  timestamp: number
}

export type ActivityEventType =
  | 'peer_connected'
  | 'peer_disconnected'
  | 'signer_available'
  | 'signer_unavailable'
  | 'request_received'
  | 'session_started'
```

### 4. `types/musig2.ts`

```typescript
export interface SharedWallet {
  id: string
  name: string
  description?: string
  participants: SharedWalletParticipant[]
  threshold: number
  aggregatedPublicKey: string
  sharedAddress: string
  balance: bigint
  utxos: UTXO[]
  createdAt: number
  updatedAt: number
}

export interface SharedWalletParticipant {
  publicKey: string
  nickname?: string
  peerId?: string
  contactId?: string
  isMe: boolean
}

export interface SigningSession {
  id: string
  state: SigningSessionState
  participants: SessionParticipant[]
  transactionType: TransactionType
  message?: string
  metadata?: Record<string, any>
  createdAt: number
  updatedAt: number
}

export type SigningSessionState =
  | 'pending'
  | 'nonce_exchange'
  | 'signing'
  | 'completed'
  | 'failed'
  | 'aborted'
```

---

## Integration Checklist

### Phase 16.1: Store Type Fixes (Completed in Phase 13) ✅

- [x] Add `shouldShowOnboarding` to onboarding store
- [x] Add `skipStep` to onboarding store
- [x] Update `OnboardingStep` type with all steps
- [x] Add `getMnemonic` to wallet store
- [x] Update `shouldShowHint` to accept string

### Phase 16.2: Contact Type Fixes (Completed in Phase 13) ✅

- [x] Add `publicKey` to Contact interface
- [x] Add `peerId` to Contact interface
- [x] Add `groupId` to Contact interface

### Phase 16.3: Composable Type Fixes ✅

- [x] Fix `useNotifications` - Remove invalid `timeout` and `actions` properties
- [x] Fix `useQRCode` - Add ts-ignore for missing qrcode types
- [x] Fix `useWallet` - Correct `networkDisplayName` to `displayName`

### Phase 16.4: Scaffolded Component Type Errors (Deferred)

These are expected mismatches between scaffolded components and current APIs:

- [ ] Contact components expect `totalSent`, `signerCapabilities`, etc.
- [ ] Explorer components expect different prop structures
- [ ] Social components expect different activity/profile types

**Note:** These will be resolved as each component is integrated into pages.

---

## Verification Commands

```bash
# Check for TypeScript errors
npx vue-tsc --noEmit

# Check specific files
npx vue-tsc --noEmit components/onboarding/Modal.vue

# Run type check in watch mode
npx vue-tsc --noEmit --watch
```

---

_Next: [17_CLEANUP_DEPRECATED.md](./17_CLEANUP_DEPRECATED.md)_
