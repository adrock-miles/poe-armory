import type { CharacterSnapshot } from "@/types/character"
import { formatDate } from "@/lib/utils"
import { Clock } from "lucide-react"

interface Props {
  snapshots: CharacterSnapshot[]
  activeId: number
  onSelect: (id: number) => void
}

export function SnapshotSelector({ snapshots, activeId, onSelect }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <select
        value={activeId}
        onChange={(e) => onSelect(Number(e.target.value))}
        className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
      >
        {snapshots.map((snap) => (
          <option key={snap.id} value={snap.id}>
            {formatDate(snap.snapshotAt)} — Lv {snap.level}
          </option>
        ))}
      </select>
      <span className="text-xs text-muted-foreground flex-shrink-0">
        {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""}
      </span>
    </div>
  )
}
