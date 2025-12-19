<script setup lang="ts">
/**
 * SettingsSection
 *
 * A section of settings items with title and icon.
 */
interface SettingsItem {
  label: string
  description?: string
  icon: string
  to?: string
  href?: string
  external?: boolean
  action?: string
  badge?: string
  badgeColor?: 'primary' | 'success' | 'warning' | 'error' | 'neutral'
}

const props = defineProps<{
  /** Section title */
  title: string
  /** Section icon */
  icon: string
  /** Settings items */
  items: SettingsItem[]
}>()

const colorMode = useColorMode()

function handleAction(action: string) {
  if (action === 'theme') {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  }
}

// Determine component type for each item
function getComponent(item: SettingsItem) {
  if (item.to) return resolveComponent('NuxtLink')
  if (item.href) return 'a'
  return 'button'
}
</script>

<template>
  <UiAppCard :title="title" :icon="icon">
    <div class="divide-y divide-default -mx-4">
      <component :is="getComponent(item)" v-for="item in items" :key="item.label" :to="item.to" :href="item.href"
        :target="item.external ? '_blank' : undefined" :rel="item.external ? 'noopener noreferrer' : undefined"
        class="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors w-full text-left"
        @click="item.action && handleAction(item.action)">
        <!-- Icon -->
        <div class="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
          <UIcon :name="item.icon" class="w-5 h-5 text-muted" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="font-medium">{{ item.label }}</p>
            <UBadge v-if="item.badge" :color="item.badgeColor || 'neutral'" variant="subtle" size="xs">
              {{ item.badge }}
            </UBadge>
          </div>
          <p v-if="item.description" class="text-sm text-muted">
            {{ item.description }}
          </p>
        </div>

        <!-- Arrow -->
        <UIcon :name="item.external ? 'i-lucide-external-link' : 'i-lucide-chevron-right'"
          class="w-5 h-5 text-muted flex-shrink-0" />
      </component>
    </div>
  </UiAppCard>
</template>
