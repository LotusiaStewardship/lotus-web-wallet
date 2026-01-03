/**
 * Settings Store
 *
 * Centralized store for UI settings that persist across sessions.
 * This store manages user preferences that don't belong to other domain-specific stores.
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getItem, setItem, STORAGE_KEYS } from '~/utils/storage'

// ============================================================================
// Types
// ============================================================================

export interface UISettings {
  /** Hide balance by default until user taps to reveal */
  hideBalance: boolean
  /** Whether settings have been loaded from storage */
  initialized: boolean
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_UI_SETTINGS: Omit<UISettings, 'initialized'> = {
  hideBalance: false,
}

// ============================================================================
// Store Definition
// ============================================================================

export const useSettingsStore = defineStore('settings', () => {
  // === STATE ===
  const hideBalance = ref(false)
  const initialized = ref(false)

  // === GETTERS ===
  /**
   * Whether balance should be hidden
   */
  const shouldHideBalance = computed(() => hideBalance.value)

  // === ACTIONS ===
  /**
   * Initialize settings from storage
   */
  function initialize() {
    if (initialized.value) return

    const saved = getItem<Partial<UISettings>>(STORAGE_KEYS.UI_SETTINGS, {})

    hideBalance.value = saved.hideBalance ?? DEFAULT_UI_SETTINGS.hideBalance
    initialized.value = true

    console.log('[Settings Store] Initialized:', {
      hideBalance: hideBalance.value,
    })
  }

  /**
   * Save current settings to storage
   */
  function _saveSettings() {
    setItem(STORAGE_KEYS.UI_SETTINGS, {
      hideBalance: hideBalance.value,
    })
  }

  /**
   * Set hide balance preference
   */
  function setHideBalance(value: boolean) {
    hideBalance.value = value
    _saveSettings()
  }

  /**
   * Toggle hide balance preference
   */
  function toggleHideBalance() {
    hideBalance.value = !hideBalance.value
    _saveSettings()
  }

  /**
   * Reset all settings to defaults
   */
  function resetSettings() {
    hideBalance.value = DEFAULT_UI_SETTINGS.hideBalance
    _saveSettings()
  }

  // === RETURN ===
  return {
    // State
    hideBalance,
    initialized,
    // Getters
    shouldHideBalance,
    // Actions
    initialize,
    setHideBalance,
    toggleHideBalance,
    resetSettings,
  }
})
