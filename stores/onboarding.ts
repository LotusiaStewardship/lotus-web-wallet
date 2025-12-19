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

export const useOnboardingStore = defineStore('onboarding', {
  state: (): OnboardingState => ({
    isFirstTime: true,
    onboardingComplete: false,
    currentStep: null,
    completedSteps: [],
    dismissedHints: [],
    backupComplete: false,
    backupRemindedAt: null,
    skipped: false,
    checklist: {
      backup: false,
      addContact: false,
      receiveFirst: false,
      sendFirst: false,
    },
    firstVisit: null,
  }),

  getters: {
    /**
     * Get progress percentage
     */
    progressPercent(): number {
      if (this.onboardingComplete) return 100
      const totalSteps = ONBOARDING_STEPS.length - 1 // Exclude 'complete'
      return Math.round((this.completedSteps.length / totalSteps) * 100)
    },

    /**
     * Check if a step is completed
     */
    isStepCompleted(): (step: OnboardingStep) => boolean {
      return (step: OnboardingStep) => this.completedSteps.includes(step)
    },

    /**
     * Get next step to complete
     */
    nextStep(): OnboardingStep | null {
      if (this.onboardingComplete) return null
      for (const step of ONBOARDING_STEPS) {
        if (!this.completedSteps.includes(step)) {
          return step
        }
      }
      return null
    },

    /**
     * Check if should show backup reminder
     */
    shouldShowBackupReminder(): boolean {
      if (this.backupComplete) return false
      if (this.skipped) return false
      if (!this.backupRemindedAt) return true
      return Date.now() - this.backupRemindedAt > BACKUP_REMINDER_INTERVAL
    },

    /**
     * Check if a hint should be shown
     */
    shouldShowHint(): (hint: FeatureHint) => boolean {
      return (hint: FeatureHint) => {
        if (this.dismissedHints.includes(hint)) return false
        // Only show hints after onboarding or if skipped
        return this.onboardingComplete || this.skipped
      }
    },

    /**
     * Check if onboarding is in progress
     */
    isOnboarding(): boolean {
      return (
        !this.onboardingComplete && !this.skipped && this.currentStep !== null
      )
    },

    /**
     * Check if onboarding modal should be shown
     * Used by onboarding/Modal.vue
     */
    shouldShowOnboarding(): boolean {
      return this.isFirstTime && !this.onboardingComplete && !this.skipped
    },

    /**
     * Get checklist progress
     */
    checklistProgress(): { completed: number; total: number } {
      const items = Object.values(this.checklist)
      const completed = items.filter(Boolean).length
      return { completed, total: items.length }
    },

    /**
     * Check if checklist is complete
     */
    isChecklistComplete(): boolean {
      return Object.values(this.checklist).every(Boolean)
    },

    /**
     * Alias for backupComplete (for plan compatibility)
     */
    backupVerified(): boolean {
      return this.backupComplete
    },

    /**
     * Check if a hint should be shown (string-based version)
     * Accepts any string ID for flexibility with new hints
     */
    shouldShowHintById(): (hintId: string) => boolean {
      return (hintId: string) => {
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
          return this.shouldShowHint(hintId as FeatureHint)
        }
        // For unknown hints, check dismissedHints array as strings
        if ((this.dismissedHints as string[]).includes(hintId)) return false
        return this.onboardingComplete || this.skipped
      }
    },
  },

  actions: {
    // ========================================================================
    // Initialization
    // ========================================================================

    /**
     * Initialize onboarding state from storage
     */
    initialize() {
      const saved = getItem<Partial<OnboardingState>>(
        STORAGE_KEYS.ONBOARDING_STATE,
        {},
      )

      if (Object.keys(saved).length > 0) {
        this.isFirstTime = saved.isFirstTime ?? true
        this.onboardingComplete = saved.onboardingComplete ?? false
        this.currentStep = saved.currentStep ?? null
        this.completedSteps = saved.completedSteps ?? []
        this.dismissedHints = saved.dismissedHints ?? []
        this.backupComplete = saved.backupComplete ?? false
        this.backupRemindedAt = saved.backupRemindedAt ?? null
        this.skipped = saved.skipped ?? false
        this.checklist = saved.checklist ?? {
          backup: false,
          addContact: false,
          receiveFirst: false,
          sendFirst: false,
        }
        this.firstVisit = saved.firstVisit ?? null
      } else {
        // First time user - record first visit
        this.firstVisit = Date.now()
        this._save()
      }
    },

    // ========================================================================
    // Onboarding Flow
    // ========================================================================

    /**
     * Start onboarding flow
     */
    startOnboarding() {
      this.isFirstTime = false
      this.currentStep = 'welcome'
      this.completedSteps = []
      this.skipped = false
      this._save()
    },

    /**
     * Complete a step and advance to next
     */
    completeStep(step: OnboardingStep) {
      if (!this.completedSteps.includes(step)) {
        this.completedSteps.push(step)
      }

      // Find next step
      const currentIndex = ONBOARDING_STEPS.indexOf(step)
      if (currentIndex < ONBOARDING_STEPS.length - 1) {
        this.currentStep = ONBOARDING_STEPS[currentIndex + 1]
      }

      // Check if complete
      if (
        step === 'complete' ||
        this.completedSteps.length >= ONBOARDING_STEPS.length - 1
      ) {
        this.onboardingComplete = true
        this.currentStep = null
      }

      this._save()
    },

    /**
     * Go to a specific step
     */
    goToStep(step: OnboardingStep) {
      this.currentStep = step
      this._save()
    },

    /**
     * Skip onboarding
     */
    skipOnboarding() {
      this.skipped = true
      this.currentStep = null
      this.isFirstTime = false
      this._save()
    },

    /**
     * Skip a specific step (mark as complete and advance)
     * Used when user wants to skip backup or other optional steps
     */
    skipStep(step: OnboardingStep) {
      // Track skipped backup attempts
      if (step === 'backup_seed' || step === 'verify_backup') {
        // Don't mark backup as complete when skipping
      }
      // Complete the step and advance
      this.completeStep(step)
    },

    /**
     * Reset onboarding (for testing or re-onboarding)
     */
    resetOnboarding() {
      this.isFirstTime = true
      this.onboardingComplete = false
      this.currentStep = null
      this.completedSteps = []
      this.skipped = false
      this._save()
    },

    // ========================================================================
    // Feature Hints
    // ========================================================================

    /**
     * Dismiss a feature hint
     */
    dismissHint(hint: FeatureHint) {
      if (!this.dismissedHints.includes(hint)) {
        this.dismissedHints.push(hint)
        this._save()
      }
    },

    /**
     * Dismiss a hint by string ID (for flexibility with new hints)
     * Used by onboarding/ContextualHint.vue
     */
    dismissHintById(hintId: string) {
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
        this.dismissHint(hintId as FeatureHint)
      } else {
        // For unknown hints, store as string (cast to any for flexibility)
        if (!(this.dismissedHints as string[]).includes(hintId)) {
          ;(this.dismissedHints as string[]).push(hintId)
          this._save()
        }
      }
    },

    /**
     * Reset all hints (show them again)
     */
    resetHints() {
      this.dismissedHints = []
      this._save()
    },

    // ========================================================================
    // Backup
    // ========================================================================

    /**
     * Mark backup as complete
     */
    markBackupComplete() {
      this.backupComplete = true
      this.checklist.backup = true
      this._save()
    },

    // ========================================================================
    // Checklist
    // ========================================================================

    /**
     * Complete a checklist item
     */
    completeChecklistItem(item: keyof ChecklistState) {
      this.checklist[item] = true
      this._save()
    },

    /**
     * Alias for markBackupComplete (for plan compatibility)
     */
    verifyBackup() {
      this.markBackupComplete()
    },

    /**
     * Snooze backup reminder
     */
    snoozeBackupReminder() {
      this.backupRemindedAt = Date.now()
      this._save()
    },

    /**
     * Reset backup status (e.g., after wallet restore)
     */
    resetBackupStatus() {
      this.backupComplete = false
      this.backupRemindedAt = null
      this._save()
    },

    // ========================================================================
    // Persistence
    // ========================================================================

    /**
     * Save state to localStorage
     */
    _save() {
      setItem(STORAGE_KEYS.ONBOARDING_STATE, {
        isFirstTime: this.isFirstTime,
        onboardingComplete: this.onboardingComplete,
        currentStep: this.currentStep,
        completedSteps: this.completedSteps,
        dismissedHints: this.dismissedHints,
        backupComplete: this.backupComplete,
        backupRemindedAt: this.backupRemindedAt,
        skipped: this.skipped,
        checklist: this.checklist,
        firstVisit: this.firstVisit,
      })
    },
  },
})
