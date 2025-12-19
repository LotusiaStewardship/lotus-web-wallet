# Phase 3: Deprecate useUtils

## Overview

This phase migrates all remaining usages of `useUtils.ts` to the new focused composables and then removes the deprecated file. This is a quick cleanup task that reduces technical debt.

**Priority**: P1 (High)
**Estimated Effort**: 0.5 days
**Dependencies**: New composables (useAddress, useAmount, useTime, useClipboard)

---

## Goals

1. Identify all files still using useUtils
2. Migrate each usage to appropriate new composable
3. Remove useUtils.ts
4. Verify no regressions

---

## Current State

### Files Using useUtils

Based on codebase analysis, 4 files still use `useUtils`:

| File                                    | Usage              |
| --------------------------------------- | ------------------ |
| `components/contacts/ContactCard.vue`   | Address formatting |
| `components/contacts/ContactForm.vue`   | Address validation |
| `components/contacts/ContactSearch.vue` | Address formatting |
| `pages/transact/receive.vue`            | Address formatting |

### Migration Mapping

| useUtils Function   | New Composable | New Function            |
| ------------------- | -------------- | ----------------------- |
| `formatFingerprint` | `useAddress`   | `toFingerprint`         |
| `isValidAddress`    | `useAddress`   | `isValidAddress`        |
| `getNetworkName`    | `useAddress`   | `getNetworkFromAddress` |
| `truncateAddress`   | `useAddress`   | `truncateAddress`       |
| `formatXPI`         | `useAmount`    | `formatXPI`             |
| `satsToXPI`         | `useAmount`    | `satsToXPI`             |
| `xpiToSats`         | `useAmount`    | `xpiToSats`             |
| `timeAgo`           | `useTime`      | `timeAgo`               |
| `formatDateTime`    | `useTime`      | `formatDateTime`        |
| `copyToClipboard`   | `useClipboard` | `copy`                  |

---

## 1. Migration Tasks

### 1.1 ContactCard.vue

**Current:**

```typescript
import { useUtils } from '~/composables/useUtils'
const { formatFingerprint } = useUtils()
```

**After:**

```typescript
const { toFingerprint } = useAddress()
```

**Template changes:**

- Replace `formatFingerprint(address)` with `toFingerprint(address)`

---

### 1.2 ContactForm.vue

**Current:**

```typescript
import { useUtils } from '~/composables/useUtils'
const { isValidAddress } = useUtils()
```

**After:**

```typescript
const { isValidAddress } = useAddress()
```

**No template changes needed** - function name is the same.

---

### 1.3 ContactSearch.vue

**Current:**

```typescript
import { useUtils } from '~/composables/useUtils'
const { formatFingerprint } = useUtils()
```

**After:**

```typescript
const { toFingerprint } = useAddress()
```

**Template changes:**

- Replace `formatFingerprint(address)` with `toFingerprint(address)`

---

### 1.4 receive.vue

**Current:**

```typescript
import { useUtils } from '~/composables/useUtils'
const { formatFingerprint } = useUtils()
```

**After:**

```typescript
const { toFingerprint } = useAddress()
```

**Template changes:**

- Replace `formatFingerprint(address)` with `toFingerprint(address)`

---

## 2. Implementation Checklist

### Migration

- [ ] Update `components/contacts/ContactCard.vue`

  - [ ] Replace useUtils import with useAddress
  - [ ] Replace formatFingerprint with toFingerprint
  - [ ] Test component renders correctly

- [ ] Update `components/contacts/ContactForm.vue`

  - [ ] Replace useUtils import with useAddress
  - [ ] Verify isValidAddress works the same
  - [ ] Test form validation

- [ ] Update `components/contacts/ContactSearch.vue`

  - [ ] Replace useUtils import with useAddress
  - [ ] Replace formatFingerprint with toFingerprint
  - [ ] Test search display

- [ ] Update `pages/transact/receive.vue`
  - [ ] Replace useUtils import with useAddress
  - [ ] Replace formatFingerprint with toFingerprint
  - [ ] Test receive page display

### Cleanup

- [ ] Run grep to verify no remaining useUtils imports
- [ ] Delete `composables/useUtils.ts`
- [ ] Run `nuxt prepare` to verify no errors
- [ ] Run TypeScript check

### Verification

- [ ] Test contacts page (add, edit, search)
- [ ] Test receive page (address display)
- [ ] Verify no console errors
- [ ] Verify no TypeScript errors

---

## 3. Verification Commands

```bash
# Check for remaining useUtils usages
grep -r "useUtils" --include="*.vue" --include="*.ts" .

# TypeScript check
npx nuxi typecheck

# Prepare Nuxt
npx nuxt prepare
```

---

## 4. Rollback Plan

If issues are found after migration:

1. Revert the file changes
2. Keep useUtils.ts temporarily
3. Add deprecation comment to useUtils.ts
4. Create issue to track remaining migration

---

## Notes

- The new composables have been verified to have all required functionality
- Function signatures are compatible (same parameters and return types)
- Only function names differ in some cases (formatFingerprint → toFingerprint)

---

_End of Phase 3_
