import type { PassiveTree } from "@/types/character"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

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
  const jewelCount = tree.jewels?.length ?? 0
  const keystoneCount = tree.keystones?.length ?? 0

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Allocated Nodes" value={totalNodes} />
        <StatCard label="Masteries" value={masteryCount} />
        <StatCard label="Keystones" value={keystoneCount} />
        <StatCard label="Jewels" value={jewelCount} />
      </div>

      {/* Keystones */}
      {tree.keystones && tree.keystones.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Keystones</h3>
            <div className="flex flex-wrap gap-2">
              {tree.keystones.map((ks, i) => (
                <Badge key={i} variant="outline" className="text-sm text-amber-400 border-amber-400/30">
                  {ks}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Masteries */}
      {tree.masteries && tree.masteries.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Masteries</h3>
            <div className="space-y-2">
              {tree.masteries.map((m, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5 flex-shrink-0">
                    #{m.nodeHash}
                  </Badge>
                  <span className="text-sm text-blue-300">
                    {m.effect || `Effect #${m.effectHash}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jewels */}
      {tree.jewels && tree.jewels.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Tree Jewels</h3>
            <div className="space-y-2">
              {tree.jewels.map((j, i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <div className="flex-1">
                    {j.name && (
                      <div className="text-sm font-medium text-poe-unique">{j.name}</div>
                    )}
                    <div className="text-xs text-muted-foreground">{j.typeLine}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Node {j.nodeHash}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Node Hashes (collapsible) */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Allocated Node IDs ({totalNodes})
          </h3>
          <div className="max-h-48 overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              {(tree.hashes || []).map((hash, i) => (
                <span key={i} className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                  {hash}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  )
}
