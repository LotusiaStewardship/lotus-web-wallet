<script setup lang="ts">
/**
 * AccountSelector Component
 *
 * Phase 6: Account selection dropdown for multi-account architecture.
 * Allows users to switch between different account types (Primary, MuSig2, etc.)
 */
import { AccountPurpose, ACCOUNT_FRIENDLY_LABELS } from '~/types/accounts'

/** Special value for "All Accounts" selection */
const ALL_ACCOUNTS = -1 as const
type AccountSelection = AccountPurpose | typeof ALL_ACCOUNTS

const props = withDefaults(
  defineProps<{
    /** Currently selected account purpose */
    modelValue: AccountSelection
    /** Show "All Accounts" option */
    showAll?: boolean
    /** Disabled state */
    disabled?: boolean
  }>(),
  {
    showAll: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: AccountSelection]
}>()

const selectedAccount = computed(() => props.modelValue)

const selectedLabel = computed(() => {
  if (selectedAccount.value === ALL_ACCOUNTS) return 'All Accounts'
  return ACCOUNT_FRIENDLY_LABELS[selectedAccount.value] || 'Unknown'
})

const selectedIcon = computed(() => {
  switch (selectedAccount.value) {
    case AccountPurpose.PRIMARY:
      return 'i-lucide-wallet'
    case AccountPurpose.MUSIG2:
      return 'i-lucide-shield'
    case AccountPurpose.SWAP:
      return 'i-lucide-repeat'
    case AccountPurpose.PRIVACY:
      return 'i-lucide-eye-off'
    default:
      return 'i-lucide-layers'
  }
})

const accountItems = computed(() => {
  const items = [
    [
      {
        label: ACCOUNT_FRIENDLY_LABELS[AccountPurpose.PRIMARY],
        icon: 'i-lucide-wallet',
        click: () => emit('update:modelValue', AccountPurpose.PRIMARY),
      },
      {
        label: ACCOUNT_FRIENDLY_LABELS[AccountPurpose.MUSIG2],
        icon: 'i-lucide-shield',
        click: () => emit('update:modelValue', AccountPurpose.MUSIG2),
      },
    ],
  ]

  if (props.showAll) {
    items[0].unshift({
      label: 'All Accounts',
      icon: 'i-lucide-layers',
      click: () => emit('update:modelValue', ALL_ACCOUNTS),
    })
  }

  return items
})
</script>

<template>
  <UDropdownMenu :items="accountItems">
    <UButton color="neutral" variant="soft" :disabled="disabled" class="min-w-[160px] justify-between">
      <div class="flex items-center gap-2">
        <UIcon :name="selectedIcon" class="w-4 h-4" />
        <span>{{ selectedLabel }}</span>
      </div>
      <UIcon name="i-lucide-chevron-down" class="w-4 h-4 ml-2" />
    </UButton>
  </UDropdownMenu>
</template>
