import { useState, useCallback } from "react"
import type { Gem, Item } from "@/types/character"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { frameTypeToColor, slotDisplayName } from "@/lib/utils"

interface Props {
  items: Item[]
  gems: Gem[]
}

// Paper-doll slot positions — mirrors the in-game character equipment layout
// Grid: 7 columns x 6 rows on desktop
const SLOT_POSITIONS: Record<string, { col: string; row: string; label: string }> = {
  Weapon:     { col: "1 / 3", row: "1 / 4", label: "Main Hand" },
  Offhand:    { col: "6 / 8", row: "1 / 4", label: "Off Hand" },
  Helm:       { col: "3 / 6", row: "1 / 2", label: "Helmet" },
  BodyArmour: { col: "3 / 6", row: "2 / 4", label: "Body Armour" },
  Amulet:     { col: "6 / 7", row: "1 / 2", label: "Amulet" },
  Gloves:     { col: "1 / 3", row: "4 / 5", label: "Gloves" },
  Boots:      { col: "6 / 8", row: "4 / 5", label: "Boots" },
  Ring:       { col: "3 / 4", row: "4 / 5", label: "Left Ring" },
  Ring2:      { col: "5 / 6", row: "4 / 5", label: "Right Ring" },
  Belt:       { col: "4 / 5", row: "4 / 5", label: "Belt" },
}

const SOCKET_COLORS: Record<string, string> = {
  S: "bg-red-500",
  D: "bg-green-500",
  I: "bg-blue-500",
  G: "bg-gray-300",
  A: "bg-gray-500",
  DV: "bg-gray-500",
}

export function GearPanel({ items, gems }: Props) {
  const [activePopover, setActivePopover] = useState<number | null>(null)

  // Group gems by item slot
  const gemsBySlot = gems.reduce<Record<string, Gem[]>>((acc, gem) => {
    const slot = gem.itemSlot || "Unknown"
    if (!acc[slot]) acc[slot] = []
    acc[slot].push(gem)
    return acc
  }, {})

  // Build a lookup of items by slot
  const itemsBySlot = items.reduce<Record<string, Item>>((acc, item) => {
    acc[item.slot] = item
    return acc
  }, {})

  const flasks = items.filter((i) => i.slot.startsWith("Flask"))

  const dismiss = useCallback(() => setActivePopover(null), [])

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
      {/* Paper-doll grid */}
      <div
        className="grid gap-2 mx-auto max-w-[700px]"
        style={{
          gridTemplateColumns: "repeat(7, 1fr)",
          gridTemplateRows: "repeat(4, auto)",
        }}
      >
        {Object.entries(SLOT_POSITIONS).map(([slot, pos]) => {
          const item = itemsBySlot[slot]
          const slotGems = gemsBySlot[slot] || []
          return (
            <EquipmentSlot
              key={slot}
              slot={slot}
              label={pos.label}
              item={item}
              gems={slotGems}
              col={pos.col}
              row={pos.row}
              activePopover={activePopover}
              setActivePopover={setActivePopover}
            />
          )
        })}
      </div>

      {/* Flasks row */}
      {flasks.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2 text-center">Flasks</h3>
          <div className="flex justify-center gap-2 flex-wrap">
            {flasks.map((item) => (
              <FlaskSlot
                key={item.id}
                item={item}
                activePopover={activePopover}
                setActivePopover={setActivePopover}
              />
            ))}
          </div>
        </div>
      )}

      {/* Click-away overlay for mobile */}
      {activePopover !== null && (
        <div className="fixed inset-0 z-40" onClick={dismiss} />
      )}
    </div>
  )
}

function EquipmentSlot({
  slot,
  label,
  item,
  gems,
  col,
  row,
  activePopover,
  setActivePopover,
}: {
  slot: string
  label: string
  item?: Item
  gems: Gem[]
  col: string
  row: string
  activePopover: number | null
  setActivePopover: (id: number | null) => void
}) {
  const borderColor = item ? frameTypeToColor(item.frameType) : "#2a2520"

  // Group gems by socket group for link display
  const gemGroups = gems.reduce<Record<number, Gem[]>>((acc, gem) => {
    const g = gem.socketGroup ?? 0
    if (!acc[g]) acc[g] = []
    acc[g].push(gem)
    return acc
  }, {})

  const handleTap = useCallback(() => {
    if (!item) return
    setActivePopover(activePopover === item.id ? null : item.id)
  }, [item, activePopover, setActivePopover])

  const isActive = item && activePopover === item.id

  return (
    <div
      className="relative group"
      style={{ gridColumn: col, gridRow: row }}
    >
      <div
        className="relative flex flex-col items-center justify-center rounded-lg border bg-[#1a1612] p-1.5 h-full min-h-[80px] cursor-pointer transition-colors hover:bg-[#252018]"
        style={{ borderColor, borderWidth: item ? "2px" : "1px" }}
        onClick={handleTap}
      >
        {/* Slot label */}
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5 text-center leading-tight">
          {label}
        </div>

        {item ? (
          <>
            {/* Item icon */}
            {item.iconUrl && (
              <img
                src={item.iconUrl}
                alt={item.typeLine}
                className="w-12 h-12 md:w-14 md:h-14 object-contain"
                loading="lazy"
              />
            )}

            {/* Item name */}
            <div
              className="text-[10px] font-medium text-center truncate w-full mt-0.5 leading-tight"
              style={{ color: borderColor }}
            >
              {item.name || item.typeLine}
            </div>

            {/* Gem overlay — small icons along bottom */}
            {gems.length > 0 && (
              <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                {Object.entries(gemGroups).map(([groupIdx, groupGems]) => (
                  <GemLinkGroup key={groupIdx} gems={groupGems} activePopover={activePopover} setActivePopover={setActivePopover} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-muted-foreground/30 text-xs">Empty</div>
        )}
      </div>

      {/* Item + gem popover */}
      {isActive && item && (
        <ItemPopover item={item} gems={gems} gemGroups={gemGroups} />
      )}
    </div>
  )
}

function GemLinkGroup({
  gems,
  activePopover,
  setActivePopover,
}: {
  gems: Gem[]
  activePopover: number | null
  setActivePopover: (id: number | null) => void
}) {
  return (
    <div className="flex items-center">
      {gems.map((gem, i) => (
        <div key={gem.id} className="flex items-center">
          {i > 0 && (
            <div className="w-1 h-[2px] bg-amber-600/60" />
          )}
          <div className="relative group/gem">
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center cursor-pointer transition-transform hover:scale-125 ${
                gem.isSupport
                  ? "border-blue-400/60 bg-blue-900/50"
                  : "border-amber-400/60 bg-amber-900/50"
              }`}
              onClick={(e) => {
                e.stopPropagation()
                setActivePopover(activePopover === gem.id + 100000 ? null : gem.id + 100000)
              }}
            >
              {gem.iconUrl && (
                <img src={gem.iconUrl} alt={gem.name} className="w-3 h-3 object-contain" />
              )}
            </div>
            {/* Desktop hover tooltip */}
            <div className="hidden group-hover/gem:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 pointer-events-none">
              <GemTooltipInner gem={gem} />
            </div>
            {/* Mobile tap popover */}
            {activePopover === gem.id + 100000 && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50">
                <GemTooltipInner gem={gem} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function FlaskSlot({
  item,
  activePopover,
  setActivePopover,
}: {
  item: Item
  activePopover: number | null
  setActivePopover: (id: number | null) => void
}) {
  const borderColor = frameTypeToColor(item.frameType)
  const isActive = activePopover === item.id

  return (
    <div className="relative">
      <div
        className="flex flex-col items-center rounded-lg border bg-[#1a1612] p-1.5 w-[72px] cursor-pointer transition-colors hover:bg-[#252018]"
        style={{ borderColor, borderWidth: "2px" }}
        onClick={() => setActivePopover(isActive ? null : item.id)}
      >
        {item.iconUrl && (
          <img src={item.iconUrl} alt={item.typeLine} className="w-10 h-10 object-contain" loading="lazy" />
        )}
        <div className="text-[9px] text-center truncate w-full mt-0.5" style={{ color: borderColor }}>
          {item.name || item.typeLine}
        </div>
      </div>
      {isActive && <ItemPopover item={item} gems={[]} gemGroups={{}} />}
    </div>
  )
}

function ItemPopover({
  item,
  gems,
  gemGroups,
}: {
  item: Item
  gems: Gem[]
  gemGroups: Record<number, Gem[]>
}) {
  const borderColor = frameTypeToColor(item.frameType)

  return (
    <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1 w-[280px] bg-[#1a1612] border border-[#3a3226] rounded-lg shadow-2xl p-3 text-left">
      {/* Item header */}
      <div className="flex items-start gap-2 mb-2">
        {item.iconUrl && (
          <img src={item.iconUrl} alt={item.typeLine} className="w-10 h-10 object-contain flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          {item.name && (
            <div className="font-semibold text-sm truncate" style={{ color: borderColor }}>
              {item.name}
            </div>
          )}
          <div className="text-xs text-muted-foreground truncate" style={!item.name ? { color: borderColor } : {}}>
            {item.typeLine}
          </div>
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {item.corrupted && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0">Corrupted</Badge>
            )}
            {item.ilvl > 0 && (
              <Badge variant="outline" className="text-[9px] px-1 py-0">iLvl {item.ilvl}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Sockets */}
      {item.sockets && item.sockets.length > 0 && (
        <div className="flex gap-0.5 mb-2">
          {item.sockets.map((s, i) => (
            <span key={i} className={`inline-block w-3 h-3 rounded-full ${SOCKET_COLORS[s.attr] || "bg-gray-500"}`} />
          ))}
        </div>
      )}

      {/* Mods */}
      <div className="space-y-0.5 mb-2 max-h-[200px] overflow-y-auto">
        {item.mods?.enchantMods?.map((mod, i) => (
          <div key={`e${i}`} className="text-[11px] text-cyan-400">{mod}</div>
        ))}
        {item.mods?.implicitMods?.map((mod, i) => (
          <div key={`i${i}`} className="text-[11px] text-blue-400">{mod}</div>
        ))}
        {item.mods?.explicitMods?.map((mod, i) => (
          <div key={`x${i}`} className="text-[11px] text-blue-300">{mod}</div>
        ))}
        {item.mods?.craftedMods?.map((mod, i) => (
          <div key={`c${i}`} className="text-[11px] text-cyan-300">{mod}</div>
        ))}
        {item.mods?.fracturedMods?.map((mod, i) => (
          <div key={`f${i}`} className="text-[11px] text-amber-400">{mod}</div>
        ))}
      </div>

      {/* Socketed gems */}
      {gems.length > 0 && (
        <div className="border-t border-[#3a3226] pt-2">
          <div className="text-[10px] text-muted-foreground mb-1">Socketed Gems</div>
          {Object.entries(gemGroups).map(([groupIdx, groupGems]) => (
            <div key={groupIdx} className="mb-1.5 last:mb-0">
              {Number(groupIdx) >= 0 && Object.keys(gemGroups).length > 1 && (
                <div className="text-[9px] text-muted-foreground/60 mb-0.5">
                  Link Group {Number(groupIdx) + 1}
                </div>
              )}
              {groupGems.map((gem) => (
                <div key={gem.id} className="flex items-center gap-1.5 py-0.5">
                  {gem.iconUrl && (
                    <img src={gem.iconUrl} alt={gem.name} className="w-4 h-4 object-contain flex-shrink-0" />
                  )}
                  <span className={`text-[11px] ${gem.isSupport ? "text-blue-400" : "text-poe-gem font-medium"}`}>
                    {gem.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    Lv{gem.level}
                    {gem.quality > 0 && ` ${gem.quality}%`}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GemTooltipInner({ gem }: { gem: Gem }) {
  return (
    <div className="bg-[#1a1612] border border-[#3a3226] rounded-lg shadow-xl p-2 w-[200px] text-left">
      <div className="flex items-center gap-1.5 mb-1">
        {gem.iconUrl && (
          <img src={gem.iconUrl} alt={gem.name} className="w-5 h-5 object-contain flex-shrink-0" />
        )}
        <div className={`text-xs font-medium ${gem.isSupport ? "text-blue-400" : "text-poe-gem"}`}>
          {gem.name}
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground">
        {gem.isSupport ? "Support" : "Skill"} — Lv {gem.level}
        {gem.quality > 0 && ` / ${gem.quality}% Quality`}
      </div>
    </div>
  )
}
