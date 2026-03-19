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
  listCharacters(account?: string): Promise<Character[]> {
    const params = account ? `?account=${encodeURIComponent(account)}` : ""
    return fetchJSON(`/characters${params}`)
  },

  getCharacter(id: number): Promise<Character> {
    return fetchJSON(`/characters/${id}`)
  },

  importCharacters(accountName: string): Promise<Character[]> {
    return fetchJSON("/characters/import", {
      method: "POST",
      body: JSON.stringify({ accountName }),
    })
  },

  deleteCharacter(id: number): Promise<void> {
    return fetchJSON(`/characters/${id}`, { method: "DELETE" })
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
