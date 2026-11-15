import {
  type Role, type Team, type SpecialRole, TEAM, QUEST_SIZES, failsNeeded, buildDeck, validateSpecials,
} from './rules.ts';

export type Phase = 'propose' | 'vote' | 'quest' | 'assassin' | 'over';

export interface Quest {
  size: number;
  failsNeeded: number;
  result: 'success' | 'fail' | null;
  fails: number | null;
  team: string[] | null;
}

export interface Proposal {
  quest: number;
  attempt: number; // 1..5
  leader: string;
  team: string[];
  votes: Record<string, boolean>; // revealed only after the vote closes
  approved: boolean;
}

export interface Game {
  seats: string[]; // player ids in seat order
  roles: Record<string, Role>;
  phase: Phase;
  leader: number; // seat index
  quest: number; // 0..4
  rejects: number; // consecutive rejections this quest
  team: string[] | null; // current proposal
  votes: Record<string, boolean>; // secret until all in
  cards: Record<string, boolean>; // secret quest cards, true = success
  quests: Quest[];
  proposals: Proposal[];
  winner: Team | null;
  reason: string | null;
  assassinTarget: string | null;
}

export type Rng = () => number;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGame(seats: string[], specials: SpecialRole[], rng: Rng = Math.random): Game {
  const err = validateSpecials(specials, seats.length);
  if (err) throw new Error(err);
  const deck = shuffle(buildDeck(specials, seats.length), rng);
  const roles: Record<string, Role> = {};
  seats.forEach((id, i) => (roles[id] = deck[i]));
  return {
    seats: [...seats],
    roles,
    phase: 'propose',
    leader: Math.floor(rng() * seats.length),
    quest: 0,
    rejects: 0,
    team: null,
    votes: {},
    cards: {},
    quests: QUEST_SIZES[seats.length].map((size, i) => ({
      size, failsNeeded: failsNeeded(seats.length, i), result: null, fails: null, team: null,
    })),
    proposals: [],
    winner: null,
    reason: null,
    assassinTarget: null,
  };
}

const leaderId = (g: Game) => g.seats[g.leader];
const nextLeader = (g: Game) => (g.leader = (g.leader + 1) % g.seats.length);
const end = (g: Game, winner: Team, reason: string) => {
  g.phase = 'over';
  g.winner = winner;
  g.reason = reason;
};
const count = (g: Game, r: Quest['result']) => g.quests.filter((q) => q.result === r).length;

/** Every action returns an error string, or null when applied. */
export function propose(g: Game, by: string, team: string[]): string | null {
  if (g.phase !== 'propose') return 'Not the time to propose a team.';
  if (by !== leaderId(g)) return 'Only the leader proposes the team.';
  const size = g.quests[g.quest].size;
  if (!Array.isArray(team) || team.length !== size) return `The team must have exactly ${size} members.`;
  if (new Set(team).size !== team.length) return 'A player can only be chosen once.';
  if (team.some((id) => !g.seats.includes(id))) return 'Unknown player in team.';
  g.team = [...team];
  g.votes = {};
  g.phase = 'vote';
  return null;
}

export function vote(g: Game, by: string, approve: boolean): string | null {
  if (g.phase !== 'vote') return 'No vote is open.';
  if (!g.seats.includes(by)) return 'You are not seated in this game.';
  if (by in g.votes) return 'You already voted.';
  if (typeof approve !== 'boolean') return 'Invalid vote.';
  g.votes[by] = approve;
  if (Object.keys(g.votes).length < g.seats.length) return null;

  const yes = Object.values(g.votes).filter(Boolean).length;
  const approved = yes > g.seats.length / 2; // ties reject
  g.proposals.push({
    quest: g.quest, attempt: g.rejects + 1, leader: leaderId(g), team: g.team!, votes: g.votes, approved,
  });
  g.votes = {};
  if (approved) {
    g.phase = 'quest';
    g.cards = {};
    return null;
  }
  g.rejects++;
  g.team = null;
  if (g.rejects >= 5) {
    end(g, 'evil', 'Five teams were rejected in a row. The kingdom falls into chaos.');
    return null;
  }
  nextLeader(g);
  g.phase = 'propose';
  return null;
}

export function playCard(g: Game, by: string, success: boolean): string | null {
  if (g.phase !== 'quest') return 'No quest is underway.';
  if (!g.team!.includes(by)) return 'You are not on this quest.';
  if (by in g.cards) return 'You already played your card.';
  if (typeof success !== 'boolean') return 'Invalid card.';
  if (!success && TEAM[g.roles[by]] === 'good') return 'Loyal servants can only play SUCCESS.';
  g.cards[by] = success;
  if (Object.keys(g.cards).length < g.team!.length) return null;

  const q = g.quests[g.quest];
  q.fails = Object.values(g.cards).filter((c) => !c).length;
  q.result = q.fails >= q.failsNeeded ? 'fail' : 'success';
  q.team = g.team;
  g.cards = {};
  g.team = null;
  g.rejects = 0;

  if (count(g, 'fail') >= 3) return end(g, 'evil', 'Three quests have failed. Mordred takes the throne.'), null;
  if (count(g, 'success') >= 3) {
    if (Object.values(g.roles).includes('assassin')) g.phase = 'assassin';
    else end(g, 'good', 'Three quests succeeded. Arthur’s court holds.');
    return null;
  }
  g.quest++;
  nextLeader(g);
  g.phase = 'propose';
  return null;
}

export function assassinate(g: Game, by: string, target: string): string | null {
  if (g.phase !== 'assassin') return 'The assassin cannot strike now.';
  if (g.roles[by] !== 'assassin') return 'Only the Assassin chooses.';
  if (!g.seats.includes(target)) return 'Unknown target.';
  if (TEAM[g.roles[target]] === 'evil') return 'Choose a servant of Arthur.';
  g.assassinTarget = target;
  if (g.roles[target] === 'merlin') end(g, 'evil', 'The Assassin found Merlin. Hope dies with him.');
  else end(g, 'good', 'The Assassin struck the wrong heart. Merlin lives.');
  return null;
}

// ---------- Visibility ----------

export type Sight = 'evil' | 'merlin-or-morgana';

export interface PublicGame {
  seats: string[];
  phase: Phase;
  leader: string;
  quest: number;
  rejects: number;
  team: string[] | null;
  voted: string[]; // who has voted, never how
  played: string[]; // who has played a card, never which
  quests: Quest[];
  proposals: Proposal[];
  winner: Team | null;
  reason: string | null;
  assassin: string | null; // revealed when the assassination phase begins
  assassinTarget: string | null;
  roles: Record<string, Role> | null; // only when the game is over
}

export interface PrivateView {
  role: Role;
  team: Team;
  sees: Record<string, Sight>;
  myVote: boolean | null;
  myCard: boolean | null;
}

export function publicView(g: Game): PublicGame {
  return {
    seats: g.seats,
    phase: g.phase,
    leader: leaderId(g),
    quest: g.quest,
    rejects: g.rejects,
    team: g.team,
    voted: Object.keys(g.votes),
    played: Object.keys(g.cards),
    quests: g.quests,
    proposals: g.proposals,
    winner: g.winner,
    reason: g.reason,
    assassin: g.phase === 'assassin' || g.phase === 'over'
      ? g.seats.find((id) => g.roles[id] === 'assassin') ?? null : null,
    assassinTarget: g.assassinTarget,
    roles: g.phase === 'over' ? g.roles : null,
  };
}

/** What one player is allowed to know about the hidden roles. */
export function privateView(g: Game, me: string): PrivateView | null {
  const role = g.roles[me];
  if (!role) return null;
  const sees: Record<string, Sight> = {};
  for (const id of g.seats) {
    if (id === me) continue;
    const r = g.roles[id];
    if (role === 'merlin' && TEAM[r] === 'evil' && r !== 'mordred') sees[id] = 'evil';
    if (role === 'percival' && (r === 'merlin' || r === 'morgana')) sees[id] = 'merlin-or-morgana';
    if (TEAM[role] === 'evil' && role !== 'oberon' && TEAM[r] === 'evil' && r !== 'oberon') sees[id] = 'evil';
  }
  return {
    role, team: TEAM[role], sees,
    myVote: me in g.votes ? g.votes[me] : null,
    myCard: me in g.cards ? g.cards[me] : null,
  };
}
