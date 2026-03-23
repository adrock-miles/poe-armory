import { useState, useCallback, useRef, useEffect } from "react"
import type { Gem, Item, TreeJewel } from "@/types/character"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { frameTypeToColor } from "@/lib/utils"

interface Props {
  items: Item[]
  gems: Gem[]
  jewels?: TreeJewel[]
}

// Desktop grid: 9 columns × 8 rows.
// Each cell is 47px — the same as a PoE inventory cell.
// Columns: [weapon 2] [gap] [centre 3] [gap] [offhand 2]
// Rows 1-5: main equip, row 6: spacing, rows 7-8: bottom gear.
const SLOT_POSITIONS: Record<
  string,
  { col: string; row: string; label: string }
> = {
  Weapon:     { col: "1 / 3",  row: "1 / 6",  label: "Main Hand" },
  Helm:       { col: "4 / 6",  row: "1 / 3",  label: "Helmet"    },
  Amulet:     { col: "6 / 7",  row: "1 / 2",  label: "Amulet"    },
  BodyArmour: { col: "4 / 7",  row: "3 / 6",  label: "Body"      },
  Offhand:    { col: "8 / 10", row: "1 / 6",  label: "Off Hand"  },
  Gloves:     { col: "1 / 3",  row: "7 / 9",  label: "Gloves"    },
  Ring:       { col: "4 / 5",  row: "7 / 8",  label: "Ring"      },
  Belt:       { col: "5 / 6",  row: "7 / 8",  label: "Belt"      },
  Ring2:      { col: "6 / 7",  row: "7 / 8",  label: "Ring"      },
  Boots:      { col: "8 / 10", row: "7 / 9",  label: "Boots"     },
}

const SOCKET_COLORS: Record<string, string> = {
  S: "bg-red-500",
  D: "bg-green-500",
  I: "bg-blue-500",
  G: "bg-gray-300",
  A: "bg-gray-500",
  DV: "bg-gray-500",
}

export function GearPanel({ items, gems, jewels }: Props) {
  const [activePopover, setActivePopover] = useState<number | null>(null)
  const [hoverPopover, setHoverPopover] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const isTouchDevice = useRef(false)
  useEffect(() => {
    function onTouch() { isTouchDevice.current = true }
    window.addEventListener("touchstart", onTouch, { once: true })
    return () => window.removeEventListener("touchstart", onTouch)
  }, [])

  const gemsBySlot = gems.reduce<Record<string, Gem[]>>((acc, gem) => {
    const slot = gem.itemSlot || "Unknown"
    if (!acc[slot]) acc[slot] = []
    acc[slot].push(gem)
    return acc
  }, {})

  const itemsBySlot = items.reduce<Record<string, Item>>((acc, item) => {
    acc[item.slot] = item
    return acc
  }, {})

  const flasks = items.filter((i) => i.slot.startsWith("Flask"))

  useEffect(() => {
    if (activePopover === null) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.closest("[data-slot]")) return
      setActivePopover(null)
    }
    document.addEventListener("pointerdown", handleClick)
    return () => document.removeEventListener("pointerdown", handleClick)
  }, [activePopover])

  const toggle = useCallback(
    (id: number) => setActivePopover((prev) => (prev === id ? null : id)),
    [],
  )

  const onHoverEnter = useCallback(
    (id: number) => { if (!isTouchDevice.current) setHoverPopover(id) },
    [],
  )
  const onHoverLeave = useCallback(
    () => setHoverPopover(null),
    [],
  )

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
    <div className="space-y-3 pb-[300px] md:pb-[200px]" ref={containerRef}>
      {/* ── Desktop: game-faithful inventory panel ── */}
      <div className="hidden md:flex justify-center">
        <div
          className="relative rounded-lg border border-[#3a3226] bg-[#0c0a08] p-4"
          style={{ width: "fit-content" }}
        >
          <div
            className="grid gap-[6px]"
            style={{
              gridTemplateColumns: "47px 47px 12px 47px 47px 47px 12px 47px 47px",
              gridTemplateRows: "47px 47px 47px 47px 47px 8px 47px 47px",
            }}
          >
            {Object.entries(SLOT_POSITIONS).map(([slot, pos]) => {
              const item = itemsBySlot[slot]
              const slotGems = gemsBySlot[slot] || []
              return (
                <DesktopSlot
                  key={slot}
                  slot={slot}
                  label={pos.label}
                  item={item}
                  gems={slotGems}
                  col={pos.col}
                  row={pos.row}
                  activePopover={activePopover}
                  hoverPopover={hoverPopover}
                  toggle={toggle}
                  onHoverEnter={onHoverEnter}
                  onHoverLeave={onHoverLeave}
                />
              )
            })}
          </div>

          {/* Flasks row */}
          {flasks.length > 0 && (
            <div className="flex justify-center gap-[6px] mt-4 pt-3 border-t border-[#2a2520]">
              {flasks.map((item) => (
                <FlaskSlot
                  key={item.id}
                  item={item}
                  activePopover={activePopover}
                  hoverPopover={hoverPopover}
                  toggle={toggle}
                  onHoverEnter={onHoverEnter}
                  onHoverLeave={onHoverLeave}
                />
              ))}
            </div>
          )}

          {/* Tree jewels row */}
          {jewels && jewels.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#2a2520]">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground/50 text-center mb-2">Jewels</div>
              <div className="flex justify-center gap-[6px] flex-wrap">
                {jewels.map((j, i) => (
                  <JewelIcon key={i} jewel={j} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="grid md:hidden grid-cols-2 gap-2">
        {(["Weapon", "Helm", "Amulet", "BodyArmour", "Offhand", "Belt", "Ring", "Ring2", "Gloves", "Boots"] as const).map((slot) => {
          const pos = SLOT_POSITIONS[slot]
          const item = itemsBySlot[slot]
          const slotGems = gemsBySlot[slot] || []
          return (
            <MobileSlot
              key={slot}
              slot={slot}
              label={pos.label}
              item={item}
              gems={slotGems}
              activePopover={activePopover}
              toggle={toggle}
            />
          )
        })}
      </div>

      {/* Mobile flasks */}
      {flasks.length > 0 && (
        <div className="md:hidden">
          <h3 className="text-xs font-medium text-muted-foreground mb-2 text-center">Flasks</h3>
          <div className="flex justify-center gap-2 flex-wrap">
            {flasks.map((item) => (
              <FlaskSlot
                key={item.id}
                item={item}
                activePopover={activePopover}
                hoverPopover={hoverPopover}
                toggle={toggle}
                onHoverEnter={onHoverEnter}
                onHoverLeave={onHoverLeave}
              />
            ))}
          </div>
        </div>
      )}

      {/* Mobile jewels */}
      {jewels && jewels.length > 0 && (
        <div className="md:hidden">
          <h3 className="text-xs font-medium text-muted-foreground mb-2 text-center">Jewels</h3>
          <div className="flex justify-center gap-2 flex-wrap">
            {jewels.map((j, i) => (
              <JewelIcon key={i} jewel={j} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────────── Desktop inventory slot ───────────────── */

function DesktopSlot({
  slot,
  label,
  item,
  gems,
  col,
  row,
  activePopover,
  hoverPopover,
  toggle,
  onHoverEnter,
  onHoverLeave,
}: {
  slot: string
  label: string
  item?: Item
  gems: Gem[]
  col: string
  row: string
  activePopover: number | null
  hoverPopover: number | null
  toggle: (id: number) => void
  onHoverEnter: (id: number) => void
  onHoverLeave: () => void
}) {
  const borderColor = item ? frameTypeToColor(item.frameType) : "#1e1b17"
  const gemGroups = groupGemsBySocket(gems)
  const isActive = item && (activePopover === item.id || hoverPopover === item.id)

  return (
    <div
      className="relative"
      data-slot={slot}
      style={{ gridColumn: col, gridRow: row }}
      onMouseEnter={() => item && onHoverEnter(item.id)}
      onMouseLeave={() => onHoverLeave()}
    >
      <div
        className="flex flex-col items-center justify-center w-full h-full bg-[#141210] border cursor-pointer transition-colors hover:bg-[#1e1a16]"
        style={{ borderColor: item ? borderColor : "#1e1b17", borderWidth: item ? "2px" : "1px" }}
        onClick={() => item && toggle(item.id)}
      >
        {item ? (
          <>
            <img
              src={item.iconUrl}
              alt={item.typeLine}
              className="max-w-[90%] max-h-[85%] object-contain"
              loading="lazy"
            />
            {/* Gem dots along bottom */}
            {gems.length > 0 && (
              <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5">
                {Object.entries(gemGroups).map(([gIdx, gGems]) => (
                  <GemLinkGroup key={gIdx} gems={gGems} activePopover={activePopover} toggle={toggle} />
                ))}
              </div>
            )}
          </>
        ) : (
          <span className="text-[8px] uppercase tracking-wider text-muted-foreground/30">{label}</span>
        )}
      </div>

      {isActive && item && <ItemPopover item={item} gems={gems} gemGroups={gemGroups} />}
    </div>
  )
}

/* ───────────────── Mobile slot ───────────────── */

function MobileSlot({
  slot,
  label,
  item,
  gems,
  activePopover,
  toggle,
}: {
  slot: string
  label: string
  item?: Item
  gems: Gem[]
  activePopover: number | null
  toggle: (id: number) => void
}) {
  const borderColor = item ? frameTypeToColor(item.frameType) : "#2a2520"
  const gemGroups = groupGemsBySocket(gems)
  const isActive = item && activePopover === item.id

  return (
    <div className="relative" data-slot={slot}>
      <div
        className="relative flex flex-col items-center justify-center rounded-lg border bg-[#1a1612] p-1.5 min-h-[70px] cursor-pointer transition-colors hover:bg-[#252018]"
        style={{ borderColor, borderWidth: item ? "2px" : "1px" }}
        onClick={() => item && toggle(item.id)}
      >
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5 text-center leading-tight">
          {label}
        </div>
        {item ? (
          <>
            {item.iconUrl && (
              <img src={item.iconUrl} alt={item.typeLine} className="w-10 h-10 object-contain" loading="lazy" />
            )}
            <div className="text-[10px] font-medium text-center truncate w-full mt-0.5 leading-tight" style={{ color: borderColor }}>
              {item.name || item.typeLine}
            </div>
            {gems.length > 0 && (
              <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                {Object.entries(gemGroups).map(([gIdx, gGems]) => (
                  <GemLinkGroup key={gIdx} gems={gGems} activePopover={activePopover} toggle={toggle} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-muted-foreground/30 text-xs">Empty</div>
        )}
      </div>
      {isActive && item && <ItemPopover item={item} gems={gems} gemGroups={gemGroups} />}
    </div>
  )
}

/* ───────────────── Gem link group ───────────────── */

function GemLinkGroup({
  gems,
  activePopover,
  toggle,
}: {
  gems: Gem[]
  activePopover: number | null
  toggle: (id: number) => void
}) {
  return (
    <div className="flex items-center">
      {gems.map((gem, i) => {
        const gemPopoverId = gem.id + 100000
        return (
          <div key={gem.id} className="flex items-center">
            {i > 0 && <div className="w-1 h-[2px] bg-amber-600/60" />}
            <div className="relative group/gem" data-slot="gem">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center cursor-pointer transition-transform hover:scale-125 ${
                  gem.isSupport
                    ? "border-blue-400/60 bg-blue-900/50"
                    : "border-amber-400/60 bg-amber-900/50"
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  toggle(gemPopoverId)
                }}
              >
                {gem.iconUrl && (
                  <img src={gem.iconUrl} alt={gem.name} className="w-3 h-3 object-contain" />
                )}
              </div>
              <div className="hidden group-hover/gem:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 pointer-events-none">
                <GemTooltipInner gem={gem} />
              </div>
              {activePopover === gemPopoverId && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50">
                  <GemTooltipInner gem={gem} />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ───────────────── Flask slot ───────────────── */

function FlaskSlot({
  item,
  activePopover,
  hoverPopover,
  toggle,
  onHoverEnter,
  onHoverLeave,
}: {
  item: Item
  activePopover: number | null
  hoverPopover?: number | null
  toggle: (id: number) => void
  onHoverEnter?: (id: number) => void
  onHoverLeave?: () => void
}) {
  const borderColor = frameTypeToColor(item.frameType)
  const isActive = activePopover === item.id || hoverPopover === item.id

  return (
    <div
      className="relative"
      data-slot="flask"
      onMouseEnter={() => onHoverEnter?.(item.id)}
      onMouseLeave={() => onHoverLeave?.()}
    >
      <div
        className="flex flex-col items-center bg-[#141210] border p-1 w-[47px] h-[94px] cursor-pointer transition-colors hover:bg-[#1e1a16] md:w-[47px] md:h-[94px]"
        style={{ borderColor, borderWidth: "2px" }}
        onClick={() => toggle(item.id)}
      >
        {item.iconUrl && (
          <img src={item.iconUrl} alt={item.typeLine} className="w-full h-full object-contain" loading="lazy" />
        )}
      </div>
      {isActive && <ItemPopover item={item} gems={[]} gemGroups={{}} />}
    </div>
  )
}

/* ───────────────── Item popover ───────────────── */

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
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = popoverRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.right > window.innerWidth - 8) {
      el.style.left = "auto"
      el.style.right = "0"
      el.style.transform = "none"
    }
    if (rect.left < 8) {
      el.style.left = "0"
      el.style.transform = "none"
    }
    if (rect.bottom > window.innerHeight - 8) {
      el.style.top = "auto"
      el.style.bottom = "100%"
      el.style.marginTop = "0"
      el.style.marginBottom = "4px"
    }
  }, [])

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1 w-[280px] bg-[#1a1612] border border-[#3a3226] rounded-lg shadow-2xl p-3 text-left"
    >
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

      {item.sockets && item.sockets.length > 0 && (
        <div className="flex gap-0.5 mb-2">
          {item.sockets.map((s, i) => (
            <span key={i} className={`inline-block w-3 h-3 rounded-full ${SOCKET_COLORS[s.attr] || "bg-gray-500"}`} />
          ))}
        </div>
      )}

      <ItemProperties properties={item.properties} />

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

/* ───────────────── Jewel icon with hover popover ───────────────── */

function JewelIcon({ jewel }: { jewel: TreeJewel }) {
  const borderColor = frameTypeToColor(jewel.frameType ?? 0)

  return (
    <div className="relative group/jewel">
      <div
        className="w-[40px] h-[40px] flex items-center justify-center bg-[#141210] border cursor-default transition-colors hover:bg-[#1e1a16]"
        style={{ borderColor, borderWidth: "2px" }}
      >
        {jewel.iconUrl ? (
          <img src={jewel.iconUrl} alt={jewel.name || jewel.typeLine} className="w-[34px] h-[34px] object-contain" />
        ) : (
          <span className="text-[8px] text-muted-foreground/40">Jewel</span>
        )}
      </div>
      {/* Hover popover */}
      <div className="hidden group-hover/jewel:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 pointer-events-none">
        <JewelTooltip jewel={jewel} />
      </div>
    </div>
  )
}

function JewelTooltip({ jewel }: { jewel: TreeJewel }) {
  const borderColor = frameTypeToColor(jewel.frameType ?? 0)
  return (
    <div className="bg-[#1a1612] border border-[#3a3226] rounded-lg shadow-xl p-3 w-[260px] text-left">
      <div className="flex items-start gap-2 mb-1.5">
        {jewel.iconUrl && (
          <img src={jewel.iconUrl} alt={jewel.name || jewel.typeLine} className="w-8 h-8 object-contain flex-shrink-0" />
        )}
        <div className="min-w-0">
          {jewel.name && (
            <div className="text-sm font-medium truncate" style={{ color: borderColor }}>
              {jewel.name}
            </div>
          )}
          <div className="text-xs text-muted-foreground">{jewel.typeLine}</div>
        </div>
      </div>
      {jewel.implicitMods && jewel.implicitMods.length > 0 && (
        <div className="space-y-0.5 mt-1">
          {jewel.implicitMods.map((mod, i) => (
            <div key={`i${i}`} className="text-[11px] text-blue-400">{mod}</div>
          ))}
        </div>
      )}
      {jewel.explicitMods && jewel.explicitMods.length > 0 && (
        <div className="space-y-0.5 mt-1">
          {jewel.explicitMods.map((mod, i) => (
            <div key={`x${i}`} className="text-[11px] text-blue-300">{mod}</div>
          ))}
        </div>
      )}
      {jewel.clusterPassives && jewel.clusterPassives.length > 0 && (
        <div className="mt-2 pt-1 border-t border-[#3a3226]">
          <div className="text-[10px] text-muted-foreground mb-1">Cluster Passives</div>
          {jewel.clusterPassives.filter(p => p.type !== "socket").map((p, i) => (
            <div key={i}>
              <span className={`text-xs ${p.type === "notable" ? "text-amber-300 font-medium" : "text-gray-300"}`}>
                {p.name}
              </span>
              {p.stats && p.stats.length > 0 && (
                <div className="ml-2">
                  {p.stats.map((s, si) => (
                    <div key={si} className="text-[11px] text-blue-300">{s}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {jewel.subJewels && jewel.subJewels.length > 0 && (
        <div className="mt-2 pt-1 border-t border-[#3a3226]">
          <div className="text-[10px] text-muted-foreground mb-1">Socketed Jewels</div>
          {jewel.subJewels.map((sj, i) => (
            <div key={i} className="flex items-start gap-2 mt-1">
              {sj.iconUrl && (
                <img src={sj.iconUrl} alt={sj.name || sj.typeLine} className="w-6 h-6 object-contain flex-shrink-0" />
              )}
              <div className="min-w-0">
                {sj.name && (
                  <div className="text-xs font-medium truncate" style={{ color: frameTypeToColor(sj.frameType ?? 0) }}>
                    {sj.name}
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground">{sj.typeLine}</div>
                {sj.explicitMods && sj.explicitMods.length > 0 && (
                  <div className="mt-0.5 space-y-0.5">
                    {sj.explicitMods.map((mod, mi) => (
                      <div key={mi} className="text-[11px] text-blue-300">{mod}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ───────────────── Helpers ───────────────── */

function groupGemsBySocket(gems: Gem[]) {
  return gems.reduce<Record<number, Gem[]>>((acc, gem) => {
    const g = gem.socketGroup ?? 0
    if (!acc[g]) acc[g] = []
    acc[g].push(gem)
    return acc
  }, {})
}

const DEFENSE_PROPS = new Set([
  "Armour", "Evasion Rating", "Energy Shield",
  "Ward", "Block", "Chance to Block",
])
const WEAPON_PROPS = new Set([
  "Physical Damage", "Elemental Damage", "Chaos Damage",
  "Critical Strike Chance", "Attacks per Second",
  "Weapon Range",
])
const DISPLAY_PROPS = new Set([...DEFENSE_PROPS, ...WEAPON_PROPS])

function ItemProperties({ properties }: { properties?: import("@/types/character").ItemProperty[] }) {
  if (!properties || properties.length === 0) return null
  const shown = properties.filter((p) => DISPLAY_PROPS.has(p.name) && p.values?.length > 0)
  if (shown.length === 0) return null

  return (
    <div className="space-y-0.5 mb-2 pb-2 border-b border-[#3a3226]">
      {shown.map((prop, i) => (
        <div key={i} className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">{prop.name}</span>
          <span className={prop.values[0]?.[1] === 1 ? "text-blue-300" : "text-gray-200"}>
            {prop.values.map((v) => v[0]).join(" - ")}
          </span>
        </div>
      ))}
    </div>
  )
}

function GemTooltipInner({ gem }: { gem: Gem }) {
  return (
    <div className="bg-[#1a1612] border border-[#3a3226] rounded-lg shadow-xl p-2 w-[200px] text-left whitespace-nowrap">
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
