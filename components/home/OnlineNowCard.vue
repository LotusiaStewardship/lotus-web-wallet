<script setup lang="ts">
/**
 * Online Now Card Component
 *
 * Shows online contacts with quick access to their profiles.
 */
import { usePeopleStore } from '~/stores/people'

const peopleStore = usePeopleStore()

const MAX_DISPLAY = 5

const displayedPeople = computed(() =>
  peopleStore.onlinePeople.slice(0, MAX_DISPLAY),
)

const remainingCount = computed(() =>
  Math.max(0, peopleStore.onlinePeople.length - MAX_DISPLAY),
)
</script>

<template>
  <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-success" />
        <span class="font-semibold">Online Now</span>
      </div>
      <NuxtLink to="/people?tab=online" class="text-sm text-primary hover:underline">
        View All
      </NuxtLink>
    </div>

    <div class="p-4">
      <div class="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        <PeoplePersonChip v-for="person in displayedPeople" :key="person.id" :person="person"
          @click="navigateTo(`/people/${person.id}`)" />

        <button v-if="remainingCount > 0"
          class="flex items-center gap-1 px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm whitespace-nowrap"
          @click="navigateTo('/people?tab=online')">
          +{{ remainingCount }} more
        </button>
      </div>
    </div>
  </div>
</template>
