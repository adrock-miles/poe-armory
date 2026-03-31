import { useEffect, useRef } from "react"

/**
 * Positions a popover element using fixed positioning to escape overflow containers.
 * Runs once when `active` becomes true.
 */
export function useRepositionPopover<T extends HTMLElement>(
  active: boolean,
) {
  const ref = useRef<T>(null!)

  useEffect(() => {
    if (!active) return
    const el = ref.current
    if (!el) return
    const parent = el.parentElement
    if (!parent) return

    const parentRect = parent.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()

    // Position above the parent, centered horizontally
    el.style.position = "fixed"
    let left = parentRect.left + parentRect.width / 2 - elRect.width / 2
    let top = parentRect.top - elRect.height - 4

    // Clamp horizontal to viewport
    if (left + elRect.width > window.innerWidth - 8) {
      left = window.innerWidth - 8 - elRect.width
    }
    if (left < 8) {
      left = 8
    }

    // If it would overflow the top, flip below the parent
    if (top < 8) {
      top = parentRect.bottom + 4
    }

    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.transform = "none"
  }, [active])

  return ref
}
