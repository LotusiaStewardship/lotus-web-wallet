<script setup lang="ts">
/**
 * SuccessAnimation - Success feedback component
 *
 * Shows animated success indicator with message.
 * Used after successful operations like transactions, wallet creation, etc.
 */
interface Props {
  message?: string
  description?: string
  icon?: string
  autoHide?: boolean
  hideDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  message: 'Success!',
  description: '',
  icon: 'i-lucide-check',
  autoHide: false,
  hideDelay: 3000,
})

const emit = defineEmits<{
  hidden: []
}>()

const visible = ref(true)

onMounted(() => {
  if (props.autoHide) {
    setTimeout(() => {
      visible.value = false
      emit('hidden')
    }, props.hideDelay)
  }
})
</script>

<template>
  <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 scale-90"
    enter-to-class="opacity-100 scale-100" leave-active-class="transition-all duration-300"
    leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-90">
    <!-- Phase 6: Semantic color classes -->
    <div v-if="visible" class="flex flex-col items-center gap-4 py-4">
      <!-- Animated checkmark circle -->
      <div class="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center animate-bounce-once">
        <UIcon :name="icon" class="w-10 h-10 text-success" />
      </div>

      <!-- Message -->
      <div class="text-center">
        <p class="text-lg font-medium">
          {{ message }}
        </p>
        <p v-if="description" class="text-sm text-muted mt-1">
          {{ description }}
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@keyframes bounce-once {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1);
  }
}

.animate-bounce-once {
  animation: bounce-once 0.5s ease-out;
}
</style>
