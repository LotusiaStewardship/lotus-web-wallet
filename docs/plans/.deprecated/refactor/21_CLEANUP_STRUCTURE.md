# 21: Cleanup - Project Structure

## Overview

This document details the final project structure organization, ensuring consistent naming conventions, proper file organization, and clean architecture.

---

## Target Project Structure

```
lotus-web-wallet/
├── .nuxt/                    # Nuxt build output (gitignored)
├── .output/                  # Production build (gitignored)
├── assets/
│   └── css/
│       └── main.css          # Global styles
├── components/
│   ├── app/                  # Global app components
│   │   ├── Card.vue
│   │   ├── EmptyState.vue
│   │   ├── ErrorState.vue
│   │   ├── HeroCard.vue
│   │   ├── LoadingState.vue
│   │   └── Modal.vue
│   ├── contacts/             # Contact components
│   │   ├── DetailSlideover.vue
│   │   ├── FormSlideover.vue
│   │   ├── GroupModal.vue
│   │   ├── ListItem.vue
│   │   ├── Picker.vue
│   │   ├── QuickCard.vue
│   │   └── Search.vue
│   ├── explorer/             # Explorer components
│   │   ├── AddressDisplay.vue
│   │   ├── AmountXPI.vue
│   │   ├── BlockCard.vue
│   │   ├── MempoolCard.vue
│   │   ├── NetworkStats.vue
│   │   ├── RecentBlocksCard.vue
│   │   ├── SearchBar.vue
│   │   ├── TxDetail.vue
│   │   └── TxItem.vue
│   ├── history/              # Transaction history components
│   │   ├── Filters.vue
│   │   ├── TxDetailModal.vue
│   │   └── TxItem.vue
│   ├── musig2/               # MuSig2 components
│   │   ├── CreateSharedWalletModal.vue
│   │   ├── FundWalletModal.vue
│   │   ├── ProposeSpendModal.vue
│   │   ├── SharedWalletCard.vue
│   │   ├── SharedWalletDetail.vue
│   │   ├── SharedWalletList.vue
│   │   ├── SigningProgress.vue
│   │   └── TransactionPreview.vue
│   ├── onboarding/           # Onboarding components
│   │   ├── BackupPrompt.vue
│   │   ├── ContextualHint.vue
│   │   ├── FeatureCard.vue
│   │   ├── Modal.vue
│   │   ├── ProgressIndicator.vue
│   │   ├── RestoreForm.vue
│   │   ├── SeedPhraseStep.vue
│   │   ├── TourStep.vue
│   │   ├── VerifyStep.vue
│   │   └── WelcomeStep.vue
│   ├── p2p/                  # P2P components
│   │   ├── ActivityFeed.vue
│   │   ├── HeroCard.vue
│   │   ├── IncomingRequests.vue
│   │   ├── OnboardingCard.vue
│   │   ├── PeerGrid.vue
│   │   ├── QuickActions.vue
│   │   ├── RequestList.vue
│   │   ├── SessionList.vue
│   │   ├── SettingsPanel.vue
│   │   ├── SignerCard.vue
│   │   └── SignerList.vue
│   ├── receive/              # Receive components
│   │   ├── PaymentRequest.vue
│   │   └── QRDisplay.vue
│   ├── send/                 # Send components
│   │   ├── AdvancedOptions.vue
│   │   ├── AmountInput.vue
│   │   ├── ConfirmationModal.vue
│   │   ├── FeeSection.vue
│   │   ├── RecipientInput.vue
│   │   └── Success.vue
│   ├── settings/             # Settings components
│   │   ├── BackButton.vue
│   │   ├── ConnectionStatus.vue
│   │   ├── DangerZone.vue
│   │   ├── NetworkCard.vue
│   │   ├── Section.vue
│   │   ├── SeedPhraseDisplay.vue
│   │   ├── SelectItem.vue
│   │   ├── SetPinModal.vue
│   │   ├── ToggleItem.vue
│   │   ├── VerifyBackup.vue
│   │   └── VersionInfo.vue
│   ├── social/               # Social/RANK components
│   │   ├── ActivityItem.vue
│   │   ├── PlatformIcon.vue
│   │   ├── ProfileCard.vue
│   │   ├── ProfileLink.vue
│   │   ├── SearchBar.vue
│   │   ├── TrendingCard.vue
│   │   ├── VoteButton.vue
│   │   └── VoteModal.vue
│   └── wallet/               # Wallet components
│       ├── ActivityCard.vue
│       ├── BackupReminder.vue
│       ├── BalanceHero.vue
│       ├── NetworkStatus.vue
│       └── QuickActions.vue
├── composables/
│   ├── useAddress.ts
│   ├── useAmount.ts
│   ├── useAvatars.ts
│   ├── useBitcore.ts
│   ├── useClipboard.ts
│   ├── useExplorerApi.ts
│   ├── useMuSig2.ts
│   ├── useNotifications.ts
│   ├── useQRCode.ts
│   ├── useTime.ts
│   └── useValidation.ts
├── docs/
│   └── plans/
│       └── refactor/
│           ├── 01_ARCHITECTURE.md
│           ├── 02_DESIGN_SYSTEM.md
│           ├── ...
│           └── STATUS.md
├── layouts/
│   └── default.vue
├── pages/
│   ├── contacts.vue
│   ├── explorer/
│   │   ├── address/
│   │   │   └── [address].vue
│   │   ├── block/
│   │   │   └── [hashOrHeight].vue
│   │   ├── tx/
│   │   │   └── [txid].vue
│   │   └── index.vue
│   ├── history.vue
│   ├── index.vue
│   ├── p2p.vue
│   ├── receive.vue
│   ├── send.vue
│   ├── settings/
│   │   ├── advertise.vue
│   │   ├── backup.vue
│   │   ├── index.vue
│   │   ├── network.vue
│   │   ├── restore.vue
│   │   └── security.vue
│   └── social/
│       ├── [platform]/
│       │   └── [profileId].vue
│       └── index.vue
├── plugins/
│   └── bitcore.client.ts
├── public/
│   └── favicon.ico
├── services/                 # Service wrappers (if needed)
│   ├── chronik.ts
│   └── p2p.ts
├── stores/
│   ├── contacts.ts
│   ├── musig2.ts
│   ├── network.ts
│   ├── onboarding.ts
│   ├── p2p.ts
│   ├── ui.ts
│   └── wallet.ts
├── types/
│   ├── contacts.ts
│   ├── musig2.ts
│   ├── onboarding.ts
│   ├── p2p.ts
│   ├── social.ts
│   ├── transaction.ts
│   └── wallet.ts
├── utils/
│   ├── constants.ts
│   └── helpers.ts
├── .gitignore
├── app.config.ts
├── app.vue
├── nuxt.config.ts
├── package.json
├── README.md
└── tsconfig.json
```

---

## Naming Conventions

### Components

| Convention          | Example                     | Description                  |
| ------------------- | --------------------------- | ---------------------------- |
| PascalCase          | `BalanceHero.vue`           | Component file names         |
| Prefixed by feature | `wallet/BalanceHero.vue`    | Organized in feature folders |
| Descriptive         | `SendConfirmationModal.vue` | Clear purpose                |

### Composables

| Convention                  | Example            | Description                    |
| --------------------------- | ------------------ | ------------------------------ |
| camelCase with `use` prefix | `useAmount.ts`     | Standard Vue composable naming |
| Verb-based                  | `useValidation.ts` | Describes action               |

### Stores

| Convention    | Example     | Description         |
| ------------- | ----------- | ------------------- |
| camelCase     | `wallet.ts` | Store file names    |
| Feature-based | `musig2.ts` | Named after feature |

### Types

| Convention            | Example                  | Description     |
| --------------------- | ------------------------ | --------------- |
| PascalCase interfaces | `Contact`, `Transaction` | Type names      |
| camelCase files       | `contacts.ts`            | Type file names |

---

## Component Organization Rules

### 1. Feature-Based Folders

Components are organized by feature, not by type:

```
✅ Good:
components/
├── wallet/
│   ├── BalanceHero.vue
│   └── QuickActions.vue
├── send/
│   ├── AmountInput.vue
│   └── RecipientInput.vue

❌ Bad:
components/
├── cards/
│   ├── BalanceCard.vue
│   └── ContactCard.vue
├── modals/
│   ├── SendModal.vue
│   └── ReceiveModal.vue
```

### 2. Nuxt Auto-Import Naming

Components are auto-imported with folder prefix:

```vue
<!-- Usage -->
<WalletBalanceHero />
<!-- components/wallet/BalanceHero.vue -->
<SendAmountInput />
<!-- components/send/AmountInput.vue -->
<ContactsListItem />
<!-- components/contacts/ListItem.vue -->
```

### 3. Index Files (Avoid)

Don't use index.vue for components - use descriptive names:

```
✅ Good:
components/wallet/BalanceHero.vue

❌ Bad:
components/wallet/index.vue
```

---

## File Organization Tasks

### Phase 21.1: Verify Component Structure

- [ ] All components in correct feature folders
- [ ] No orphaned components in root `components/`
- [ ] Consistent naming (PascalCase)
- [ ] No duplicate components

### Phase 21.2: Verify Store Structure

- [ ] All stores in `stores/` folder
- [ ] Consistent naming (camelCase)
- [ ] No business logic in components (moved to stores)

### Phase 21.3: Verify Composable Structure

- [ ] All composables in `composables/` folder
- [ ] Consistent naming (`use` prefix)
- [ ] No duplicate functionality

### Phase 21.4: Verify Type Structure

- [ ] All types in `types/` folder
- [ ] Consistent naming (PascalCase for types, camelCase for files)
- [ ] Types exported and importable

### Phase 21.5: Clean Up Root

- [ ] No stray files in project root
- [ ] README.md is up to date
- [ ] .gitignore is complete

---

## Import Organization

### Standard Import Order

```typescript
// 1. Vue/Nuxt imports
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// 2. Store imports
import { useWalletStore } from '~/stores/wallet'
import { useContactStore } from '~/stores/contacts'

// 3. Composable imports
import { useAmount } from '~/composables/useAmount'
import { useNotifications } from '~/composables/useNotifications'

// 4. Type imports
import type { Contact } from '~/types/contacts'
import type { Transaction } from '~/types/transaction'

// 5. Utility imports
import { formatDate } from '~/utils/helpers'
```

### ESLint Import Rules

```javascript
// eslint.config.mjs
export default {
  rules: {
    'import/order': [
      'error',
      {
        'groups': [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling'],
          'index',
          'type',
        ],
        'newlines-between': 'always',
      },
    ],
  },
}
```

---

## Documentation Structure

### Required Documentation

```
docs/
├── plans/
│   └── refactor/
│       ├── 01_ARCHITECTURE.md
│       ├── 02_DESIGN_SYSTEM.md
│       ├── 03_STORES_REFACTOR.md
│       ├── 04_COMPOSABLES_REFACTOR.md
│       ├── 05_WALLET_CORE.md
│       ├── 06_CONTACTS_SYSTEM.md
│       ├── 07_EXPLORER_PAGES.md
│       ├── 08_SOCIAL_PAGES.md
│       ├── 09_P2P_SYSTEM.md
│       ├── 10_MUSIG2_SYSTEM.md
│       ├── 11_SETTINGS_PAGES.md
│       ├── 12_ONBOARDING_FLOW.md
│       ├── 13_INTEGRATION_STORES.md
│       ├── 14_INTEGRATION_PAGES.md
│       ├── 15_INTEGRATION_COMPOSABLES.md
│       ├── 16_TYPE_ALIGNMENT.md
│       ├── 17_INTEGRATION_CONTACTS.md
│       ├── 18_INTEGRATION_EXPLORER.md
│       ├── 19_INTEGRATION_P2P_MUSIG2.md
│       ├── 20_CLEANUP_DEPRECATED.md
│       ├── 21_CLEANUP_STRUCTURE.md
│       └── STATUS.md
└── README.md                 # Project overview
```

---

## Final Verification

### Build Verification

```bash
# Clean build
rm -rf .nuxt .output node_modules/.cache
npm run build

# Type check
npx vue-tsc --noEmit

# Lint
npm run lint
```

### Structure Verification Script

```bash
#!/bin/bash
# verify-structure.sh

echo "=== Verifying Project Structure ==="

# Check required directories exist
dirs=("components" "composables" "stores" "types" "pages" "layouts" "plugins")
for dir in "${dirs[@]}"; do
  if [ -d "$dir" ]; then
    echo "✅ $dir/"
  else
    echo "❌ Missing: $dir/"
  fi
done

# Check for stray .vue files in components root
stray=$(find components -maxdepth 1 -name "*.vue" | wc -l)
if [ "$stray" -gt 0 ]; then
  echo "⚠️  Found $stray stray .vue files in components/"
  find components -maxdepth 1 -name "*.vue"
fi

# Check component folder structure
echo ""
echo "=== Component Folders ==="
ls -d components/*/ 2>/dev/null

echo ""
echo "=== Store Files ==="
ls stores/*.ts 2>/dev/null

echo ""
echo "=== Composable Files ==="
ls composables/*.ts 2>/dev/null

echo ""
echo "=== Type Files ==="
ls types/*.ts 2>/dev/null
```

---

## Completion Criteria

The cleanup is complete when:

1. ✅ All components organized in feature folders
2. ✅ All stores properly structured
3. ✅ All composables properly named
4. ✅ All types defined and exported
5. ✅ No deprecated code remains
6. ✅ Build succeeds without errors
7. ✅ Type check passes
8. ✅ Lint passes
9. ✅ All features work correctly

---

_End of Cleanup Phase_
