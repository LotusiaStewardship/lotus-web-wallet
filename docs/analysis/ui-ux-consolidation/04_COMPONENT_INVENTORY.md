# Component Inventory

Complete inventory of UI components organized by directory.

---

## Summary

| Directory         | Count | Duplicates | Notes                                       |
| ----------------- | ----- | ---------- | ------------------------------------------- |
| `common/`         | 24    | 0          | Core reusable components                    |
| `ui/`             | 10    | 0          | Generic UI patterns                         |
| `contacts/`       | 10    | 0          | Contact management                          |
| `p2p/`            | 18    | 3          | High duplication with common/shared-wallets |
| `musig2/`         | 11    | 0          | Multi-signature features                    |
| `shared-wallets/` | 7     | 2          | Overlaps with p2p/musig2                    |
| `explorer/`       | 11    | 1          | Blockchain explorer                         |
| `wallet/`         | 7     | 2          | Wallet dashboard                            |
| `history/`        | 3     | 1          | Transaction history                         |
| `send/`           | 6     | 0          | Send transaction flow                       |
| `receive/`        | 2     | 0          | Receive flow                                |
| `settings/`       | 12    | 0          | Settings pages                              |
| `onboarding/`     | 12    | 0          | Onboarding flow                             |
| `social/`         | 8     | 0          | Social features                             |
| `layout/`         | 6     | 0          | App layout                                  |
| `notifications/`  | 1     | 0          | Notification display                        |
| `shared/`         | 1     | 0          | Shared utilities                            |

**Total**: ~149 components  
**Duplicates identified**: 9

---

## components/common/ (24)

Core reusable components that should be used throughout the app.

| Component                    | Size   | Purpose                        | Usage               |
| ---------------------------- | ------ | ------------------------------ | ------------------- |
| `ActivityFeed.vue`           | 4.2 KB | Cross-feature activity feed    | Dashboard, P2P      |
| `AddressDisplay.vue`         | 3.3 KB | Contact-aware address display  | Everywhere          |
| `AddressFingerprint.vue`     | 1.6 KB | Short address fingerprint      | Compact displays    |
| `AmountDisplay.vue`          | 1.7 KB | Formatted amount display       | Transactions        |
| `Avatar.vue`                 | 1.8 KB | Generic avatar                 | Various             |
| `Badge.vue`                  | 0.7 KB | Generic badge                  | Various             |
| `ConfirmationBadge.vue`      | 1.2 KB | Transaction confirmation badge | Transactions        |
| `CopyButton.vue`             | 1.1 KB | Copy to clipboard button       | Various             |
| `DismissibleBanner.vue`      | 2.9 KB | Dismissible info banner        | Onboarding          |
| `ErrorState.vue`             | 1.1 KB | Error display                  | Error handling      |
| `FeatureIntro.vue`           | 3.1 KB | Feature introduction           | Onboarding          |
| `FirstTimeTooltip.vue`       | 2.1 KB | First-time user tooltip        | Onboarding          |
| `InstructionStep.vue`        | 0.6 KB | Instruction step               | Guides              |
| `KeyboardShortcutsModal.vue` | 3.0 KB | Keyboard shortcuts help        | Help                |
| `LoadingOverlay.vue`         | 1.1 KB | Loading overlay                | Loading states      |
| `NetworkBadge.vue`           | 0.8 KB | Network indicator badge        | Header              |
| `OfflineIndicator.vue`       | 0.8 KB | Offline status indicator       | Header              |
| `QRCode.vue`                 | 1.7 KB | QR code display                | Receive             |
| `SignerCard.vue`             | 5.7 KB | Signer card display            | P2P, Shared Wallets |
| `SignerDetailModal.vue`      | 5.6 KB | Signer detail modal            | P2P, Shared Wallets |
| `SkipLinks.vue`              | 0.5 KB | Accessibility skip links       | Layout              |
| `SuccessAnimation.vue`       | 1.9 KB | Success animation              | Confirmations       |
| `TimeAgo.vue`                | 1.2 KB | Relative time display          | Various             |
| `TxidDisplay.vue`            | 1.7 KB | Transaction ID display         | Transactions        |

---

## components/ui/ (10)

Generic UI patterns and wrappers.

| Component             | Size   | Purpose                  |
| --------------------- | ------ | ------------------------ |
| `AppActionCard.vue`   | 1.3 KB | Action card with button  |
| `AppCard.vue`         | 1.6 KB | Generic card wrapper     |
| `AppConfirmModal.vue` | 2.3 KB | Confirmation modal       |
| `AppEmptyState.vue`   | 1.0 KB | Empty state display      |
| `AppErrorState.vue`   | 0.9 KB | Error state display      |
| `AppHeroCard.vue`     | 1.3 KB | Hero card for dashboards |
| `AppListItem.vue`     | 2.3 KB | Generic list item        |
| `AppLoadingState.vue` | 0.7 KB | Loading state display    |
| `AppSkeleton.vue`     | 1.5 KB | Skeleton loader          |
| `AppStatCard.vue`     | 1.0 KB | Statistics card          |

---

## components/contacts/ (10)

Contact management components.

| Component                    | Size    | Purpose                      | Duplication |
| ---------------------------- | ------- | ---------------------------- | ----------- |
| `ContactAvatar.vue`          | 2.5 KB  | Contact avatar with presence | -           |
| `ContactCard.vue`            | 11.7 KB | Contact list card            | -           |
| `ContactDetailSlideover.vue` | 10.9 KB | Contact detail view          | -           |
| `ContactForm.vue`            | 10.5 KB | Contact create/edit form     | -           |
| `ContactFormSlideover.vue`   | 5.2 KB  | Form in slideover            | -           |
| `ContactGroupModal.vue`      | 4.1 KB  | Contact group management     | -           |
| `ContactListItem.vue`        | 2.0 KB  | Compact contact list item    | -           |
| `ContactPicker.vue`          | 3.0 KB  | Contact selection            | -           |
| `ContactQuickCard.vue`       | 0.6 KB  | Quick contact card           | -           |
| `ContactSearch.vue`          | 6.7 KB  | Contact search               | -           |

---

## components/p2p/ (18)

P2P networking components. **High duplication with common/ and shared-wallets/**.

| Component                    | Size    | Purpose               | Duplication              |
| ---------------------------- | ------- | --------------------- | ------------------------ |
| `ActivityFeed.vue`           | 3.7 KB  | P2P activity feed     | **Duplicate of common/** |
| `HeroCard.vue`               | 4.2 KB  | P2P hero card         | -                        |
| `IncomingRequests.vue`       | 2.4 KB  | Incoming request list | -                        |
| `IncomingSigningRequest.vue` | 7.9 KB  | Signing request card  | -                        |
| `NetworkStatus.vue`          | 6.8 KB  | P2P network status    | **Duplicate pattern**    |
| `OnboardingCard.vue`         | 2.3 KB  | P2P onboarding        | -                        |
| `PeerGrid.vue`               | 2.6 KB  | Connected peers grid  | -                        |
| `PresenceToggle.vue`         | 2.4 KB  | Presence toggle       | -                        |
| `QuickActions.vue`           | 1.7 KB  | Quick action buttons  | -                        |
| `RequestList.vue`            | 6.5 KB  | Signing request list  | -                        |
| `SessionDetailModal.vue`     | 8.5 KB  | Session detail modal  | -                        |
| `SessionList.vue`            | 3.5 KB  | Session list          | -                        |
| `SettingsPanel.vue`          | 3.5 KB  | P2P settings          | -                        |
| `SignerDetailModal.vue`      | 7.0 KB  | Signer detail modal   | **Duplicate of common/** |
| `SignerList.vue`             | 5.7 KB  | Signer list           | -                        |
| `SignerListSkeleton.vue`     | 1.0 KB  | Signer list skeleton  | -                        |
| `SigningRequestModal.vue`    | 8.9 KB  | Signing request modal | -                        |
| `SigningSessionProgress.vue` | 13.3 KB | Session progress      | -                        |

---

## components/musig2/ (11)

Multi-signature components.

| Component                      | Size    | Purpose                |
| ------------------------------ | ------- | ---------------------- |
| `CreateSharedWalletModal.vue`  | 13.0 KB | Wallet creation wizard |
| `FundWalletModal.vue`          | 4.0 KB  | Fund shared wallet     |
| `IncomingRequestCard.vue`      | 4.8 KB  | Incoming request card  |
| `ProposeSpendModal.vue`        | 11.0 KB | Propose spend modal    |
| `RequestDetailModal.vue`       | 8.1 KB  | Request detail modal   |
| `SharedWalletCard.vue`         | 2.6 KB  | Wallet card            |
| `SharedWalletDetail.vue`       | 4.7 KB  | Wallet detail view     |
| `SharedWalletList.vue`         | 2.0 KB  | Wallet list            |
| `SharedWalletListSkeleton.vue` | 1.4 KB  | Wallet list skeleton   |
| `SigningProgress.vue`          | 4.4 KB  | Signing progress       |
| `TransactionPreview.vue`       | 3.1 KB  | Transaction preview    |

---

## components/shared-wallets/ (7)

Shared wallet components. **Overlaps with musig2/**.

| Component                | Size    | Purpose                | Duplication              |
| ------------------------ | ------- | ---------------------- | ------------------------ |
| `AvailableSigners.vue`   | 6.6 KB  | Available signers list | -                        |
| `NetworkStatusBar.vue`   | 5.3 KB  | Network status bar     | **Duplicate pattern**    |
| `ParticipantList.vue`    | 10.3 KB | Participant list       | -                        |
| `PendingRequests.vue`    | 6.4 KB  | Pending requests       | -                        |
| `SignerDetailModal.vue`  | 7.0 KB  | Signer detail modal    | **Duplicate of common/** |
| `SignerModePanel.vue`    | 6.9 KB  | Signer mode panel      | -                        |
| `WalletActivityFeed.vue` | 5.1 KB  | Wallet activity feed   | -                        |

---

## components/explorer/ (11)

Blockchain explorer components.

| Component                | Size   | Purpose                  | Duplication              |
| ------------------------ | ------ | ------------------------ | ------------------------ |
| `AddToContactButton.vue` | 2.6 KB | Add to contacts button   | -                        |
| `AddressDisplay.vue`     | 2.4 KB | Explorer address display | **Duplicate of common/** |
| `BlockItem.vue`          | 2.2 KB | Block list item          | -                        |
| `ExplorerAmountXPI.vue`  | 1.3 KB | Amount display           | -                        |
| `ExplorerTxTable.vue`    | 2.7 KB | Transaction table        | -                        |
| `MempoolCard.vue`        | 1.4 KB | Mempool stats card       | -                        |
| `NetworkStats.vue`       | 1.4 KB | Network statistics       | -                        |
| `RecentBlocksCard.vue`   | 1.0 KB | Recent blocks card       | -                        |
| `SearchBar.vue`          | 4.1 KB | Explorer search          | -                        |
| `StatCard.vue`           | 1.6 KB | Statistics card          | -                        |
| `TxItem.vue`             | 4.2 KB | Transaction item         | **Duplicate pattern**    |

---

## components/wallet/ (7)

Wallet dashboard components.

| Component             | Size   | Purpose               | Duplication           |
| --------------------- | ------ | --------------------- | --------------------- |
| `AccountBadge.vue`    | 2.2 KB | Account type badge    | -                     |
| `AccountSelector.vue` | 2.5 KB | Account selector      | -                     |
| `ActivityCard.vue`    | 1.5 KB | Activity summary card | -                     |
| `BalanceHero.vue`     | 2.2 KB | Balance hero display  | -                     |
| `NetworkStatus.vue`   | 1.5 KB | Network status        | **Duplicate pattern** |
| `QuickActions.vue`    | 1.1 KB | Quick action buttons  | -                     |
| `TxItem.vue`          | 3.2 KB | Transaction item      | **Duplicate pattern** |

---

## components/history/ (3)

Transaction history components.

| Component           | Size   | Purpose            | Duplication           |
| ------------------- | ------ | ------------------ | --------------------- |
| `Filters.vue`       | ?      | History filters    | -                     |
| `TxDetailModal.vue` | ?      | Transaction detail | -                     |
| `TxItem.vue`        | 4.5 KB | Transaction item   | **Duplicate pattern** |

---

## components/send/ (6)

Send transaction flow components.

| Component               | Size | Purpose               |
| ----------------------- | ---- | --------------------- |
| `AdvancedOptions.vue`   | ?    | Advanced send options |
| `ConfirmationModal.vue` | ?    | Send confirmation     |
| `RecipientInput.vue`    | ?    | Recipient input       |
| `AmountInput.vue`       | ?    | Amount input          |
| `FeeSelector.vue`       | ?    | Fee selection         |
| `Summary.vue`           | ?    | Transaction summary   |

---

## components/receive/ (2)

Receive flow components.

| Component            | Size | Purpose         |
| -------------------- | ---- | --------------- |
| `PaymentRequest.vue` | ?    | Payment request |
| `QRDisplay.vue`      | ?    | QR code display |

---

## components/settings/ (12)

Settings page components.

| Component                   | Size | Purpose     |
| --------------------------- | ---- | ----------- |
| Various settings components | -    | Settings UI |

---

## components/onboarding/ (12)

Onboarding flow components.

| Component                     | Size | Purpose       |
| ----------------------------- | ---- | ------------- |
| Various onboarding components | -    | Onboarding UI |

---

## components/social/ (8)

Social features components.

| Component                 | Size | Purpose              |
| ------------------------- | ---- | -------------------- |
| `ActivityItem.vue`        | ?    | Social activity item |
| `VoteModal.vue`           | ?    | RANK voting modal    |
| Various social components | -    | Social UI            |

---

## components/layout/ (6)

App layout components.

| Component                 | Size | Purpose         |
| ------------------------- | ---- | --------------- |
| `CommandPalette.vue`      | ?    | Command palette |
| `NavbarActions.vue`       | ?    | Navbar actions  |
| `SidebarFooter.vue`       | ?    | Sidebar footer  |
| Various layout components | -    | Layout UI       |

---

## Duplication Summary

### Exact Duplicates (same functionality, different files)

| Pattern           | Files   | Action             |
| ----------------- | ------- | ------------------ |
| SignerDetailModal | 3 files | Merge into common/ |
| AddressDisplay    | 2 files | Merge into common/ |
| ActivityFeed      | 2 files | Merge into common/ |

### Pattern Duplicates (similar functionality, different implementations)

| Pattern       | Files   | Action                   |
| ------------- | ------- | ------------------------ |
| TxItem        | 3 files | Create unified component |
| NetworkStatus | 3 files | Create unified component |

### Total Reduction Potential

- **Files to delete**: 10
- **Lines of code saved**: ~2,000+
- **Maintenance burden reduced**: Significant
