<script setup lang="ts">
/**
 * Activity Item Compact Component
 *
 * Compact version of ActivityItem for use in the home page recent activity section.
 */
import type { ActivityItem } from '~/stores/activity'
import {
  getActivityIcon,
  getActivityIconBgClass,
  getActivityIconTextClass,
  getActivityTitle,
  getActivityAmount,
  getActivityAmountClass,
} from '~/utils/activity'
import { formatRelativeTime } from '~/utils/formatting'

const props = defineProps<{
  item: ActivityItem
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const icon = computed(() => getActivityIcon(props.item))
const iconBgClass = computed(() => getActivityIconBgClass(props.item))
const iconClass = computed(() => getActivityIconTextClass(props.item))
const title = computed(() => getActivityTitle(props.item))
const amount = computed(() => getActivityAmount(props.item))
const amountClass = computed(() => getActivityAmountClass(props.item))
const formattedTime = computed(() => formatRelativeTime(props.item.timestamp))
</script>

<template>
  <div class="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
    @click="emit('click')">
    <!-- Icon -->
    <div :class="['w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', iconBgClass]">
      <UIcon :name="icon" :class="['w-4 h-4', iconClass]" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium truncate">{{ title }}</p>
      <p class="text-xs text-gray-500">{{ formattedTime }}</p>
    </div>

    <!-- Amount (if applicable) -->
    <p v-if="amount" :class="['font-mono text-sm', amountClass]">
      {{ amount }}
    </p>

    <!-- Unread indicator -->
    <div v-if="!item.readAt" class="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
  </div>
</template>
