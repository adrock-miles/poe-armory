import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { api } from "@/lib/api"
import type { Character } from "@/types/character"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { Download, Camera, Trash2, Search, Filter, Users, X, CheckSquare, Square, Loader2 } from "lucide-react"
import { toast } from "sonner"

const CLASS_COLORS: Record<string, string> = {
  Marauder: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  Witch: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  Ranger: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  Duelist: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  Templar: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  Shadow: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300",
  Scion: "bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300",
}

function sortLeagues(a: string, b: string): number {
  if (a === "Standard") return 1
  if (b === "Standard") return -1
  return a.localeCompare(b)
}

export function CharacterListPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [leagues, setLeagues] = useState<string[]>([])
  const [accounts, setAccounts] = useState<string[]>([])
  const [selectedLeague, setSelectedLeague] = useState("")
  const [selectedAccount, setSelectedAccount] = useState("")
  const [accountName, setAccountName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Import preview state
  const [previewing, setPreviewing] = useState(false)
  const [previewChars, setPreviewChars] = useState<Character[]>([])
  const [previewLeague, setPreviewLeague] = useState("")
  const [previewSelected, setPreviewSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [previewAccount, setPreviewAccount] = useState("")

  // Snapshot loading state
  const [snapshottingId, setSnapshottingId] = useState<number | null>(null)

  // Batch delete state
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadFilters()
    loadCharacters()
  }, [])

  useEffect(() => {
    loadCharacters()
  }, [selectedLeague, selectedAccount])

  async function loadFilters() {
    try {
      const [l, a] = await Promise.all([
        api.listLeagues().catch(() => []),
        api.listAccounts().catch(() => []),
      ])
      setLeagues(Array.isArray(l) ? l : [])
      setAccounts(Array.isArray(a) ? a : [])
    } catch {
      // ignore
    }
  }

  async function loadCharacters() {
    setLoading(true)
    try {
      const chars = await api.listCharacters({
        league: selectedLeague || undefined,
        account: selectedAccount || undefined,
      })
      setCharacters(Array.isArray(chars) ? chars : [])
    } catch {
      setCharacters([])
    } finally {
      setLoading(false)
    }
  }

  async function handlePreview() {
    if (!accountName.trim()) return
    setPreviewing(true)
    setError("")
    try {
      const chars = await api.previewCharacters(accountName.trim())
      const charList = Array.isArray(chars) ? chars : []
      setPreviewChars(charList)
      setPreviewAccount(accountName.trim())

      // Find available leagues and default to a non-Standard league if available
      const previewLeagues = [...new Set(charList.map((c) => c.league).filter(Boolean))]
      const nonStandard = previewLeagues.filter((l) => l !== "Standard" && l !== "Standard HC")
      const defaultLeague = nonStandard.length > 0 ? nonStandard[0] : previewLeagues[0] || ""
      setPreviewLeague(defaultLeague)

      // Pre-select all characters in the default league
      const inLeague = charList.filter((c) => c.league === defaultLeague)
      setPreviewSelected(new Set(inLeague.map((c) => c.name)))
    } catch (err: any) {
      setError(err.message || "Failed to fetch characters. Make sure the profile is public.")
    } finally {
      setPreviewing(false)
    }
  }

  function handlePreviewLeagueChange(league: string) {
    setPreviewLeague(league)
    const inLeague = previewChars.filter((c) => c.league === league)
    setPreviewSelected(new Set(inLeague.map((c) => c.name)))
  }

  function togglePreviewChar(name: string) {
    setPreviewSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function toggleAllPreviewInLeague() {
    const inLeague = previewChars.filter((c) => c.league === previewLeague)
    const allSelected = inLeague.every((c) => previewSelected.has(c.name))
    if (allSelected) {
      setPreviewSelected(new Set())
    } else {
      setPreviewSelected(new Set(inLeague.map((c) => c.name)))
    }
  }

  function cancelPreview() {
    setPreviewChars([])
    setPreviewLeague("")
    setPreviewSelected(new Set())
    setPreviewAccount("")
  }

  async function handleImport() {
    if (previewSelected.size === 0) return
    setImporting(true)
    setError("")
    try {
      await api.importCharacters(previewAccount, previewLeague, [...previewSelected])
      cancelPreview()
      setAccountName("")
      await Promise.all([loadCharacters(), loadFilters()])
    } catch (err: any) {
      setError(err.message || "Failed to import characters.")
    } finally {
      setImporting(false)
    }
  }

  async function handleSnapshot(id: number) {
    setSnapshottingId(id)
    try {
      const snap = await api.snapshotCharacter(id)
      // Update character level/details from the snapshot
      if (snap && snap.level) {
        setCharacters((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, level: snap.level, experience: snap.experience, updatedAt: snap.snapshotAt } : c
          )
        )
      }
      toast.success("Snapshot created successfully!")
    } catch (err: any) {
      toast.error(err.message || "Failed to create snapshot")
    } finally {
      setSnapshottingId(null)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this character and all its snapshots?")) return
    try {
      await api.deleteCharacter(id)
      await loadCharacters()
    } catch (err: any) {
      setError(err.message || "Failed to delete character")
    }
  }

  function toggleSelectId(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllInLeague(leagueChars: Character[]) {
    const ids = leagueChars.map((c) => c.id)
    const allSelected = ids.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
      }
      return next
    })
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} character${selectedIds.size !== 1 ? "s" : ""} and all their snapshots?`)) return
    try {
      await api.batchDeleteCharacters([...selectedIds])
      setSelectedIds(new Set())
      setSelectMode(false)
      await Promise.all([loadCharacters(), loadFilters()])
    } catch (err: any) {
      setError(err.message || "Failed to delete characters")
    }
  }

  // Group characters by league
  const charsByLeague = useMemo(
    () =>
      characters.reduce<Record<string, Character[]>>((acc, char) => {
        const league = char.league || "Standard"
        ;(acc[league] ??= []).push(char)
        return acc
      }, {}),
    [characters],
  )

  const leagueOrder = useMemo(
    () => Object.keys(charsByLeague).sort(sortLeagues),
    [charsByLeague],
  )

  const previewLeagueList = useMemo(
    () =>
      [...new Set(previewChars.map((c) => c.league).filter(Boolean))].sort(sortLeagues),
    [previewChars],
  )

  const previewInLeague = useMemo(
    () => previewChars.filter((c) => c.league === previewLeague),
    [previewChars, previewLeague],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Characters</h1>
        <p className="text-muted-foreground">
          Import and track public Path of Exile characters organized by league.
        </p>
      </div>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import Characters</CardTitle>
        </CardHeader>
        <CardContent>
          {previewChars.length === 0 ? (
            <>
              <div className="flex gap-3">
                <Input
                  placeholder="PoE Account Name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePreview()}
                  className="max-w-sm"
                />
                <Button onClick={handlePreview} disabled={previewing || !accountName.trim()}>
                  <Search className="mr-2 h-4 w-4" />
                  {previewing ? "Fetching..." : "Find Characters"}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                The account profile must be set to public on pathofexile.com.
              </p>
            </>
          ) : (
            <div className="space-y-4">
              {/* League selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium">League:</span>
                {previewLeagueList.map((l) => (
                  <Button
                    key={l}
                    variant={previewLeague === l ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePreviewLeagueChange(l)}
                  >
                    {l}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {previewChars.filter((c) => c.league === l).length}
                    </Badge>
                  </Button>
                ))}
                <Button variant="ghost" size="sm" onClick={cancelPreview} className="ml-auto">
                  <X className="mr-1 h-4 w-4" /> Cancel
                </Button>
              </div>

              {/* Character selection */}
              {previewInLeague.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleAllPreviewInLeague}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {previewInLeague.every((c) => previewSelected.has(c.name)) ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      Select All ({previewInLeague.length})
                    </button>
                  </div>

                  <div className="grid gap-1 max-h-64 overflow-y-auto">
                    {previewInLeague.map((char) => (
                      <label
                        key={char.name}
                        className="flex items-center gap-3 p-2 rounded hover:bg-accent/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={previewSelected.has(char.name)}
                          onChange={() => togglePreviewChar(char.name)}
                          className="rounded"
                        />
                        <span className="font-medium text-sm">{char.name}</span>
                        <Badge variant="outline" className={`text-xs ${CLASS_COLORS[char.class] || ""}`}>
                          {char.ascendancy || char.class}
                        </Badge>
                        <span className="font-mono text-xs">Lv {char.level}</span>
                      </label>
                    ))}
                  </div>

                  <Button
                    onClick={handleImport}
                    disabled={importing || previewSelected.size === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {importing ? "Importing..." : `Import ${previewSelected.size} Character${previewSelected.size !== 1 ? "s" : ""}`}
                  </Button>
                </div>
              )}
            </div>
          )}
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* Filters & Batch Actions */}
      {(leagues.length > 0 || accounts.length > 0 || characters.length > 0) && (
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />

          {/* League filter */}
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">All Leagues</option>
            {leagues.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          {/* Account filter */}
          {accounts.length > 1 && (
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
            >
              <option value="">All Accounts</option>
              {accounts.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          )}

          {(selectedLeague || selectedAccount) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedLeague(""); setSelectedAccount("") }}
            >
              Clear Filters
            </Button>
          )}

          <div className="ml-auto flex gap-2">
            {selectMode ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selectedIds.size === 0}
                  onClick={handleBatchDelete}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectMode(false); setSelectedIds(new Set()) }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              characters.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setSelectMode(true)}>
                  <CheckSquare className="mr-1 h-4 w-4" />
                  Select
                </Button>
              )
            )}
          </div>
        </div>
      )}

      {/* Character List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading characters...</div>
      ) : characters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Search className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No characters found.</p>
            <p className="text-sm">Enter a public PoE account name above to import characters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {leagueOrder.map((league) => (
            <div key={league}>
              {/* League Header */}
              <div className="flex items-center gap-2 mb-3">
                {selectMode && (
                  <button
                    onClick={() => toggleSelectAllInLeague(charsByLeague[league])}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Select all in league"
                  >
                    {charsByLeague[league].every((c) => selectedIds.has(c.id)) ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                )}
                <h2 className="text-lg font-semibold">{league}</h2>
                <Badge variant="secondary" className="text-xs">
                  {charsByLeague[league].length} character{charsByLeague[league].length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {/* Characters in this league */}
              <div className="grid gap-2">
                {charsByLeague[league].map((char) => (
                  <Card
                    key={char.id}
                    className={`hover:bg-accent/50 transition-colors ${selectMode && selectedIds.has(char.id) ? "ring-1 ring-primary" : ""}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
                          {selectMode && (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(char.id)}
                              onChange={() => toggleSelectId(char.id)}
                              className="rounded flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-shrink">
                            <Link
                              to={`/characters/${char.id}`}
                              className="font-medium hover:text-primary transition-colors truncate block"
                            >
                              {char.name}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground truncate">{char.accountName}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" className={CLASS_COLORS[char.class] || ""}>
                              {char.ascendancy || char.class}
                            </Badge>
                            <span className="font-mono text-sm">Lv {char.level}</span>
                          </div>
                          <span className="text-xs text-muted-foreground hidden md:inline flex-shrink-0">
                            Updated {formatDate(char.updatedAt)}
                          </span>
                        </div>

                        {!selectMode && (
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSnapshot(char.id)}
                              disabled={snapshottingId === char.id}
                              title="Take Snapshot"
                            >
                              {snapshottingId === char.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Camera className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(char.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
