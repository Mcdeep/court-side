export const POINTS_TO_WIN = 24
export const PRE_GENERATED_FORMATS = ['americano', 'round_robin']
// Formats where partners are fixed manually (not auto-paired by ranking)
// and persist as a "team" — round_robin/knockout play the same partner
// across every round; king_of_the_court/snakes_and_ladders keep the same
// partner too, only the court/opponent changes.
export const FIXED_PAIR_FORMATS = ['round_robin', 'knockout', 'king_of_the_court', 'snakes_and_ladders']
