import { describe, expect, it } from 'vitest'
import {
  awaitingAi,
  canPlay,
  configure,
  initialState,
  nextRound,
  play,
  playAi,
  turn,
} from './session'

const fixedRng = () => 0

describe('play', () => {
  it('places the mark for whoever is to move', () => {
    const s = play(initialState(), 4)
    expect(s.board[4]).toBe('X')
    expect(turn(s)).toBe('O')
  })

  it('ignores a click on an occupied cell', () => {
    const s = play(initialState(), 4)
    expect(play(s, 4)).toBe(s)
  })

  it('ignores a click after the game has ended', () => {
    let s = initialState()
    for (const move of [0, 3, 1, 4, 2]) s = play(s, move)
    expect(s.outcome).toMatchObject({ kind: 'win', player: 'X' })
    expect(play(s, 5)).toBe(s)
  })

  it('ignores an out-of-range index', () => {
    const s = initialState()
    expect(play(s, 9)).toBe(s)
    expect(play(s, -1)).toBe(s)
  })
})

describe('score', () => {
  it('counts a win once, at the moment it happens', () => {
    let s = initialState()
    for (const move of [0, 3, 1, 4, 2]) s = play(s, move)
    expect(s.score).toEqual({ X: 1, O: 0, draws: 0 })
  })

  it('counts a draw', () => {
    let s = initialState()
    for (const move of [4, 0, 1, 7, 6, 2, 5, 3, 8]) s = play(s, move)
    expect(s.outcome.kind).toBe('draw')
    expect(s.score.draws).toBe(1)
  })

  it('carries the score into the next round', () => {
    let s = initialState()
    for (const move of [0, 3, 1, 4, 2]) s = play(s, move)
    const next = nextRound(s)
    expect(next.score).toEqual({ X: 1, O: 0, draws: 0 })
    expect(next.board.every((c) => c === null)).toBe(true)
  })
})

describe('nextRound', () => {
  it('hands the opening move to the other side so neither keeps the edge', () => {
    const s = nextRound(initialState())
    expect(s.starter).toBe('O')
    expect(turn(s)).toBe('O')
    expect(nextRound(s).starter).toBe('X')
  })

  it('clears any finished outcome', () => {
    let s = initialState()
    for (const move of [0, 3, 1, 4, 2]) s = play(s, move)
    expect(nextRound(s).outcome).toEqual({ kind: 'playing' })
  })
})

describe('configure', () => {
  it('wipes the board and score when the difficulty changes', () => {
    let s = play(initialState(), 4)
    s = { ...s, score: { X: 3, O: 1, draws: 2 } }
    const next = configure(s, { difficulty: 'easy' })

    expect(next.difficulty).toBe('easy')
    expect(next.board.every((c) => c === null)).toBe(true)
    expect(next.score).toEqual({ X: 0, O: 0, draws: 0 })
    expect(next.starter).toBe('X')
  })

  it('wipes the board when the mode changes', () => {
    const next = configure(play(initialState(), 0), { mode: 'hotseat' })
    expect(next.mode).toBe('hotseat')
    expect(next.board.every((c) => c === null)).toBe(true)
  })

  it('is a no-op when nothing actually changes', () => {
    const s = play(initialState(), 4)
    expect(configure(s, { mode: 'ai' })).toBe(s)
  })
})

describe('ai turn', () => {
  it('waits for the AI only in ai mode', () => {
    const s = play(initialState(), 4)
    expect(awaitingAi(s)).toBe(true)
    expect(awaitingAi(configure(initialState(), { mode: 'hotseat' }))).toBe(false)
  })

  it('does not claim an AI turn while the human is to move', () => {
    expect(awaitingAi(initialState())).toBe(false)
  })

  it('plays a move when it is the AI turn', () => {
    const s = playAi(play(initialState(), 4), fixedRng)
    expect(s.board.filter((c) => c === 'O')).toHaveLength(1)
  })

  it('leaves the state alone when it is not the AI turn', () => {
    const s = initialState()
    expect(playAi(s, fixedRng)).toBe(s)
  })

  it('does not move after the game is decided', () => {
    let s = initialState()
    for (const move of [0, 3, 1, 4, 2]) s = play(s, move)
    expect(playAi(s, fixedRng)).toBe(s)
  })

  it('opens the round when the AI starts', () => {
    const s = nextRound(initialState())
    expect(awaitingAi(s)).toBe(true)
    expect(playAi(s, fixedRng).board.filter((c) => c !== null)).toHaveLength(1)
  })
})

describe('canPlay', () => {
  it('rejects taken cells, finished games and bad indices', () => {
    const s = play(initialState(), 0)
    expect(canPlay(s, 0)).toBe(false)
    expect(canPlay(s, 1)).toBe(true)
    expect(canPlay(s, 99)).toBe(false)
  })
})

describe('unbeatable session', () => {
  it('never lets a human win by playing greedily', () => {
    // Human always takes the lowest free cell — a naive but legal strategy.
    for (let game = 0; game < 40; game += 1) {
      let s = initialState()
      while (s.outcome.kind === 'playing') {
        s = awaitingAi(s)
          ? playAi(s)
          : play(
              s,
              s.board.findIndex((c) => c === null),
            )
      }
      expect(s.outcome).not.toMatchObject({ kind: 'win', player: 'X' })
    }
  })
})
