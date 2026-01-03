<script setup lang="ts">
/**
 * Activity Item Component
 *
 * Displays a single activity item with icon, title, subtitle, amount, and actions.
 */
import type { ActivityItem } from '~/stores/activity'
import {
  getActivityIcon,
  getActivityIconBgClass,
  getActivityIconTextClass,
  getActivityTitle,
  getActivitySubtitle,
  getActivityAmount,
  getActivityAmountClass,
} from '~/utils/activity'
import { formatRelativeTime } from '~/utils/formatting'

const props = defineProps<{
  item: ActivityItem
}>()

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'action', actionId: string): void
}>()

// === COMPUTED DISPLAY PROPERTIES ===

const icon = computed(() => getActivityIcon(props.item))
const iconBgClass = computed(() => getActivityIconBgClass(props.item))
const iconClass = computed(() => getActivityIconTextClass(props.item))
const title = computed(() => getActivityTitle(props.item))
const subtitle = computed(() => getActivitySubtitle(props.item))
const amount = computed(() => getActivityAmount(props.item))
const amountClass = computed(() => getActivityAmountClass(props.item))
const formattedTime = computed(() => formatRelativeTime(props.item.timestamp))
</script>

<template>
  <div :class="[
    'p-4 rounded-xl border transition-all cursor-pointer',
    'hover:shadow-md hover:border-primary/30',
    !item.readAt && 'bg-primary/5 border-primary/20',
    item.readAt && 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
  ]" @click="emit('click')">
    <div class="flex items-start gap-3">
      <!-- Icon -->
      <div :class="[
        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
        iconBgClass,
      ]">
        <UIcon :name="icon" :class="['w-5 h-5', iconClass]" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="font-medium truncate">{{ title }}</p>
            <p v-if="subtitle" class="text-sm text-gray-500 truncate">{{ subtitle }}</p>
          </div>

          <!-- Unread indicator -->
          <div v-if="!item.readAt" class="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
        </div>

        <!-- Amount (if applicable) -->
        <p v-if="amount" :class="['font-mono text-sm mt-1', amountClass]">
          {{ amount }}
        </p>

        <!-- Timestamp -->
        <p class="text-xs text-gray-500 mt-1">{{ formattedTime }}</p>

        <!-- Actions -->
        <div v-if="item.actions?.length" class="flex gap-2 mt-3">
          <UButton v-for="action in item.actions" :key="action.id" :color="action.primary ? 'primary' : 'neutral'"
            :variant="action.primary ? 'solid' : 'outline'" size="sm" :icon="action.icon"
            @click.stop="emit('action', action.id)">
            {{ action.label }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
