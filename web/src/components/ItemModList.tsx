import type { ItemMods } from "@/types/character"

interface ItemModListProps {
  mods: ItemMods | undefined
  fontSize?: "xs" | "sm"
}

const MOD_CATEGORIES: { key: keyof ItemMods; className: string }[] = [
  { key: "enchantMods", className: "text-cyan-400" },
  { key: "implicitMods", className: "text-blue-400" },
  { key: "explicitMods", className: "text-blue-300" },
  { key: "craftedMods", className: "text-cyan-300" },
  { key: "fracturedMods", className: "text-amber-400" },
]

export function ItemModList({ mods, fontSize = "xs" }: ItemModListProps) {
  if (!mods) return null

  const sizeClass = fontSize === "sm" ? "text-[11px]" : "text-[10px]"

  return (
    <>
      {MOD_CATEGORIES.map(({ key, className }) =>
        mods[key]?.map((mod, i) => (
          <div key={`${key[0]}${i}`} className={`${sizeClass} ${className}`}>
            {mod}
          </div>
        )),
      )}
    </>
  )
}
