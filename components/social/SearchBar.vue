<script setup lang="ts">
/**
 * SocialSearchBar
 *
 * Search input for finding social profiles to vote on.
 */
const model = defineModel<string>()

const emit = defineEmits<{
  search: [query: string]
}>()

const platforms = [
  { value: 'all', label: 'All Platforms', icon: 'i-lucide-globe' },
  { value: 'twitter', label: 'Twitter', icon: 'i-lucide-twitter' },
  { value: 'youtube', label: 'YouTube', icon: 'i-lucide-youtube' },
  { value: 'twitch', label: 'Twitch', icon: 'i-lucide-twitch' },
  { value: 'github', label: 'GitHub', icon: 'i-lucide-github' },
]

const selectedPlatform = ref('all')

function handleSubmit() {
  if (model.value?.trim()) {
    emit('search', model.value.trim())
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="flex gap-2">
    <!-- Platform Select -->
    <USelect v-model="selectedPlatform" :options="platforms" option-attribute="label" value-attribute="value"
      class="w-40">
      <template #leading>
        <UIcon :name="platforms.find(p => p.value === selectedPlatform)?.icon || 'i-lucide-globe'" class="w-4 h-4" />
      </template>
    </USelect>

    <!-- Search Input -->
    <UInput v-model="model" icon="i-lucide-search" placeholder="Search profiles..." class="flex-1"
      @keydown.enter="handleSubmit">
      <template #trailing>
        <UButton type="submit" color="primary" size="xs" :disabled="!model?.trim()">
          Search
        </UButton>
      </template>
    </UInput>
  </form>
</template>
