/**
 * People Store
 *
 * Unified people management with persistence, presence tracking, and shared wallets.
 * Provides a relationship-centric view of all contacts.
 */
import { defineStore } from 'pinia'

// ============================================================================
// Store Definition (Composition API)
// ============================================================================

export const usePeopleStore = defineStore('people', () => {
  // === STATE ===
  const people = ref<Map<string, Person>>(new Map())
  const sharedWallets = ref<Map<string, SharedWallet>>(new Map())
  const searchQuery = ref('')
  const sortBy = ref<'recent' | 'name' | 'favorite'>('recent')
  const initialized = ref(false)

  // === INITIALIZATION ===
  async function initialize() {
    if (initialized.value) return

    // Load people
    const storedPeople = localStorage.getItem(STORAGE_KEYS.PEOPLE)
    if (storedPeople) {
      try {
        const data = JSON.parse(storedPeople)
        // Convert bigint strings back to bigint
        const entries = data.map(([id, person]: [string, Person]) => {
          return [
            id,
            {
              ...person,
              totalSent: BigInt(person.totalSent || 0),
              totalReceived: BigInt(person.totalReceived || 0),
            },
          ]
        })
        people.value = new Map(entries)
      } catch (e) {
        console.error('Failed to load people:', e)
      }
    }

    // Load shared wallets
    const storedWallets = localStorage.getItem(STORAGE_KEYS.SHARED_WALLETS)
    if (storedWallets) {
      try {
        const data = JSON.parse(storedWallets)
        const entries = data.map(([id, wallet]: [string, SharedWallet]) => {
          return [
            id,
            {
              ...wallet,
              balanceSats: BigInt(wallet.balanceSats || 0),
            },
          ]
        })
        sharedWallets.value = new Map(entries)
      } catch (e) {
        console.error('Failed to load shared wallets:', e)
      }
    }

    initialized.value = true
  }

  function persistPeople() {
    const data = Array.from(people.value.entries()).map(([id, person]) => {
      return [
        id,
        {
          ...person,
          totalSent: person.totalSent.toString(),
          totalReceived: person.totalReceived.toString(),
        },
      ]
    })
    localStorage.setItem(STORAGE_KEYS.PEOPLE, JSON.stringify(data))
  }

  function persistWallets() {
    const data = Array.from(sharedWallets.value.entries()).map(
      ([id, wallet]) => {
        return [
          id,
          {
            ...wallet,
            balanceSats: wallet.balanceSats.toString(),
          },
        ]
      },
    )
    localStorage.setItem(STORAGE_KEYS.SHARED_WALLETS, JSON.stringify(data))
  }

  // === GETTERS ===

  /** All people sorted by current sort preference */
  const allPeople = computed(() => {
    const list = Array.from(people.value.values())
    return sortPeople(list)
  })

  /** People filtered by search query */
  const filteredPeople = computed(() => {
    if (!searchQuery.value.trim()) return allPeople.value

    const query = searchQuery.value.toLowerCase()
    return allPeople.value.filter(
      person =>
        person.name.toLowerCase().includes(query) ||
        person.address.toLowerCase().includes(query) ||
        person.tags.some(tag => tag.toLowerCase().includes(query)),
    )
  })

  /** Favorite people */
  const favorites = computed(() =>
    allPeople.value.filter(person => person.isFavorite),
  )

  /** Online people */
  const onlinePeople = computed(() =>
    allPeople.value.filter(person => person.isOnline),
  )

  /** People who can sign (have public key) */
  const signers = computed(() =>
    allPeople.value.filter(person => person.canSign),
  )

  /** All shared wallets */
  const allWallets = computed(() =>
    Array.from(sharedWallets.value.values()).sort(
      (a, b) => (b.lastActivityAt || 0) - (a.lastActivityAt || 0),
    ),
  )

  /** Get person by ID */
  function getById(id: string): Person | undefined {
    return people.value.get(id)
  }

  /** Get person by address */
  function getByAddress(address: string): Person | undefined {
    return allPeople.value.find(p => p.address === address)
  }

  /** Get person by peer ID */
  function getByPeerId(peerId: string): Person | undefined {
    return allPeople.value.find(p => p.peerId === peerId)
  }

  /** Get person by public key hex */
  function getByPublicKey(publicKeyHex: string): Person | undefined {
    return allPeople.value.find(p => p.publicKeyHex === publicKeyHex)
  }

  /** Get shared wallet by ID */
  function getWallet(id: string): SharedWallet | undefined {
    return sharedWallets.value.get(id)
  }

  // === ACTIONS ===

  function addPerson(input: PersonInput): Person {
    const id = generateId('person')
    const now = Date.now()
    const person: Person = {
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
    }

    people.value.set(id, person)
    persistPeople()
    return person
  }

  function updatePerson(id: string, update: PersonUpdate): Person | undefined {
    const person = people.value.get(id)
    if (!person) return undefined

    const updated: Person = {
      ...person,
      ...update,
      updatedAt: Date.now(),
    }

    people.value.set(id, updated)
    persistPeople()
    return updated
  }

  function removePerson(id: string): boolean {
    const deleted = people.value.delete(id)
    if (deleted) {
      persistPeople()
    }
    return deleted
  }

  function addSharedWallet(input: SharedWalletInput): SharedWallet {
    const id = generateId('wallet')
    const now = Date.now()
    const wallet: SharedWallet = {
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
    }

    sharedWallets.value.set(id, wallet)
    persistWallets()

    // Update participants' sharedWalletIds (skip 'self' which is the current user)
    for (const participant of input.participants) {
      if (participant.personId === 'self' || participant.isMe) continue
      const person = people.value.get(participant.personId)
      if (person && !person.sharedWalletIds.includes(id)) {
        person.sharedWalletIds.push(id)
      }
    }
    persistPeople()

    return wallet
  }

  function updateSharedWallet(
    id: string,
    update: SharedWalletUpdate,
  ): SharedWallet | undefined {
    const wallet = sharedWallets.value.get(id)
    if (!wallet) return undefined

    const updated: SharedWallet = {
      ...wallet,
      ...update,
      updatedAt: Date.now(),
    }

    sharedWallets.value.set(id, updated)
    persistWallets()
    return updated
  }

  function removeSharedWallet(id: string): boolean {
    const wallet = sharedWallets.value.get(id)
    if (!wallet) return false

    // Remove from participants' sharedWalletIds
    for (const participant of wallet.participants) {
      if (participant.personId === 'self' || participant.isMe) continue
      const person = people.value.get(participant.personId)
      if (person) {
        person.sharedWalletIds = person.sharedWalletIds.filter(
          wid => wid !== id,
        )
      }
    }
    persistPeople()

    sharedWallets.value.delete(id)
    persistWallets()
    return true
  }

  // === PRESENCE ===

  function updatePresence(peerId: string, isOnline: boolean) {
    const person = getByPeerId(peerId)
    if (person) {
      person.isOnline = isOnline
      if (!isOnline) {
        person.lastSeenAt = Date.now()
      }
      persistPeople()
    }
  }

  function setAllOffline() {
    const now = Date.now()
    people.value.forEach(person => {
      if (person.isOnline) {
        person.isOnline = false
        person.lastSeenAt = now
      }
    })
    persistPeople()
  }

  // === ACTIVITY TRACKING ===

  function recordActivity(
    personId: string,
    amountSats: bigint,
    isSend: boolean,
  ) {
    const person = people.value.get(personId)
    if (!person) return

    person.lastActivityAt = Date.now()
    person.transactionCount++
    if (isSend) {
      person.totalSent += amountSats
    } else {
      person.totalReceived += amountSats
    }
    person.updatedAt = Date.now()

    persistPeople()
  }

  // === FAVORITES AND GROUPS ===

  function toggleFavorite(personId: string) {
    const person = people.value.get(personId)
    if (!person) return

    person.isFavorite = !person.isFavorite
    person.updatedAt = Date.now()

    persistPeople()
  }

  function assignToGroup(personId: string, groupId: string) {
    const person = people.value.get(personId)
    if (!person) return

    // Add groupId to tags if not already present
    if (!person.tags.includes(groupId)) {
      person.tags.push(groupId)
      person.updatedAt = Date.now()
      persistPeople()
    }
  }

  // === HELPERS ===

  function sortPeople(list: Person[]): Person[] {
    // Favorites first, then by sort preference
    const favorites = list.filter(p => p.isFavorite)
    const others = list.filter(p => !p.isFavorite)

    const sortFn = (a: Person, b: Person) => {
      switch (sortBy.value) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'favorite':
          return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)
        case 'recent':
        default:
          return (
            (b.lastActivityAt || b.createdAt) -
            (a.lastActivityAt || a.createdAt)
          )
      }
    }

    return [...favorites.sort(sortFn), ...others.sort(sortFn)]
  }

  function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  return {
    // State
    people,
    sharedWallets,
    searchQuery,
    sortBy,
    initialized,

    // Getters
    allPeople,
    filteredPeople,
    favorites,
    onlinePeople,
    signers,
    allWallets,

    // Lookups
    getById,
    getByAddress,
    getByPeerId,
    getByPublicKey,
    getWallet,

    // Actions
    initialize,
    addPerson,
    updatePerson,
    removePerson,
    addSharedWallet,
    updateSharedWallet,
    removeSharedWallet,

    // Presence
    updatePresence,
    setAllOffline,

    // Activity
    recordActivity,

    // Favorites and Groups
    toggleFavorite,
    assignToGroup,
  }
})
