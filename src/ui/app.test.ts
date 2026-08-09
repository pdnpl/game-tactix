// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HTML from '../../index.html?raw'
import { mount } from './app'

// Bound to the real shipped markup, so a change to index.html that breaks the
// wiring fails here rather than in the browser.
const BODY = HTML.slice(HTML.indexOf('<body>') + 6, HTML.indexOf('</body>'))

let unmount: () => void

/** Loads the real index.html body so the tests bind to the shipped markup. */
function setup() {
  document.body.innerHTML = BODY
  document.documentElement.dataset.theme = 'dark'
  unmount = mount()
}

const cells = () => [...document.querySelectorAll<HTMLButtonElement>('.cell')]
const status = () => document.querySelector('#status')!.textContent!.trim()
const marks = () =>
  cells().map((c) => c.querySelector(':scope > svg')?.getAttribute('class') ?? null)
const click = (i: number) => cells()[i].click()

beforeEach(() => {
  vi.useFakeTimers()
  // jsdom has no layout, so the strike-line maths would divide by a zero-size board.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  setup()
})

afterEach(() => {
  unmount?.()
  vi.useRealTimers()
  vi.restoreAllMocks()
  localStorage.clear()
})

/** Lets the AI's deliberation timer fire. */
function letAiMove() {
  vi.advanceTimersByTime(500)
}

describe('board', () => {
  it('renders nine cells', () => {
    expect(cells()).toHaveLength(9)
  })

  it('places your mark where you click', () => {
    click(4)
    expect(marks()[4]).toBe('mark-x')
  })

  it('ignores a click on a taken cell', () => {
    click(4)
    letAiMove()
    const before = marks()
    click(4)
    expect(marks()).toEqual(before)
  })

  it('locks the board while the AI is thinking', () => {
    click(0)
    expect(status()).toContain('thinking')
    click(1)
    // The click landed mid-thought and must not register.
    expect(marks()[1]).toBeNull()
  })
})

describe('solo play', () => {
  it('lets the AI reply after you move', () => {
    click(4)
    letAiMove()
    expect(marks().filter((m) => m === 'mark-o')).toHaveLength(1)
  })

  it('never loses as the unbeatable AI', () => {
    // Play greedily into the lowest free cell until the round ends.
    let moves = 0
    for (let i = 0; i < 9; i += 1) {
      const free = cells().findIndex((c) => c.dataset.playable === 'true')
      if (free === -1) break
      click(free)
      letAiMove()
      moves += 1
    }
    // Guards against the loop exiting immediately and asserting nothing.
    expect(moves).toBeGreaterThan(2)
    expect(document.querySelector<HTMLButtonElement>('#again')!.hidden).toBe(false)
    expect(status()).not.toBe('You win')
  })
})

describe('hot-seat', () => {
  beforeEach(() => {
    document.querySelector<HTMLButtonElement>('[data-mode="hotseat"]')!.click()
  })

  it('alternates X and O with no AI involvement', () => {
    click(0)
    click(1)
    click(2)
    expect(marks()[0]).toBe('mark-x')
    expect(marks()[1]).toBe('mark-o')
    expect(marks()[2]).toBe('mark-x')
  })

  it('hides the difficulty control', () => {
    expect(document.querySelector<HTMLElement>('#difficulty')!.dataset.hidden).toBe('true')
  })

  it('relabels the scoreboard for two humans', () => {
    expect(document.querySelector('#label-x')!.textContent).toBe('Player X')
    expect(document.querySelector('#label-o')!.textContent).toBe('Player O')
  })

  it('announces the winner and shows the strike line', () => {
    for (const i of [0, 3, 1, 4, 2]) click(i)
    expect(status()).toContain('X wins')
    expect(document.querySelector<SVGElement>('#strike')!.dataset.show).toBe('true')
    expect(document.querySelector('#score-x')!.textContent).toBe('1')
  })

  it('marks the winning cells and no others', () => {
    for (const i of [0, 3, 1, 4, 2]) click(i)
    const winners = cells().map((c) => c.dataset.win)
    expect(winners).toEqual([
      'true',
      'true',
      'true',
      'false',
      'false',
      'false',
      'false',
      'false',
      'false',
    ])
  })

  it('stops accepting moves once the game is won', () => {
    for (const i of [0, 3, 1, 4, 2]) click(i)
    click(5)
    expect(marks()[5]).toBeNull()
  })
})

describe('draw', () => {
  const playToDraw = () => {
    document.querySelector<HTMLButtonElement>('[data-mode="hotseat"]')!.click()
    for (const i of [4, 0, 1, 7, 6, 2, 5, 3, 8]) click(i)
  }

  it('recognises the draw and counts it', () => {
    playToDraw()
    expect(status()).toBe("It's a draw")
    expect(document.querySelector('#score-draw')!.textContent).toBe('1')
  })

  it('does not dim the board, because nothing lost', () => {
    playToDraw()
    // The spotlight rule keys off data-result, so a draw must not report "win".
    expect(document.querySelector<HTMLElement>('#board')!.dataset.result).toBe('draw')
    expect(
      [...document.querySelectorAll<HTMLElement>('.cell')].every((c) => c.dataset.win === 'false'),
    ).toBe(true)
  })

  it('draws no strike line', () => {
    playToDraw()
    expect(document.querySelector<SVGElement>('#strike')!.dataset.show).toBe('false')
  })

  it('marks the board as won only when someone actually wins', () => {
    document.querySelector<HTMLButtonElement>('[data-mode="hotseat"]')!.click()
    for (const i of [0, 3, 1, 4, 2]) click(i)
    expect(document.querySelector<HTMLElement>('#board')!.dataset.result).toBe('win')
  })

  it('returns to playing on the next round', () => {
    playToDraw()
    document.querySelector<HTMLButtonElement>('#again')!.click()
    expect(document.querySelector<HTMLElement>('#board')!.dataset.result).toBe('playing')
  })
})

describe('play again', () => {
  it('is hidden until the round ends, then clears the board', () => {
    const again = document.querySelector<HTMLButtonElement>('#again')!
    expect(again.hidden).toBe(true)

    document.querySelector<HTMLButtonElement>('[data-mode="hotseat"]')!.click()
    for (const i of [0, 3, 1, 4, 2]) click(i)
    expect(again.hidden).toBe(false)

    again.click()
    expect(marks().every((m) => m === null)).toBe(true)
    expect(document.querySelector('#score-x')!.textContent).toBe('1')
  })

  it('gives the next opening move to the other side', () => {
    document.querySelector<HTMLButtonElement>('[data-mode="hotseat"]')!.click()
    for (const i of [0, 3, 1, 4, 2]) click(i)
    document.querySelector<HTMLButtonElement>('#again')!.click()

    expect(status()).toContain('O to play')
  })
})

describe('switching settings', () => {
  it('resets the board and the score', () => {
    document.querySelector<HTMLButtonElement>('[data-mode="hotseat"]')!.click()
    for (const i of [0, 3, 1, 4, 2]) click(i)
    expect(document.querySelector('#score-x')!.textContent).toBe('1')

    document.querySelector<HTMLButtonElement>('[data-difficulty="easy"]')!.click()
    expect(document.querySelector('#score-x')!.textContent).toBe('0')
    expect(marks().every((m) => m === null)).toBe(true)
  })

  it('cancels a pending AI move instead of letting it land later', () => {
    click(0)
    document.querySelector<HTMLButtonElement>('[data-mode="hotseat"]')!.click()
    letAiMove()
    expect(marks().every((m) => m === null)).toBe(true)
  })
})

describe('keyboard', () => {
  const press = (key: string) =>
    document
      .querySelector('#board')!
      .dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

  it('moves focus across the grid with the arrow keys', () => {
    cells()[0].focus()
    press('ArrowRight')
    expect(document.activeElement).toBe(cells()[1])
    press('ArrowDown')
    expect(document.activeElement).toBe(cells()[4])
  })

  it('does not wrap from the end of one row to the next', () => {
    cells()[2].focus()
    press('ArrowRight')
    expect(document.activeElement).toBe(cells()[2])
  })

  it('does not move past the top or bottom edge', () => {
    cells()[1].focus()
    press('ArrowUp')
    expect(document.activeElement).toBe(cells()[1])
  })

  it('jumps to the first and last cell with Home and End', () => {
    cells()[4].focus()
    press('End')
    expect(document.activeElement).toBe(cells()[8])
    press('Home')
    expect(document.activeElement).toBe(cells()[0])
  })

  it('keeps exactly one cell in the tab order', () => {
    cells()[0].focus()
    press('ArrowRight')
    expect(cells().filter((c) => c.tabIndex === 0)).toHaveLength(1)
  })
})

describe('theme', () => {
  it('toggles and remembers the choice', () => {
    const toggle = document.querySelector<HTMLButtonElement>('#theme-toggle')!
    toggle.click()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('tactix.theme')).toBe('light')

    toggle.click()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('keeps the label describing the action, not the current theme', () => {
    const toggle = document.querySelector<HTMLButtonElement>('#theme-toggle')!
    expect(toggle.getAttribute('aria-label')).toBe('Switch to light theme')
    toggle.click()
    expect(toggle.getAttribute('aria-label')).toBe('Switch to dark theme')
  })

  it('corrects the markup label when the boot script chose light', () => {
    // index.html ships data-theme="dark"; the inline script may flip it to light
    // before mount, and the hardcoded label must not survive that.
    unmount()
    document.documentElement.dataset.theme = 'light'
    document.body.innerHTML = BODY
    unmount = mount()

    expect(document.querySelector('#theme-toggle')!.getAttribute('aria-label')).toBe(
      'Switch to dark theme',
    )
  })
})

describe('accessibility', () => {
  it('labels every cell by its position', () => {
    expect(cells()[0].getAttribute('aria-label')).toBe('Play row 1, column 1')
    expect(cells()[8].getAttribute('aria-label')).toBe('Play row 3, column 3')
  })

  it('names the mark once a cell is played', () => {
    document.querySelector<HTMLButtonElement>('[data-mode="hotseat"]')!.click()
    click(4)
    expect(cells()[4].getAttribute('aria-label')).toBe('row 2, column 2, X')
  })

  it('marks played cells as disabled for assistive tech', () => {
    document.querySelector<HTMLButtonElement>('[data-mode="hotseat"]')!.click()
    click(0)
    expect(cells()[0].getAttribute('aria-disabled')).toBe('true')
    expect(cells()[1].getAttribute('aria-disabled')).toBe('false')
  })

  it('exposes the selected mode and difficulty', () => {
    expect(document.querySelector('[data-mode="ai"]')!.getAttribute('aria-checked')).toBe('true')
    expect(
      document.querySelector('[data-difficulty="unbeatable"]')!.getAttribute('aria-checked'),
    ).toBe('true')
  })
})
