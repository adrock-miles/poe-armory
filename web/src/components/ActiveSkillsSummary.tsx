import { useMemo } from "react"
import type { Gem, Item } from "@/types/character"
import { Card, CardContent } from "@/components/ui/card"
import { slotDisplayName } from "@/lib/utils"

interface Props {
  gems: Gem[]
  items: Item[]
}

interface GemLink {
  slot: string
  socketGroup: number
  gems: Gem[]
}

const WEAPON_SWAP_SLOTS = new Set(["Weapon2", "Offhand2"])

export function ActiveSkillsSummary({ gems, items }: Props) {
  const filteredGems = useMemo(
    () => gems.filter((g) => !WEAPON_SWAP_SLOTS.has(g.itemSlot)),
    [gems],
  )

  const itemBySlot = useMemo(
    () => {
      const map: Record<string, Item> = {}
      for (const item of items) map[item.slot] = item
      return map
    },
    [items],
  )

  const { links, totalActive, totalSupport } = useMemo(() => {
    const linkMap = new Map<string, GemLink>()
    for (const gem of filteredGems) {
      const key = `${gem.itemSlot}::${gem.socketGroup}`
      if (!linkMap.has(key)) {
        linkMap.set(key, { slot: gem.itemSlot, socketGroup: gem.socketGroup, gems: [] })
      }
      linkMap.get(key)!.gems.push(gem)
    }

    const result = Array.from(linkMap.values())
    for (const link of result) {
      link.gems.sort((a, b) => (a.isSupport === b.isSupport ? 0 : a.isSupport ? 1 : -1))
    }

    const maxLinkBySlot = new Map<string, number>()
    for (const link of result) {
      const cur = maxLinkBySlot.get(link.slot) || 0
      maxLinkBySlot.set(link.slot, Math.max(cur, link.gems.length))
    }

    result.sort((a, b) => {
      const aSlotMax = maxLinkBySlot.get(a.slot) || 0
      const bSlotMax = maxLinkBySlot.get(b.slot) || 0
      if (aSlotMax !== bSlotMax) return bSlotMax - aSlotMax
      if (a.slot !== b.slot) return a.slot.localeCompare(b.slot)
      return b.gems.length - a.gems.length
    })

    return {
      links: result,
      totalActive: filteredGems.filter((g) => !g.isSupport).length,
      totalSupport: filteredGems.filter((g) => g.isSupport).length,
    }
  }, [filteredGems])

  if (filteredGems.length === 0) return null

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
