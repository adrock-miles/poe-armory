import { useRef, useEffect, useState, useCallback } from "react"

interface TreeNode {
  id: number
  x: number
  y: number
  n: string // name
  t: string // type: n=normal, N=notable, K=keystone, M=mastery, J=jewel, S=classStart, A=ascendancy
  out: string[]
  s?: string[] // stats
  me?: { id: number; s: string[] }[] // mastery effects
  r?: string[] // reminder text
  f?: string[] // flavour text
  a?: string // ascendancy name
  ci?: number // class start index
}

interface TreeData {
  nodes: Record<string, TreeNode>
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

interface Props {
  allocatedHashes: Set<number>
  masteryEffects?: Map<number, number> // nodeHash -> effectHash
  className?: string
}

const NODE_RADIUS: Record<string, number> = {
  n: 5,
  N: 8,
  K: 12,
  M: 7,
  J: 7,
  S: 14,
  A: 6,
}

const NODE_COLORS = {
  allocated: {
    n: "#c8a84e",
    N: "#c8a84e",
    K: "#c8a84e",
    M: "#5c9ece",
    J: "#5c9ece",
    S: "#c8a84e",
    A: "#c8a84e",
  },
  unallocated: {
    n: "#3a3226",
    N: "#4a4030",
    K: "#4a4030",
    M: "#2a3040",
    J: "#2a3040",
    S: "#3a3226",
    A: "#3a3226",
  },
  border: {
    n: "#5a4e38",
    N: "#7a6e48",
    K: "#8a7e58",
    M: "#4a5e6e",
    J: "#4a5e6e",
    S: "#5a4e38",
    A: "#5a4e38",
  },
}

export function SkillTreeCanvas({ allocatedHashes, masteryEffects, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [treeData, setTreeData] = useState<TreeData | null>(null)
  const [loading, setLoading] = useState(true)

  // Transform state
  const transformRef = useRef({ x: 0, y: 0, scale: 0.04 })
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startTx: 0, startTy: 0 })

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    node: TreeNode
    allocated: boolean
    selectedMastery?: { id: number; s: string[] }
  } | null>(null)

  // Load tree data
  useEffect(() => {
    fetch("/data/skill-tree.json")
      .then((r) => r.json())
      .then((data: TreeData) => {
        setTreeData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Center view on allocated nodes or tree center
  useEffect(() => {
    if (!treeData || !canvasRef.current || !containerRef.current) return
    const canvas = canvasRef.current
    const container = containerRef.current
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    // Find center of allocated nodes, or tree center
    let cx = 0
    let cy = 0
    if (allocatedHashes.size > 0) {
      let count = 0
      for (const node of Object.values(treeData.nodes)) {
        if (allocatedHashes.has(node.id)) {
          cx += node.x
          cy += node.y
          count++
        }
      }
      if (count > 0) {
        cx /= count
        cy /= count
      }
    }

    // Determine scale to fit allocated nodes or show a reasonable portion
    let scale = 0.04
    if (allocatedHashes.size > 1) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (const node of Object.values(treeData.nodes)) {
        if (allocatedHashes.has(node.id)) {
          minX = Math.min(minX, node.x)
          maxX = Math.max(maxX, node.x)
          minY = Math.min(minY, node.y)
          maxY = Math.max(maxY, node.y)
        }
      }
      const rangeX = maxX - minX || 1
      const rangeY = maxY - minY || 1
      const padding = 1.3
      scale = Math.min(
        canvas.width / (rangeX * padding),
        canvas.height / (rangeY * padding)
      )
      scale = Math.max(0.02, Math.min(scale, 0.15))
    }

    transformRef.current = {
      x: canvas.width / 2 - cx * scale,
      y: canvas.height / 2 - cy * scale,
      scale,
    }
    draw()
  }, [treeData, allocatedHashes])

  const draw = useCallback(() => {
    if (!treeData || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x: tx, y: ty, scale } = transformRef.current
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = "#0c0a08"
    ctx.fillRect(0, 0, w, h)

    const nodes = treeData.nodes

    // Determine visible bounds in tree coordinates
    const viewMinX = (0 - tx) / scale
    const viewMaxX = (w - tx) / scale
    const viewMinY = (0 - ty) / scale
    const viewMaxY = (h - ty) / scale
    const margin = 200 / scale

    // Filter to visible nodes
    const visibleNodes: [string, TreeNode][] = []
    for (const [nid, node] of Object.entries(nodes)) {
      if (
        node.x >= viewMinX - margin &&
        node.x <= viewMaxX + margin &&
        node.y >= viewMinY - margin &&
        node.y <= viewMaxY + margin
      ) {
        visibleNodes.push([nid, node])
      }
    }

    // Draw connections
    ctx.lineWidth = Math.max(1, scale * 15)
    for (const [nid, node] of visibleNodes) {
      for (const outId of node.out) {
        const target = nodes[outId]
        if (!target) continue
        // Skip connections between different ascendancies or between ascendancy and main tree
        if (node.a !== target.a) continue

        const bothAllocated =
          allocatedHashes.has(node.id) && allocatedHashes.has(target.id)

        ctx.strokeStyle = bothAllocated ? "rgba(200, 168, 78, 0.6)" : "rgba(60, 50, 35, 0.5)"
        ctx.beginPath()
        ctx.moveTo(tx + node.x * scale, ty + node.y * scale)
        ctx.lineTo(tx + target.x * scale, ty + target.y * scale)
        ctx.stroke()
      }
    }

    // Draw nodes
    for (const [, node] of visibleNodes) {
      const sx = tx + node.x * scale
      const sy = ty + node.y * scale
      const allocated = allocatedHashes.has(node.id)
      const type = node.t
      const radius = (NODE_RADIUS[type] || 5) * scale * 10

      // Skip very small nodes
      if (radius < 0.5) continue

      const fillColor = allocated
        ? NODE_COLORS.allocated[type] || NODE_COLORS.allocated.n
        : NODE_COLORS.unallocated[type] || NODE_COLORS.unallocated.n
      const borderColor = NODE_COLORS.border[type] || NODE_COLORS.border.n

      ctx.fillStyle = fillColor
      ctx.strokeStyle = allocated ? (NODE_COLORS.allocated[type] || "#c8a84e") : borderColor
      ctx.lineWidth = Math.max(0.5, scale * 8)

      if (type === "K") {
        // Keystone: larger circle with glow
        ctx.beginPath()
        ctx.arc(sx, sy, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        if (allocated) {
          ctx.save()
          ctx.shadowColor = "#c8a84e"
          ctx.shadowBlur = radius * 0.8
          ctx.strokeStyle = "rgba(200, 168, 78, 0.4)"
          ctx.lineWidth = Math.max(1, scale * 12)
          ctx.beginPath()
          ctx.arc(sx, sy, radius * 1.2, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }
      } else if (type === "N") {
        // Notable: diamond
        ctx.beginPath()
        ctx.moveTo(sx, sy - radius)
        ctx.lineTo(sx + radius, sy)
        ctx.lineTo(sx, sy + radius)
        ctx.lineTo(sx - radius, sy)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      } else if (type === "J") {
        // Jewel: square
        ctx.beginPath()
        ctx.rect(sx - radius, sy - radius, radius * 2, radius * 2)
        ctx.fill()
        ctx.stroke()
      } else if (type === "M") {
        // Mastery: hexagon
        const sides = 6
        ctx.beginPath()
        for (let i = 0; i < sides; i++) {
          const angle = (Math.PI * 2 * i) / sides - Math.PI / 2
          const px = sx + radius * Math.cos(angle)
          const py = sy + radius * Math.sin(angle)
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      } else if (type === "S") {
        // Class start: large circle
        ctx.beginPath()
        ctx.arc(sx, sy, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      } else {
        // Normal: small circle
        ctx.beginPath()
        ctx.arc(sx, sy, radius, 0, Math.PI * 2)
        ctx.fill()
        if (allocated || radius > 2) {
          ctx.stroke()
        }
      }

      // Draw name for larger nodes when zoomed in enough
      if (scale > 0.06 && (type === "K" || type === "N") && node.n) {
        ctx.fillStyle = allocated ? "#e8d8a8" : "#6a5e48"
        ctx.font = `${Math.max(8, radius * 0.8)}px sans-serif`
        ctx.textAlign = "center"
        ctx.fillText(node.n, sx, sy + radius + Math.max(8, radius * 0.8) + 2)
      }
    }
  }, [treeData, allocatedHashes])

  // Mouse handlers for pan/zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      const t = transformRef.current
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      const newScale = Math.max(0.005, Math.min(0.5, t.scale * factor))

      t.x = mx - ((mx - t.x) / t.scale) * newScale
      t.y = my - ((my - t.y) / t.scale) * newScale
      t.scale = newScale

      draw()
      setTooltip(null)
    },
    [draw]
  )

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startTx: transformRef.current.x,
      startTy: transformRef.current.y,
    }
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const d = dragRef.current
      if (d.dragging) {
        transformRef.current.x = d.startTx + (e.clientX - d.startX)
        transformRef.current.y = d.startTy + (e.clientY - d.startY)
        draw()
        setTooltip(null)
        return
      }

      // Hit test for tooltip
      if (!treeData || !canvasRef.current) return
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const { x: tx, y: ty, scale } = transformRef.current

      let closest: { node: TreeNode; dist: number } | null = null
      const threshold = 15

      for (const node of Object.values(treeData.nodes)) {
        const sx = tx + node.x * scale
        const sy = ty + node.y * scale
        const dx = mx - sx
        const dy = my - sy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const radius = (NODE_RADIUS[node.t] || 5) * scale * 10
        if (dist < Math.max(radius + 3, threshold) && (!closest || dist < closest.dist)) {
          closest = { node, dist }
        }
      }

      if (closest) {
        const node = closest.node
        const allocated = allocatedHashes.has(node.id)
        let selectedMastery: { id: number; s: string[] } | undefined
        if (node.t === "M" && node.me && masteryEffects) {
          const effectHash = masteryEffects.get(node.id)
          if (effectHash) {
            selectedMastery = node.me.find((m) => m.id === effectHash)
          }
        }
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          node,
          allocated,
          selectedMastery,
        })
      } else {
        setTooltip(null)
      }
    },
    [treeData, allocatedHashes, masteryEffects, draw]
  )

  const handleMouseUp = useCallback(() => {
    dragRef.current.dragging = false
  }, [])

  // Attach wheel listener (non-passive)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener("wheel", handleWheel, { passive: false })
    return () => canvas.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  // Handle resize
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const observer = new ResizeObserver(() => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      draw()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [draw])

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-[#0c0a08] rounded-lg ${className || ""}`} style={{ minHeight: 500 }}>
        <span className="text-muted-foreground">Loading skill tree...</span>
      </div>
    )
  }

  if (!treeData) {
    return (
      <div className={`flex items-center justify-center bg-[#0c0a08] rounded-lg ${className || ""}`} style={{ minHeight: 500 }}>
        <span className="text-muted-foreground">Failed to load skill tree data.</span>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg bg-[#0c0a08] border border-border select-none ${className || ""}`}
      style={{ minHeight: 500, height: 600, cursor: dragRef.current.dragging ? "grabbing" : "grab" }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp()
          setTooltip(null)
        }}
        style={{ display: "block", width: "100%", height: "100%" }}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          className="w-8 h-8 bg-background/80 border border-border rounded text-sm hover:bg-accent"
          onClick={() => {
            const t = transformRef.current
            const canvas = canvasRef.current
            if (!canvas) return
            const cx = canvas.width / 2
            const cy = canvas.height / 2
            const newScale = Math.min(0.5, t.scale * 1.3)
            t.x = cx - ((cx - t.x) / t.scale) * newScale
            t.y = cy - ((cy - t.y) / t.scale) * newScale
            t.scale = newScale
            draw()
          }}
        >
          +
        </button>
        <button
          className="w-8 h-8 bg-background/80 border border-border rounded text-sm hover:bg-accent"
          onClick={() => {
            const t = transformRef.current
            const canvas = canvasRef.current
            if (!canvas) return
            const cx = canvas.width / 2
            const cy = canvas.height / 2
            const newScale = Math.max(0.005, t.scale / 1.3)
            t.x = cx - ((cx - t.x) / t.scale) * newScale
            t.y = cy - ((cy - t.y) / t.scale) * newScale
            t.scale = newScale
            draw()
          }}
        >
          -
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-3 left-3 bg-background/80 border border-border rounded p-2 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#c8a84e" }} />
          <span>Allocated</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "#3a3226" }} />
          <span>Unallocated</span>
        </div>
        <div className="text-muted-foreground mt-1">Scroll to zoom, drag to pan</div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <NodeTooltip
          node={tooltip.node}
          allocated={tooltip.allocated}
          selectedMastery={tooltip.selectedMastery}
          x={tooltip.x}
          y={tooltip.y}
          containerWidth={containerRef.current?.clientWidth || 0}
          containerHeight={containerRef.current?.clientHeight || 0}
        />
      )}
    </div>
  )
}

function NodeTooltip({
  node,
  allocated,
  selectedMastery,
  x,
  y,
  containerWidth,
  containerHeight,
}: {
  node: TreeNode
  allocated: boolean
  selectedMastery?: { id: number; s: string[] }
  x: number
  y: number
  containerWidth: number
  containerHeight: number
}) {
  const typeLabels: Record<string, string> = {
    n: "Passive",
    N: "Notable",
    K: "Keystone",
    M: "Mastery",
    J: "Jewel Socket",
    S: "Class Start",
    A: "Ascendancy",
  }

  const typeColors: Record<string, string> = {
    n: "text-gray-300",
    N: "text-amber-300",
    K: "text-amber-200",
    M: "text-blue-300",
    J: "text-blue-300",
    S: "text-gray-300",
    A: "text-purple-300",
  }

  // Position tooltip to avoid overflow
  const tooltipWidth = 280
  const tooltipHeight = 200
  let left = x + 15
  let top = y + 15
  if (left + tooltipWidth > containerWidth) left = x - tooltipWidth - 10
  if (top + tooltipHeight > containerHeight) top = Math.max(5, containerHeight - tooltipHeight - 5)

  return (
    <div
      className="absolute z-50 pointer-events-none bg-[#1a1612] border border-[#3a3226] rounded-lg shadow-xl p-3 max-w-[280px]"
      style={{ left, top }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-medium ${typeColors[node.t] || ""}`}>
          {typeLabels[node.t] || "Node"}
        </span>
        {allocated && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300">
            Allocated
          </span>
        )}
        {node.a && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300">
            {node.a}
          </span>
        )}
      </div>

      {/* Name */}
      <div className={`font-semibold text-sm mb-1 ${typeColors[node.t] || "text-white"}`}>
        {node.n}
      </div>

      {/* Stats */}
      {node.s && node.s.length > 0 && (
        <div className="space-y-0.5 mb-1">
          {node.s.map((stat, i) => (
            <div key={i} className="text-xs text-blue-200">
              {stat}
            </div>
          ))}
        </div>
      )}

      {/* Mastery effects */}
      {node.t === "M" && node.me && node.me.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#3a3226]">
          <div className="text-[10px] text-muted-foreground mb-1">
            {selectedMastery ? "Selected Effect:" : "Available Effects:"}
          </div>
          {selectedMastery ? (
            <div className="text-xs text-blue-200">
              {selectedMastery.s.join(", ")}
            </div>
          ) : (
            <div className="space-y-0.5">
              {node.me.slice(0, 4).map((me, i) => (
                <div key={i} className="text-[11px] text-gray-400">
                  {me.s.join(", ")}
                </div>
              ))}
              {node.me.length > 4 && (
                <div className="text-[10px] text-gray-500">
                  +{node.me.length - 4} more...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reminder text */}
      {node.r && node.r.length > 0 && (
        <div className="mt-1">
          {node.r.map((r, i) => (
            <div key={i} className="text-[10px] text-gray-500 italic">
              {r}
            </div>
          ))}
        </div>
      )}

      {/* Flavour text (keystones) */}
      {node.f && node.f.length > 0 && (
        <div className="mt-1 pt-1 border-t border-[#3a3226]">
          {node.f.map((f, i) => (
            <div key={i} className="text-[10px] text-amber-700 italic">
              {f}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
