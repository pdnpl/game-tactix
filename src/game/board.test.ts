import { describe, expect, it } from 'vitest'
import {
  applyMove,
  availableMoves,
  currentPlayer,
  EMPTY_BOARD,
  getOutcome,
  LINES,
  other,
} from './board'
import type { Board, Cell, Player } from './types'

/** "X.O|...|..." → board, for readable fixtures. */
function board(spec: string): Board {
  return [...spec.replaceAll('|', '')].map((ch) => (ch === '.' ? null : (ch as Player)))
}

describe('getOutcome', () => {
  it('reports an untouched board as still playing', () => {
    expect(getOutcome(EMPTY_BOARD)).toEqual({ kind: 'playing' })
  })

  it('detects a win on every one of the eight lines', () => {
    for (const line of LINES) {
      const cells: Cell[] = Array(9).fill(null)
      for (const i of line) cells[i] = 'X'
      expect(getOutcome(cells as Board)).toEqual({ kind: 'win', player: 'X', line })
    }
  })

  it('detects a win for O as well as X', () => {
    expect(getOutcome(board('OOO|XX.|...'))).toMatchObject({ kind: 'win', player: 'O' })
  })

  it('reports a full board with no line as a draw', () => {
    expect(getOutcome(board('XOX|XOO|OXX'))).toEqual({ kind: 'draw' })
  })

  it('does not call a partially filled board a draw', () => {
    expect(getOutcome(board('XOX|XO.|OXX'))).toEqual({ kind: 'playing' })
  })

  it('reports the winning line so the UI can highlight it', () => {
    expect(getOutcome(board('X..|X..|X.O'))).toEqual({
      kind: 'win',
      player: 'X',
      line: [0, 3, 6],
    })
  })
})

describe('applyMove', () => {
  it('returns a new board and leaves the original untouched', () => {
    const next = applyMove(EMPTY_BOARD, 4, 'X')
    expect(next[4]).toBe('X')
    expect(EMPTY_BOARD[4]).toBeNull()
  })

  it('rejects a cell that is already taken', () => {
    expect(() => applyMove(board('X........'), 0, 'O')).toThrow(/already taken/)
  })

  it('rejects an index outside the board', () => {
    expect(() => applyMove(EMPTY_BOARD, 9, 'X')).toThrow(RangeError)
    expect(() => applyMove(EMPTY_BOARD, -1, 'X')).toThrow(RangeError)
  })
})

describe('availableMoves', () => {
  it('lists every empty cell', () => {
    expect(availableMoves(EMPTY_BOARD)).toHaveLength(9)
    expect(availableMoves(board('XOX|OXO|XOX'))).toEqual([])
    expect(availableMoves(board('XOX|O.O|XOX'))).toEqual([4])
  })
})

describe('currentPlayer', () => {
  it('gives the first move to the starter', () => {
    expect(currentPlayer(EMPTY_BOARD)).toBe('X')
    expect(currentPlayer(EMPTY_BOARD, 'O')).toBe('O')
  })

  it('alternates as the board fills', () => {
    expect(currentPlayer(board('X........'))).toBe('O')
    expect(currentPlayer(board('XO.......'))).toBe('X')
  })

  it('respects an O start throughout', () => {
    expect(currentPlayer(board('O........'), 'O')).toBe('X')
    expect(currentPlayer(board('OX.......'), 'O')).toBe('O')
  })
})

describe('other', () => {
  it('flips the player', () => {
    expect(other('X')).toBe('O')
    expect(other('O')).toBe('X')
  })
})
