# Testing Checklist

Comprehensive verification steps for each phase of the remediation.

---

## Phase 1: Wallet API

### Transaction Sending

- [ ] **P2PKH Send**: Create wallet with P2PKH, send transaction, verify broadcast
- [ ] **P2TR Send**: Create wallet with P2TR (Taproot), send transaction, verify broadcast
- [ ] **Send Max**: Use "Send Max" feature, verify correct amount calculation
- [ ] **Multi-Recipient**: Add multiple recipients, verify all receive correct amounts
- [ ] **Coin Control**: Manually select UTXOs, verify only selected are used
- [ ] **OP_RETURN**: Add OP_RETURN data, verify included in transaction
- [ ] **Locktime**: Set locktime, verify transaction has correct locktime

### Edge Cases

- [ ] **Insufficient Balance**: Attempt send with insufficient funds, verify error
- [ ] **Invalid Address**: Enter invalid address, verify validation error
- [ ] **Network Mismatch**: Enter testnet address on mainnet, verify error
- [ ] **Dust Amount**: Attempt to send dust amount, verify handling

### Crypto Worker

- [ ] **Worker Signing**: Verify transaction signing works via crypto worker
- [ ] **Fallback Signing**: Disable worker, verify fallback signing works

---

## Phase 2: Identity Consolidation

### Identity Store

- [ ] **Create Identity**: Add contact with public key, verify identity created
- [ ] **Find by PeerId**: Connect to peer, verify `findByPeerId()` works
- [ ] **Find by Address**: Look up identity by address, verify correct result
- [ ] **Online Status**: Verify `getOnlineStatus()` returns correct status

### P2P Integration

- [ ] **Peer Connect**: Connect to peer, verify identity marked online
- [ ] **Peer Disconnect**: Disconnect from peer, verify identity marked offline
- [ ] **Multiaddr Update**: Connect with new multiaddr, verify identity updated

### MuSig2 Integration

- [ ] **Signer Discovery**: Discover signer, verify identity created/updated
- [ ] **Signer Offline**: Signer goes offline, verify identity updated
- [ ] **Capabilities Update**: Signer updates capabilities, verify identity updated

### Contact Migration

- [ ] **Legacy Contact**: Load app with legacy contact (publicKey, no identityId)
- [ ] **Migration Runs**: Verify contact gets identityId after migration
- [ ] **Data Preserved**: Verify peerId, lastSeenOnline copied to identity
- [ ] **No Duplicate**: Verify no duplicate identities created

### Online Status Display

- [ ] **Contact Card**: Verify correct online status badge
- [ ] **Contact Detail**: Verify correct online status in slideover
- [ ] **Signer Card**: Verify correct online status for signers
- [ ] **Participant List**: Verify correct status for shared wallet participants

---

## Phase 3: Facade Composables

### useContactContext

- [ ] **Contact Data**: Verify contact data is accessible
- [ ] **Identity Data**: Verify identity data is accessible
- [ ] **Online Status**: Verify online status is correct
- [ ] **Shared Wallets**: Verify shared wallets list is correct
- [ ] **Transaction Count**: Verify transaction count is correct
- [ ] **Send Action**: Verify send navigates to send page with address
- [ ] **Edit Action**: Verify edit navigates to edit form
- [ ] **Delete Action**: Verify delete removes contact
- [ ] **Copy Actions**: Verify copy address/public key works

### useSharedWalletContext

- [ ] **Wallet Data**: Verify wallet data is accessible
- [ ] **Participants**: Verify participants have identity/contact attached
- [ ] **Online Count**: Verify online participant count is correct
- [ ] **Can Propose**: Verify canPropose is true when all online
- [ ] **Sessions**: Verify active/pending sessions are correct
- [ ] **Propose Spend**: Verify propose spend action works
- [ ] **Refresh Balance**: Verify balance refresh works
- [ ] **Delete Wallet**: Verify delete wallet works

### useSignerContext

- [ ] **Discovered Signers**: Verify signers have identity/contact attached
- [ ] **Is Advertising**: Verify advertising state is correct
- [ ] **My Config**: Verify signer config is accessible
- [ ] **Advertise**: Verify advertise action works
- [ ] **Withdraw**: Verify withdraw action works
- [ ] **Refresh**: Verify refresh action works

---

## Phase 4: Component Migration

### Contact Components

- [ ] **ContactCard**: Displays correctly with new composable
- [ ] **ContactDetailSlideover**: All sections display correctly
- [ ] **ContactForm**: Create/edit contact works
- [ ] **ContactPicker**: Select contact works
- [ ] **ContactSearch**: Search finds contacts

### Shared Wallet Components

- [ ] **CreateSharedWalletModal**: Create wallet with participants
- [ ] **ProposeSpendModal**: Propose spend works
- [ ] **ParticipantList**: Shows all participants with status
- [ ] **AvailableSigners**: Shows discovered signers
- [ ] **NetworkStatusBar**: Shows correct connection status
- [ ] **PendingRequests**: Shows pending signing requests
- [ ] **SignerModePanel**: Toggle signer mode works
- [ ] **WalletActivityFeed**: Shows wallet activity

### P2P Components

- [ ] **NetworkStatus**: Shows correct P2P status
- [ ] **PresenceToggle**: Toggle presence works
- [ ] **SignerList**: Shows signers with correct status
- [ ] **RequestList**: Shows signing requests
- [ ] **SigningSessionProgress**: Shows session progress

### Common Components

- [ ] **OnlineStatusBadge**: Displays correct badge for each status
- [ ] **SignerCard**: Shows signer with correct status
- [ ] **SignerDetailModal**: Shows signer details

### Pages

- [ ] **/people/contacts**: List and manage contacts
- [ ] **/people/p2p**: P2P network management
- [ ] **/people/shared-wallets**: List shared wallets
- [ ] **/people/shared-wallets/[id]**: View shared wallet detail
- [ ] **/settings/advertise**: Configure signer advertisement
- [ ] **/settings/p2p**: P2P settings
- [ ] **/transact/send**: Send transaction
- [ ] **/transact/history**: Transaction history

---

## Phase 5: Cleanup

### Deprecated Code Removal

- [ ] **No Private Access**: `grep "Store\(\)\._"` returns no results
- [ ] **No Legacy Stubs**: useMuSig2 has no throwing stubs
- [ ] **No Duplicate Utils**: Address utilities consolidated

### Console Output

- [ ] **No Warnings**: No deprecation warnings in console
- [ ] **No Errors**: No errors in console during normal operation
- [ ] **Clean Logs**: Migration logs appear once on first load

### Performance

- [ ] **Load Time**: App loads in reasonable time
- [ ] **Reactivity**: UI updates promptly on state changes
- [ ] **Memory**: No memory leaks from store subscriptions

---

## Regression Testing

### Wallet Core

- [ ] Create new wallet
- [ ] Restore wallet from seed phrase
- [ ] Switch network (mainnet ↔ testnet)
- [ ] View balance
- [ ] View transaction history
- [ ] Receive payment (verify UTXO appears)

### Contacts

- [ ] Add contact by address
- [ ] Add contact with public key
- [ ] Edit contact
- [ ] Delete contact
- [ ] Search contacts
- [ ] Favorite contact

### P2P Network

- [ ] Connect to DHT
- [ ] Discover peers
- [ ] Advertise presence
- [ ] Receive presence updates

### MuSig2

- [ ] Advertise as signer
- [ ] Discover signers
- [ ] Create shared wallet
- [ ] View shared wallet balance
- [ ] Propose spend
- [ ] Complete signing session

### Settings

- [ ] Change display preferences
- [ ] Backup seed phrase
- [ ] P2P settings
- [ ] Signer advertisement settings

---

## Browser Compatibility

- [ ] **Chrome**: All features work
- [ ] **Firefox**: All features work
- [ ] **Safari**: All features work
- [ ] **Mobile Chrome**: All features work
- [ ] **Mobile Safari**: All features work

---

## Automated Tests

### Unit Tests to Add

```typescript
// stores/wallet.test.ts
describe('Wallet Store - Transaction API', () => {
  it('getTransactionBuildContext returns null when not initialized')
  it('getTransactionBuildContext returns context when initialized')
  it('isReadyForSigning returns false when not initialized')
  it('isReadyForSigning returns true when initialized')
  it('signTransactionHex throws when not initialized')
  it('signTransactionHex returns hex for P2PKH')
  it('signTransactionHex returns hex for P2TR')
})

// stores/identity.test.ts
describe('Identity Store - Online Status', () => {
  it('getOnlineStatus returns unknown for missing identity')
  it('getOnlineStatus returns online when isOnline is true')
  it('getOnlineStatus returns recently_online within threshold')
  it('getOnlineStatus returns offline after threshold')
  it('updateFromPeerConnection sets online status')
  it('markOfflineByPeerId clears online status')
})

// composables/useContactContext.test.ts
describe('useContactContext', () => {
  it('returns null contact for invalid id')
  it('returns contact data for valid id')
  it('returns identity when contact has identityId')
  it('returns correct online status')
  it('returns shared wallets with contact')
})
```

### Integration Tests to Add

```typescript
// tests/integration/transaction-flow.test.ts
describe('Transaction Flow', () => {
  it('builds and signs P2PKH transaction')
  it('builds and signs P2TR transaction')
  it('handles send max correctly')
})

// tests/integration/identity-consolidation.test.ts
describe('Identity Consolidation', () => {
  it('creates identity when contact added with public key')
  it('updates identity when peer connects')
  it('updates identity when signer discovered')
})
```

---

## Sign-Off

| Phase                           | Tested By | Date | Status |
| ------------------------------- | --------- | ---- | ------ |
| Phase 1: Wallet API             |           |      |        |
| Phase 2: Identity Consolidation |           |      |        |
| Phase 3: Facade Composables     |           |      |        |
| Phase 4: Component Migration    |           |      |        |
| Phase 5: Cleanup                |           |      |        |
| Regression Testing              |           |      |        |
