import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { api } from "@/lib/api"
import type { Character } from "@/types/character"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { Download, Camera, Trash2, Search, Filter, Users } from "lucide-react"

export function CharacterListPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [leagues, setLeagues] = useState<string[]>([])
  const [accounts, setAccounts] = useState<string[]>([])
  const [selectedLeague, setSelectedLeague] = useState("")
  const [selectedAccount, setSelectedAccount] = useState("")
  const [accountName, setAccountName] = useState("")
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState("")

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

  async function handleImport() {
    if (!accountName.trim()) return
    setImporting(true)
    setError("")
    try {
      await api.importCharacters(accountName.trim())
      setAccountName("")
      await Promise.all([loadCharacters(), loadFilters()])
    } catch (err: any) {
      setError(err.message || "Failed to import characters. Make sure the profile is public.")
    } finally {
      setImporting(false)
    }
  }

  async function handleSnapshot(id: number) {
    try {
      await api.snapshotCharacter(id)
      alert("Snapshot created successfully!")
    } catch (err: any) {
      setError(err.message || "Failed to create snapshot")
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

  // Group characters by league
  const charsByLeague = characters.reduce<Record<string, Character[]>>((acc, char) => {
    const league = char.league || "Standard"
    if (!acc[league]) acc[league] = []
    acc[league].push(char)
    return acc
  }, {})

  // Sort leagues: current leagues first, then Standard
  const leagueOrder = Object.keys(charsByLeague).sort((a, b) => {
    if (a === "Standard") return 1
    if (b === "Standard") return -1
    return a.localeCompare(b)
  })

  const classColors: Record<string, string> = {
    Marauder: "bg-red-900/50 text-red-300",
    Witch: "bg-purple-900/50 text-purple-300",
    Ranger: "bg-green-900/50 text-green-300",
    Duelist: "bg-yellow-900/50 text-yellow-300",
    Templar: "bg-blue-900/50 text-blue-300",
    Shadow: "bg-indigo-900/50 text-indigo-300",
    Scion: "bg-gray-700/50 text-gray-300",
  }

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
          <div className="flex gap-3">
            <Input
              placeholder="PoE Account Name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleImport()}
              className="max-w-sm"
            />
            <Button onClick={handleImport} disabled={importing || !accountName.trim()}>
              <Download className="mr-2 h-4 w-4" />
              {importing ? "Importing..." : "Import"}
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            The account profile must be set to public on pathofexile.com.
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      {(leagues.length > 0 || accounts.length > 0) && (
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />

          {/* League filter */}
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
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
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
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
                <h2 className="text-lg font-semibold">{league}</h2>
                <Badge variant="secondary" className="text-xs">
                  {charsByLeague[league].length} character{charsByLeague[league].length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {/* Characters in this league */}
              <div className="grid gap-2">
                {charsByLeague[league].map((char) => (
                  <Card key={char.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="min-w-0">
                            <Link
                              to={`/characters/${char.id}`}
                              className="font-medium hover:text-primary transition-colors"
                            >
                              {char.name}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{char.accountName}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className={classColors[char.class] || ""}>
                            {char.ascendancy || char.class}
                          </Badge>
                          <span className="font-mono text-sm">Lv {char.level}</span>
                          <span className="text-xs text-muted-foreground hidden md:inline">
                            Updated {formatDate(char.updatedAt)}
                          </span>
                        </div>

                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSnapshot(char.id)}
                            title="Take Snapshot"
                          >
                            <Camera className="h-4 w-4" />
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
