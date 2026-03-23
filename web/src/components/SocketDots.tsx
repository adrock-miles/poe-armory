import type { Socket } from "@/types/character"

const SOCKET_COLORS: Record<string, string> = {
  S: "bg-red-500",
  D: "bg-green-500",
  I: "bg-blue-500",
  G: "bg-gray-300",
  A: "bg-gray-500",
  DV: "bg-gray-500",
}

interface SocketDotsProps {
  sockets: Socket[] | undefined
  size?: "sm" | "md"
}

export function SocketDots({ sockets, size = "md" }: SocketDotsProps) {
  if (!sockets || sockets.length === 0) return null

  const dotSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"

  return (
    <div className="flex gap-0.5">
      {sockets.map((s, i) => (
        <span
          key={i}
          className={`inline-block rounded-full ${dotSize} ${SOCKET_COLORS[s.attr] || "bg-gray-500"}`}
        />
      ))}
    </div>
  )
}

export { SOCKET_COLORS }
