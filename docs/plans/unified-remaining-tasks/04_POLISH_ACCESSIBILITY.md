# Phase 4: Polish & Accessibility

## Overview

This phase focuses on polish, accessibility, performance optimization, and keyboard navigation. These improvements make the wallet feel professional and usable by everyone.

**Priority**: P3 (Lower)
**Estimated Effort**: 2-3 days
**Dependencies**: All previous phases

---

## Goals

1. Keyboard shortcuts and navigation
2. Accessibility audit and fixes
3. Performance optimization
4. Loading state standardization
5. Error handling improvements
6. Mobile optimization pass

---

## 1. Keyboard Shortcuts

### 1.1 Create Composable

**File**: `composables/useKeyboardShortcuts.ts`

#### Requirements

- [ ] Global keyboard shortcuts registration
- [ ] Command palette trigger (⌘K)
- [ ] Navigation shortcuts (⌘S, ⌘R, ⌘H)
- [ ] Search focus (/)
- [ ] Help modal (?)
- [ ] Escape to close modals
- [ ] Ignore shortcuts when typing in inputs

#### Shortcuts to Implement

| Shortcut | Action               |
| -------- | -------------------- |
| ⌘K       | Open command palette |
| ⌘S       | Go to Send           |
| ⌘R       | Go to Receive        |
| ⌘H       | Go to History        |
| /        | Focus search         |
| ?        | Show shortcuts help  |
| Escape   | Close modal/dialog   |

---

### 1.2 Keyboard Shortcuts Help Modal

**File**: `components/layout/KeyboardShortcutsModal.vue`

#### Requirements

- [ ] Display all available shortcuts
- [ ] Group by category (Navigation, General)
- [ ] Keyboard key styling
- [ ] Close button

---

## 2. Accessibility Improvements

### 2.1 Skip Links

**File**: `components/layout/SkipLinks.vue`

#### Requirements

- [ ] Skip to main content link
- [ ] Skip to navigation link
- [ ] Only visible on focus
- [ ] Proper focus management

---

### 2.2 Focus Management

**File**: `composables/useFocusManagement.ts`

#### Requirements

- [ ] Focus trap for modals
- [ ] Return focus after modal closes
- [ ] Focus first interactive element in modals

---

### 2.3 ARIA Labels

Add proper ARIA labels to interactive elements:

- [ ] Balance card with `aria-live="polite"`
- [ ] Toggle buttons with `aria-pressed`
- [ ] Navigation with `aria-current`
- [ ] Loading states with `aria-busy`
- [ ] Error messages with `role="alert"`

---

### 2.4 Color Contrast

Ensure all text meets WCAG AA standards:

- [ ] Audit all text colors
- [ ] Fix any contrast issues
- [ ] Test in both light and dark modes

---

## 3. Performance Optimization

### 3.1 Virtual Scrolling

For long lists (transaction history, contacts):

- [ ] Implement virtual scrolling using `@vueuse/core`
- [ ] Apply to transaction history page
- [ ] Apply to contacts list if large

---

### 3.2 Lazy Loading

- [ ] Lazy load heavy components (QR scanner, export modal)
- [ ] Use `defineAsyncComponent` for modals
- [ ] Add loading states for async components

---

### 3.3 Image Optimization

- [ ] Use `NuxtImg` for optimized images
- [ ] Add lazy loading to avatars
- [ ] Add placeholder images

---

## 4. Loading State Standardization

### 4.1 Skeleton Loading

Ensure all async content has skeleton loading:

- [ ] Transaction list skeletons
- [ ] Contact list skeletons
- [ ] Profile card skeletons
- [ ] Block list skeletons

---

### 4.2 Loading Variants

The `AppLoadingState` component should support:

- [ ] Spinner variant (default)
- [ ] Skeleton variant
- [ ] Dots variant

---

## 5. Error Handling Improvements

### 5.1 Standardized Error States

All pages should use `AppErrorState` with:

- [ ] Clear error title
- [ ] Helpful error message
- [ ] Retry button
- [ ] Help link (where applicable)

---

### 5.2 Error Codes

Add error codes for debugging:

- [ ] Network errors
- [ ] Validation errors
- [ ] Transaction errors

---

## 6. Mobile Optimization

### 6.1 Touch Targets

- [ ] Ensure all buttons are at least 44x44px
- [ ] Add touch feedback (scale on press)
- [ ] Test on mobile devices

---

### 6.2 Swipe Gestures (Optional)

- [ ] Swipe to navigate back
- [ ] Pull to refresh on lists

---

## 7. Implementation Checklist

### Keyboard Navigation

- [ ] Create `useKeyboardShortcuts` composable
- [ ] Create `KeyboardShortcutsModal` component
- [ ] Register global shortcuts in `app.vue`
- [ ] Test all shortcuts work
- [ ] Test shortcuts don't fire in inputs

### Accessibility

- [ ] Create `SkipLinks` component
- [ ] Add to `layouts/default.vue`
- [ ] Create `useFocusManagement` composable
- [ ] Add ARIA labels to interactive elements
- [ ] Run axe accessibility audit
- [ ] Fix any issues found

### Performance

- [ ] Add virtual scrolling to history page
- [ ] Lazy load heavy components
- [ ] Optimize images
- [ ] Run Lighthouse audit
- [ ] Fix any performance issues

### Loading States

- [ ] Verify all pages have loading states
- [ ] Add skeleton variants where missing
- [ ] Test loading states display correctly

### Error Handling

- [ ] Verify all pages have error states
- [ ] Add retry functionality everywhere
- [ ] Add help links for common errors

### Mobile

- [ ] Audit touch target sizes
- [ ] Add touch feedback
- [ ] Test on mobile devices
- [ ] Test on various screen sizes

---

## 8. Testing

### Accessibility Testing

- [ ] Run axe-core audit
- [ ] Test with keyboard only
- [ ] Test with screen reader (VoiceOver)
- [ ] Verify color contrast

### Performance Testing

- [ ] Run Lighthouse audit
- [ ] Target score > 90
- [ ] Check bundle size
- [ ] Check initial load time

### Mobile Testing

- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Test on various screen sizes
- [ ] Test touch interactions

---

## 9. Audit Checklist

### WCAG AA Compliance

- [ ] 1.1.1 Non-text Content - Alt text for images
- [ ] 1.3.1 Info and Relationships - Semantic HTML
- [ ] 1.4.3 Contrast (Minimum) - 4.5:1 for text
- [ ] 2.1.1 Keyboard - All functionality via keyboard
- [ ] 2.1.2 No Keyboard Trap - Can escape all elements
- [ ] 2.4.1 Bypass Blocks - Skip links
- [ ] 2.4.3 Focus Order - Logical tab order
- [ ] 2.4.7 Focus Visible - Visible focus indicators
- [ ] 3.3.1 Error Identification - Clear error messages
- [ ] 4.1.2 Name, Role, Value - ARIA labels

---

## 8. Transaction Confirmation Flow

### 8.1 Confirmation Modal

Add dedicated confirmation step before sending:

- [ ] Create `SendConfirmationModal.vue` component
- [ ] Show recipient (with contact name if known)
- [ ] Show amount with fiat equivalent (optional)
- [ ] Show fee breakdown
- [ ] Show total deduction
- [ ] Show estimated confirmation time
- [ ] "Edit" button to go back
- [ ] "Confirm & Send" button

### 8.2 Success State Enhancement

Improve post-transaction experience:

- [ ] Add celebration animation (confetti or checkmark animation)
- [ ] Add "Share Receipt" button
- [ ] Prompt to save new recipient as contact
- [ ] Show estimated confirmation time
- [ ] Add "View in Explorer" link

---

## 9. Contact Activity Integration

### 9.1 Per-Contact Transaction History

Show transaction history with each contact:

- [ ] Add "View History" action on contact card
- [ ] Show last transaction date on contact list item
- [ ] Display total sent/received with contact
- [ ] Add quick stats (# of transactions, total amount)

### 9.2 Contact Detail Enhancement

- [ ] Show transaction summary in contact detail slideover
- [ ] Add "Recent Transactions" section
- [ ] Show shared wallets with this contact (if any)

---

## 10. Unified Activity Feed

### 10.1 Home Page Activity

Consolidate activity from all sources:

- [ ] Show wallet transactions
- [ ] Show P2P events (signing requests, sessions)
- [ ] Show RANK votes
- [ ] Show shared wallet activity
- [ ] Unified timeline with filtering

### 10.2 Activity Types

- [ ] Transaction sent/received
- [ ] Signing request received
- [ ] Signing session completed
- [ ] Vote cast
- [ ] Contact added
- [ ] Shared wallet funded

---

_End of Phase 4_
