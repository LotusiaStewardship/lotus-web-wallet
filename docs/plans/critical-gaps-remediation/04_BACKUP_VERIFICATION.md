# Phase 4: Backup Verification Integration

## Overview

Ensure the backup verification flow is fully integrated into the backup page, prompting users to verify their seed phrase after viewing it.

**Priority**: P1
**Estimated Effort**: 0.5 days
**Dependencies**: Existing VerifyBackup component

---

## Problem Statement

The backup page shows the seed phrase, and a `VerifyBackup.vue` component exists, but the verification flow may not be fully integrated. Users should be prompted to verify their backup to ensure they've correctly recorded their seed phrase.

---

## Current State

- `pages/settings/backup.vue` - Shows seed phrase
- `components/settings/VerifyBackup.vue` - Verification component exists
- `components/onboarding/VerifyStep.vue` - Onboarding verification exists

The backup page needs to:

1. Track whether the user has verified their backup
2. Prompt verification after viewing
3. Show "Verified" status if already verified

---

## Implementation

### Task 4.1: Integrate Verification into Backup Page

**File**: `pages/settings/backup.vue`

Ensure the backup page includes verification flow:

```vue
<script setup lang="ts">
// Add to existing script
const isVerified = ref(false)
const showVerification = ref(false)

// Check verification status on mount
onMounted(() => {
  isVerified.value = localStorage.getItem('lotus-backup-verified') === 'true'
})

// Handle verification complete
function handleVerificationComplete() {
  isVerified.value = true
  localStorage.setItem('lotus-backup-verified', 'true')
  showVerification.value = false

  toast.add({
    title: 'Backup Verified',
    description: 'Your seed phrase backup has been verified',
    color: 'success',
  })
}

// Prompt verification after viewing
function promptVerification() {
  showVerification.value = true
}
</script>

<template>
  <!-- Add after seed phrase display -->

  <!-- Verification Status -->
  <UiAppCard v-if="!showVerification">
    <div class="flex items-center gap-4">
      <div
        class="w-12 h-12 rounded-xl flex items-center justify-center"
        :class="isVerified ? 'bg-success/10' : 'bg-warning/10'"
      >
        <UIcon
          :name="isVerified ? 'i-lucide-shield-check' : 'i-lucide-shield-alert'"
          class="w-6 h-6"
          :class="isVerified ? 'text-success' : 'text-warning'"
        />
      </div>
      <div class="flex-1">
        <div class="font-medium">
          {{ isVerified ? 'Backup Verified' : 'Backup Not Verified' }}
        </div>
        <div class="text-sm text-muted">
          {{
            isVerified
              ? 'You have verified your seed phrase backup'
              : 'Verify your backup to ensure you recorded it correctly'
          }}
        </div>
      </div>
      <UButton v-if="!isVerified" color="primary" @click="promptVerification">
        Verify Now
      </UButton>
      <UButton
        v-else
        color="neutral"
        variant="outline"
        @click="promptVerification"
      >
        Re-verify
      </UButton>
    </div>
  </UiAppCard>

  <!-- Verification Flow -->
  <SettingsVerifyBackup
    v-if="showVerification"
    :mnemonic="mnemonic"
    @complete="handleVerificationComplete"
    @cancel="showVerification = false"
  />
</template>
```

---

### Task 4.2: Ensure VerifyBackup Component Works

**File**: `components/settings/VerifyBackup.vue`

Verify the component has the correct interface:

```vue
<script setup lang="ts">
/**
 * VerifyBackup
 *
 * Prompts user to verify their seed phrase by selecting words.
 */
const props = defineProps<{
  mnemonic: string
}>()

const emit = defineEmits<{
  complete: []
  cancel: []
}>()

// Parse mnemonic into words
const words = computed(() => props.mnemonic.split(' '))

// Select 3 random word indices to verify
const verifyIndices = ref<number[]>([])
const userAnswers = ref<Record<number, string>>({})
const showError = ref(false)

onMounted(() => {
  // Pick 3 random indices
  const indices: number[] = []
  while (indices.length < 3) {
    const idx = Math.floor(Math.random() * words.value.length)
    if (!indices.includes(idx)) {
      indices.push(idx)
    }
  }
  verifyIndices.value = indices.sort((a, b) => a - b)
})

// Check if all answers are correct
const allCorrect = computed(() => {
  return verifyIndices.value.every(
    idx =>
      userAnswers.value[idx]?.toLowerCase() === words.value[idx].toLowerCase(),
  )
})

// Verify answers
function verify() {
  if (allCorrect.value) {
    emit('complete')
  } else {
    showError.value = true
  }
}
</script>

<template>
  <UiAppCard title="Verify Your Backup" icon="i-lucide-shield-check">
    <p class="text-sm text-muted mb-4">
      Enter the following words from your seed phrase to verify you've recorded
      it correctly.
    </p>

    <div class="space-y-4">
      <UFormField
        v-for="idx in verifyIndices"
        :key="idx"
        :label="`Word #${idx + 1}`"
      >
        <UInput
          v-model="userAnswers[idx]"
          :placeholder="`Enter word ${idx + 1}`"
          @input="showError = false"
        />
      </UFormField>
    </div>

    <UAlert
      v-if="showError"
      color="error"
      icon="i-lucide-alert-circle"
      class="mt-4"
    >
      <template #description>
        One or more words are incorrect. Please check your backup and try again.
      </template>
    </UAlert>

    <div class="flex gap-3 mt-4">
      <UButton
        color="neutral"
        variant="outline"
        class="flex-1"
        @click="emit('cancel')"
      >
        Cancel
      </UButton>
      <UButton color="primary" class="flex-1" @click="verify"> Verify </UButton>
    </div>
  </UiAppCard>
</template>
```

---

### Task 4.3: Add Backup Reminder Banner

**File**: `components/layout/BackupReminder.vue`

Create a reminder banner for unverified backups:

```vue
<script setup lang="ts">
/**
 * BackupReminder
 *
 * Shows a reminder banner if backup is not verified.
 */
const isVerified = ref(true)
const isDismissed = ref(false)

onMounted(() => {
  isVerified.value = localStorage.getItem('lotus-backup-verified') === 'true'
  isDismissed.value =
    sessionStorage.getItem('backup-reminder-dismissed') === 'true'
})

function dismiss() {
  isDismissed.value = true
  sessionStorage.setItem('backup-reminder-dismissed', 'true')
}
</script>

<template>
  <div
    v-if="!isVerified && !isDismissed"
    class="bg-warning/10 border-b border-warning/20 px-4 py-2"
  >
    <div class="flex items-center justify-between max-w-4xl mx-auto">
      <div class="flex items-center gap-2 text-sm">
        <UIcon name="i-lucide-shield-alert" class="w-4 h-4 text-warning" />
        <span>Your wallet backup is not verified.</span>
        <NuxtLink
          to="/settings/backup"
          class="text-primary font-medium hover:underline"
        >
          Verify now
        </NuxtLink>
      </div>
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="xs"
        @click="dismiss"
      />
    </div>
  </div>
</template>
```

---

## Verification Checklist

- [ ] Backup page shows verification status
- [ ] "Verify Now" button opens verification flow
- [ ] Verification asks for 3 random words
- [ ] Correct answers mark backup as verified
- [ ] Incorrect answers show error message
- [ ] Verified status persists across sessions
- [ ] Backup reminder banner shows for unverified wallets

---

## Notes

- Consider resetting verification status if seed phrase changes
- The reminder banner should not be too intrusive
- Allow re-verification for users who want to double-check

---

_Phase 4 of Critical Gaps Remediation Plan_
