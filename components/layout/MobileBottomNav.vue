<script setup lang="ts">
export interface NavItem {
  label: string
  icon: string
  to: string
  active?: boolean
  badge?: number
}

defineProps<{
  items: NavItem[]
}>()
</script>

<template>
  <nav class="mobile-bottom-nav">
    <div class="flex justify-around items-center h-16 px-2 max-w-lg mx-auto">
      <NuxtLink v-for="item in items" :key="item.label" :to="item.to"
        class="flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all" :class="[
          item.active
            ? 'text-primary'
            : 'text-muted hover:text-foreground',
        ]">
        <div class="relative">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
            :class="item.active ? 'bg-primary/10' : ''">
            <UIcon :name="item.icon" class="w-5 h-5" />
          </div>
          <span v-if="item.badge && item.badge > 0"
            class="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-error text-white text-xs rounded-full flex items-center justify-center">
            {{ item.badge > 9 ? '9+' : item.badge }}
          </span>
        </div>
        <span class="text-[10px] mt-0.5 font-medium">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  z-index: 50;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

:root.dark .mobile-bottom-nav {
  background: rgba(17, 24, 39, 0.95);
  border-top-color: rgba(255, 255, 255, 0.1);
}
</style>
