# 20: Cleanup - Deprecated Code

## Overview

This document details the identification and removal of deprecated code, including old components, unused stores, and legacy patterns that have been replaced by the refactored architecture.

---

## Cleanup Categories

1. **Deprecated Components** - Old components replaced by new ones
2. **Unused Stores** - Store code no longer needed
3. **Legacy Composables** - Old composables replaced
4. **Dead Code** - Unreachable or unused code
5. **Redundant Files** - Duplicate or obsolete files

---

## Deprecated Components Analysis

### Components to Review for Deprecation

Before removing any component, verify it's not used anywhere:

```bash
# Search for component usage
grep -r "ComponentName" --include="*.vue" --include="*.ts" .
```

### Potential Deprecated Components

| Old Component                      | Replaced By                | Action            |
| ---------------------------------- | -------------------------- | ----------------- |
| `SignerCard.vue` (old)             | `p2p/SignerCard.vue`       | Verify and remove |
| `SigningRequestModal.vue` (old)    | `p2p/RequestList.vue`      | Verify and remove |
| `IncomingSigningRequest.vue` (old) | `p2p/IncomingRequests.vue` | Verify and remove |
| Old explorer components            | `explorer/*.vue`           | Verify and remove |
| Old social components              | `social/*.vue`             | Verify and remove |

### Component Audit Script

```bash
#!/bin/bash
# audit-components.sh

echo "=== Component Usage Audit ==="

# List all .vue files
find components -name "*.vue" | while read file; do
  component_name=$(basename "$file" .vue)

  # Count usages (excluding the file itself)
  usage_count=$(grep -r "$component_name" --include="*.vue" --include="*.ts" . | grep -v "$file" | wc -l)

  if [ "$usage_count" -eq 0 ]; then
    echo "UNUSED: $file"
  fi
done
```

---

## Store Cleanup

### Current Store Structure

```
stores/
├── wallet.ts      # Keep - core wallet functionality
├── contacts.ts    # Keep - contact management
├── network.ts     # Keep - network configuration
├── p2p.ts         # Keep - P2P state
├── musig2.ts      # Keep - MuSig2 state (new)
├── ui.ts          # Keep - UI state (new)
└── onboarding.ts  # Keep - Onboarding state (new)
```

### Store Code to Remove

#### 1. Draft Transaction Logic in wallet.ts

The draft transaction state should be moved to a separate store or composable:

```typescript
// REMOVE from wallet.ts - move to stores/draft.ts or composables/useDraftTransaction.ts
interface DraftTransactionState {
  recipients: DraftRecipient[]
  selectedUtxos: string[]
  feeRate: 'low' | 'normal' | 'high' | 'custom'
  customFeeRate?: number
  opReturn?: string
}
```

#### 2. Redundant P2P Logic

If P2P logic is duplicated between `p2p.ts` and `musig2.ts`:

```typescript
// Review and consolidate:
// - Signer discovery (should be in musig2.ts)
// - Session management (should be in musig2.ts)
// - Connection state (should be in p2p.ts)
```

---

## Legacy Composables

### Composables to Review

| Composable          | Status | Action                 |
| ------------------- | ------ | ---------------------- |
| `useBitcore.ts`     | Keep   | Core SDK access        |
| `useExplorerApi.ts` | Keep   | API access             |
| `useAvatars.ts`     | Keep   | Avatar generation      |
| `useMuSig2.ts`      | Review | May overlap with store |

### Potential Redundancy

If `useMuSig2.ts` composable duplicates `stores/musig2.ts`:

```typescript
// Option 1: Keep composable for SDK operations, store for state
// Option 2: Merge into store with actions
// Option 3: Keep composable as thin wrapper around store
```

---

## Dead Code Identification

### Finding Unused Exports

```bash
# Find exported functions/variables that aren't imported anywhere
# Use ts-prune or similar tool

npx ts-prune
```

### Finding Unused Imports

```bash
# ESLint can identify unused imports
npx eslint --rule 'no-unused-vars: error' .
```

### Common Dead Code Patterns

1. **Commented-out code blocks**

```typescript
// REMOVE: Old implementation
// function oldFunction() {
//   // ...
// }
```

2. **TODO comments with old code**

```typescript
// TODO: Remove after migration
const legacyFunction = () => {
  /* ... */
}
```

3. **Feature flags for completed migrations**

```typescript
// REMOVE: Migration complete
const USE_NEW_COMPONENTS = true
if (USE_NEW_COMPONENTS) {
  // new code
} else {
  // old code - REMOVE THIS BRANCH
}
```

---

## Redundant Files

### Files to Review

```
# Old component files that may have been replaced
components/
├── old/              # If exists, review for removal
├── deprecated/       # If exists, review for removal
└── legacy/           # If exists, review for removal

# Old page files
pages/
├── _old_*.vue        # Review for removal
└── *.backup.vue      # Review for removal

# Old type files
types/
├── old/              # If exists, review for removal
└── deprecated/       # If exists, review for removal
```

### File Cleanup Script

```bash
#!/bin/bash
# cleanup-files.sh

# Find backup files
echo "=== Backup Files ==="
find . -name "*.backup.*" -o -name "*.bak" -o -name "*~"

# Find old/deprecated directories
echo "=== Old Directories ==="
find . -type d -name "old" -o -name "deprecated" -o -name "legacy"

# Find large files that might be unused
echo "=== Large Files (>100KB) ==="
find . -type f -size +100k -name "*.ts" -o -name "*.vue"
```

---

## Cleanup Checklist

### Phase 20.1: Component Audit

- [ ] Run component usage audit script
- [ ] Identify unused components
- [ ] Verify no imports reference deprecated components
- [ ] Create list of components to remove
- [ ] Back up deprecated components (optional)
- [ ] Remove deprecated components

### Phase 20.2: Store Cleanup

- [ ] Audit store exports for unused code
- [ ] Remove draft transaction logic from wallet.ts (if moved)
- [ ] Consolidate P2P/MuSig2 logic
- [ ] Remove any legacy store patterns

### Phase 20.3: Composable Cleanup

- [ ] Audit composable usage
- [ ] Remove or consolidate redundant composables
- [ ] Update imports in consuming files

### Phase 20.4: Dead Code Removal

- [ ] Run ts-prune to find unused exports
- [ ] Run ESLint to find unused imports
- [ ] Remove commented-out code blocks
- [ ] Remove feature flags for completed migrations

### Phase 20.5: File Cleanup

- [ ] Remove backup files
- [ ] Remove old/deprecated directories
- [ ] Clean up any temporary files

---

## Safety Measures

### Before Removing Any Code

1. **Git branch**: Create a cleanup branch

```bash
git checkout -b refactor/cleanup
```

2. **Verify no usage**: Double-check with grep

```bash
grep -r "ComponentName" --include="*.vue" --include="*.ts" .
```

3. **Run tests**: Ensure tests pass before and after

```bash
npm run test
```

4. **Build check**: Ensure build succeeds

```bash
npm run build
```

### Rollback Plan

```bash
# If something breaks, revert the cleanup
git checkout main -- path/to/file

# Or revert entire cleanup
git checkout main
git branch -D refactor/cleanup
```

---

## Post-Cleanup Verification

### Verification Steps

1. **Build succeeds**

```bash
npm run build
```

2. **Type check passes**

```bash
npx vue-tsc --noEmit
```

3. **Lint passes**

```bash
npm run lint
```

4. **Tests pass**

```bash
npm run test
```

5. **Dev server starts**

```bash
npm run dev
```

6. **Manual testing**

- [ ] Wallet creation works
- [ ] Send/receive works
- [ ] Contacts work
- [ ] P2P connection works
- [ ] Settings work
- [ ] Onboarding works

---

_Next: [21_CLEANUP_STRUCTURE.md](./21_CLEANUP_STRUCTURE.md)_
