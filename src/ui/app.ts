import {
  awaitingAi,
  configure,
  initialState,
  nextRound,
  play,
  playAi,
  turn,
  type State,
} from '../game/session'
import type { Cell, Difficulty, Mode } from '../game/types'
import { cellLabel, scoreLabels, statusText } from './copy'
import { markSvg } from './marks'

/** How long the AI appears to deliberate. Minimax itself takes under a millisecond. */
const THINK_MS = 420

type Els = {
  board: HTMLElement
  strike: SVGSVGElement
  status: HTMLElement
  again: HTMLButtonElement
  difficulty: HTMLElement
  themeToggle: HTMLButtonElement
  scores: Record<'X' | 'O' | 'draws', HTMLElement>
  labels: { x: HTMLElement; o: HTMLElement }
}

export function mount(root: ParentNode = document): () => void {
  const $ = <T extends Element>(sel: string) => {
    const el = root.querySelector<T>(sel)
    if (!el) throw new Error(`Missing element: ${sel}`)
    return el
  }

  const els: Els = {
    board: $('#board'),
    strike: $<SVGSVGElement>('#strike'),
    status: $('#status'),
    again: $<HTMLButtonElement>('#again'),
    difficulty: $('#difficulty'),
    themeToggle: $<HTMLButtonElement>('#theme-toggle'),
    scores: { X: $('#score-x'), O: $('#score-o'), draws: $('#score-draw') },
    labels: { x: $('#label-x'), o: $('#label-o') },
  }

  let state = initialState()
  let thinking = false
  let aiTimer: ReturnType<typeof setTimeout> | undefined

  // Mirrors of the last painted values, so each render touches only what moved.
  // Starts as `undefined` rather than `null` so the first render, on a board
  // that is legitimately all-null, still paints every cell.
  let painted: (Cell | undefined)[] = Array(9).fill(undefined)
  let paintedScore = { ...state.score }
  let paintedStatus = ''

  const cells: HTMLButtonElement[] = []
  let focusIndex = 0

  /* ------------------------------------------------------------ building */

  for (let i = 0; i < 9; i += 1) {
    const cell = document.createElement('button')
    cell.type = 'button'
    cell.className = 'cell'
    cell.dataset.index = String(i)
    cell.setAttribute('role', 'gridcell')
    cell.tabIndex = i === 0 ? 0 : -1

    const ghost = document.createElement('span')
    ghost.className = 'ghost'
    cell.append(ghost)

    cells.push(cell)
    els.board.append(cell)
  }

  /* ------------------------------------------------------------ painting */

  function paintCell(i: number) {
    const mark = state.board[i]
    const cell = cells[i]

    // The ghost is the first child and is never rebuilt; the mark follows it.
    cell.querySelector(':scope > svg')?.remove()
    const ghost = cell.firstElementChild as HTMLElement
    ghost.replaceChildren()

    if (mark === null) {
      if (state.outcome.kind === 'playing') ghost.append(markSvg(turn(state)))
    } else {
      cell.append(markSvg(mark))
    }

    const playable = mark === null && state.outcome.kind === 'playing' && !thinking
    cell.dataset.playable = String(playable)
    cell.setAttribute('aria-label', cellLabel(i, mark))
    cell.setAttribute('aria-disabled', String(!playable))
  }

  function paintStrike() {
    const { outcome } = state
    if (outcome.kind !== 'win') {
      els.strike.dataset.show = 'false'
      els.strike.classList.remove('is-x', 'is-o')
      return
    }

    const [from, , to] = outcome.line
    const a = cells[from]
    const b = cells[to]
    const w = els.board.clientWidth
    const h = els.board.clientHeight
    if (w === 0 || h === 0) return

    const centre = (el: HTMLElement) => ({
      x: el.offsetLeft + el.offsetWidth / 2,
      y: el.offsetTop + el.offsetHeight / 2,
    })
    const p1 = centre(a)
    const p2 = centre(b)

    // Extend a little past both centres so the stroke reads as a strike-through.
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const len = Math.hypot(dx, dy) || 1
    const over = Math.min(w, h) * 0.11
    const ux = (dx / len) * over
    const uy = (dy / len) * over

    const line = els.strike.querySelector('line')!
    els.strike.setAttribute('viewBox', `0 0 ${w} ${h}`)
    line.setAttribute('x1', String(p1.x - ux))
    line.setAttribute('y1', String(p1.y - uy))
    line.setAttribute('x2', String(p2.x + ux))
    line.setAttribute('y2', String(p2.y + uy))
    line.setAttribute('stroke-width', String(Math.max(4, w * 0.022)))

    els.strike.classList.toggle('is-x', outcome.player === 'X')
    els.strike.classList.toggle('is-o', outcome.player === 'O')
    els.strike.dataset.show = 'true'
  }

  function render() {
    const over = state.outcome.kind !== 'playing'

    for (let i = 0; i < 9; i += 1) {
      // Repaint a cell when its mark changed, or when the round ended or began
      // (which flips playability and clears ghosts across the whole board).
      if (painted[i] !== state.board[i] || over !== (els.board.dataset.over === 'true')) {
        paintCell(i)
      }
      const inWin = state.outcome.kind === 'win' && state.outcome.line.includes(i)
      cells[i].dataset.win = String(inWin)
    }
    painted = [...state.board]
    els.board.dataset.over = String(over)

    paintStrike()

    const html = statusText(state, thinking)
    if (html !== paintedStatus) {
      els.status.innerHTML = html
      els.status.classList.remove('shift')
      void els.status.offsetWidth // restart the transition
      els.status.classList.add('shift')
      paintedStatus = html
    }

    const labels = scoreLabels(state)
    els.labels.x.textContent = labels.x
    els.labels.o.textContent = labels.o

    for (const key of ['X', 'O', 'draws'] as const) {
      const value = state.score[key]
      if (paintedScore[key] !== value) {
        const el = els.scores[key]
        el.textContent = String(value)
        el.classList.remove('bump')
        void el.offsetWidth
        el.classList.add('bump')
      }
    }
    paintedScore = { ...state.score }

    els.again.hidden = !over
    els.difficulty.dataset.hidden = String(state.mode !== 'ai')
    for (const btn of els.difficulty.querySelectorAll('button')) {
      btn.tabIndex = state.mode === 'ai' ? 0 : -1
    }

    for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
      btn.setAttribute('aria-checked', String(btn.dataset.mode === state.mode))
    }
    for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-difficulty]')) {
      btn.setAttribute('aria-checked', String(btn.dataset.difficulty === state.difficulty))
    }
  }

  /* --------------------------------------------------------------- turns */

  function cancelAi() {
    clearTimeout(aiTimer)
    aiTimer = undefined
    thinking = false
  }

  /** Hands over to the AI if it is its move, after a short pause for feel. */
  function scheduleAi() {
    if (!awaitingAi(state)) return
    thinking = true
    render()
    aiTimer = setTimeout(() => {
      aiTimer = undefined
      thinking = false
      state = playAi(state)
      render()
    }, THINK_MS)
  }

  function commit(next: State) {
    if (next === state) return
    state = next
    render()
    scheduleAi()
  }

  /* -------------------------------------------------------------- events */

  els.board.addEventListener('click', (e) => {
    if (thinking) return
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.cell')
    if (!cell) return
    commit(play(state, Number(cell.dataset.index)))
  })

  els.board.addEventListener('keydown', (e) => {
    const delta: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: 3,
      ArrowUp: -3,
    }
    if (e.key === 'Home') {
      focusIndex = 0
    } else if (e.key === 'End') {
      focusIndex = 8
    } else if (e.key in delta) {
      const next = focusIndex + delta[e.key]
      // Left/right must not wrap onto the neighbouring row.
      const sameRow = Math.abs(delta[e.key]) === 1
      if (next < 0 || next > 8) return
      if (sameRow && Math.floor(next / 3) !== Math.floor(focusIndex / 3)) return
      focusIndex = next
    } else {
      return
    }

    e.preventDefault()
    for (const [i, c] of cells.entries()) c.tabIndex = i === focusIndex ? 0 : -1
    cells[focusIndex].focus()
  })

  els.board.addEventListener('focusin', (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.cell')
    if (cell) focusIndex = Number(cell.dataset.index)
  })

  els.again.addEventListener('click', () => {
    cancelAi()
    commit(nextRound(state))
    // Keep the keyboard where the action is.
    cells[focusIndex].focus({ preventScroll: true })
  })

  for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
    btn.addEventListener('click', () => {
      cancelAi()
      commit(configure(state, { mode: btn.dataset.mode as Mode }))
    })
  }

  for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-difficulty]')) {
    btn.addEventListener('click', () => {
      cancelAi()
      commit(configure(state, { difficulty: btn.dataset.difficulty as Difficulty }))
    })
  }

  /** Keeps the toggle's label describing what it will do, not what is showing. */
  function syncThemeLabel() {
    const dark = document.documentElement.dataset.theme === 'dark'
    els.themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`)
  }

  // The inline boot script may have picked light from the system preference,
  // so the label baked into the markup cannot be trusted at this point.
  syncThemeLabel()

  els.themeToggle.addEventListener('click', () => {
    const docEl = document.documentElement
    const dark = docEl.dataset.theme !== 'dark'
    docEl.dataset.theme = dark ? 'dark' : 'light'
    syncThemeLabel()
    try {
      localStorage.setItem('tactix.theme', dark ? 'dark' : 'light')
    } catch {
      // Private mode — the theme simply will not persist.
    }
  })

  // The strike is drawn in pixels, so it has to follow the board when it resizes.
  const observer = new ResizeObserver(() => {
    if (state.outcome.kind === 'win') paintStrike()
  })
  observer.observe(els.board)

  render()

  return () => {
    cancelAi()
    observer.disconnect()
  }
}
