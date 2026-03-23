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
      // Update the displayed character level from the fresh snapshot data
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Characters
          </Link>
          <h1 className="text-3xl font-bold">{character.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className="text-sm">
              Level {character.level}
            </Badge>
            <Badge variant="secondary">
              {character.ascendancy || character.class}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {character.league || "Standard"}
            </span>
            <span className="text-xs text-muted-foreground">
              {character.accountName}
            </span>
          </div>
        </div>
        <Button onClick={handleSnapshot} disabled={snapshotting}>
          {snapshotting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Camera className="mr-2 h-4 w-4" />
          )}
          {snapshotting ? "Snapshotting..." : "Take Snapshot"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Snapshot Selector */}
      {snapshots.length > 0 && (
        <SnapshotSelector
          snapshots={snapshots}
          activeId={activeSnapshot?.id ?? 0}
          onSelect={handleSelectSnapshot}
        />
      )}

      {/* Content — single overview: equipment, skills, passive tree */}
      {activeSnapshot ? (
        <div className="space-y-6">
          <GearPanel items={activeSnapshot.items || []} gems={activeSnapshot.gems || []} jewels={activeSnapshot.passiveTree?.jewels} characterId={charId} />

          <ActiveSkillsSummary gems={activeSnapshot.gems || []} items={activeSnapshot.items || []} />

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
