import type { Item } from "@/types/character"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { frameTypeToColor, slotDisplayName } from "@/lib/utils"

interface Props {
  items: Item[]
}

const SLOT_ORDER = [
  "Weapon", "Offhand", "Helm", "BodyArmour", "Gloves", "Boots",
  "Amulet", "Ring", "Ring2", "Belt",
  "Flask",
]

export function GearPanel({ items }: Props) {
  const sortedItems = [...items].sort((a, b) => {
    const ai = SLOT_ORDER.indexOf(a.slot)
    const bi = SLOT_ORDER.indexOf(b.slot)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  // Split into equipment and flasks
  const equipment = sortedItems.filter((i) => !i.slot.startsWith("Flask"))
  const flasks = sortedItems.filter((i) => i.slot.startsWith("Flask"))

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No equipment data in this snapshot.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Equipment Grid - poe.ninja style layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {equipment.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>

      {/* Flasks */}
      {flasks.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Flasks</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {flasks.map((item) => (
                <ItemCard key={item.id} item={item} compact />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ItemCard({ item, compact }: { item: Item; compact?: boolean }) {
  const borderColor = frameTypeToColor(item.frameType)

  return (
    <Card
      className="overflow-hidden transition-colors hover:bg-accent/30"
      style={{ borderLeftColor: borderColor, borderLeftWidth: "3px" }}
    >
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div className="flex gap-3">
          {/* Item Icon */}
          {item.iconUrl && (
            <div className="flex-shrink-0">
              <img
                src={item.iconUrl}
                alt={item.typeLine}
                className="w-12 h-12 object-contain"
                loading="lazy"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Slot Label */}
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              {slotDisplayName(item.slot)}
            </div>

            {/* Item Name */}
            {item.name && (
              <div className="font-medium text-sm truncate" style={{ color: borderColor }}>
                {item.name}
              </div>
            )}
            <div className="text-xs text-muted-foreground truncate" style={!item.name ? { color: borderColor } : {}}>
              {item.typeLine}
            </div>

            {/* Sockets */}
            {item.sockets && item.sockets.length > 0 && (
              <div className="flex gap-1 mt-1">
                {item.sockets.map((s, i) => (
                  <SocketIcon key={i} color={s.attr} />
                ))}
              </div>
            )}

            {/* Mods (compact view) */}
            {!compact && (
              <div className="mt-2 space-y-0.5">
                {item.mods?.enchantMods?.map((mod, i) => (
                  <div key={`e${i}`} className="text-xs text-cyan-400">{mod}</div>
                ))}
                {item.mods?.implicitMods?.map((mod, i) => (
                  <div key={`i${i}`} className="text-xs text-blue-400">{mod}</div>
                ))}
                {item.mods?.explicitMods?.map((mod, i) => (
                  <div key={`x${i}`} className="text-xs text-blue-300">{mod}</div>
                ))}
                {item.mods?.craftedMods?.map((mod, i) => (
                  <div key={`c${i}`} className="text-xs text-cyan-300">{mod}</div>
                ))}
                {item.mods?.fracturedMods?.map((mod, i) => (
                  <div key={`f${i}`} className="text-xs text-amber-400">{mod}</div>
                ))}
              </div>
            )}

            {/* Item properties badges */}
            <div className="flex gap-1 mt-1 flex-wrap">
              {item.corrupted && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0">Corrupted</Badge>
              )}
              {item.ilvl > 0 && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">iLvl {item.ilvl}</Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SocketIcon({ color }: { color: string }) {
  const colors: Record<string, string> = {
    S: "bg-red-600",     // Strength
    D: "bg-green-600",   // Dexterity
    I: "bg-blue-600",    // Intelligence
    G: "bg-gray-400",    // White
    A: "bg-gray-600",    // Abyss
    DV: "bg-gray-600",   // Delve
  }
  return (
    <span className={`inline-block w-3 h-3 rounded-full ${colors[color] || "bg-gray-500"}`} />
  )
}
