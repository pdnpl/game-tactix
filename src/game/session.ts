import { chooseMove } from './ai'
import { applyMove, currentPlayer, EMPTY_BOARD, getOutcome, other } from './board'
import type { Board, Difficulty, Mode, Outcome, Player, Rng } from './types'

export type Score = { X: number; O: number; draws: number }

export type State = {
  readonly board: Board
  readonly mode: Mode
  readonly difficulty: Difficulty
  readonly outcome: Outcome
  /** Who moves first this round; alternates so neither side keeps the advantage. */
  readonly starter: Player
  readonly score: Score
}

/** In AI mode the human is always X; the AI answers as O. */
export const HUMAN: Player = 'X'
export const AI: Player = 'O'

export function initialState(): State {
  return {
    board: EMPTY_BOARD,
    mode: 'ai',
    difficulty: 'unbeatable',
    outcome: { kind: 'playing' },
    starter: 'X',
    score: { X: 0, O: 0, draws: 0 },
  }
}

function tallied(score: Score, outcome: Outcome): Score {
  if (outcome.kind === 'win') {
    return { ...score, [outcome.player]: score[outcome.player] + 1 }
  }
  if (outcome.kind === 'draw') return { ...score, draws: score.draws + 1 }
  return score
}

export function turn(state: State): Player {
  return currentPlayer(state.board, state.starter)
}

/** True when the given cell can legally be played right now. */
export function canPlay(state: State, index: number): boolean {
  return state.outcome.kind === 'playing' && index >= 0 && index < 9 && state.board[index] === null
}

/** True when it is the AI's move and the round is still live. */
export function awaitingAi(state: State): boolean {
  return state.mode === 'ai' && state.outcome.kind === 'playing' && turn(state) === AI
}

/** Plays `index` for whoever is to move. Returns the state unchanged if illegal. */
export function play(state: State, index: number): State {
  if (!canPlay(state, index)) return state

  const board = applyMove(state.board, index, turn(state))
  const outcome = getOutcome(board)
  return { ...state, board, outcome, score: tallied(state.score, outcome) }
}

/** Plays the AI's move, or returns the state unchanged if it is not the AI's turn. */
export function playAi(state: State, rng: Rng = Math.random): State {
  if (!awaitingAi(state)) return state

  const move = chooseMove(state.board, AI, state.difficulty, rng)
  return move === null ? state : play(state, move)
}

/** Clears the board and hands the first move to the other side. Keeps the score. */
export function nextRound(state: State): State {
  return {
    ...state,
    board: EMPTY_BOARD,
    outcome: { kind: 'playing' },
    starter: other(state.starter),
  }
}

/** Switching mode or difficulty abandons the round and wipes the score. */
export function configure(
  state: State,
  change: Partial<Pick<State, 'mode' | 'difficulty'>>,
): State {
  const next = { ...state, ...change }
  if (next.mode === state.mode && next.difficulty === state.difficulty) return state

  return {
    ...next,
    board: EMPTY_BOARD,
    outcome: { kind: 'playing' },
    starter: 'X',
    score: { X: 0, O: 0, draws: 0 },
  }
}
