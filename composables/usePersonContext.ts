/**
 * Person Context Composable
 *
 * Phase 4: Unified person interface (replaces useContactContext)
 *
 * Provides a unified interface for person-related UI.
 * Combines data from people, identity, and musig2 stores.
 *
 * This composable eliminates the need for components to import multiple stores
 * and manually coordinate data from different sources.
 *
 * Usage:
 * ```typescript
 * const {
 *   person,
 *   identity,
 *   isOnline,
 *   send,
 * } = usePersonContext(personId)
 * ```
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Online status enum
 */
export type OnlineStatus = 'online' | 'offline' | 'unknown'

/**
 * Person context returned by the composable
 */
export interface PersonContext {
  // === Data ===
  /** The person record */
  person: ComputedRef<Person | null>
  /** Resolved identity from identity store */
  identity: ComputedRef<Identity | null>
  /** Current online status */
  onlineStatus: ComputedRef<OnlineStatus>
  /** Number of transactions with this person */
  transactionCount: ComputedRef<number>
  /** Whether the person is currently online */
  isOnline: ComputedRef<boolean>
  /** Whether the person is a favorite */
  isFavorite: ComputedRef<boolean>
  /** Display name for the person */
  displayName: ComputedRef<string>
  /** Public key hex */
  publicKeyHex: ComputedRef<string | undefined>
  /** Relationship level */
  level: ComputedRef<RelationshipLevel>
  /** Whether the person can sign transactions */
  canSign: ComputedRef<boolean>
  /** Person's address */
  address: ComputedRef<string | undefined>
  /** Person's tags */
  tags: ComputedRef<string[]>
  /** Person's notes */
  notes: ComputedRef<string | undefined>

  // === Actions ===
  /** Navigate to send page with this person as recipient */
  send: () => Promise<void>
  /** Navigate to edit this person */
  edit: () => Promise<void>
  /** Delete this person */
  remove: () => Promise<boolean>
  /** Copy address to clipboard */
  copyAddress: () => Promise<void>
  /** Copy public key to clipboard */
  copyPublicKey: () => Promise<void>
  /** Toggle favorite status */
  toggleFavorite: () => boolean | undefined
  /** Assign to a group */
  assignToGroup: (groupId: string | null) => void
  /** Update the person */
  update: (updates: Partial<Person>) => Promise<Person | undefined>
}

// ============================================================================
// Composable
// ============================================================================

/**
 * Get unified context for a person
 *
 * @param personId - Person ID (string or ref)
 * @returns PersonContext with reactive data and actions
 */
export function usePersonContext(
  personId: string | Ref<string>,
): PersonContext {
  const peopleStore = usePeopleStore()
  const identityStore = useIdentityStore()
  const { openSendModal } = useOverlays()

  // Resolve the ID (handles both string and ref)
  const id = computed(() => unref(personId))

  // === Computed Data ===

  const person = computed(() => peopleStore.getById(id.value) ?? null)

  const identity = computed((): Identity | null => {
    if (!person.value) return null

    // Use publicKeyHex to look up identity
    if (person.value.publicKeyHex) {
      return identityStore.get(person.value.publicKeyHex) ?? null
    }

    return null
  })

  const onlineStatus = computed((): OnlineStatus => {
    if (!person.value) return 'unknown'
    if (person.value.isOnline) return 'online'
    return 'offline'
  })

  const isOnline = computed(() => person.value?.isOnline ?? false)

  const transactionCount = computed(() => person.value?.transactionCount ?? 0)

  const isFavorite = computed(() => person.value?.isFavorite ?? false)

  const displayName = computed(() => person.value?.name ?? 'Unknown')

  const publicKeyHex = computed(() => person.value?.publicKeyHex)

  const level = computed((): RelationshipLevel => person.value?.level ?? 0)

  const canSign = computed(() => person.value?.canSign ?? false)

  const address = computed(() => person.value?.address)

  const tags = computed(() => person.value?.tags ?? [])

  const notes = computed(() => person.value?.notes)

  // === Actions ===

  async function send(): Promise<void> {
    if (!person.value?.address) return

    await openSendModal({ initialRecipient: person.value })
  }

  async function edit(): Promise<void> {
    if (!person.value) return

    await navigateTo({
      path: '/people',
      query: { edit: person.value.id },
    })
  }

  async function remove(): Promise<boolean> {
    if (!person.value) return false
    return peopleStore.removePerson(person.value.id)
  }

  async function copyAddress(): Promise<void> {
    if (!person.value?.address) return

    try {
      await navigator.clipboard.writeText(person.value.address)
    } catch (error) {
      console.error('[usePersonContext] Failed to copy address:', error)
    }
  }

  async function copyPublicKey(): Promise<void> {
    const pubKey = person.value?.publicKeyHex
    if (!pubKey) return

    try {
      await navigator.clipboard.writeText(pubKey)
    } catch (error) {
      console.error('[usePersonContext] Failed to copy public key:', error)
    }
  }

  function toggleFavorite(): boolean | undefined {
    if (!person.value) return undefined
    peopleStore.toggleFavorite(person.value.id)
    return person.value.isFavorite
  }

  function assignToGroup(groupId: string | null): void {
    if (!person.value || !groupId) return
    peopleStore.assignToGroup(person.value.id, groupId)
  }

  async function update(updates: Partial<Person>): Promise<Person | undefined> {
    if (!person.value) return undefined
    return peopleStore.updatePerson(person.value.id, updates)
  }

  // === Return ===

  return {
    // Data
    person,
    identity,
    onlineStatus,
    transactionCount,
    isOnline,
    isFavorite,
    displayName,
    publicKeyHex,
    level,
    canSign,
    address,
    tags,
    notes,

    // Actions
    send,
    edit,
    remove,
    copyAddress,
    copyPublicKey,
    toggleFavorite,
    assignToGroup,
    update,
  }
}
