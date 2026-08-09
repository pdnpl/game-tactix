import { applyMove, availableMoves, getOutcome, other } from './board'
import type { Board, Difficulty, Player, Rng } from './types'

const WIN_SCORE = 10

/**
 * Alpha-beta minimax scored from `me`'s perspective.
 *
 * Depth is subtracted from a win and added to a loss so the engine prefers the
 * fastest win and the slowest loss. Without that, every forced win scores the
 * same and the AI can idle instead of closing the game out.
 */
function minimax(
  board: Board,
  me: Player,
  toMove: Player,
  depth: number,
  alpha: number,
  beta: number,
): number {
  const outcome = getOutcome(board)
  if (outcome.kind === 'win') {
    return outcome.player === me ? WIN_SCORE - depth : depth - WIN_SCORE
  }
  if (outcome.kind === 'draw') return 0

  const maximizing = toMove === me
  let best = maximizing ? -Infinity : Infinity
  let a = alpha
  let b = beta

  for (const move of availableMoves(board)) {
    const score = minimax(applyMove(board, move, toMove), me, other(toMove), depth + 1, a, b)
    if (maximizing) {
      if (score > best) best = score
      if (best > a) a = best
    } else {
      if (score < best) best = score
      if (best < b) b = best
    }
    if (b <= a) break
  }
  return best
}

function pick(moves: readonly number[], rng: Rng): number {
  return moves[Math.floor(rng() * moves.length)]
}

/** Every move that ties for the best minimax score. */
function bestMoves(board: Board, player: Player): number[] {
  let best = -Infinity
  let winners: number[] = []

  for (const move of availableMoves(board)) {
    const score = minimax(
      applyMove(board, move, player),
      player,
      other(player),
      1,
      -Infinity,
      Infinity,
    )
    if (score > best) {
      best = score
      winners = [move]
    } else if (score === best) {
      winners.push(move)
    }
  }
  return winners
}

/** A move that immediately completes a line for `player`, if one exists. */
function winningMove(board: Board, player: Player): number | null {
  for (const move of availableMoves(board)) {
    const outcome = getOutcome(applyMove(board, move, player))
    if (outcome.kind === 'win' && outcome.player === player) return move
  }
  return null
}

/**
 * Picks a move for `player`.
 *
 * - `easy` plays uniformly at random, so it is beatable by a child.
 * - `medium` takes an immediate win and blocks an immediate loss, but plans no
 *   further — it feels alert without being airtight.
 * - `unbeatable` is full minimax, which for tic-tac-toe can never lose.
 *
 * Ties are broken randomly so repeat games do not replay identically.
 */
export function chooseMove(
  board: Board,
  player: Player,
  difficulty: Difficulty,
  rng: Rng = Math.random,
): number | null {
  const moves = availableMoves(board)
  if (moves.length === 0 || getOutcome(board).kind !== 'playing') return null

  if (difficulty === 'easy') return pick(moves, rng)

  if (difficulty === 'medium') {
    const win = winningMove(board, player)
    if (win !== null) return win
    const block = winningMove(board, other(player))
    if (block !== null) return block
    return pick(moves, rng)
  }

  return pick(bestMoves(board, player), rng)
}
