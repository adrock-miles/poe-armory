import type { Gem } from "@/types/character"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { slotDisplayName } from "@/lib/utils"

interface Props {
  gems: Gem[]
}

export function ActiveSkillsSummary({ gems }: Props) {
  if (gems.length === 0) return null

  const activeGems = gems.filter((g) => !g.isSupport)
  const supportCount = gems.filter((g) => g.isSupport).length

  if (activeGems.length === 0) return null

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Active Skills</h3>
          <span className="text-xs text-muted-foreground">
            {activeGems.length} skills, {supportCount} supports
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {activeGems.map((gem) => (
            <Tooltip key={gem.id}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 cursor-default">
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
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px] p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  {gem.iconUrl && (
                    <img src={gem.iconUrl} alt={gem.name} className="w-8 h-8 object-contain flex-shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-sm text-poe-gem">{gem.name}</div>
                    <div className="text-[10px] text-muted-foreground">Skill Gem</div>
                  </div>
                </div>
                <div className="space-y-0.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Level</span>
                    <span>{gem.level}</span>
                  </div>
                  {gem.quality > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quality</span>
                      <span className="text-blue-300">+{gem.quality}%</span>
                    </div>
                  )}
                  {gem.itemSlot && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Slot</span>
                      <span>{slotDisplayName(gem.itemSlot)}</span>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
