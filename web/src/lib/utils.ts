import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function frameTypeToRarity(frameType: number): string {
  switch (frameType) {
    case 0: return "normal"
    case 1: return "magic"
    case 2: return "rare"
    case 3: return "unique"
    case 4: return "gem"
    default: return "normal"
  }
}

export function frameTypeToColor(frameType: number): string {
  switch (frameType) {
    case 0: return "#c8c8c8"
    case 1: return "#8888ff"
    case 2: return "#ffff77"
    case 3: return "#af6025"
    case 4: return "#1ba29b"
    default: return "#c8c8c8"
  }
}

export function slotDisplayName(slot: string): string {
  const names: Record<string, string> = {
    Helm: "Helmet",
    BodyArmour: "Body Armour",
    Gloves: "Gloves",
    Boots: "Boots",
    Weapon: "Main Hand",
    Weapon2: "Off Hand",
    Offhand: "Off Hand",
    Offhand2: "Weapon Swap Off Hand",
    Ring: "Left Ring",
    Ring2: "Right Ring",
    Amulet: "Amulet",
    Belt: "Belt",
    Flask: "Flask",
  }
  return names[slot] || slot
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
