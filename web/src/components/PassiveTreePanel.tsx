import { useMemo } from "react"
import type { PassiveTree } from "@/types/character"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SkillTreeCanvas } from "@/components/SkillTreeCanvas"

interface Props {
  tree: PassiveTree | null
}

export function PassiveTreePanel({ tree }: Props) {
  if (!tree) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No passive tree data in this snapshot.
        </CardContent>
      </Card>
    )
  }

  const totalNodes = tree.hashes?.length ?? 0
  const masteryCount = tree.masteries?.length ?? 0
  const keystoneCount = tree.keystones?.length ?? 0

  const allocatedHashes = useMemo(
    () => new Set(tree.hashes || []),
    [tree.hashes]
  )

  const masteryEffects = useMemo(() => {
    const map = new Map<number, number>()
    if (tree.masteries) {
      for (const m of tree.masteries) {
        map.set(m.nodeHash, m.effectHash)
      }
    }
    return map
  }, [tree.masteries])

  return (
    <div className="space-y-2">
      {/* Inline stats + keystones */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground px-1">
        <span><span className="font-medium text-foreground">{totalNodes}</span> nodes</span>
        {masteryCount > 0 && (
          <span><span className="font-medium text-foreground">{masteryCount}</span> masteries</span>
        )}
        {keystoneCount > 0 && (
          <span><span className="font-medium text-foreground">{keystoneCount}</span> keystones</span>
        )}
        {tree.keystones && tree.keystones.length > 0 && (
          <>
            <span className="text-muted-foreground/40">|</span>
            {tree.keystones.map((ks, i) => (
              <Badge key={i} variant="outline" className="text-xs text-amber-400 border-amber-400/30">
                {ks}
              </Badge>
            ))}
          </>
        )}
      </div>

      {/* Interactive Skill Tree */}
      <SkillTreeCanvas
        allocatedHashes={allocatedHashes}
        masteryEffects={masteryEffects}
        jewels={tree.jewels}
      />
    </div>
  )
}
