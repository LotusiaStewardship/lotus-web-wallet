<script setup lang="ts">
/**
 * TimeAgo
 *
 * Relative time display that updates automatically.
 */
import { formatRelativeTime, formatDateTime } from '~/utils/formatting'

const props = defineProps<{
  /** Timestamp in milliseconds */
  timestamp: number
  /** Show full date on hover */
  showTooltip?: boolean
  /** Update interval in seconds (0 to disable) */
  updateInterval?: number
}>()

const displayTime = ref(formatRelativeTime(props.timestamp))

// Update the display periodically
let intervalId: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (props.updateInterval !== 0) {
    const interval = (props.updateInterval || 60) * 1000
    intervalId = setInterval(() => {
      displayTime.value = formatRelativeTime(props.timestamp)
    }, interval)
  }
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})

// Update when timestamp changes
watch(
  () => props.timestamp,
  newTimestamp => {
    displayTime.value = formatRelativeTime(newTimestamp)
  },
)

const fullDateTime = computed(() => formatDateTime(props.timestamp))
</script>

<template>
  <span :title="showTooltip !== false ? fullDateTime : undefined" class="text-muted">
    {{ displayTime }}
  </span>
</template>
