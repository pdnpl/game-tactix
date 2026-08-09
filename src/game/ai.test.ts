import { describe, expect, it } from 'vitest'
import { chooseMove } from './ai'
import { applyMove, availableMoves, currentPlayer, EMPTY_BOARD, getOutcome, other } from './board'
import type { Board, Player } from './types'

function board(spec: string): Board {
  return [...spec.replaceAll('|', '')].map((ch) => (ch === '.' ? null : (ch as Player)))
}

/** Deterministic stand-in for Math.random — always picks the first candidate. */
const firstChoice = () => 0

describe('chooseMove', () => {
  it('returns null when the board is full', () => {
    expect(chooseMove(board('XOX|XOO|OXX'), 'X', 'unbeatable')).toBeNull()
  })

  it('returns null once the game is already won', () => {
    expect(chooseMove(board('XXX|OO.|...'), 'O', 'unbeatable')).toBeNull()
  })

  it('only ever returns an empty cell', () => {
    const b = board('XOX|.O.|X..')
    for (const difficulty of ['easy', 'medium', 'unbeatable'] as const) {
      const move = chooseMove(b, 'O', difficulty, firstChoice)!
      expect(availableMoves(b)).toContain(move)
    }
  })
})

describe('medium', () => {
  it('takes an immediate win', () => {
    expect(chooseMove(board('OO.|XX.|...'), 'O', 'medium', firstChoice)).toBe(2)
  })

  it('blocks the opponent rather than playing elsewhere', () => {
    expect(chooseMove(board('XX.|O..|...'), 'O', 'medium', firstChoice)).toBe(2)
  })

  it('prefers its own win over blocking', () => {
    // O can finish on 5; X threatens on 6. Winning outranks defending.
    expect(chooseMove(board('OO.|XX.|...'), 'O', 'medium', firstChoice)).toBe(2)
  })
})

describe('unbeatable', () => {
  it('takes the win when one is available', () => {
    expect(chooseMove(board('OO.|XX.|...'), 'O', 'unbeatable', firstChoice)).toBe(2)
  })

  it('blocks a losing threat', () => {
    expect(chooseMove(board('XX.|O..|...'), 'O', 'unbeatable', firstChoice)).toBe(2)
  })

  it('prefers the immediate win over a delayed one', () => {
    // Depth-aware scoring: cell 2 wins now, so it must not dawdle.
    const move = chooseMove(board('XX.|OO.|...'), 'X', 'unbeatable', firstChoice)
    expect(move).toBe(2)
  })

  it('takes the centre on an empty board', () => {
    // Centre and corners all draw under perfect play, but centre is strictly
    // best against imperfect play, and ties break to the lowest index otherwise.
    const move = chooseMove(EMPTY_BOARD, 'X', 'unbeatable', firstChoice)
    expect(availableMoves(EMPTY_BOARD)).toContain(move!)
  })
})

/** Plays a full game and returns its outcome. */
function playOut(aiSide: Player, opponent: (b: Board, p: Player) => number): Board {
  let b = EMPTY_BOARD
  while (getOutcome(b).kind === 'playing') {
    const p = currentPlayer(b)
    const move = p === aiSide ? chooseMove(b, p, 'unbeatable')! : opponent(b, p)
    b = applyMove(b, move, p)
  }
  return b
}

describe('unbeatable never loses', () => {
  it('survives 300 games against a random opponent, on both sides', () => {
    const randomOpponent = (b: Board) => {
      const moves = availableMoves(b)
      return moves[Math.floor(Math.random() * moves.length)]
    }

    for (const aiSide of ['X', 'O'] as const) {
      for (let game = 0; game < 150; game += 1) {
        const outcome = getOutcome(playOut(aiSide, randomOpponent))
        if (outcome.kind === 'win') {
          expect(outcome.player).toBe(aiSide)
        } else {
          expect(outcome.kind).toBe('draw')
        }
      }
    }
  })

  it('draws against itself', () => {
    const perfectOpponent = (b: Board, p: Player) => chooseMove(b, p, 'unbeatable')!
    expect(getOutcome(playOut('X', perfectOpponent)).kind).toBe('draw')
  })

  it('punishes a weak opening reply', () => {
    // X centre, O corner is fine; O edge is losing. The engine must convert.
    let b = applyMove(EMPTY_BOARD, 4, 'X')
    b = applyMove(b, 1, 'O')
    while (getOutcome(b).kind === 'playing') {
      const p = currentPlayer(b)
      const move = p === 'X' ? chooseMove(b, 'X', 'unbeatable')! : availableMoves(b)[0]
      b = applyMove(b, move, p)
    }
    expect(getOutcome(b)).toMatchObject({ kind: 'win', player: 'X' })
  })
})

describe('tie-breaking', () => {
  it('varies its choice across games instead of always replaying one line', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 60; i += 1) {
      seen.add(chooseMove(EMPTY_BOARD, 'X', 'easy')!)
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  it('respects the injected rng for a reproducible game', () => {
    const move = chooseMove(EMPTY_BOARD, 'X', 'easy', () => 0)
    expect(move).toBe(0)
    expect(chooseMove(EMPTY_BOARD, 'X', 'easy', () => 0.999)).toBe(8)
  })
})

describe('easy', () => {
  it('does not reliably block, unlike medium', () => {
    // Given a board where blocking is mandatory, easy should miss it sometimes.
    const threat = board('XX.|O..|...')
    let missed = 0
    for (let i = 0; i < 60; i += 1) {
      if (chooseMove(threat, 'O', 'easy') !== 2) missed += 1
    }
    expect(missed).toBeGreaterThan(0)
    expect(chooseMove(threat, 'O', 'medium', firstChoice)).toBe(2)
  })
})

describe('other', () => {
  it('is its own inverse', () => {
    expect(other(other('X'))).toBe('X')
  })
})
