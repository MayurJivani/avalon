import { describe, it, expect } from 'vitest';
import {
  createGame, propose, vote, playCard, assassinate, publicView, privateView, type Game,
} from '../shared/engine.ts';
import { validateSpecials, buildDeck, EVIL_COUNT, QUEST_SIZES, TEAM, type Role } from '../shared/rules.ts';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** Builds a game, then forces a known role layout for deterministic tests. */
function rigged(roles: Role[]): Game {
  const seats = ids(roles.length);
  const g = createGame(seats, [], seeded(1));
  seats.forEach((id, i) => (g.roles[id] = roles[i]));
  g.leader = 0;
  return g;
}
const leader = (g: Game) => g.seats[g.leader];
const voteAll = (g: Game, approve: boolean | ((id: string) => boolean)) =>
  g.seats.forEach((id) => expect(vote(g, id, typeof approve === 'function' ? approve(id) : approve)).toBeNull());
function runQuest(g: Game, fails: number) {
  const team = g.seats.slice(0, g.quests[g.quest].size);
  // put evil first so they can play the fails
  team.sort((a, b) => (TEAM[g.roles[a]] === 'evil' ? -1 : 0) - (TEAM[g.roles[b]] === 'evil' ? -1 : 0));
  expect(propose(g, leader(g), team)).toBeNull();
  voteAll(g, true);
  team.forEach((id, i) => expect(playCard(g, id, i >= fails)).toBeNull());
}

describe('setup', () => {
  it('deals the right evil count for every player count', () => {
    for (let n = 5; n <= 10; n++) {
      const g = createGame(ids(n), ['merlin', 'assassin'], seeded(n));
      const evil = Object.values(g.roles).filter((r) => TEAM[r] === 'evil').length;
      expect(evil).toBe(EVIL_COUNT[n]);
      expect(g.quests.map((q) => q.size)).toEqual(QUEST_SIZES[n]);
      expect(Object.values(g.roles).filter((r) => r === 'merlin')).toHaveLength(1);
    }
  });
  it('requires two fails on quest four only at 7+ players', () => {
    expect(createGame(ids(6), [], seeded(2)).quests[3].failsNeeded).toBe(1);
    expect(createGame(ids(7), [], seeded(2)).quests.map((q) => q.failsNeeded)).toEqual([1, 1, 1, 2, 1]);
  });
  it('validates role configurations', () => {
    expect(validateSpecials(['merlin'], 5)).toMatch(/Assassin/);
    expect(validateSpecials(['percival', 'merlin', 'assassin'], 5)).toBeNull();
    expect(validateSpecials(['merlin', 'percival', 'assassin', 'morgana', 'mordred'], 5)).toMatch(/evil seats/);
    expect(validateSpecials(['merlin', 'assassin', 'morgana'], 5)).toMatch(/Percival/);
    expect(validateSpecials([], 4)).toMatch(/at least/);
    expect(buildDeck(['merlin', 'assassin', 'oberon'], 10).filter((r) => r === 'minion')).toHaveLength(2);
  });
});

describe('team proposal and voting', () => {
  it('rejects out-of-turn and invalid teams', () => {
    const g = rigged(['merlin', 'servant', 'servant', 'assassin', 'minion']);
    expect(propose(g, 'p1', ['p0', 'p1'])).toMatch(/leader/);
    expect(propose(g, 'p0', ['p0'])).toMatch(/exactly 2/);
    expect(propose(g, 'p0', ['p0', 'p0'])).toMatch(/once/);
    expect(propose(g, 'p0', ['p0', 'zz'])).toMatch(/Unknown/);
    expect(vote(g, 'p0', true)).toMatch(/No vote/);
    expect(propose(g, 'p0', ['p0', 'p1'])).toBeNull();
  });
  it('blocks duplicate votes and hides votes until everyone voted', () => {
    const g = rigged(['merlin', 'servant', 'servant', 'assassin', 'minion']);
    propose(g, 'p0', ['p0', 'p1']);
    expect(vote(g, 'p0', true)).toBeNull();
    expect(vote(g, 'p0', false)).toMatch(/already/);
    const pub = publicView(g);
    expect(pub.voted).toEqual(['p0']);
    expect(JSON.stringify(pub)).not.toMatch(/"votes":\{"p0"/);
  });
  it('treats ties as rejection and passes leadership', () => {
    const g = rigged(['merlin', 'servant', 'percival', 'assassin', 'morgana', 'minion']);
    propose(g, 'p0', ['p0', 'p1']);
    voteAll(g, (id) => ['p0', 'p1', 'p2'].includes(id)); // 3-3
    expect(g.proposals[0].approved).toBe(false);
    expect(g.phase).toBe('propose');
    expect(leader(g)).toBe('p1');
    expect(g.rejects).toBe(1);
  });
  it('gives evil the win after five consecutive rejections', () => {
    const g = rigged(['merlin', 'servant', 'servant', 'assassin', 'minion']);
    for (let i = 0; i < 5; i++) {
      propose(g, leader(g), g.seats.slice(0, 2));
      voteAll(g, false);
    }
    expect(g.phase).toBe('over');
    expect(g.winner).toBe('evil');
  });
});

describe('quests', () => {
  it('forbids good players from failing and outsiders from playing', () => {
    const g = rigged(['merlin', 'servant', 'servant', 'assassin', 'minion']);
    propose(g, 'p0', ['p0', 'p3']);
    voteAll(g, true);
    expect(playCard(g, 'p0', false)).toMatch(/only play SUCCESS/);
    expect(playCard(g, 'p1', true)).toMatch(/not on this quest/);
    expect(playCard(g, 'p3', false)).toBeNull();
    expect(playCard(g, 'p3', true)).toMatch(/already/);
    expect(publicView(g).played).toEqual(['p3']);
    expect(playCard(g, 'p0', true)).toBeNull();
    expect(g.quests[0]).toMatchObject({ result: 'fail', fails: 1 });
    expect(JSON.stringify(publicView(g))).not.toMatch(/cards/);
  });
  it('quest four survives one fail at 7 players', () => {
    const g = rigged(['assassin', 'morgana', 'minion', 'merlin', 'percival', 'servant', 'servant']);
    runQuest(g, 0);
    runQuest(g, 1);
    runQuest(g, 0);
    runQuest(g, 1); // quest 4: one fail is not enough
    expect(g.quests.map((q) => q.result)).toEqual(['success', 'fail', 'success', 'success', null]);
    expect(g.phase).toBe('assassin');
  });
  it('three failed quests end the game for evil', () => {
    const g = rigged(['assassin', 'minion', 'merlin', 'servant', 'servant']);
    runQuest(g, 1);
    runQuest(g, 1);
    runQuest(g, 1);
    expect(g).toMatchObject({ phase: 'over', winner: 'evil' });
  });
  it('resets the rejection counter after a quest', () => {
    const g = rigged(['merlin', 'servant', 'servant', 'assassin', 'minion']);
    propose(g, 'p0', ['p0', 'p1']);
    voteAll(g, false);
    expect(g.rejects).toBe(1);
    runQuest(g, 0);
    expect(g.rejects).toBe(0);
  });
});

describe('assassination', () => {
  const toAssassin = () => {
    const g = rigged(['assassin', 'minion', 'merlin', 'servant', 'servant']);
    runQuest(g, 0); runQuest(g, 0); runQuest(g, 0);
    expect(g.phase).toBe('assassin');
    return g;
  };
  it('evil wins when Merlin is found', () => {
    const g = toAssassin();
    expect(assassinate(g, 'p1', 'p2')).toMatch(/Only the Assassin/);
    expect(assassinate(g, 'p0', 'p0')).toMatch(/someone else/);
    expect(assassinate(g, 'p0', 'p2')).toBeNull();
    expect(g.winner).toBe('evil');
  });
  it('striking an unknown evil player (Oberon) is allowed and counts as a miss', () => {
    const g = rigged(['assassin', 'oberon', 'merlin', 'servant', 'servant']);
    runQuest(g, 0); runQuest(g, 0); runQuest(g, 0);
    expect(assassinate(g, 'p0', 'p1')).toBeNull();
    expect(g.winner).toBe('good');
  });
  it('good wins when the Assassin misses', () => {
    const g = toAssassin();
    assassinate(g, 'p0', 'p3');
    expect(g.winner).toBe('good');
    expect(publicView(g).roles).toEqual(g.roles);
  });
  it('good wins outright with no Assassin in play', () => {
    const g = rigged(['minion', 'minion', 'servant', 'servant', 'servant']);
    runQuest(g, 0); runQuest(g, 0); runQuest(g, 0);
    expect(g).toMatchObject({ phase: 'over', winner: 'good' });
  });
});

describe('information visibility', () => {
  const g = rigged(['merlin', 'percival', 'servant', 'assassin', 'morgana', 'mordred', 'oberon', 'servant', 'minion', 'servant']);
  const sees = (id: string) => privateView(g, id)!.sees;

  it('Merlin sees evil except Mordred', () => {
    expect(sees('p0')).toEqual({ p3: 'evil', p4: 'evil', p6: 'evil', p8: 'evil' });
  });
  it('Percival sees Merlin and Morgana, indistinguishably', () => {
    expect(sees('p1')).toEqual({ p0: 'merlin-or-morgana', p4: 'merlin-or-morgana' });
  });
  it('evil see each other except Oberon', () => {
    expect(sees('p3')).toEqual({ p4: 'evil', p5: 'evil', p8: 'evil' });
    expect(sees('p5')).toEqual({ p3: 'evil', p4: 'evil', p8: 'evil' });
  });
  it('Oberon and servants see no one', () => {
    expect(sees('p6')).toEqual({});
    expect(sees('p2')).toEqual({});
  });
  it('public view never carries roles while the game runs', () => {
    const pub = JSON.stringify(publicView(g));
    expect(publicView(g).roles).toBeNull();
    for (const r of ['merlin', 'morgana', 'assassin', 'oberon']) expect(pub).not.toContain(`:"${r}"`);
  });
});
