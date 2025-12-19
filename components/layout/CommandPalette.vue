<script setup lang="ts">
import { useContactsStore } from '~/stores/contacts'

const open = defineModel<boolean>('open', { default: false })

const contactsStore = useContactsStore()
const router = useRouter()

const searchQuery = ref('')

interface Command {
  id: string
  label: string
  icon: string
  shortcut?: string
  subtitle?: string
  action: () => void
}

interface CommandGroup {
  key: string
  label: string
  commands: Command[]
}

// Command groups
const commandGroups = computed<CommandGroup[]>(() => [
  {
    key: 'actions',
    label: 'Quick Actions',
    commands: [
      {
        id: 'send',
        label: 'Send Lotus',
        icon: 'i-lucide-send',
        shortcut: '⌘S',
        action: () => router.push('/transact/send'),
      },
      {
        id: 'receive',
        label: 'Receive Lotus',
        icon: 'i-lucide-qr-code',
        shortcut: '⌘R',
        action: () => router.push('/transact/receive'),
      },
      {
        id: 'scan',
        label: 'Scan QR Code',
        icon: 'i-lucide-scan',
        action: () => router.push('/transact/send?scan=true'),
      },
      {
        id: 'history',
        label: 'View History',
        icon: 'i-lucide-history',
        shortcut: '⌘H',
        action: () => router.push('/transact/history'),
      },
    ],
  },
  {
    key: 'contacts',
    label: 'Recent Contacts',
    commands: contactsStore.favoriteContacts.slice(0, 5).map(contact => ({
      id: `contact-${contact.id}`,
      label: contact.name,
      icon: 'i-lucide-user',
      subtitle: contact.address.slice(0, 20) + '...',
      action: () => router.push(`/transact/send?to=${contact.address}`),
    })),
  },
  {
    key: 'pages',
    label: 'Pages',
    commands: [
      {
        id: 'home',
        label: 'Home',
        icon: 'i-lucide-home',
        action: () => router.push('/'),
      },
      {
        id: 'contacts',
        label: 'Contacts',
        icon: 'i-lucide-users',
        action: () => router.push('/people/contacts'),
      },
      {
        id: 'p2p',
        label: 'P2P Network',
        icon: 'i-lucide-globe',
        action: () => router.push('/people/p2p'),
      },
      {
        id: 'explorer',
        label: 'Explorer',
        icon: 'i-lucide-blocks',
        action: () => router.push('/explore/explorer'),
      },
      {
        id: 'social',
        label: 'Social',
        icon: 'i-lucide-thumbs-up',
        action: () => router.push('/explore/social'),
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: 'i-lucide-settings',
        action: () => router.push('/settings'),
      },
    ],
  },
])

// Filtered commands based on search
const filteredGroups = computed(() => {
  if (!searchQuery.value) return commandGroups.value

  const query = searchQuery.value.toLowerCase()
  return commandGroups.value
    .map(group => ({
      ...group,
      commands: group.commands.filter(
        cmd =>
          cmd.label.toLowerCase().includes(query) ||
          cmd.subtitle?.toLowerCase().includes(query),
      ),
    }))
    .filter(group => group.commands.length > 0)
})

function executeCommand(command: Command) {
  command.action()
  open.value = false
  searchQuery.value = ''
}

// Reset search when closing
watch(open, (isOpen) => {
  if (!isOpen) {
    searchQuery.value = ''
  }
})
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-xl' }">
    <template #content>
      <!-- Phase 6: Semantic color classes -->
      <div class="p-4">
        <!-- Search Input -->
        <div class="relative mb-4">
          <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input v-model="searchQuery" type="text" placeholder="Search or type a command..."
            class="w-full pl-10 pr-16 py-3 bg-muted/50 rounded-lg border-0 focus:ring-2 focus:ring-primary" autofocus />
          <kbd class="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-muted rounded">
            ESC
          </kbd>
        </div>

        <!-- Command Groups -->
        <div class="max-h-96 overflow-y-auto space-y-4">
          <div v-for="group in filteredGroups" :key="group.key">
            <div class="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-2">
              {{ group.label }}
            </div>
            <div class="space-y-1">
              <button v-for="command in group.commands" :key="command.id"
                class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                @click="executeCommand(command)">
                <UIcon :name="command.icon" class="w-5 h-5 text-muted" />
                <div class="flex-1 min-w-0">
                  <div class="font-medium truncate">{{ command.label }}</div>
                  <div v-if="command.subtitle" class="text-sm text-muted truncate">
                    {{ command.subtitle }}
                  </div>
                </div>
                <kbd v-if="command.shortcut" class="px-2 py-1 text-xs bg-muted rounded">
                  {{ command.shortcut }}
                </kbd>
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredGroups.length === 0" class="text-center py-8 text-muted">
            <UIcon name="i-lucide-search-x" class="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No results found for "{{ searchQuery }}"</p>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
