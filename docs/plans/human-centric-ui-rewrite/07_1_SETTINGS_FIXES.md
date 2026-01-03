# Phase 7.1: Settings Page Fixes

> Remediation document for issues identified in Phase 7 Settings implementation.
> Created: December 2024

---

## Issues Identified

### Issue 1: Missing Wallet Restore Option

**Problem**: The Settings page has "Backup Recovery Phrase" and "View Recovery Phrase" options, but no "Restore Wallet" option. Users need the ability to restore a wallet from an existing recovery phrase.

**Root Cause**: The Phase 7 implementation focused on backup/view but omitted the restore flow.

**Solution**: Add a "Restore Wallet" option in the Wallet section that opens a `RestoreWalletModal` component. This modal should:

1. Accept a 12-word recovery phrase input
2. Validate the phrase using `walletStore.isValidSeedPhrase()`
3. Warn user that this will replace the current wallet
4. Call `walletStore.restoreWallet(seedPhrase)` on confirmation

**Files to Create/Modify**:

- Create `components/settings/RestoreWalletModal.vue`
- Modify `pages/settings/index.vue` to add restore option and modal

---

### Issue 2: Settings Toggles Lose State on Navigation

**Problem**: When navigating away from Settings and back, toggles like "Enable P2P Networking" show the opposite state.

**Root Cause**: The Settings page initializes toggle refs with store values at component mount time:

```typescript
const p2pEnabled = ref(p2pStore.settings.autoConnect)
const signerEnabled = ref(musig2Store.signerEnabled)
```

However:

1. `p2pStore.settings` is not loaded from storage until `loadSettings()` is called
2. The refs are initialized once and don't react to store changes
3. The watchers trigger on initial mount, causing unintended side effects

**Solution**:

1. Use `computed` with getter/setter pattern instead of `ref` + `watch`
2. Ensure P2P store loads settings on app initialization
3. Add `loadSettings()` call in `app.vue` during initialization

**Files to Modify**:

- `pages/settings/index.vue` - Change refs to computed with getter/setter
- `app.vue` - Add P2P settings loading during initialization

---

### Issue 3: Connected/Offline Indicator in Navbar

**Problem**: The navbar shows "Connected"/"Offline" indicator but:

1. It's unclear what this represents (Chronik? P2P? Both?)
2. Clicking on it does nothing

**Root Cause**: The indicator uses `walletStore.connected` which tracks Chronik WebSocket connection status. This is correct but:

1. The label is ambiguous
2. There's no interaction or tooltip explaining what it means

**Solution**:

1. Add a tooltip explaining the connection status
2. Make it clickable to navigate to Settings > Network section
3. Consider showing both Chronik and P2P status if P2P is enabled

**Files to Modify**:

- `layouts/default.vue` - Add tooltip and click handler to connection indicator

---

### Issue 4: Advertise as Signer Errors (MuSig2 not initialized)

**Problem**: Enabling "Advertise as Signer" throws error: `MuSig2 not initialized`

**Root Cause**: The watcher in Settings page calls `musig2Store.advertiseSigner()` which requires:

1. P2P to be initialized first
2. MuSig2 to be initialized (which depends on P2P)

The current flow doesn't ensure these dependencies are met before allowing the toggle.

**Solution**:

1. Add initialization checks before enabling signer advertising
2. Initialize MuSig2 if P2P is connected but MuSig2 isn't initialized
3. Show appropriate error/loading state if dependencies aren't met
4. Consider auto-initializing MuSig2 when P2P connects

**Files to Modify**:

- `pages/settings/index.vue` - Add dependency checks and proper initialization flow
- `app.vue` - Consider initializing MuSig2 after P2P if settings indicate it should be enabled

---

### Issue 5: Settings State Not Restored on App Mount

**Problem**: Settings like "P2P enabled" and "Signer enabled" are not properly restored when the app loads.

**Root Cause**: The app initialization in `app.vue` only initializes:

1. `onboardingStore.initialize()`
2. `notificationStore.initialize()`
3. `walletStore.initialize()`

It does NOT:

1. Load P2P settings from storage
2. Auto-connect P2P if `autoConnect` setting is true
3. Initialize MuSig2 if signer was previously enabled
4. Load other persisted settings (hideBalance, etc.)

**Solution**: Create a comprehensive settings initialization flow:

1. Create a `stores/settings.ts` store to centralize UI settings (hideBalance, etc.)
2. In `app.vue`, after wallet initialization:
   - Load P2P settings: `p2pStore.loadSettings()`
   - If `p2pStore.settings.autoConnect`, initialize P2P
   - If P2P connected and signer was enabled, initialize MuSig2

**Files to Create/Modify**:

- Create `stores/settings.ts` for UI settings persistence
- Modify `app.vue` to add comprehensive initialization
- Modify `pages/settings/index.vue` to use centralized settings store

---

## Implementation Plan

### Step 1: Create Settings Store

Create `stores/settings.ts` to centralize UI settings:

- `hideBalance: boolean`
- Persistence via localStorage
- `initialize()` method to load from storage

### Step 2: Fix App Initialization

Modify `app.vue` to:

1. Load P2P settings early
2. Conditionally initialize P2P based on `autoConnect`
3. Conditionally initialize MuSig2 based on saved signer config

### Step 3: Fix Settings Page Toggles

Modify `pages/settings/index.vue`:

1. Replace `ref` + `watch` with `computed` getter/setter
2. Add proper dependency checks for MuSig2
3. Use settings store for UI settings

### Step 4: Create RestoreWalletModal

Create `components/settings/RestoreWalletModal.vue`:

1. Multi-step flow: warning → input → confirm → success
2. Validate phrase before allowing restore
3. Clear warning about replacing current wallet

### Step 5: Fix Navbar Connection Indicator

Modify `layouts/default.vue`:

1. Add tooltip explaining connection status
2. Make clickable to navigate to Settings

### Step 6: Update Settings Page

Add restore option and integrate all fixes.

---

## Verification Checklist

- [ ] Restore wallet flow works end-to-end
- [ ] P2P toggle state persists across navigation
- [ ] Signer toggle state persists across navigation
- [ ] Hide balance toggle state persists across navigation
- [ ] Theme selection persists across navigation
- [ ] P2P auto-connects on app load if setting enabled
- [ ] MuSig2 initializes properly when signer toggle enabled
- [ ] Connection indicator has tooltip
- [ ] Connection indicator is clickable
- [ ] No console errors when toggling settings

---

## Files Summary

**Create**:

- `stores/settings.ts`
- `components/settings/RestoreWalletModal.vue`

**Modify**:

- `app.vue`
- `pages/settings/index.vue`
- `layouts/default.vue`
