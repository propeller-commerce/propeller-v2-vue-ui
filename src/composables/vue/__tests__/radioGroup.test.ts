/**
 * Tests for the card-radio-group keyboard helpers.
 *
 * These back the checkout accessibility fix: CartPaymethods / CartCarriers /
 * DeliveryDate render options as styled divs, so their keyboard behaviour is
 * hand-written rather than inherited from `<input type="radio">`. The wrap-around
 * arithmetic and the click-delegation are the parts that can silently regress.
 *
 * vitest runs in the `node` environment here (see vitest.config.ts), so rather
 * than pull in jsdom for four DOM methods we stub exactly the surface the
 * helper touches.
 */

import { describe, it, expect, vi } from 'vitest'
import { radioGroupKeydown, radioTabIndex } from '../../shared/utils/radioGroup'

interface FakeRadio {
  click: ReturnType<typeof vi.fn>
  focus: ReturnType<typeof vi.fn>
  getAttribute: (name: string) => string | null
  closest: (selector: string) => unknown
}

/** Build `count` fake radios sharing one fake radiogroup parent. */
function makeGroup(count: number, disabledIndexes: number[] = []) {
  const radios: FakeRadio[] = []
  const group = {
    querySelectorAll: (selector: string) =>
      selector === '[role="radio"]' ? radios : [],
  }
  for (let i = 0; i < count; i++) {
    radios.push({
      click: vi.fn(),
      focus: vi.fn(),
      getAttribute: (name: string) =>
        name === 'aria-disabled' && disabledIndexes.includes(i) ? 'true' : null,
      closest: (selector: string) =>
        selector === '[role="radiogroup"]' ? group : null,
    })
  }
  return radios
}

function press(key: string, target: FakeRadio) {
  const preventDefault = vi.fn()
  radioGroupKeydown({
    key,
    currentTarget: target,
    preventDefault,
  } as unknown as KeyboardEvent)
  return { preventDefault }
}

describe('radioGroupKeydown', () => {
  it('selects on Enter and Space without letting the page scroll or a form submit', () => {
    for (const key of ['Enter', ' ', 'Spacebar']) {
      const radios = makeGroup(3)
      const { preventDefault } = press(key, radios[1])
      expect(radios[1].click, `${key} should select`).toHaveBeenCalledTimes(1)
      expect(preventDefault, `${key} should be swallowed`).toHaveBeenCalled()
    }
  })

  it('moves focus and selection to the next/previous option', () => {
    for (const key of ['ArrowRight', 'ArrowDown']) {
      const radios = makeGroup(3)
      press(key, radios[0])
      expect(radios[1].focus).toHaveBeenCalledTimes(1)
      expect(radios[1].click).toHaveBeenCalledTimes(1)
      expect(radios[2].focus).not.toHaveBeenCalled()
    }
    for (const key of ['ArrowLeft', 'ArrowUp']) {
      const radios = makeGroup(3)
      press(key, radios[2])
      expect(radios[1].focus).toHaveBeenCalledTimes(1)
      expect(radios[1].click).toHaveBeenCalledTimes(1)
    }
  })

  it('wraps around at both ends', () => {
    const forward = makeGroup(3)
    press('ArrowRight', forward[2])
    expect(forward[0].focus).toHaveBeenCalledTimes(1)

    const backward = makeGroup(3)
    press('ArrowLeft', backward[0])
    expect(backward[2].focus).toHaveBeenCalledTimes(1)
  })

  it('skips options marked aria-disabled', () => {
    const radios = makeGroup(3, [1])
    press('ArrowRight', radios[0])
    expect(radios[1].focus).not.toHaveBeenCalled()
    expect(radios[2].focus).toHaveBeenCalledTimes(1)
  })

  it('ignores keys it does not own, so typing still reaches the page', () => {
    const radios = makeGroup(3)
    const { preventDefault } = press('Tab', radios[0])
    expect(preventDefault).not.toHaveBeenCalled()
    expect(radios[0].click).not.toHaveBeenCalled()
    expect(radios[1].focus).not.toHaveBeenCalled()
  })

  it('does nothing when the option is not inside a radiogroup', () => {
    const orphan: FakeRadio = {
      click: vi.fn(),
      focus: vi.fn(),
      getAttribute: () => null,
      closest: () => null,
    }
    expect(() => press('ArrowRight', orphan)).not.toThrow()
    expect(orphan.click).not.toHaveBeenCalled()
  })
})

describe('radioTabIndex', () => {
  it('gives the tab stop to the selected option', () => {
    expect(radioTabIndex(true, 2, true)).toBe(0)
    expect(radioTabIndex(false, 0, true)).toBe(-1)
    expect(radioTabIndex(false, 3, true)).toBe(-1)
  })

  it('falls back to the first option when nothing is selected yet', () => {
    // Checkout starts in exactly this state; without the fallback the group
    // would have no tabbable element and be unreachable by keyboard.
    expect(radioTabIndex(false, 0, false)).toBe(0)
    expect(radioTabIndex(false, 1, false)).toBe(-1)
  })
})
