export type Player = 'X' | 'O'
export type Cell = Player | null

/** Always 9 cells, row-major from top-left. */
export type Board = readonly Cell[]

export type Difficulty = 'easy' | 'medium' | 'unbeatable'
export type Mode = 'ai' | 'hotseat'

export type Outcome =
  | { readonly kind: 'playing' }
  | { readonly kind: 'draw' }
  | {
      readonly kind: 'win'
      readonly player: Player
      readonly line: readonly [number, number, number]
    }

/** Injectable so tests can make AI choices deterministic. */
export type Rng = () => number
