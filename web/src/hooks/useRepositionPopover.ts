import { useEffect, useRef } from "react"

/**
 * Adjusts the position of a popover element to keep it within the viewport.
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

    const rect = el.getBoundingClientRect()

    if (rect.right > window.innerWidth - 8) {
      el.style.left = "auto"
      el.style.right = "0"
      el.style.transform = "none"
    }
    if (rect.left < 8) {
      el.style.left = "0"
      el.style.transform = "none"
    }
    if (rect.top < 8) {
      el.style.bottom = "auto"
      el.style.top = "100%"
      el.style.marginBottom = "0"
      el.style.marginTop = "4px"
    }
  }, [active])

  return ref
}
