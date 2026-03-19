export interface Profile {
  id: number
  accountName: string
  realm: string
}

export interface AuthState {
  authenticated: boolean
  profile?: Profile
}

export interface Character {
  id: number
  profileId?: number
  accountName: string
  name: string
  league: string
  classId: number
  class: string
  ascendancy: string
  level: number
  experience: number
  createdAt: string
  updatedAt: string
}

export interface CharacterSnapshot {
  id: number
  characterId: number
  level: number
  experience: number
  snapshotAt: string
  items: Item[]
  gems: Gem[]
  passiveTree: PassiveTree | null
}

export interface Item {
  id: number
  snapshotId: number
  name: string
  typeLine: string
  baseType: string
  frameType: number
  slot: string
  iconUrl: string
  ilvl: number
  identified: boolean
  corrupted: boolean
  sockets: Socket[]
  properties: ItemProperty[]
  mods: ItemMods
}

export interface Socket {
  group: number
  attr: string
  color: string
}

export interface ItemProperty {
  name: string
  values: [string, number][]
}

export interface ItemMods {
  implicitMods?: string[]
  explicitMods?: string[]
  craftedMods?: string[]
  enchantMods?: string[]
  fracturedMods?: string[]
}

export interface Gem {
  id: number
  snapshotId: number
  itemSlot: string
  socketGroup: number
  name: string
  typeLine: string
  iconUrl: string
  level: number
  quality: number
  isSupport: boolean
}

export interface PassiveTree {
  id: number
  snapshotId: number
  hashes: number[]
  masteries: MasteryAlloc[]
  keystones: string[]
  jewels: TreeJewel[]
}

export interface MasteryAlloc {
  nodeHash: number
  effectHash: number
  effect: string
}

export interface TreeJewel {
  nodeHash: number
  itemId: string
  name: string
  typeLine: string
}

export interface PublicCharacterData {
  character: Character
  items: Item[]
  gems: Gem[]
  passiveTree: PassiveTree | null
}

export interface PublicLookupResponse {
  shareCode: string
  expiresAt: string
  data: PublicCharacterData
}
