import type { AuthState, Character, CharacterSnapshot, Profile, PublicCharacterData, PublicLookupResponse } from "@/types/character"

const API_BASE = "/api/v1"

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed with status ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Auth
  getAuthState(): Promise<AuthState> {
    return fetchJSON("/auth/me")
  },

  logout(): Promise<void> {
    return fetchJSON("/auth/logout", { method: "POST" })
  },

  listProfiles(): Promise<Profile[]> {
    return fetchJSON("/auth/profiles")
  },

  // Characters
  listCharacters(params?: { account?: string; league?: string; profileId?: number }): Promise<Character[]> {
    const searchParams = new URLSearchParams()
    if (params?.account) searchParams.set("account", params.account)
    if (params?.league) searchParams.set("league", params.league)
    if (params?.profileId) searchParams.set("profileId", String(params.profileId))
    const qs = searchParams.toString()
    return fetchJSON(`/characters${qs ? "?" + qs : ""}`)
  },

  listLeagues(): Promise<string[]> {
    return fetchJSON("/characters/leagues")
  },

  getCharacter(id: number): Promise<Character> {
    return fetchJSON(`/characters/${id}`)
  },

  importCharacters(): Promise<Character[]> {
    return fetchJSON("/characters/import", { method: "POST" })
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

  // Public lookup
  lookupPublicCharacter(accountName: string, characterName: string): Promise<PublicLookupResponse> {
    return fetchJSON("/public/lookup", {
      method: "POST",
      body: JSON.stringify({ accountName, characterName }),
    })
  },

  getSharedCharacter(shareCode: string): Promise<PublicCharacterData> {
    return fetchJSON(`/public/share/${shareCode}`)
  },
}
