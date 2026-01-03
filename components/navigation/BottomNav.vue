<script setup lang="ts">
/**
 * Bottom Navigation Component
 *
 * 5-item bottom navigation for mobile with action button in center.
 */
import { useActivityStore } from '~/stores/activity'

const route = useRoute()

const emit = defineEmits<{
  action: []
}>()

interface NavItem {
  to: string
  icon: string
  label: string
  isAction?: boolean
  badge?: number
}

const activityStore = useActivityStore()

const navItems = computed<NavItem[]>(() => [
  { to: '/', icon: 'i-lucide-home', label: 'Home' },
  { to: '/people', icon: 'i-lucide-users', label: 'People' },
  { to: '#action', icon: 'i-lucide-plus', label: '', isAction: true },
  {
    to: '/activity',
    icon: 'i-lucide-bell',
    label: 'Activity',
    badge: activityStore.unreadCount,
  },
  { to: '/settings', icon: 'i-lucide-settings', label: 'Settings' },
])

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  if (to === '#action') return false
  return route.path.startsWith(to)
}

function handleClick(item: NavItem) {
  if (item.isAction) {
    emit('action')
  }
}
</script>

<template>
  <nav
    class="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe">
    <div class="flex items-center justify-around h-16">
      <template v-for="item in navItems" :key="item.to">
        <!-- Action button (center) -->
        <button v-if="item.isAction"
          class="w-12 h-12 -mt-4 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          @click="handleClick(item)">
          <UIcon :name="item.icon" class="w-6 h-6" />
        </button>

        <!-- Regular nav item -->
        <NuxtLink v-else :to="item.to"
          class="flex flex-col items-center justify-center w-16 h-full relative transition-colors" :class="isActive(item.to)
            ? 'text-primary'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            ">
          <div class="relative">
            <UIcon :name="item.icon" class="w-6 h-6" />
            <span v-if="item.badge && item.badge > 0"
              class="absolute -top-1 -right-2 min-w-4 h-4 px-1 bg-error text-white text-xs rounded-full flex items-center justify-center font-medium">
              {{ item.badge > 99 ? '99+' : item.badge }}
            </span>
          </div>
          <span class="text-xs">{{ item.label }}</span>
        </NuxtLink>
      </template>
    </div>
  </nav>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
