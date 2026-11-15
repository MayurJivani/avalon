export type Role = 'merlin' | 'percival' | 'servant' | 'assassin' | 'morgana' | 'mordred' | 'oberon' | 'minion';
export type Team = 'good' | 'evil';
export type SpecialRole = Exclude<Role, 'servant' | 'minion'>;

export const TEAM: Record<Role, Team> = {
  merlin: 'good', percival: 'good', servant: 'good',
  assassin: 'evil', morgana: 'evil', mordred: 'evil', oberon: 'evil', minion: 'evil',
};

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;

/** Team size for each of the five quests, by player count. */
export const QUEST_SIZES: Record<number, number[]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

export const EVIL_COUNT: Record<number, number> = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 };

export const failsNeeded = (players: number, quest: number) => (quest === 3 && players >= 7 ? 2 : 1);

export const ALL_SPECIALS: SpecialRole[] = ['merlin', 'percival', 'assassin', 'morgana', 'mordred', 'oberon'];

/** Recommended advanced set per player count. */
export function recommendedSpecials(players: number): SpecialRole[] {
  if (players <= 6) return ['merlin', 'percival', 'assassin', 'morgana'];
  if (players <= 9) return ['merlin', 'percival', 'assassin', 'morgana', 'mordred'];
  return ['merlin', 'percival', 'assassin', 'morgana', 'mordred', 'oberon'];
}

export const BASIC_SPECIALS: SpecialRole[] = ['merlin', 'assassin'];

/** Returns an error message or null. */
export function validateSpecials(specials: SpecialRole[], players: number): string | null {
  if (players < MIN_PLAYERS) return `Need at least ${MIN_PLAYERS} players.`;
  if (players > MAX_PLAYERS) return `At most ${MAX_PLAYERS} players.`;
  if (new Set(specials).size !== specials.length) return 'Duplicate roles.';
  const has = (r: SpecialRole) => specials.includes(r);
  if (has('merlin') !== has('assassin')) return 'Merlin and the Assassin must be played together.';
  if (has('percival') && !has('merlin')) return 'Percival needs Merlin in the game.';
  if (has('morgana') && !has('percival')) return 'Morgana needs Percival to deceive.';
  const evil = specials.filter((r) => TEAM[r] === 'evil').length;
  if (evil > EVIL_COUNT[players]) return `Only ${EVIL_COUNT[players]} evil seats at ${players} players.`;
  const good = specials.length - evil;
  if (good > players - EVIL_COUNT[players]) return 'Too many good specials.';
  return null;
}

export function buildDeck(specials: SpecialRole[], players: number): Role[] {
  const evil = EVIL_COUNT[players];
  const deck: Role[] = [...specials];
  const evilSpecials = specials.filter((r) => TEAM[r] === 'evil').length;
  for (let i = evilSpecials; i < evil; i++) deck.push('minion');
  while (deck.length < players) deck.push('servant');
  return deck;
}
