import type { Gem, Item } from "@/types/character"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { slotDisplayName } from "@/lib/utils"

interface Props {
  gems: Gem[]
  items: Item[]
}

export function GemsPanel({ gems, items }: Props) {
  if (gems.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No gem data in this snapshot.
        </CardContent>
      </Card>
    )
  }

  // Group gems by item slot
  const gemsBySlot = gems.reduce<Record<string, Gem[]>>((acc, gem) => {
    const slot = gem.itemSlot || "Unknown"
    if (!acc[slot]) acc[slot] = []
    acc[slot].push(gem)
    return acc
  }, {})

  // Separate active skills from support gems
  const activeGems = gems.filter((g) => !g.isSupport)
  const supportGems = gems.filter((g) => g.isSupport)

  return (
    <div className="space-y-6">
      {/* Main Skills Overview - poe.ninja style */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Active Skills</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeGems.map((gem) => (
              <div key={gem.id} className="flex items-center gap-2 p-2 rounded-md bg-secondary/50">
                {gem.iconUrl && (
                  <img src={gem.iconUrl} alt={gem.name} className="w-8 h-8 object-contain" loading="lazy" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-poe-gem truncate">{gem.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Lv {gem.level}
                    {gem.quality > 0 && ` / ${gem.quality}%`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gems by Equipment Slot */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Gems by Equipment Slot</h3>
        {Object.entries(gemsBySlot).map(([slot, slotGems]) => {
          const item = items.find((i) => i.slot === slot)
          return (
            <Card key={slot}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    {slotDisplayName(slot)}
                  </span>
                  {item && (
                    <span className="text-xs text-muted-foreground">
                      — {item.name || item.typeLine}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {slotGems.map((gem) => (
                    <GemRow key={gem.id} gem={gem} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Summary</h3>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Active Skills: </span>
              <span className="font-medium">{activeGems.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Support Gems: </span>
              <span className="font-medium">{supportGems.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Gems: </span>
              <span className="font-medium">{gems.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function GemRow({ gem }: { gem: Gem }) {
  return (
    <div className="flex items-center gap-3 py-1">
      {gem.iconUrl && (
        <img src={gem.iconUrl} alt={gem.name} className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
      )}
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${gem.isSupport ? "text-blue-400" : "text-poe-gem font-medium"}`}>
          {gem.name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          Lv {gem.level}
        </Badge>
        {gem.quality > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {gem.quality}% Q
          </Badge>
        )}
        {gem.isSupport && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Support
          </Badge>
        )}
      </div>
    </div>
  )
}
