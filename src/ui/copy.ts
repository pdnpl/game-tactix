import type { State } from '../game/session'
import { AI, HUMAN, turn } from '../game/session'

const chip = (player: 'X' | 'O', label: string) =>
  `<b class="is-${player.toLowerCase()}">${label}</b>`

/** The status line, as HTML so the active player can be colour-coded. */
export function statusText(state: State, thinking: boolean): string {
  const { outcome, mode } = state

  if (outcome.kind === 'win') {
    if (mode === 'hotseat') return `${chip(outcome.player, outcome.player)} wins`
    return outcome.player === HUMAN ? 'You win' : `${chip(AI, 'Tactix')} wins`
  }

  if (outcome.kind === 'draw') return "It's a draw"

  const player = turn(state)
  if (mode === 'hotseat') return `${chip(player, player)} to play`
  if (thinking) return `${chip(AI, 'Tactix')} is thinking…`
  return player === HUMAN ? 'Your turn' : `${chip(AI, 'Tactix')} to play`
}

/** Scoreboard headings, which differ between solo and pass-and-play. */
export function scoreLabels(state: State): { x: string; o: string } {
  return state.mode === 'ai' ? { x: 'You', o: 'Tactix' } : { x: 'Player X', o: 'Player O' }
}

/** Announcement for the cell that was just played, for screen readers. */
export function cellLabel(index: number, mark: 'X' | 'O' | null): string {
  const row = Math.floor(index / 3) + 1
  const col = (index % 3) + 1
  const where = `row ${row}, column ${col}`
  return mark === null ? `Play ${where}` : `${where}, ${mark}`
}
