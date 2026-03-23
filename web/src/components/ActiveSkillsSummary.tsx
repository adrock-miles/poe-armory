import type { Gem, Item } from "@/types/character"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { slotDisplayName } from "@/lib/utils"

interface Props {
  gems: Gem[]
  items: Item[]
}

/** A link group: the slot it lives in, the socket group index, and the gems sorted skill-first. */
interface GemLink {
  slot: string
  socketGroup: number
  gems: Gem[]
}

/** Weapon swap slots to exclude */
const WEAPON_SWAP_SLOTS = new Set(["Weapon2", "Offhand2"])

export function ActiveSkillsSummary({ gems, items }: Props) {
  // Filter out weapon swap gems
  const filteredGems = gems.filter((g) => !WEAPON_SWAP_SLOTS.has(g.itemSlot))

  if (filteredGems.length === 0) return null

  // Build a lookup of item name by slot
  const itemBySlot: Record<string, Item> = {}
  for (const item of items) {
    itemBySlot[item.slot] = item
  }

  // Group gems by slot + socketGroup
  const linkMap = new Map<string, GemLink>()
  for (const gem of filteredGems) {
    const key = `${gem.itemSlot}::${gem.socketGroup}`
    if (!linkMap.has(key)) {
      linkMap.set(key, { slot: gem.itemSlot, socketGroup: gem.socketGroup, gems: [] })
    }
    linkMap.get(key)!.gems.push(gem)
  }

  // Sort each link: active skills first, then supports
  const links = Array.from(linkMap.values())
  for (const link of links) {
    link.gems.sort((a, b) => (a.isSupport === b.isSupport ? 0 : a.isSupport ? 1 : -1))
  }

  // Sort links: highest gem count first, but keep links from the same item slot together
  // First, find the max link size per slot
  const maxLinkBySlot = new Map<string, number>()
  for (const link of links) {
    const cur = maxLinkBySlot.get(link.slot) || 0
    maxLinkBySlot.set(link.slot, Math.max(cur, link.gems.length))
  }

  links.sort((a, b) => {
    // Primary: slots with the biggest link come first
    const aSlotMax = maxLinkBySlot.get(a.slot) || 0
    const bSlotMax = maxLinkBySlot.get(b.slot) || 0
    if (aSlotMax !== bSlotMax) return bSlotMax - aSlotMax
    // Secondary: keep same slot together, then biggest link within slot first
    if (a.slot !== b.slot) return a.slot.localeCompare(b.slot)
    return b.gems.length - a.gems.length
  })

  const totalActive = filteredGems.filter((g) => !g.isSupport).length
  const totalSupport = filteredGems.filter((g) => g.isSupport).length

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Gem Links</h3>
          <span className="text-xs text-muted-foreground">
            {totalActive} skills, {totalSupport} supports
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {links.map((link) => {
            const item = itemBySlot[link.slot]
            const activeGem = link.gems.find((g) => !g.isSupport)
            return (
              <div
                key={`${link.slot}-${link.socketGroup}`}
                className="rounded-md border border-border/50 bg-secondary/30 p-2.5"
              >
                {/* Header: slot name + item */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    {slotDisplayName(link.slot)}
                  </span>
                  {item && (
                    <span className="text-[10px] text-muted-foreground/70 truncate">
                      — {item.name || item.typeLine}
                    </span>
                  )}
                </div>

                {/* Gems in this link */}
                <div className="space-y-1">
                  {link.gems.map((gem) => (
                    <div key={gem.id} className="flex items-center gap-2">
                      {gem.iconUrl && (
                        <img src={gem.iconUrl} alt={gem.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
                      )}
                      <span className={`text-sm truncate ${gem.isSupport ? "text-blue-400" : "text-poe-gem font-medium"}`}>
                        {gem.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                        Lv{gem.level}
                        {gem.quality > 0 && ` / ${gem.quality}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
