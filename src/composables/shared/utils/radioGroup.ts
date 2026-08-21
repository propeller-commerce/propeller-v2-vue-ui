/**
 * Keyboard + roving-tabindex helpers for card-style radio groups.
 *
 * CartPaymethods / CartCarriers / DeliveryDate render their options as styled
 * cards, not `<input type="radio">`, so they got no keyboard or screen-reader
 * affordances for free: the options were plain divs with a click handler —
 * unreachable by Tab, invisible to the accessibility tree, and (because
 * choosing a carrier is required to advance checkout) a hard block for
 * keyboard-only and screen-reader users.
 *
 * Rather than restyle three components around native inputs, they keep their
 * markup and adopt the ARIA radiogroup pattern. These two helpers are the
 * whole behavioural contract, shared so the three stay consistent.
 */

const NEXT_KEYS = ['ArrowRight', 'ArrowDown']
// 'Spacebar' is the legacy IE/Edge name for ' '. Cheap to accept.
const SELECT_KEYS = ['Enter', ' ', 'Spacebar']

/**
 * `keydown` handler for an element carrying `role="radio"`.
 *
 * Enter/Space selects; arrow keys move focus to the previous/next radio in the
 * enclosing `role="radiogroup"` and select it, which is how native radios
 * behave. Selection is driven by dispatching a real `click`, so the component's
 * existing `@click` handler stays the single place selection is implemented —
 * no second code path to keep in sync.
 */
export function radioGroupKeydown(event: KeyboardEvent): void {
  const el = event.currentTarget as HTMLElement | null
  if (!el) return

  if (SELECT_KEYS.includes(event.key)) {
    // Space would scroll the page, Enter could submit a wrapping form.
    event.preventDefault()
    el.click()
    return
  }

  const isNext = NEXT_KEYS.includes(event.key)
  const isPrev = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
  if (!isNext && !isPrev) return
  event.preventDefault()

  const group = el.closest('[role="radiogroup"]')
  if (!group) return
  const radios = Array.from(
    group.querySelectorAll<HTMLElement>('[role="radio"]'),
  ).filter((r) => r.getAttribute('aria-disabled') !== 'true')

  const current = radios.indexOf(el)
  if (current === -1) return
  // Wrap around at both ends, as the radiogroup pattern specifies.
  const target = radios[(current + (isNext ? 1 : -1) + radios.length) % radios.length]
  if (!target || target === el) return
  target.focus()
  target.click()
}

/**
 * Roving tabindex: exactly ONE radio in a group is tabbable, so Tab enters and
 * leaves the group as a single stop and the arrow keys move within it.
 *
 * The selected option owns the tab stop. With nothing selected yet the first
 * option takes it — otherwise the group would have no tabbable element at all
 * and a keyboard user could never reach it, which is the state checkout starts
 * in.
 */
export function radioTabIndex(
  isSelected: boolean,
  index: number,
  hasSelection: boolean,
): number {
  return isSelected || (!hasSelection && index === 0) ? 0 : -1
}
