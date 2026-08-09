import type { Board, Outcome, Player } from './types'

export const EMPTY_BOARD: Board = Object.freeze([
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
])

/** The eight winning triples: 3 rows, 3 columns, 2 diagonals. */
export const LINES: readonly (readonly [number, number, number])[] = Object.freeze([
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
])

export function other(player: Player): Player {
  return player === 'X' ? 'O' : 'X'
}

export function getOutcome(board: Board): Outcome {
  for (const line of LINES) {
    const [a, b, c] = line
    const mark = board[a]
    if (mark !== null && mark === board[b] && mark === board[c]) {
      return { kind: 'win', player: mark, line }
    }
  }
  return board.includes(null) ? { kind: 'playing' } : { kind: 'draw' }
}

export function availableMoves(board: Board): number[] {
  const moves: number[] = []
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] === null) moves.push(i)
  }
  return moves
}

/**
 * Returns a new board with `player` placed at `index`.
 * Throws on an occupied or out-of-range cell — callers must validate first.
 */
export function applyMove(board: Board, index: number, player: Player): Board {
  if (index < 0 || index >= board.length) {
    throw new RangeError(`Cell ${index} is outside the board`)
  }
  if (board[index] !== null) {
    throw new Error(`Cell ${index} is already taken by ${board[index]}`)
  }
  const next = board.slice()
  next[index] = player
  return next
}

/**
 * Whose turn it is, derived from the board rather than tracked separately so the
 * two can never drift apart. `starter` moves on even counts.
 */
export function currentPlayer(board: Board, starter: Player = 'X'): Player {
  let placed = 0
  for (const cell of board) {
    if (cell !== null) placed += 1
  }
  return placed % 2 === 0 ? starter : other(starter)
}
