import type { CharacterSnapshot } from "@/types/character"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { formatDate } from "@/lib/utils"
import { Clock } from "lucide-react"

interface Props {
  snapshots: CharacterSnapshot[]
  activeId: number
  onSelect: (id: number) => void
}

export function SnapshotSelector({ snapshots, activeId, onSelect }: Props) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Snapshots</span>
          <span className="text-xs text-muted-foreground">({snapshots.length})</span>
        </div>
        <ScrollArea className="w-full">
          <div className="flex gap-2">
            {snapshots.map((snap) => (
              <Button
                key={snap.id}
                variant={snap.id === activeId ? "default" : "outline"}
                size="sm"
                className="whitespace-nowrap flex-shrink-0"
                onClick={() => onSelect(snap.id)}
              >
                <div className="text-left">
                  <div className="text-xs">{formatDate(snap.snapshotAt)}</div>
                  <div className="text-xs opacity-70">Lv {snap.level}</div>
                </div>
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
