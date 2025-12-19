<script setup lang="ts">
/**
 * CommonQRCode
 *
 * Reusable QR code display component.
 * Uses qrcode-vue3 for rendering.
 */
import QRCodeVue3 from 'qrcode-vue3'

const props = withDefaults(
  defineProps<{
    /** Value to encode in QR code */
    value: string
    /** Size in pixels */
    size?: number
    /** Margin (quiet zone) */
    margin?: number
    /** Primary color for dots and corners */
    color?: string
    /** Background color */
    backgroundColor?: string
  }>(),
  {
    size: 180,
    margin: 2,
    color: '#c6005c',
    backgroundColor: '#ffffff',
  },
)

const qrOptions = computed(() => ({
  width: props.size,
  height: props.size,
  margin: props.margin,
  dotsOptions: {
    color: props.color,
    type: 'rounded' as const,
  },
  cornersSquareOptions: {
    color: props.color,
    type: 'extra-rounded' as const,
  },
  cornersDotOptions: {
    color: props.color,
    type: 'dot' as const,
  },
  backgroundOptions: {
    color: props.backgroundColor,
  },
}))
</script>

<template>
  <div class="inline-block p-4 bg-white rounded-xl shadow-sm">
    <QRCodeVue3 v-if="value" :key="value" :value="value" :width="qrOptions.width" :height="qrOptions.height"
      :margin="qrOptions.margin" :dots-options="qrOptions.dotsOptions"
      :corners-square-options="qrOptions.cornersSquareOptions" :corners-dot-options="qrOptions.cornersDotOptions"
      :background-options="qrOptions.backgroundOptions" />
    <div v-else class="flex items-center justify-center text-muted"
      :style="{ width: `${size}px`, height: `${size}px` }">
      <UIcon name="i-lucide-qr-code" class="w-12 h-12" />
    </div>
  </div>
</template>
