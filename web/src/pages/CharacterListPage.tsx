import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { api } from "@/lib/api"
import type { Character } from "@/types/character"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { Download, Camera, Trash2, Search } from "lucide-react"

export function CharacterListPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [accountName, setAccountName] = useState("")
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadCharacters()
  }, [])

  async function loadCharacters() {
    setLoading(true)
    try {
      const chars = await api.listCharacters()
      setCharacters(Array.isArray(chars) ? chars : [])
    } catch {
      // No characters yet
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
      await loadCharacters()
      setAccountName("")
    } catch (err: any) {
      setError(err.message || "Failed to import characters")
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
          Import and track your Path of Exile characters over time.
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
            The account profile must be set to public, or configure your POESESSID in settings.
          </p>
        </CardContent>
      </Card>

      {/* Character List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading characters...</div>
      ) : characters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Search className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No characters imported yet.</p>
            <p className="text-sm">Enter a PoE account name above to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_120px_100px_140px_120px_100px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div>Character</div>
            <div>Class</div>
            <div>Level</div>
            <div>League</div>
            <div>Updated</div>
            <div className="text-right">Actions</div>
          </div>

          {characters.map((char) => (
            <Card key={char.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <div className="grid grid-cols-[1fr_120px_100px_140px_120px_100px] gap-4 items-center">
                  <div>
                    <Link
                      to={`/characters/${char.id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {char.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{char.accountName}</div>
                  </div>
                  <div>
                    <Badge variant="outline" className={classColors[char.class] || ""}>
                      {char.ascendancy || char.class}
                    </Badge>
                  </div>
                  <div className="font-mono text-sm">{char.level}</div>
                  <div className="text-sm text-muted-foreground">{char.league || "Standard"}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(char.updatedAt)}</div>
                  <div className="flex gap-1 justify-end">
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
      )}
    </div>
  )
}
