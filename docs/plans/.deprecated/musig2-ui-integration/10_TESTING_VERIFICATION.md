# 10: Testing & Verification

## Overview

This document provides test scenarios and verification checklists for the MuSig2 UI integration. These tests ensure all user flows work correctly end-to-end.

---

## Test Environment Setup

### Prerequisites

1. **Two or more wallet instances** - Test multi-party flows
2. **P2P connectivity** - Ensure peers can discover each other
3. **Test funds** - Have testnet XPI available
4. **Contacts with public keys** - Pre-configured for testing

### Test Accounts

| Account | Role                     | Public Key (example) |
| ------- | ------------------------ | -------------------- |
| Alice   | Primary tester           | 02abc123...          |
| Bob     | Co-signer                | 02def456...          |
| Carol   | Third party (for 3-of-3) | 02ghi789...          |

---

## Test Scenarios

### Scenario 1: Navigation & Discovery

#### 1.1 Access Shared Wallets Section

**Steps:**

1. Open wallet app
2. Navigate to People tab
3. Click on "Shared Wallets"

**Expected:**

- [ ] People hub shows shared wallets link
- [ ] Shared wallets page loads
- [ ] Empty state shown if no wallets exist
- [ ] Create button is visible

#### 1.2 Home Page Integration

**Steps:**

1. Create at least one shared wallet
2. Navigate to home page

**Expected:**

- [ ] Shared wallets summary card appears
- [ ] Shows wallet count and total balance
- [ ] "View All" link works

---

### Scenario 2: Shared Wallet Creation

#### 2.1 Create 2-of-2 Wallet

**Steps:**

1. Navigate to Shared Wallets
2. Click "Create Shared Wallet"
3. Enter wallet name: "Test Wallet"
4. Add description (optional)
5. Click Next
6. Select one contact with public key
7. Click Next
8. Review details
9. Check acknowledgment
10. Click Create

**Expected:**

- [ ] Modal opens with step 1
- [ ] Name validation works (required)
- [ ] Step 2 shows eligible contacts only
- [ ] Your public key shown automatically
- [ ] Selected contact appears in list
- [ ] Step 3 shows correct n-of-n (2-of-2)
- [ ] Acknowledgment checkbox required
- [ ] Creating state shows spinner
- [ ] Success state shows address and QR
- [ ] Wallet appears in list after creation

#### 2.2 Create 3-of-3 Wallet

**Steps:**

1. Same as 2.1 but select 2 contacts

**Expected:**

- [ ] Shows 3-of-3 in review
- [ ] All 3 participants listed
- [ ] Wallet created successfully

#### 2.3 Manual Public Key Entry

**Steps:**

1. Start wallet creation
2. In step 2, enter a public key manually
3. Complete creation

**Expected:**

- [ ] Public key input accepts valid keys
- [ ] Invalid keys show error
- [ ] Duplicate keys rejected
- [ ] Manual participant appears in list

#### 2.4 Validation Errors

**Steps:**

1. Try to proceed without name
2. Try to proceed with only yourself
3. Try to create without acknowledgment

**Expected:**

- [ ] Name required error shown
- [ ] Minimum 2 participants enforced
- [ ] Acknowledgment required to create

---

### Scenario 3: Wallet Detail View

#### 3.1 View Wallet Details

**Steps:**

1. Create a shared wallet
2. Click on wallet card to view details

**Expected:**

- [ ] Detail page loads
- [ ] Shows wallet name and badge
- [ ] Shows balance (0 initially)
- [ ] Shows shared address
- [ ] Copy address works
- [ ] QR code modal works
- [ ] Participants listed with status
- [ ] Fund and Spend buttons visible

#### 3.2 Participant Online Status

**Steps:**

1. View wallet detail
2. Have co-signer go online/offline

**Expected:**

- [ ] Online indicator updates
- [ ] "All online" vs "X/Y online" shown
- [ ] Spend button disabled if not all online

---

### Scenario 4: Funding Flow

#### 4.1 Fund Shared Wallet

**Steps:**

1. View wallet detail
2. Click "Fund"
3. Enter amount: 1000
4. Click "Fund Wallet"

**Expected:**

- [ ] Modal shows current balances
- [ ] Amount input works
- [ ] Quick percentage buttons work
- [ ] Fee breakdown shown
- [ ] Validation for insufficient balance
- [ ] Processing state shows spinner
- [ ] Success state shows txid
- [ ] Balance updates after funding

#### 4.2 Fund with Quick Amounts

**Steps:**

1. Open fund modal
2. Click 25%, 50%, 75%, Max buttons

**Expected:**

- [ ] Amount updates correctly
- [ ] Max accounts for fees
- [ ] Remaining balance shown

---

### Scenario 5: Spending Flow (Initiator)

#### 5.1 Propose Spend Transaction

**Steps:**

1. Fund wallet with test amount
2. Ensure all participants online
3. Click "Spend"
4. Enter recipient address
5. Enter amount
6. Enter purpose
7. Click Next
8. Review transaction
9. Click "Propose Transaction"

**Expected:**

- [ ] Modal shows available balance
- [ ] Recipient validation works
- [ ] Amount validation works
- [ ] Purpose field optional
- [ ] Review shows all details
- [ ] Participant status shown
- [ ] Warning if not all online
- [ ] Signing progress displayed

#### 5.2 Signing Progress

**Steps:**

1. Propose a transaction
2. Watch progress as co-signer approves

**Expected:**

- [ ] Progress steps update
- [ ] Participant status updates
- [ ] Expiration countdown shown
- [ ] Success state on completion
- [ ] Transaction ID shown
- [ ] Balance updates

#### 5.3 Cancel Signing Session

**Steps:**

1. Propose a transaction
2. Click "Cancel Session"

**Expected:**

- [ ] Confirmation prompt shown
- [ ] Session cancelled
- [ ] Other participants notified
- [ ] Modal closes

---

### Scenario 6: Incoming Requests (Co-signer)

#### 6.1 Receive Signing Request

**Steps:**

1. Have another participant propose spend
2. Check for notification

**Expected:**

- [ ] Toast notification appears
- [ ] Badge on People tab
- [ ] Request card in P2P page
- [ ] Request shows transaction details

#### 6.2 View Request Details

**Steps:**

1. Receive signing request
2. Click "View Details"

**Expected:**

- [ ] Detail modal opens
- [ ] Shows requester info
- [ ] Shows transaction details
- [ ] Shows all participants
- [ ] Shows expiration time

#### 6.3 Approve Request

**Steps:**

1. View request details
2. Click "Approve & Sign"

**Expected:**

- [ ] Joins signing session
- [ ] Progress shown
- [ ] Nonce shared automatically
- [ ] Partial signature shared
- [ ] Completion notification

#### 6.4 Reject Request

**Steps:**

1. View request details
2. Click "Reject"
3. Enter reason (optional)
4. Confirm rejection

**Expected:**

- [ ] Confirmation dialog shown
- [ ] Reason field optional
- [ ] Request removed from list
- [ ] Requester notified

---

### Scenario 7: Session Management

#### 7.1 View Active Sessions

**Steps:**

1. Start a signing session
2. Navigate to P2P page

**Expected:**

- [ ] Active sessions section visible
- [ ] Session card shows progress
- [ ] Expiration countdown shown

#### 7.2 View Session History

**Steps:**

1. Complete a signing session
2. Check session history

**Expected:**

- [ ] Completed session in history
- [ ] Shows status (completed/failed)
- [ ] Shows timestamp

#### 7.3 Session Timeout

**Steps:**

1. Start signing session
2. Don't complete before timeout

**Expected:**

- [ ] Session expires
- [ ] Status changes to failed
- [ ] Appropriate message shown

---

### Scenario 8: Contact Integration

#### 8.1 Add Contact with Public Key

**Steps:**

1. Go to Contacts
2. Add new contact
3. Enter public key

**Expected:**

- [ ] Public key field available
- [ ] Validation for format
- [ ] Contact saved with key

#### 8.2 Add Signer as Contact

**Steps:**

1. Go to P2P page
2. Find discovered signer
3. Click "Add to Contacts"

**Expected:**

- [ ] Contact created
- [ ] Public key saved
- [ ] Signer capabilities saved
- [ ] Tagged as "signer"

#### 8.3 View Contact MuSig2 Info

**Steps:**

1. View contact with public key

**Expected:**

- [ ] Public key shown
- [ ] Copy button works
- [ ] Shared wallets listed
- [ ] "Create Shared Wallet" action available

---

### Scenario 9: Error Handling

#### 9.1 P2P Not Connected

**Steps:**

1. Disconnect P2P
2. Try to create shared wallet

**Expected:**

- [ ] Appropriate error message
- [ ] Guidance to connect P2P

#### 9.2 Participant Offline During Signing

**Steps:**

1. Start signing session
2. Have participant go offline

**Expected:**

- [ ] Status updates to offline
- [ ] Session may timeout
- [ ] Clear error message

#### 9.3 Invalid Transaction

**Steps:**

1. Try to spend more than balance
2. Try to send to invalid address

**Expected:**

- [ ] Validation errors shown
- [ ] Cannot proceed with invalid data

---

### Scenario 10: Edge Cases

#### 10.1 Delete Shared Wallet

**Steps:**

1. View wallet detail
2. Click "Delete Wallet"
3. Confirm deletion

**Expected:**

- [ ] Confirmation dialog shown
- [ ] Warning about funds
- [ ] Wallet removed from list
- [ ] Redirected to list page

#### 10.2 Refresh Balances

**Steps:**

1. Fund wallet externally
2. Click refresh in wallet list

**Expected:**

- [ ] Loading indicator shown
- [ ] Balance updates
- [ ] Last updated time shown

#### 10.3 Multiple Active Sessions

**Steps:**

1. Create multiple signing sessions

**Expected:**

- [ ] All sessions shown
- [ ] Each has independent progress
- [ ] Can manage each separately

---

## Verification Checklist

### Navigation

- [ ] People hub shows shared wallets link
- [ ] Shared wallets page accessible
- [ ] Breadcrumb navigation works
- [ ] Back navigation works
- [ ] Home page shows shared wallets summary

### Wallet Creation

- [ ] Create 2-of-2 wallet
- [ ] Create 3-of-3 wallet
- [ ] Manual public key entry
- [ ] Validation errors shown
- [ ] Success state with address

### Wallet Management

- [ ] View wallet details
- [ ] Copy address
- [ ] View QR code
- [ ] See participant status
- [ ] Delete wallet

### Funding

- [ ] Fund from personal wallet
- [ ] Quick amount buttons
- [ ] Fee calculation
- [ ] Success with txid
- [ ] Balance updates

### Spending

- [ ] Propose transaction
- [ ] Review before sending
- [ ] Signing progress shown
- [ ] Cancel session
- [ ] Success with txid

### Incoming Requests

- [ ] Notification received
- [ ] Request card displayed
- [ ] View details
- [ ] Approve request
- [ ] Reject request

### Session Management

- [ ] Active sessions visible
- [ ] Progress updates
- [ ] Session history
- [ ] Timeout handling

### Contact Integration

- [ ] Add public key to contact
- [ ] Save signer as contact
- [ ] View MuSig2 info on contact
- [ ] Filter eligible contacts

### Error Handling

- [ ] P2P disconnection
- [ ] Participant offline
- [ ] Invalid input
- [ ] Session timeout

---

## Performance Benchmarks

| Operation          | Target  | Acceptable |
| ------------------ | ------- | ---------- |
| Page load          | < 500ms | < 1s       |
| Wallet creation    | < 2s    | < 5s       |
| Balance refresh    | < 1s    | < 3s       |
| Session creation   | < 2s    | < 5s       |
| Signing completion | < 30s   | < 60s      |

---

## Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Focus management in modals
- [ ] Screen reader labels
- [ ] Color contrast sufficient
- [ ] Loading states announced

---

## Browser Compatibility

Test on:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari
- [ ] Mobile Chrome

---

_End of MuSig2 UI Integration Plan_
