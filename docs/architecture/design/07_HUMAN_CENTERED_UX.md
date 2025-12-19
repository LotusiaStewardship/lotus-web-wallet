# Human-Centered UX Principles

**Version**: 1.1.0  
**Date**: December 2024  
**Status**: Active  
**Priority**: CRITICAL DESIGN PREREQUISITE

---

## Executive Summary

Every feature in the Lotus Web Wallet **MUST** be designed with human-centered UX as a critical prerequisite. This document establishes the UX principles that prevent confusing average users while providing avenues to satisfy tech-savvy users.

**Core Mandate**: No feature ships without answering these four questions:

1. **"What can I do here?"** — Clear purpose and value proposition
2. **"How do I do it?"** — Obvious, intuitive actions
3. **"Did it work?"** — Clear feedback and confirmation
4. **"What went wrong?"** — Actionable error recovery

---

## The Problem We're Solving

Previous implementations suffered from:

```
┌─────────────────────────────────────────────────────────────────┐
│                    UX ANTI-PATTERNS (AVOID)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ❌ TECHNICAL JARGON                                             │
│     "UTXOs: 12" → User: "What's a UTXO?"                        │
│     "DHT Ready" → User: "Is that good or bad?"                  │
│     "PeerId: 12D3KooW..." → User: "Who is this?"                │
│                                                                  │
│  ❌ MISSING MENTAL MODELS                                        │
│     "Available Signers" → User: "Why would I need a signer?"    │
│     "P2P Network" → User: "What can I do here?"                 │
│     "MuSig2" → User: "Is this safe?"                            │
│                                                                  │
│  ❌ INCOMPLETE FLOWS                                             │
│     Request sent → No status tracking                           │
│     Error occurred → No retry option                            │
│     Action completed → No next steps                            │
│                                                                  │
│  ❌ HIDDEN FEATURES                                              │
│     "Become a Signer" buried in settings                        │
│     Advanced options require prior knowledge                    │
│     Power features undiscoverable                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core UX Principles

### Principle 1: Progressive Disclosure

**Simple by default, powerful when needed.**

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROGRESSIVE DISCLOSURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LEVEL 1: ESSENTIAL (Always Visible)                             │
│  ─────────────────────────────────────                           │
│  • Primary action (Send, Receive, etc.)                          │
│  • Key information (Balance, Status)                             │
│  • Clear feedback (Success, Error)                               │
│                                                                  │
│  LEVEL 2: CONTEXTUAL (Visible When Relevant)                     │
│  ─────────────────────────────────────────                       │
│  • Secondary actions (Edit, Delete)                              │
│  • Additional details (Transaction ID)                           │
│  • Related features (Add to Contacts)                            │
│                                                                  │
│  LEVEL 3: ADVANCED (On Demand)                                   │
│  ─────────────────────────────                                   │
│  • Technical details (Raw TX, UTXOs)                             │
│  • Power user options (Custom fees)                              │
│  • Developer tools (JSON view)                                   │
│                                                                  │
│  IMPLEMENTATION:                                                 │
│  • Use "Show details" / "Advanced" toggles                       │
│  • Remember user preferences                                     │
│  • Never require advanced knowledge for basic tasks              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation Pattern**:

```typescript
// Progressive disclosure in components
interface ProgressiveDisclosureProps {
  // Level 1: Always shown
  primaryContent: ReactNode

  // Level 2: Shown on hover/expand
  secondaryContent?: ReactNode

  // Level 3: Shown via toggle
  advancedContent?: ReactNode
  showAdvanced?: boolean
}
```

---

### Principle 2: User-Friendly Language

**Translate technical concepts into human terms.**

| Technical Term | User-Friendly Alternative            | Context            |
| -------------- | ------------------------------------ | ------------------ |
| UTXO           | "Coin" or hide entirely              | Balance display    |
| DHT            | "Network" or "Discovery"             | P2P status         |
| PeerId         | Contact name or "Anonymous"          | Peer display       |
| MuSig2         | "Shared Wallet" or "Multi-signature" | Feature name       |
| Signer         | "Co-signer" or "Participant"         | Shared wallets     |
| Public Key     | "Wallet ID" or hide behind address   | Contact form       |
| Mempool        | "Pending"                            | Transaction status |
| Block Height   | "Network Status" or hide             | Stats display      |

**Implementation Pattern**:

```typescript
// User-friendly terminology helper
const userFriendlyTerms = {
  // Technical → User-friendly
  utxo: 'coin',
  utxos: 'coins',
  dht: 'network',
  peerId: 'wallet ID',
  publicKey: 'wallet address',
  musig2: 'shared wallet',
  signer: 'co-signer',
  mempool: 'pending transactions',
}

// Use in UI
function formatTechnicalTerm(term: string, showTechnical = false): string {
  if (showTechnical) return term
  return userFriendlyTerms[term.toLowerCase()] || term
}
```

---

### Principle 3: Mental Model Establishment

**Users must understand WHAT something is before HOW to use it.**

```
┌─────────────────────────────────────────────────────────────────┐
│                    MENTAL MODEL PATTERN                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BEFORE SHOWING A FEATURE, ANSWER:                               │
│                                                                  │
│  1. WHAT is this?                                                │
│     "Shared Wallets let you create a wallet that requires        │
│      multiple people to approve transactions."                   │
│                                                                  │
│  2. WHY would I use it?                                          │
│     "Perfect for: Family savings, Business accounts,             │
│      Extra security for large amounts."                          │
│                                                                  │
│  3. HOW does it work?                                            │
│     "1. Select co-signers from your contacts                     │
│      2. Create the shared wallet                                 │
│      3. All co-signers must approve each transaction"            │
│                                                                  │
│  4. IS IT SAFE?                                                  │
│     "Your funds are protected by cryptography.                   │
│      No single person can spend without others' approval."       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation Pattern**:

```vue
<!-- First-time feature introduction -->
<template>
  <div v-if="isFirstVisit" class="feature-intro">
    <h2>{{ feature.title }}</h2>
    <p class="what">{{ feature.description }}</p>

    <div class="use-cases">
      <h3>Perfect for:</h3>
      <ul>
        <li v-for="useCase in feature.useCases" :key="useCase">
          {{ useCase }}
        </li>
      </ul>
    </div>

    <div class="how-it-works">
      <h3>How it works:</h3>
      <ol>
        <li v-for="step in feature.steps" :key="step">
          {{ step }}
        </li>
      </ol>
    </div>

    <UButton @click="dismissIntro">Got it, let's go!</UButton>
    <UCheckbox v-model="dontShowAgain">Don't show this again</UCheckbox>
  </div>
</template>
```

---

### Principle 4: Complete Feedback Loops

**Every action must have clear feedback and next steps.**

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEEDBACK LOOP PATTERN                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ACTION INITIATED                                                │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────┐                                                │
│  │  LOADING    │  "Sending transaction..."                      │
│  │  STATE      │  [Cancel] if possible                          │
│  └──────┬──────┘                                                │
│         │                                                        │
│    ┌────┴────┐                                                  │
│    ▼         ▼                                                  │
│  SUCCESS   FAILURE                                               │
│    │         │                                                   │
│    ▼         ▼                                                   │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │ ✓ Sent!    │  │ ✗ Failed   │                                │
│  │            │  │            │                                 │
│  │ Next steps:│  │ What went  │                                │
│  │ • View tx  │  │ wrong:     │                                │
│  │ • Send more│  │ [Specific  │                                │
│  │ • Add to   │  │  error]    │                                │
│  │   contacts │  │            │                                │
│  │            │  │ [Retry]    │                                │
│  │ [Share]    │  │ [Get Help] │                                │
│  └─────────────┘  └─────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation Pattern**:

```typescript
// Complete feedback for async actions
interface ActionFeedback {
  // Loading state
  loading: {
    message: string
    canCancel?: boolean
  }

  // Success state
  success: {
    title: string
    message: string
    celebration?: 'confetti' | 'checkmark' | 'none'
    nextActions: Array<{
      label: string
      action: () => void
      primary?: boolean
    }>
  }

  // Error state
  error: {
    title: string
    message: string // User-friendly, not technical
    technicalDetails?: string // For "Show details"
    actions: Array<{
      label: string
      action: () => void
    }>
  }
}
```

---

### Principle 5: Contextual Help

**Help users where they are, not in a separate docs page.**

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXTUAL HELP TYPES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TOOLTIPS (Hover/Focus)                                          │
│  ─────────────────────                                           │
│  • Brief explanations (1-2 sentences)                            │
│  • Technical term definitions                                    │
│  • Icon meanings                                                 │
│                                                                  │
│  INLINE HINTS (Always Visible)                                   │
│  ─────────────────────────────                                   │
│  • Form field guidance                                           │
│  • Format requirements                                           │
│  • Validation feedback                                           │
│                                                                  │
│  EXPANDABLE HELP (On Demand)                                     │
│  ───────────────────────────                                     │
│  • "Learn more" links                                            │
│  • Step-by-step guides                                           │
│  • Video tutorials                                               │
│                                                                  │
│  EMPTY STATE GUIDANCE                                            │
│  ─────────────────────                                           │
│  • What to do when list is empty                                 │
│  • How to get started                                            │
│  • Why something might be empty                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation Pattern**:

```vue
<!-- Contextual help component -->
<template>
  <div class="form-field">
    <label>
      {{ label }}
      <UTooltip v-if="tooltip" :text="tooltip">
        <UIcon name="i-lucide-help-circle" class="help-icon" />
      </UTooltip>
    </label>

    <input v-model="value" />

    <p v-if="hint" class="hint">{{ hint }}</p>

    <p v-if="error" class="error">
      {{ error }}
      <button v-if="errorHelp" @click="showHelp">How to fix this</button>
    </p>
  </div>
</template>
```

---

### Principle 6: Dual-Track Design

**Serve both average users AND power users.**

```
┌─────────────────────────────────────────────────────────────────┐
│                    DUAL-TRACK DESIGN                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AVERAGE USER PATH                    POWER USER PATH            │
│  ─────────────────                    ───────────────            │
│                                                                  │
│  Simple interface                     Advanced options           │
│  • Big, clear buttons                 • Keyboard shortcuts       │
│  • Guided flows                       • Batch operations         │
│  • Sensible defaults                  • Custom parameters        │
│  • Minimal choices                    • Raw data access          │
│                                                                  │
│  Example: Send Transaction                                       │
│  ─────────────────────────                                       │
│                                                                  │
│  AVERAGE USER:                        POWER USER:                │
│  ┌─────────────────┐                  ┌─────────────────┐       │
│  │ To: [Alice    ▼]│                  │ To: [Address   ]│       │
│  │ Amount: [100   ]│                  │ Amount: [100   ]│       │
│  │                 │                  │ Fee: [Custom  ▼]│       │
│  │ [Send]          │                  │ UTXO: [Select ▼]│       │
│  └─────────────────┘                  │ OP_RETURN: [   ]│       │
│                                       │ [Preview Raw TX]│       │
│  Fee: Auto-calculated                 │ [Send]          │       │
│  UTXOs: Auto-selected                 └─────────────────┘       │
│                                                                  │
│  TOGGLE: [Simple] ←→ [Advanced]                                  │
│  Remember preference per user                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Principle 8: Respect User Autonomy (Anti-Annoyance)

**Help users learn, then get out of their way.**

While guidance is important for new users, excessive hand-holding annoys experienced users. Every explanatory UI element must be **dismissible** with user preferences **persisted**.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANTI-ANNOYANCE PRINCIPLE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  THE BALANCE:                                                    │
│  ─────────────                                                   │
│                                                                  │
│  TOO LITTLE HELP          JUST RIGHT           TOO MUCH HELP    │
│  ───────────────          ──────────           ──────────────   │
│  • No onboarding          • First-time help    • Repeated popups│
│  • No explanations        • Dismissible tips   • Forced tutorials│
│  • Sink or swim           • "Don't show again" • Blocking modals│
│  • Users confused         • Users empowered    • Users annoyed  │
│                                                                  │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  RULE: Every educational/protective UI element MUST have:        │
│                                                                  │
│  1. ☐ "Don't show this again" checkbox                          │
│  2. ☐ Preference persisted to localStorage                       │
│  3. ☐ Way to re-enable in Settings if user changes mind          │
│  4. ☐ Graceful degradation (feature works without the prompt)    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Dismissible UI Categories**:

| UI Element                      | Dismissible? | Persistence Key Example             |
| ------------------------------- | ------------ | ----------------------------------- |
| Feature introduction modals     | ✅ Yes       | `ux:dismissed:intro:sharedWallets`  |
| Onboarding tooltips             | ✅ Yes       | `ux:dismissed:tooltip:p2pExplainer` |
| Warning banners (informational) | ✅ Yes       | `ux:dismissed:warning:addressReuse` |
| Empty state guidance            | ✅ Yes       | `ux:dismissed:emptyState:contacts`  |
| "What's new" announcements      | ✅ Yes       | `ux:dismissed:whatsNew:v1.2.0`      |
| Security confirmations          | ❌ No        | N/A (always show for safety)        |
| Transaction confirmations       | ❌ No        | N/A (always show for safety)        |
| Error messages                  | ❌ No        | N/A (always show)                   |

**Implementation Pattern**:

```typescript
// composables/useDismissible.ts

const STORAGE_PREFIX = 'ux:dismissed:'

export function useDismissible(key: string) {
  const storageKey = `${STORAGE_PREFIX}${key}`

  const isDismissed = ref(localStorage.getItem(storageKey) === 'true')

  function dismiss(dontShowAgain: boolean = true) {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, 'true')
      isDismissed.value = true
    }
  }

  function reset() {
    localStorage.removeItem(storageKey)
    isDismissed.value = false
  }

  return {
    isDismissed: readonly(isDismissed),
    dismiss,
    reset,
  }
}

// Usage in component
const { isDismissed, dismiss } = useDismissible('intro:sharedWallets')
```

```vue
<!-- Dismissible introduction modal -->
<template>
  <UModal v-if="!isDismissed" @close="dismiss(dontShowAgain)">
    <div class="intro-content">
      <h2>Welcome to Shared Wallets</h2>
      <p>Create wallets that require multiple approvals...</p>

      <div class="actions">
        <UCheckbox v-model="dontShowAgain"> Don't show this again </UCheckbox>
        <UButton @click="dismiss(dontShowAgain)"> Got it! </UButton>
      </div>
    </div>
  </UModal>
</template>

<script setup>
const { isDismissed, dismiss } = useDismissible('intro:sharedWallets')
const dontShowAgain = ref(false)
</script>
```

**Settings Integration**:

```vue
<!-- In Settings > Preferences -->
<template>
  <div class="dismissed-prompts-settings">
    <h3>Dismissed Prompts</h3>
    <p class="hint">
      You've dismissed some helpful prompts. Re-enable them here if you'd like
      to see them again.
    </p>

    <div v-for="prompt in dismissedPrompts" :key="prompt.key">
      <div class="prompt-item">
        <span>{{ prompt.label }}</span>
        <UButton size="xs" @click="resetPrompt(prompt.key)">
          Show again
        </UButton>
      </div>
    </div>

    <UButton v-if="dismissedPrompts.length" @click="resetAllPrompts">
      Reset all prompts
    </UButton>
  </div>
</template>
```

---

### Principle 9: Consistent Patterns

**Same action = Same interaction everywhere.**

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONSISTENCY REQUIREMENTS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  VISUAL CONSISTENCY                                              │
│  ──────────────────                                              │
│  • Same icons for same actions across app                        │
│  • Same colors for same meanings (green=success, red=error)      │
│  • Same component styles (buttons, cards, modals)                │
│                                                                  │
│  INTERACTION CONSISTENCY                                         │
│  ───────────────────────                                         │
│  • Same gestures for same actions                                │
│  • Same keyboard shortcuts                                       │
│  • Same confirmation patterns                                    │
│                                                                  │
│  LANGUAGE CONSISTENCY                                            │
│  ────────────────────                                            │
│  • Same terms for same concepts                                  │
│  • Same tone of voice                                            │
│  • Same error message format                                     │
│                                                                  │
│  LAYOUT CONSISTENCY                                              │
│  ──────────────────                                              │
│  • Primary action always in same position                        │
│  • Navigation always in same place                               │
│  • Feedback always appears same way                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## UX Checklist for New Features

Before implementing any feature, complete this checklist:

### Pre-Implementation

- [ ] **Mental Model**: Can a non-technical user understand what this feature does?
- [ ] **Value Proposition**: Is it clear WHY someone would use this?
- [ ] **Entry Point**: Is the feature discoverable from logical places?
- [ ] **Language**: Are all labels and messages user-friendly?

### During Implementation

- [ ] **Loading States**: Does every async action show loading feedback?
- [ ] **Empty States**: What does the user see when there's no data?
- [ ] **Error States**: Are errors actionable with retry options?
- [ ] **Success States**: Is there clear confirmation and next steps?

### Progressive Disclosure

- [ ] **Default View**: Is the simple view sufficient for 80% of users?
- [ ] **Advanced View**: Can power users access additional options?
- [ ] **Preference Memory**: Does the app remember user preferences?

### Anti-Annoyance

- [ ] **Dismissible**: Can educational prompts be dismissed?
- [ ] **"Don't Show Again"**: Is there a checkbox to permanently dismiss?
- [ ] **Persistence**: Are dismissal preferences saved to localStorage?
- [ ] **Re-enable Path**: Can users re-enable dismissed prompts in Settings?

### Accessibility

- [ ] **Keyboard Navigation**: Can all actions be done via keyboard?
- [ ] **Screen Reader**: Are ARIA labels present?
- [ ] **Color Contrast**: Does it meet WCAG AA standards?
- [ ] **Touch Targets**: Are buttons at least 44x44px?

### Consistency

- [ ] **Visual**: Does it match existing design patterns?
- [ ] **Interaction**: Does it behave like similar features?
- [ ] **Language**: Does it use established terminology?

---

## Anti-Patterns to Avoid

### ❌ Never Do This

| Anti-Pattern                         | Why It's Bad                   | Do This Instead                       |
| ------------------------------------ | ------------------------------ | ------------------------------------- |
| Show raw error messages              | Confuses users                 | Translate to user-friendly message    |
| Technical jargon without explanation | Excludes non-technical users   | Use plain language + optional details |
| Dead-end errors                      | Users can't recover            | Always provide retry or alternative   |
| Hidden features                      | Users miss functionality       | Progressive disclosure with hints     |
| Inconsistent terminology             | Creates confusion              | Establish and follow glossary         |
| No loading feedback                  | Users think it's broken        | Always show loading state             |
| Silent failures                      | Users don't know what happened | Always show error feedback            |
| Assuming prior knowledge             | Excludes new users             | Provide contextual help               |
| **Non-dismissible prompts**          | **Annoys experienced users**   | **Add "Don't show again" option**     |
| **Repeated explanations**            | **Wastes user time**           | **Persist dismissal preferences**     |
| **Blocking modals for info**         | **Interrupts workflow**        | **Use inline hints or banners**       |
| **No way to re-enable help**         | **Users can't change mind**    | **Add reset option in Settings**      |

---

## Success Metrics

Track these metrics to measure UX quality:

### Engagement Metrics

- **Time to First Action**: How long until user completes first task?
- **Feature Discovery Rate**: % of users who find and use features
- **Task Completion Rate**: % of started tasks that complete successfully

### Error Metrics

- **Error Rate**: % of actions resulting in errors
- **Error Recovery Rate**: % of errors where user successfully retries
- **Abandonment Rate**: % of users who leave after error

### Satisfaction Metrics

- **Help Request Rate**: How often users need help (lower is better)
- **Return Rate**: Users coming back to use feature again
- **Feature Adoption**: % of users who use advanced features

---

## Integration with Design Philosophy

This document is a **critical prerequisite** for all other design documents:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DESIGN DOCUMENT HIERARCHY                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           07_HUMAN_CENTERED_UX.md (THIS DOCUMENT)        │    │
│  │                  CRITICAL PREREQUISITE                   │    │
│  │         All implementations MUST follow these rules      │    │
│  └────────────────────────────┬────────────────────────────┘    │
│                               │                                  │
│         ┌─────────────────────┼─────────────────────┐            │
│         │                     │                     │            │
│         ▼                     ▼                     ▼            │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      │
│  │ 00_PHILOSOPHY│      │01_IDENTITY  │      │02_CONTACTS  │      │
│  │ Contact-    │      │ Unified     │      │ System      │      │
│  │ Centric     │      │ Model       │      │ Design      │      │
│  └─────────────┘      └─────────────┘      └─────────────┘      │
│         │                     │                     │            │
│         └─────────────────────┼─────────────────────┘            │
│                               │                                  │
│                               ▼                                  │
│                    ┌─────────────────────┐                       │
│                    │   IMPLEMENTATION    │                       │
│                    │   Must satisfy:     │                       │
│                    │   • UX Principles   │                       │
│                    │   • Design Patterns │                       │
│                    │   • UX Checklist    │                       │
│                    └─────────────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary

Human-centered UX is not optional—it is a **critical design prerequisite**. Every feature must:

1. **Be understandable** to non-technical users
2. **Provide clear feedback** for all actions
3. **Offer recovery paths** for all errors
4. **Scale from simple to advanced** via progressive disclosure
5. **Maintain consistency** with established patterns
6. **Include contextual help** where users need it
7. **Respect user autonomy** with dismissible prompts and persisted preferences

**Remember**: Lotus is energy is money is time. We don't waste people's precious time with confusing interfaces OR excessive hand-holding.

---

_This document is referenced by all other design documents and must be consulted before any implementation._
