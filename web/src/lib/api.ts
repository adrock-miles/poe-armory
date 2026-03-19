import type { Character, CharacterSnapshot } from "@/types/character"

const API_BASE = "/api/v1"

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed with status ${res.status}`)
  }
  return res.json()
}

export const api = {
  listCharacters(params?: { account?: string; league?: string; class?: string }): Promise<Character[]> {
    const searchParams = new URLSearchParams()
    if (params?.account) searchParams.set("account", params.account)
    if (params?.league) searchParams.set("league", params.league)
    if (params?.class) searchParams.set("class", params.class)
    const qs = searchParams.toString()
    return fetchJSON(`/characters${qs ? "?" + qs : ""}`)
  },

  listLeagues(): Promise<string[]> {
    return fetchJSON("/characters/leagues")
  },

  listAccounts(): Promise<string[]> {
    return fetchJSON("/characters/accounts")
  },

  getCharacter(id: number): Promise<Character> {
    return fetchJSON(`/characters/${id}`)
  },

  previewCharacters(accountName: string): Promise<Character[]> {
    return fetchJSON("/characters/preview", {
      method: "POST",
      body: JSON.stringify({ accountName }),
    })
  },

  importCharacters(accountName: string, league?: string, characters?: string[]): Promise<Character[]> {
    return fetchJSON("/characters/import", {
      method: "POST",
      body: JSON.stringify({ accountName, league: league || "", characters: characters || [] }),
    })
  },

  deleteCharacter(id: number): Promise<void> {
    return fetchJSON(`/characters/${id}`, { method: "DELETE" })
  },

  batchDeleteCharacters(ids: number[]): Promise<void> {
    return fetchJSON("/characters/batch-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    })
  },

  snapshotCharacter(id: number): Promise<CharacterSnapshot> {
    return fetchJSON(`/characters/${id}/snapshot`, { method: "POST" })
  },

  listSnapshots(characterId: number): Promise<CharacterSnapshot[]> {
    return fetchJSON(`/characters/${characterId}/snapshots`)
  },

  getLatestSnapshot(characterId: number): Promise<CharacterSnapshot> {
    return fetchJSON(`/characters/${characterId}/snapshots/latest`)
  },

  getSnapshot(snapshotId: number): Promise<CharacterSnapshot> {
    return fetchJSON(`/snapshots/${snapshotId}`)
  },
}
