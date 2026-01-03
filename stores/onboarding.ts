/**
 * Onboarding Store
 *
 * Manages first-time user experience and feature discovery.
 *
 * Responsibilities:
 * - First-time user detection
 * - Onboarding step tracking
 * - Feature hints
 * - Backup reminders
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getItem, setItem, STORAGE_KEYS } from '~/utils/storage'

// ============================================================================
// Types
// ============================================================================

/**
 * Onboarding steps
 */
export type OnboardingStep =
  | 'welcome'
  | 'create_or_restore'
  | 'backup_seed'
  | 'verify_backup'
  | 'quick_tour'
  | 'first_receive'
  | 'first_send'
  | 'explore_features'
  | 'complete'

/**
 * Feature hint identifiers
 */
export type FeatureHint =
  | 'address_copy'
  | 'qr_code'
  | 'transaction_details'
  | 'coin_control'
  | 'contacts'
  | 'p2p_network'
  | 'musig2_signing'
  | 'explorer'
  | 'settings'

/**
 * Getting started checklist items
 */
export interface ChecklistState {
  /** Has user backed up their wallet */
  backup: boolean
  /** Has user added their first contact */
  addContact: boolean
  /** Has user received their first transaction */
  receiveFirst: boolean
  /** Has user sent their first transaction */
  sendFirst: boolean
}

/**
 * Onboarding store state
 */
export interface OnboardingState {
  /** Whether this is a first-time user */
  isFirstTime: boolean
  /** Whether onboarding is complete */
  onboardingComplete: boolean
  /** Current onboarding step */
  currentStep: OnboardingStep | null
  /** Completed steps */
  completedSteps: OnboardingStep[]
  /** Dismissed feature hints */
  dismissedHints: FeatureHint[]
  /** Whether seed backup is complete */
  backupComplete: boolean
  /** Last backup reminder timestamp */
  backupRemindedAt: number | null
  /** Whether user skipped onboarding */
  skipped: boolean
  /** Getting started checklist */
  checklist: ChecklistState
  /** Timestamp of first visit */
  firstVisit: number | null
}

// ============================================================================
// Constants
// ============================================================================

const BACKUP_REMINDER_INTERVAL = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Ordered list of onboarding steps
 */
const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'create_or_restore',
  'backup_seed',
  'verify_backup',
  'quick_tour',
  'first_receive',
  'first_send',
  'explore_features',
  'complete',
]

// ============================================================================
// Store Definition
// ============================================================================

export const useOnboardingStore = defineStore('onboarding', () => {
  // === STATE ===
  const isFirstTime = ref(true)
  const onboardingComplete = ref(false)
  const currentStep = ref<OnboardingStep | null>(null)
  const completedSteps = ref<OnboardingStep[]>([])
  const dismissedHints = ref<FeatureHint[]>([])
  const backupComplete = ref(false)
  const backupRemindedAt = ref<number | null>(null)
  const skipped = ref(false)
  const checklist = ref<ChecklistState>({
    backup: false,
    addContact: false,
    receiveFirst: false,
    sendFirst: false,
  })
  const firstVisit = ref<number | null>(null)

  // === GETTERS ===
  /**
   * Get progress percentage
   */
  const progressPercent = computed(() => {
    if (onboardingComplete.value) return 100
    const totalSteps = ONBOARDING_STEPS.length - 1 // Exclude 'complete'
    return Math.round((completedSteps.value.length / totalSteps) * 100)
  })

  /**
   * Get next step to complete
   */
  const nextStep = computed((): OnboardingStep | null => {
    if (onboardingComplete.value) return null
    for (const step of ONBOARDING_STEPS) {
      if (!completedSteps.value.includes(step)) {
        return step
      }
    }
    return null
  })

  /**
   * Check if should show backup reminder
   */
  const shouldShowBackupReminder = computed(() => {
    if (backupComplete.value) return false
    if (skipped.value) return false
    if (!backupRemindedAt.value) return true
    return Date.now() - backupRemindedAt.value > BACKUP_REMINDER_INTERVAL
  })

  /**
   * Check if onboarding is in progress
   */
  const isOnboarding = computed(() => {
    return (
      !onboardingComplete.value && !skipped.value && currentStep.value !== null
    )
  })

  /**
   * Check if onboarding modal should be shown
   * Used by onboarding/Modal.vue
   */
  const shouldShowOnboarding = computed(() => {
    return isFirstTime.value && !onboardingComplete.value && !skipped.value
  })

  /**
   * Get checklist progress
   */
  const checklistProgress = computed(() => {
    const items = Object.values(checklist.value)
    const completed = items.filter(Boolean).length
    return { completed, total: items.length }
  })

  /**
   * Check if checklist is complete
   */
  const isChecklistComplete = computed(() => {
    return Object.values(checklist.value).every(Boolean)
  })

  /**
   * Alias for backupComplete (for plan compatibility)
   */
  const backupVerified = computed(() => backupComplete.value)

  // === PARAMETERIZED GETTERS (as functions) ===
  /**
   * Check if a step is completed
   */
  function isStepCompleted(step: OnboardingStep): boolean {
    return completedSteps.value.includes(step)
  }

  /**
   * Check if a hint should be shown
   */
  function shouldShowHint(hint: FeatureHint): boolean {
    if (dismissedHints.value.includes(hint)) return false
    // Only show hints after onboarding or if skipped
    return onboardingComplete.value || skipped.value
  }

  /**
   * Check if a hint should be shown (string-based version)
   * Accepts any string ID for flexibility with new hints
   */
  function shouldShowHintById(hintId: string): boolean {
    // Check if it's a known FeatureHint
    const knownHints: string[] = [
      'address_copy',
      'qr_code',
      'transaction_details',
      'coin_control',
      'contacts',
      'p2p_network',
      'musig2_signing',
      'explorer',
      'settings',
    ]
    if (knownHints.includes(hintId)) {
      return shouldShowHint(hintId as FeatureHint)
    }
    // For unknown hints, check dismissedHints array as strings
    if ((dismissedHints.value as string[]).includes(hintId)) return false
    return onboardingComplete.value || skipped.value
  }

  // === ACTIONS ===
  // ========================================================================
  // Initialization
  // ========================================================================

  /**
   * Initialize onboarding state from storage
   */
  function initialize() {
    const saved = getItem<Partial<OnboardingState>>(
      STORAGE_KEYS.ONBOARDING_STATE,
      {},
    )

    if (Object.keys(saved).length > 0) {
      isFirstTime.value = saved.isFirstTime ?? true
      onboardingComplete.value = saved.onboardingComplete ?? false
      currentStep.value = saved.currentStep ?? null
      completedSteps.value = saved.completedSteps ?? []
      dismissedHints.value = saved.dismissedHints ?? []
      backupComplete.value = saved.backupComplete ?? false
      backupRemindedAt.value = saved.backupRemindedAt ?? null
      skipped.value = saved.skipped ?? false
      checklist.value = saved.checklist ?? {
        backup: false,
        addContact: false,
        receiveFirst: false,
        sendFirst: false,
      }
      firstVisit.value = saved.firstVisit ?? null
    } else {
      // First time user - record first visit
      firstVisit.value = Date.now()
      _save()
    }
  }

  // ========================================================================
  // Onboarding Flow
  // ========================================================================

  /**
   * Start onboarding flow
   */
  function startOnboarding() {
    isFirstTime.value = false
    currentStep.value = 'welcome'
    completedSteps.value = []
    skipped.value = false
    _save()
  }

  /**
   * Complete a step and advance to next
   */
  function completeStep(step: OnboardingStep) {
    if (!completedSteps.value.includes(step)) {
      completedSteps.value.push(step)
    }

    // Find next step
    const currentIndex = ONBOARDING_STEPS.indexOf(step)
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      currentStep.value = ONBOARDING_STEPS[currentIndex + 1]
    }

    // Check if complete
    if (
      step === 'complete' ||
      completedSteps.value.length >= ONBOARDING_STEPS.length - 1
    ) {
      onboardingComplete.value = true
      currentStep.value = null
    }

    _save()
  }

  /**
   * Go to a specific step
   */
  function goToStep(step: OnboardingStep) {
    currentStep.value = step
    _save()
  }

  /**
   * Skip onboarding
   */
  function skipOnboarding() {
    skipped.value = true
    currentStep.value = null
    isFirstTime.value = false
    _save()
  }

  /**
   * Skip a specific step (mark as complete and advance)
   * Used when user wants to skip backup or other optional steps
   */
  function skipStep(step: OnboardingStep) {
    // Track skipped backup attempts
    if (step === 'backup_seed' || step === 'verify_backup') {
      // Don't mark backup as complete when skipping
    }
    // Complete the step and advance
    completeStep(step)
  }

  /**
   * Reset onboarding (for testing or re-onboarding)
   */
  function resetOnboarding() {
    isFirstTime.value = true
    onboardingComplete.value = false
    currentStep.value = null
    completedSteps.value = []
    skipped.value = false
    _save()
  }

  // ========================================================================
  // Feature Hints
  // ========================================================================

  /**
   * Dismiss a feature hint
   */
  function dismissHint(hint: FeatureHint) {
    if (!dismissedHints.value.includes(hint)) {
      dismissedHints.value.push(hint)
      _save()
    }
  }

  /**
   * Dismiss a hint by string ID (for flexibility with new hints)
   * Used by onboarding/ContextualHint.vue
   */
  function dismissHintById(hintId: string) {
    // Check if it's a known FeatureHint
    const knownHints: FeatureHint[] = [
      'address_copy',
      'qr_code',
      'transaction_details',
      'coin_control',
      'contacts',
      'p2p_network',
      'musig2_signing',
      'explorer',
      'settings',
    ]
    if (knownHints.includes(hintId as FeatureHint)) {
      dismissHint(hintId as FeatureHint)
    } else {
      // For unknown hints, store as string (cast to any for flexibility)
      if (!(dismissedHints.value as string[]).includes(hintId)) {
        ;(dismissedHints.value as string[]).push(hintId)
        _save()
      }
    }
  }

  /**
   * Reset all hints (show them again)
   */
  function resetHints() {
    dismissedHints.value = []
    _save()
  }

  // ========================================================================
  // Backup
  // ========================================================================

  /**
   * Mark backup as complete
   */
  function markBackupComplete() {
    backupComplete.value = true
    checklist.value.backup = true
    _save()
  }

  // ========================================================================
  // Checklist
  // ========================================================================

  /**
   * Complete a checklist item
   */
  function completeChecklistItem(item: keyof ChecklistState) {
    checklist.value[item] = true
    _save()
  }

  /**
   * Alias for markBackupComplete (for plan compatibility)
   */
  function verifyBackup() {
    markBackupComplete()
  }

  /**
   * Snooze backup reminder
   */
  function snoozeBackupReminder() {
    backupRemindedAt.value = Date.now()
    _save()
  }

  /**
   * Reset backup status (e.g., after wallet restore)
   */
  function resetBackupStatus() {
    backupComplete.value = false
    backupRemindedAt.value = null
    _save()
  }

  // ========================================================================
  // Persistence
  // ========================================================================

  /**
   * Save state to localStorage
   */
  function _save() {
    setItem(STORAGE_KEYS.ONBOARDING_STATE, {
      isFirstTime: isFirstTime.value,
      onboardingComplete: onboardingComplete.value,
      currentStep: currentStep.value,
      completedSteps: completedSteps.value,
      dismissedHints: dismissedHints.value,
      backupComplete: backupComplete.value,
      backupRemindedAt: backupRemindedAt.value,
      skipped: skipped.value,
      checklist: checklist.value,
      firstVisit: firstVisit.value,
    })
  }

  // === RETURN ===
  return {
    // State
    isFirstTime,
    onboardingComplete,
    currentStep,
    completedSteps,
    dismissedHints,
    backupComplete,
    backupRemindedAt,
    skipped,
    checklist,
    firstVisit,
    // Getters
    progressPercent,
    nextStep,
    shouldShowBackupReminder,
    isOnboarding,
    shouldShowOnboarding,
    checklistProgress,
    isChecklistComplete,
    backupVerified,
    // Parameterized getters (functions)
    isStepCompleted,
    shouldShowHint,
    shouldShowHintById,
    // Actions
    initialize,
    startOnboarding,
    completeStep,
    goToStep,
    skipOnboarding,
    skipStep,
    resetOnboarding,
    dismissHint,
    dismissHintById,
    resetHints,
    markBackupComplete,
    completeChecklistItem,
    verifyBackup,
    snoozeBackupReminder,
    resetBackupStatus,
  }
})
