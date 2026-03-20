import { useState, useCallback, useRef, useEffect } from "react"
import type { Gem, Item } from "@/types/character"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { frameTypeToColor, slotDisplayName } from "@/lib/utils"

interface Props {
  items: Item[]
  gems: Gem[]
}

// Paper-doll slot positions — mirrors the in-game character equipment layout
// Grid: 8 columns x 4 rows on desktop.  The extra column ensures the Amulet
// has its own space between the Body Armour and the Off Hand weapon.
const SLOT_POSITIONS: Record<
  string,
  { col: string; row: string; label: string; iconClass: string; minH: string }
> = {
  Weapon: {
    col: "1 / 3",
    row: "1 / 4",
    label: "Main Hand",
    iconClass: "w-14 h-20 md:w-16 md:h-24",
    minH: "min-h-[120px] md:min-h-[150px]",
  },
  Offhand: {
    col: "7 / 9",
    row: "1 / 4",
    label: "Off Hand",
    iconClass: "w-14 h-20 md:w-16 md:h-24",
    minH: "min-h-[120px] md:min-h-[150px]",
  },
  Helm: {
    col: "3 / 6",
    row: "1 / 2",
    label: "Helmet",
    iconClass: "w-10 h-10 md:w-12 md:h-12",
    minH: "min-h-[70px]",
  },
  BodyArmour: {
    col: "3 / 7",
    row: "2 / 4",
    label: "Body Armour",
    iconClass: "w-12 h-16 md:w-14 md:h-20",
    minH: "min-h-[100px] md:min-h-[120px]",
  },
  Amulet: {
    col: "6 / 7",
    row: "1 / 2",
    label: "Amulet",
    iconClass: "w-7 h-7 md:w-8 md:h-8",
    minH: "min-h-[60px]",
  },
  Gloves: {
    col: "1 / 3",
    row: "4 / 5",
    label: "Gloves",
    iconClass: "w-10 h-10 md:w-12 md:h-12",
    minH: "min-h-[70px]",
  },
  Boots: {
    col: "7 / 9",
    row: "4 / 5",
    label: "Boots",
    iconClass: "w-10 h-10 md:w-12 md:h-12",
    minH: "min-h-[70px]",
  },
  Ring: {
    col: "3 / 5",
    row: "4 / 5",
    label: "Left Ring",
    iconClass: "w-7 h-7 md:w-8 md:h-8",
    minH: "min-h-[60px]",
  },
  Ring2: {
    col: "6 / 7",
    row: "4 / 5",
    label: "Right Ring",
    iconClass: "w-7 h-7 md:w-8 md:h-8",
    minH: "min-h-[60px]",
  },
  Belt: {
    col: "5 / 6",
    row: "4 / 5",
    label: "Belt",
    iconClass: "w-10 h-6 md:w-12 md:h-7",
    minH: "min-h-[60px]",
  },
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
  // Single popover ID — either item.id or gem.id + 100000
  const [activePopover, setActivePopover] = useState<number | null>(null)
  // Separate hover state for desktop — shows popover on mouse-enter
  const [hoverPopover, setHoverPopover] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Detect touch device — if the user has touched the screen, disable hover popovers
  const isTouchDevice = useRef(false)
  useEffect(() => {
    function onTouch() { isTouchDevice.current = true }
    window.addEventListener("touchstart", onTouch, { once: true })
    return () => window.removeEventListener("touchstart", onTouch)
  }, [])

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

  // Close popover when clicking outside any slot
  useEffect(() => {
    if (activePopover === null) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      // If the click is inside a [data-slot] element, that slot's own
      // onClick already handles the toggle — don't interfere.
      if (target.closest("[data-slot]")) return
      setActivePopover(null)
    }
    document.addEventListener("pointerdown", handleClick)
    return () => document.removeEventListener("pointerdown", handleClick)
  }, [activePopover])

  // Toggle helper: clicking a new slot opens it, clicking the same closes it
  const toggle = useCallback(
    (id: number) => setActivePopover((prev) => (prev === id ? null : id)),
    [],
  )

  // Hover helpers for desktop
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
    <div className="space-y-4 pb-[300px] md:pb-[200px]" ref={containerRef}>
      {/* Paper-doll grid — stacks to 2-column on mobile */}
      <div className="hidden md:grid gap-2 mx-auto max-w-[700px]" style={{
        gridTemplateColumns: "repeat(8, 1fr)",
        gridTemplateRows: "repeat(4, auto)",
      }}>
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
              iconClass={pos.iconClass}
              minH={pos.minH}
              activePopover={activePopover}
              hoverPopover={hoverPopover}
              toggle={toggle}
              onHoverEnter={onHoverEnter}
              onHoverLeave={onHoverLeave}
            />
          )
        })}
      </div>

      {/* Mobile layout — simple 2-col grid that mirrors the paper-doll rows */}
      <div className="grid md:hidden grid-cols-2 gap-2">
        {/* Row 1: Weapon + Helm */}
        {(["Weapon", "Helm"] as const).map((slot) => {
          const pos = SLOT_POSITIONS[slot]
          const item = itemsBySlot[slot]
          const slotGems = gemsBySlot[slot] || []
          return (
            <EquipmentSlot key={slot} slot={slot} label={pos.label} item={item} gems={slotGems}
              iconClass={pos.iconClass} minH={pos.minH} activePopover={activePopover} toggle={toggle} />
          )
        })}
        {/* Row 2: Amulet + Body Armour */}
        {(["Amulet", "BodyArmour"] as const).map((slot) => {
          const pos = SLOT_POSITIONS[slot]
          const item = itemsBySlot[slot]
          const slotGems = gemsBySlot[slot] || []
          return (
            <EquipmentSlot key={slot} slot={slot} label={pos.label} item={item} gems={slotGems}
              iconClass={pos.iconClass} minH={pos.minH} activePopover={activePopover} toggle={toggle} />
          )
        })}
        {/* Row 3: Offhand + Belt */}
        {(["Offhand", "Belt"] as const).map((slot) => {
          const pos = SLOT_POSITIONS[slot]
          const item = itemsBySlot[slot]
          const slotGems = gemsBySlot[slot] || []
          return (
            <EquipmentSlot key={slot} slot={slot} label={pos.label} item={item} gems={slotGems}
              iconClass={pos.iconClass} minH={pos.minH} activePopover={activePopover} toggle={toggle} />
          )
        })}
        {/* Row 4: Left Ring + Right Ring */}
        {(["Ring", "Ring2"] as const).map((slot) => {
          const pos = SLOT_POSITIONS[slot]
          const item = itemsBySlot[slot]
          const slotGems = gemsBySlot[slot] || []
          return (
            <EquipmentSlot key={slot} slot={slot} label={pos.label} item={item} gems={slotGems}
              iconClass={pos.iconClass} minH={pos.minH} activePopover={activePopover} toggle={toggle} />
          )
        })}
        {/* Row 5: Gloves + Boots */}
        {(["Gloves", "Boots"] as const).map((slot) => {
          const pos = SLOT_POSITIONS[slot]
          const item = itemsBySlot[slot]
          const slotGems = gemsBySlot[slot] || []
          return (
            <EquipmentSlot key={slot} slot={slot} label={pos.label} item={item} gems={slotGems}
              iconClass={pos.iconClass} minH={pos.minH} activePopover={activePopover} toggle={toggle} />
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
                hoverPopover={hoverPopover}
                toggle={toggle}
                onHoverEnter={onHoverEnter}
                onHoverLeave={onHoverLeave}
              />
            ))}
          </div>
        </div>
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
  iconClass,
  minH,
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
  col?: string
  row?: string
  iconClass: string
  minH: string
  activePopover: number | null
  hoverPopover?: number | null
  toggle: (id: number) => void
  onHoverEnter?: (id: number) => void
  onHoverLeave?: () => void
}) {
  const borderColor = item ? frameTypeToColor(item.frameType) : "#2a2520"

  // Group gems by socket group for link display
  const gemGroups = gems.reduce<Record<number, Gem[]>>((acc, gem) => {
    const g = gem.socketGroup ?? 0
    if (!acc[g]) acc[g] = []
    acc[g].push(gem)
    return acc
  }, {})

  const isActive = item && (activePopover === item.id || hoverPopover === item.id)

  return (
    <div
      className="relative group"
      data-slot={slot}
      style={col && row ? { gridColumn: col, gridRow: row } : undefined}
      onMouseEnter={() => item && onHoverEnter?.(item.id)}
      onMouseLeave={() => onHoverLeave?.()}
    >
      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border bg-[#1a1612] p-1.5 h-full ${minH} cursor-pointer transition-colors hover:bg-[#252018]`}
        style={{ borderColor, borderWidth: item ? "2px" : "1px" }}
        onClick={() => item && toggle(item.id)}
      >
        {/* Slot label */}
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-0.5 text-center leading-tight">
          {label}
        </div>

        {item ? (
          <>
            {/* Item icon — sized per slot */}
            {item.iconUrl && (
              <img
                src={item.iconUrl}
                alt={item.typeLine}
                className={`${iconClass} object-contain`}
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
                  <GemLinkGroup
                    key={groupIdx}
                    gems={groupGems}
                    activePopover={activePopover}
                    toggle={toggle}
                  />
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
              {/* Desktop hover tooltip */}
              <div className="hidden group-hover/gem:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 pointer-events-none">
                <GemTooltipInner gem={gem} />
              </div>
              {/* Mobile tap popover */}
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
        className="flex flex-col items-center rounded-lg border bg-[#1a1612] p-1.5 w-[60px] md:w-[72px] cursor-pointer transition-colors hover:bg-[#252018]"
        style={{ borderColor, borderWidth: "2px" }}
        onClick={() => toggle(item.id)}
      >
        {item.iconUrl && (
          <img src={item.iconUrl} alt={item.typeLine} className="w-8 h-12 md:w-10 md:h-14 object-contain" loading="lazy" />
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
  const popoverRef = useRef<HTMLDivElement>(null)

  // Reposition if popover overflows viewport
  useEffect(() => {
    const el = popoverRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    // Horizontal overflow
    if (rect.right > window.innerWidth - 8) {
      el.style.left = "auto"
      el.style.right = "0"
      el.style.transform = "none"
    }
    if (rect.left < 8) {
      el.style.left = "0"
      el.style.transform = "none"
    }
    // Bottom overflow — flip above the slot
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

      {/* Defense / weapon properties */}
      <ItemProperties properties={item.properties} />

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
