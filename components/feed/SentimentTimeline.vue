<script setup lang="ts">
/**
 * Sentiment Timeline Component (R5: Temporal Diversity in Vote Display)
 *
 * Stacked bar chart showing endorsed vs flagged XPI burn per day over a
 * selectable 7-day or 30-day window. Reveals how sentiment evolved over time
 * rather than presenting only the current aggregate score.
 *
 * Strategy compliance:
 *   R5: Temporal Diversity — daily sentiment bars encourage independent judgment
 *       by showing that community opinion is not a fixed consensus.
 *
 * @see lotusia-monorepo/strategies/rank/research/echo-chamber-mitigation.md — R5
 *
 * NOTE: This component must be used as a client-only component (no SSR) because
 * Chart.js relies on the browser Canvas API. Import as <FeedSentimentTimeline>
 * which Nuxt auto-imports; the .client suffix is NOT on this file — the parent
 * wraps it in <ClientOnly> instead to keep the component name clean.
 */
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import type { ProfileRankTransaction } from '~/composables/useRankApi'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

// ---------------------------------------------------------------------------
// Color mode detection for Chart.js (needs hex values, not Tailwind classes)
// ---------------------------------------------------------------------------

// useColorMode is auto-imported from @nuxtjs/color-mode (respects user preferences)
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// Light mode: gray-500 (#6b7280), Dark mode: gray-400 (#9ca3af)
const tickColor = computed(() => (isDark.value ? '#9ca3af' : '#6b7280'))
// Grid color: lighter version of tick color with opacity
const gridColor = computed(() => (isDark.value ? 'rgba(156,163,175,0.15)' : 'rgba(107,114,128,0.15)'))

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

const props = defineProps<{
  /** RANK transactions within the selected window, newest-first from API */
  transactions: ProfileRankTransaction[]
  /** Whether to show the loading skeleton */
  loading?: boolean
}>()

// ---------------------------------------------------------------------------
// Window toggle: 7d / 30d
// ---------------------------------------------------------------------------

type Window = 7 | 30
const activeWindow = ref<Window>(7)

// ---------------------------------------------------------------------------
// Daily bucket computation
// ---------------------------------------------------------------------------

interface DayBucket {
  label: string       // e.g. "Feb 14"
  dateKey: string     // YYYY-MM-DD for deduplication
  satsPositive: number
  satsNegative: number
}

/** Build an ordered array of day buckets for the last N days (oldest → newest). */
function buildDayBuckets(days: number): DayBucket[] {
  const now = Date.now()
  const buckets: DayBucket[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000)
    const dateKey = d.toISOString().slice(0, 10) // YYYY-MM-DD
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    buckets.push({ label, dateKey, satsPositive: 0, satsNegative: 0 })
  }
  return buckets
}

const chartData = computed<ChartData<'bar'>>(() => {
  const days = activeWindow.value
  const cutoffSec = Math.floor(Date.now() / 1000) - days * 86_400
  const buckets = buildDayBuckets(days)
  const bucketMap = new Map(buckets.map(b => [b.dateKey, b]))

  for (const tx of props.transactions) {
    const ts = Number(tx.timestamp)
    if (!ts || ts < cutoffSec) continue
    const dateKey = new Date(ts * 1000).toISOString().slice(0, 10)
    const bucket = bucketMap.get(dateKey)
    if (!bucket) continue
    // Convert sats (string) to XPI (divide by 1e6) for readable y-axis
    const xpi = Number(tx.sats || '0') / 1_000_000
    if (tx.sentiment === 'positive') {
      bucket.satsPositive += xpi
    } else if (tx.sentiment === 'negative') {
      bucket.satsNegative += xpi
    }
  }

  return {
    labels: buckets.map(b => b.label),
    datasets: [
      {
        label: 'Endorsed',
        data: buckets.map(b => b.satsPositive),
        backgroundColor: 'rgba(34, 197, 94, 0.75)',  // green-500
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
        borderRadius: 2,
        stack: 'sentiment',
      },
      {
        label: 'Flagged',
        data: buckets.map(b => -b.satsNegative),
        backgroundColor: 'rgba(239, 68, 68, 0.75)',  // red-500
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
        borderRadius: 2,
        stack: 'sentiment',
      },
    ],
  }
})

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 200 },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label(ctx) {
          const val = Math.abs(ctx.parsed.y ?? 0)
          const sign = ctx.datasetIndex === 0 ? '+' : '-'
          return ` ${ctx.dataset.label}: ${sign}${val.toFixed(2)} XPI`
        },
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: {
        font: { size: 10 },
        color: tickColor.value,
        maxRotation: 0,
        // Show fewer labels on 30-day to avoid crowding
        maxTicksLimit: activeWindow.value === 7 ? 7 : 10,
      },
    },
    y: {
      stacked: true,
      grid: { color: gridColor.value },
      ticks: {
        font: { size: 10 },
        color: tickColor.value,
        callback(val) {
          const n = Number(val)
          if (n === 0) return '0'
          return (n > 0 ? '+' : '') + formatCompact(n) + ' XPI'
        },
      },
    },
  },
}))

/** True if the current window has any non-zero activity */
const hasData = computed(() => {
  if (!props.transactions.length) return false
  const cutoffSec = Math.floor(Date.now() / 1000) - activeWindow.value * 86_400
  return props.transactions.some(tx => Number(tx.timestamp) >= cutoffSec)
})

/** Detect a sentiment shift within the window: dominant sentiment of first
 *  active day differs from dominant sentiment of last active day. */
const sentimentShift = computed<string | null>(() => {
  const days = activeWindow.value
  const cutoffSec = Math.floor(Date.now() / 1000) - days * 86_400
  const buckets = buildDayBuckets(days)
  const bucketMap = new Map(buckets.map(b => [b.dateKey, b]))

  for (const tx of props.transactions) {
    const ts = Number(tx.timestamp)
    if (!ts || ts < cutoffSec) continue
    const dateKey = new Date(ts * 1000).toISOString().slice(0, 10)
    const bucket = bucketMap.get(dateKey)
    if (!bucket) continue
    const xpi = Number(tx.sats || '0') / 1_000_000
    if (tx.sentiment === 'positive') bucket.satsPositive += xpi
    else if (tx.sentiment === 'negative') bucket.satsNegative += xpi
  }

  const active = buckets.filter(b => b.satsPositive + b.satsNegative > 0)
  if (active.length < 2) return null

  const first = active[0]
  const last = active[active.length - 1]
  const firstDom = first.satsPositive >= first.satsNegative ? 'positive' : 'negative'
  const lastDom = last.satsPositive >= last.satsNegative ? 'positive' : 'negative'
  if (firstDom === lastDom) return null

  const direction = lastDom === 'positive' ? 'more positive' : 'more negative'
  return `Sentiment trended ${direction} over this period`
})
</script>

<template>
  <!-- Loading skeleton -->
  <div v-if="loading" class="space-y-2 pt-3">
    <USkeleton class="h-3 w-1/3" />
    <USkeleton class="h-28 w-full rounded-lg" />
  </div>

  <!-- No activity in window (silently hide — content may just be very new) -->
  <template v-else-if="!hasData" />

  <!-- Chart -->
  <div v-else class="space-y-2">
    <!-- Header row: label + window toggle -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <UIcon name="i-lucide-bar-chart-2" class="w-3.5 h-3.5 flex-shrink-0" />
        <span>Sentiment over time</span>
      </div>
      <!-- Legend + toggle -->
      <div class="flex items-center gap-3">
        <!-- <div class="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 ">
          <span class="flex items-center gap-1">
            <span class="inline-block w-2.5 h-2.5 rounded-sm bg-success-500/75" />
            Endorsed
          </span>
          <span class="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <span class="inline-block w-2.5 h-2.5 rounded-sm bg-error-500/75" />
            Flagged
          </span>
        </div> -->
        <div class="flex rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 text-[10px]">
          <button class="px-2 py-0.5 transition-colors" :class="activeWindow === 7
            ? 'bg-primary text-white'
            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'" @click="activeWindow = 7">7d</button>
          <button class="px-2 py-0.5 transition-colors border-l border-gray-200 dark:border-gray-700" :class="activeWindow === 30
            ? 'bg-primary text-white'
            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'" @click="activeWindow = 30">30d</button>
        </div>
      </div>
    </div>

    <!-- Bar chart -->
    <div class="h-28">
      <Bar :data="chartData" :options="chartOptions" />
    </div>

    <!-- Sentiment shift callout -->
    <div v-if="sentimentShift" class="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400">
      <UIcon name="i-lucide-trending-up" class="w-3.5 h-3.5 flex-shrink-0" />
      <span>{{ sentimentShift }}</span>
    </div>
  </div>
</template>
