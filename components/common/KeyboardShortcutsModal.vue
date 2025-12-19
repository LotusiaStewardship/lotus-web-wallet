<script setup lang="ts">
/**
 * KeyboardShortcutsModal - Keyboard shortcuts help modal
 *
 * Displays available keyboard shortcuts organized by category.
 */
const isOpen = defineModel<boolean>('open', { default: false })

interface Shortcut {
  key: string
  description: string
}

interface ShortcutGroup {
  name: string
  shortcuts: Shortcut[]
}

const shortcutGroups: ShortcutGroup[] = [
  {
    name: 'Navigation',
    shortcuts: [
      { key: '⌘ + K', description: 'Open command palette' },
      { key: '⌘ + S', description: 'Go to Send' },
      { key: '⌘ + R', description: 'Go to Receive' },
      { key: '⌘ + H', description: 'Go to History' },
      { key: '⌘ + /', description: 'Show keyboard shortcuts' },
    ],
  },
  {
    name: 'Actions',
    shortcuts: [
      { key: 'Escape', description: 'Close modal / Cancel' },
      { key: 'Enter', description: 'Confirm / Submit' },
      { key: 'Tab', description: 'Next field' },
      { key: 'Shift + Tab', description: 'Previous field' },
    ],
  },
  {
    name: 'Accessibility',
    shortcuts: [
      { key: 'Tab', description: 'Navigate to next element' },
      { key: 'Space', description: 'Activate button / checkbox' },
      { key: 'Arrow keys', description: 'Navigate within menus' },
    ],
  },
]

// Close on escape
onKeyStroke('Escape', () => {
  if (isOpen.value) {
    isOpen.value = false
  }
})
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Keyboard Shortcuts</h3>
            <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-x" @click="isOpen = false" />
          </div>
        </template>

        <!-- Phase 6: Semantic color classes -->
        <div class="space-y-6">
          <div v-for="group in shortcutGroups" :key="group.name">
            <p class="font-medium text-sm text-muted mb-3">
              {{ group.name }}
            </p>
            <div class="divide-y divide-default">
              <div v-for="shortcut in group.shortcuts" :key="shortcut.key"
                class="py-2 flex items-center justify-between">
                <span class="text-sm">
                  {{ shortcut.description }}
                </span>
                <kbd class="px-2 py-1 bg-muted/50 rounded text-xs font-mono text-muted">
                  {{ shortcut.key }}
                </kbd>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <p class="text-xs text-muted text-center">
            Press <kbd class="px-1 py-0.5 bg-muted/50 rounded text-xs">⌘ + /</kbd> anytime to show this
            help
          </p>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
