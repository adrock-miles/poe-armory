import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { api } from "@/lib/api"
import type { Character, CharacterSnapshot } from "@/types/character"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, Camera, Clock, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { GearPanel } from "@/components/GearPanel"
import { ActiveSkillsSummary } from "@/components/ActiveSkillsSummary"
import { PassiveTreePanel } from "@/components/PassiveTreePanel"
import { SnapshotSelector } from "@/components/SnapshotSelector"

export function CharacterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [character, setCharacter] = useState<Character | null>(null)
  const [snapshots, setSnapshots] = useState<CharacterSnapshot[]>([])
  const [activeSnapshot, setActiveSnapshot] = useState<CharacterSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [snapshotting, setSnapshotting] = useState(false)
  const [error, setError] = useState("")

  const charId = Number(id)

  useEffect(() => {
    loadData()
  }, [charId])

  async function loadData() {
    setLoading(true)
    try {
      const [char, snaps] = await Promise.all([
        api.getCharacter(charId),
        api.listSnapshots(charId).catch(() => []),
      ])
      setCharacter(char)
      const snapList = Array.isArray(snaps) ? snaps : []
      setSnapshots(snapList)

      if (snapList.length > 0) {
        const latest = await api.getSnapshot(snapList[0].id)
        setActiveSnapshot(latest)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSnapshot() {
    setSnapshotting(true)
    try {
      const snap = await api.snapshotCharacter(charId)
      setActiveSnapshot(snap)
      if (character && snap.level !== character.level) {
        setCharacter({ ...character, level: snap.level, experience: snap.experience })
      }
      const snaps = await api.listSnapshots(charId)
      setSnapshots(Array.isArray(snaps) ? snaps : [])
      toast.success("Snapshot created successfully!")
    } catch (err: any) {
      toast.error(err.message || "Failed to create snapshot")
    } finally {
      setSnapshotting(false)
    }
  }

  async function handleSelectSnapshot(snapshotId: number) {
    try {
      const snap = await api.getSnapshot(snapshotId)
      setActiveSnapshot(snap)
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading character...</div>
  }

  if (!character) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Character not found.</p>
        <Link to="/" className="text-primary hover:underline mt-2 inline-block">Back to list</Link>
      </div>
    )
  }

  const ascendancyOrClass = character.ascendancy || character.class

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Characters
      </Link>

      {/* Character header — poe.ninja style */}
      <div className="rounded-lg border border-border bg-card px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: identity */}
          <div className="flex items-start gap-4">
            {/* Class colour stripe */}
            <div className="hidden sm:block w-1 self-stretch rounded-full bg-poe-gem opacity-60" />

            <div>
              <h1 className="text-2xl font-bold tracking-tight leading-none mb-1">
                {character.name}
              </h1>
              <p className="text-sm text-muted-foreground mb-3">
                {character.accountName}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 dark:bg-amber-700/30 dark:text-amber-300 dark:border-amber-700/50 dark:hover:bg-amber-700/40">
                  Level {character.level}
                </Badge>
                <Badge variant="secondary" className="font-medium text-foreground">
                  {ascendancyOrClass}
                </Badge>
                <Badge variant="outline">
                  {character.league || "Standard"}
                </Badge>
                {character.ascendancy && character.ascendancy !== character.class && (
                  <span className="text-xs text-muted-foreground">{character.class}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: snapshot controls */}
          <div className="flex flex-col gap-2 sm:items-end w-full sm:w-auto">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleSnapshot} disabled={snapshotting} size="sm" className="flex-shrink-0">
                {snapshotting ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-3.5 w-3.5" />
                )}
                {snapshotting ? "Snapshotting..." : "Take Snapshot"}
              </Button>
              {snapshots.length > 0 && (
                <SnapshotSelector
                  snapshots={snapshots}
                  activeId={activeSnapshot?.id ?? 0}
                  onSelect={handleSelectSnapshot}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Main content */}
      {activeSnapshot ? (
        <div className="space-y-5">
          {/* Two-column: gear (left) + skills (right) */}
          <div className="grid grid-cols-1 xl:grid-cols-[auto_1fr] gap-5 items-start">
            <GearPanel
              items={activeSnapshot.items || []}
              gems={activeSnapshot.gems || []}
              jewels={activeSnapshot.passiveTree?.jewels}
              characterId={charId}
            />
            <ActiveSkillsSummary
              gems={activeSnapshot.gems || []}
              items={activeSnapshot.items || []}
            />
          </div>

          {/* Passive tree — full width */}
          <PassiveTreePanel tree={activeSnapshot.passiveTree} />
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No snapshots yet.</p>
            <p className="text-sm">Click "Take Snapshot" to capture this character's current state from the PoE API.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
