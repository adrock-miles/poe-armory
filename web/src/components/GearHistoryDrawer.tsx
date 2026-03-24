import { useState, useEffect } from "react"
import { History, ChevronRight } from "lucide-react"
import { api } from "@/lib/api"
import type { GearHistoryEntry } from "@/types/character"
import { frameTypeToColor, formatDate, slotDisplayName } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ItemModList } from "./ItemModList"
import { SocketDots } from "./SocketDots"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

interface Props {
  characterId: number
  slot: string
  open: boolean
  onClose: () => void
}

export function GearHistoryDrawer({ characterId, slot, open, onClose }: Props) {
  const [history, setHistory] = useState<GearHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError("")
    setExpandedIdx(null)
    api
      .getGearHistory(characterId, slot)
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [open, characterId, slot])

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2 text-sm">
            <History className="h-4 w-4 text-muted-foreground" />
            {slotDisplayName(slot)} History
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {loading && (
            <div className="text-center text-muted-foreground py-8 text-sm">Loading history...</div>
          )}

          {error && (
            <div className="text-center text-destructive py-8 text-sm">{error}</div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No history available for this slot.
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

              <div className="space-y-1">
                {history.map((entry, idx) => (
                  <HistoryEntry
                    key={idx}
                    entry={entry}
                    isLatest={idx === 0}
                    expanded={expandedIdx === idx}
                    onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function HistoryEntry({
  entry,
  isLatest,
  expanded,
  onToggle,
}: {
  entry: GearHistoryEntry
  isLatest: boolean
  expanded: boolean
  onToggle: () => void
}) {
  const item = entry.item
  const borderColor = frameTypeToColor(item.frameType)

  return (
    <div className="relative pl-9">
      {/* Timeline dot */}
      <div
        className="absolute left-[11px] top-3 w-[9px] h-[9px] rounded-full border-2"
        style={{
          borderColor,
          backgroundColor: isLatest ? borderColor : "transparent",
        }}
      />

      <div
        className="rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer p-2.5"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {item.iconUrl && (
            <img
              src={item.iconUrl}
              alt={item.typeLine}
              className="w-8 h-8 object-contain flex-shrink-0"
              loading="lazy"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium truncate" style={{ color: borderColor }}>
                {item.name || item.typeLine}
              </span>
              {isLatest && (
                <Badge className="text-[8px] px-1 py-0 bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-700">
                  Current
                </Badge>
              )}
            </div>
            {item.name && (
              <div className="text-[10px] text-muted-foreground truncate">{item.typeLine}</div>
            )}
            <div className="text-[10px] text-muted-foreground/70 mt-0.5">
              {formatDate(entry.firstSeenAt)}
              {entry.snapshotCount > 1 && (
                <span> — {formatDate(entry.lastSeenAt)}</span>
              )}
              {entry.snapshotCount > 1 && (
                <span className="ml-1 text-muted-foreground/50">
                  ({entry.snapshotCount} snapshots)
                </span>
              )}
            </div>
          </div>
          <ChevronRight
            className={`h-3.5 w-3.5 text-muted-foreground/40 transition-transform flex-shrink-0 ${expanded ? "rotate-90" : ""}`}
          />
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
            <div className="flex gap-1 flex-wrap">
              {item.corrupted && (
                <Badge variant="destructive" className="text-[9px] px-1 py-0">Corrupted</Badge>
              )}
              {item.ilvl > 0 && (
                <Badge variant="outline" className="text-[9px] px-1 py-0">iLvl {item.ilvl}</Badge>
              )}
            </div>

            <SocketDots sockets={item.sockets} size="sm" />

            <div className="space-y-0.5 max-h-[150px] overflow-y-auto">
              <ItemModList mods={item.mods} fontSize="xs" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
