import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { io, type Socket } from 'socket.io-client';
import type { StateMsg } from '../shared/protocol.ts';

const PORT = 39000 + Math.floor(Math.random() * 900);
const URL = `http://localhost:${PORT}`;
let srv: ChildProcess;

beforeAll(async () => {
  srv = spawn('node', ['node_modules/tsx/dist/cli.mjs', 'server/index.ts'], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: `/tmp/avalon-test-${PORT}`, HOST_GRACE_MS: '300' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(URL + '/health')).ok) return; } catch { /* booting */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('server did not start');
}, 15000);
afterAll(() => { srv.kill(); });

interface Bot { s: Socket; token: string; last: StateMsg | null; raw: string[]; emit: (ev: string, arg?: unknown) => Promise<any> }
const bots: Bot[] = [];

function bot(token = Math.random().toString(36).slice(2).padEnd(20, 'x')): Promise<Bot> {
  const s = io(URL, { auth: { token }, transports: ['websocket'], forceNew: true });
  const b: Bot = {
    s, token, last: null, raw: [],
    emit: (ev, arg) => new Promise((res) => s.emit(ev, arg, res)),
  };
  s.on('state', (m: StateMsg) => { b.last = m; b.raw.push(JSON.stringify(m)); });
  bots.push(b);
  return new Promise((res) => s.on('connect', () => res(b)));
}
const tick = (ms = 120) => new Promise((r) => setTimeout(r, ms));
afterAll(() => bots.forEach((b) => b.s.close()));

async function table(n: number, specials?: string[]) {
  const host = await bot();
  const r = await host.emit('room:create', { name: 'P0' });
  expect(r.ok).toBe(true);
  const ps = [host];
  for (let i = 1; i < n; i++) {
    const b = await bot();
    expect((await b.emit('room:join', { code: r.code, name: `P${i}` })).ok).toBe(true);
    await b.emit('room:ready', true);
    ps.push(b);
  }
  if (specials) expect((await host.emit('room:specials', specials)).ok).toBe(true);
  return { ps, code: r.code as string };
}
const idOf = (b: Bot) => b.last!.me;
const game = (b: Bot) => b.last!.room.game!;
const leader = (ps: Bot[]) => ps.find((b) => game(b).leader === idOf(b))!;

describe('server: rooms', () => {
  it('rejects bad joins and enforces host-only actions', async () => {
    const { ps, code } = await table(5);
    const late = await bot();
    expect((await late.emit('room:join', { code: 'ZZZZZ', name: 'X' })).error).toMatch(/No room/);
    expect((await late.emit('room:join', { code, name: 'p1' })).error).toMatch(/taken/);
    expect((await late.emit('room:join', { code, name: '' })).error).toMatch(/name/);
    expect((await ps[1].emit('room:start')).error).toMatch(/host/);
    expect((await ps[1].emit('room:specials', ['merlin', 'assassin'])).error).toMatch(/host/);
    expect((await ps[0].emit('room:specials', ['wizard'])).error).toMatch(/Unknown role/);
    expect((await ps[0].emit('room:start')).ok).toBe(true);
    expect((await late.emit('room:join', { code, name: 'Late' })).error).toMatch(/underway/);
  });

  it('caps the table at 10', async () => {
    const { code } = await table(10);
    const x = await bot();
    expect((await x.emit('room:join', { code, name: 'Eleven' })).error).toMatch(/full/);
  });

  it('refuses to start with too few players or an unready one', async () => {
    const { ps } = await table(4);
    expect((await ps[0].emit('room:start')).error).toMatch(/at least 5/);
    const b = await bot();
    await b.emit('room:join', { code: ps[0].last!.room.code, name: 'Slow' });
    expect((await ps[0].emit('room:start')).error).toMatch(/ready/);
  });
});

describe('server: secrecy', () => {
  it('never broadcasts another player\'s role, vote or card before the end', async () => {
    const { ps } = await table(7, ['merlin', 'percival', 'assassin', 'morgana', 'mordred']);
    await ps[0].emit('room:start');
    await tick();
    const lead = leader(ps);
    const team = game(lead).seats.slice(0, 2);
    expect((await lead.emit('game:act', { action: 'propose', arg: team })).ok).toBe(true);
    await ps[0].emit('game:act', { action: 'vote', arg: false });
    await tick();
    for (const b of ps) {
      const mine = b.last!.secret!.role;
      for (const msg of b.raw) {
        const m = JSON.parse(msg) as StateMsg;
        if (m.room.game?.phase === 'over') continue;
        expect(m.room.game?.roles ?? null).toBeNull();
        for (const p of m.room.game?.proposals ?? []) expect(Object.keys(p.votes).length).toBe(m.room.game!.seats.length);
        expect(JSON.stringify(m.room)).not.toMatch(/"token"/);
        // the only role named in a private view is your own
        expect(m.secret === null || m.secret.role === mine).toBe(true);
      }
      expect(game(b).voted).toEqual([idOf(ps[0])]);
      expect(JSON.stringify(b.last!.room)).not.toMatch(/"votes":\{"/);
    }
  });

  it('a reconnect with the same token gets the same seat and role; a new token cannot', async () => {
    const { ps, code } = await table(5);
    await ps[0].emit('room:start');
    await tick();
    const victim = ps[3];
    const role = victim.last!.secret!.role;
    const id = idOf(victim);
    victim.s.close();
    await tick();
    const again = await bot(victim.token);
    expect((await again.emit('room:join', { code, name: 'whatever' })).ok).toBe(true);
    await tick();
    expect(idOf(again)).toBe(id);
    expect(again.last!.secret!.role).toBe(role);
    expect(again.last!.room.members.find((m) => m.id === id)!.name).toBe('P3');
    const thief = await bot();
    expect((await thief.emit('room:join', { code, name: 'P3' })).error).toMatch(/underway/);
  });
});

describe('server: game actions', () => {
  it('validates every action on the server', async () => {
    const { ps } = await table(5, ['merlin', 'assassin']);
    await ps[0].emit('room:start');
    await tick();
    const lead = leader(ps);
    const other = ps.find((b) => b !== lead)!;
    const seats = game(lead).seats;
    expect((await other.emit('game:act', { action: 'propose', arg: seats.slice(0, 2) })).error).toMatch(/leader/);
    expect((await lead.emit('game:act', { action: 'propose', arg: seats.slice(0, 3) })).error).toMatch(/exactly 2/);
    expect((await lead.emit('game:act', { action: 'propose', arg: 'nope' })).error).toMatch(/exactly 2/);
    expect((await lead.emit('game:act', { action: 'vote', arg: true })).error).toMatch(/No vote/);
    expect((await lead.emit('game:act', { action: 'hack', arg: 1 })).error).toMatch(/Unknown action/);
    expect((await lead.emit('game:act', { action: 'propose', arg: seats.slice(0, 2) })).ok).toBe(true);
    expect((await ps[0].emit('game:act', { action: 'vote', arg: 'yes' })).error).toMatch(/Invalid/);
    for (const b of ps) expect((await b.emit('game:act', { action: 'vote', arg: true })).ok).toBe(true);
    expect((await ps[0].emit('game:act', { action: 'vote', arg: true })).error).toMatch(/No vote/);
    await tick();
    const onTeam = ps.filter((b) => game(b).team?.includes(idOf(b)));
    const offTeam = ps.find((b) => !onTeam.includes(b))!;
    expect((await offTeam.emit('game:act', { action: 'quest', arg: true })).error).toMatch(/not on this quest/);
    for (const b of onTeam) {
      const good = b.last!.secret!.team === 'good';
      if (good) expect((await b.emit('game:act', { action: 'quest', arg: false })).error).toMatch(/only play SUCCESS/);
      expect((await b.emit('game:act', { action: 'quest', arg: true })).ok).toBe(true);
    }
    await tick();
    expect(game(ps[0]).quests[0].result).toBe('success');
    expect(game(ps[0]).phase).toBe('propose');
  });

  it('plays to the end, leaves, and starts a rematch without dropped players', async () => {
    const { ps } = await table(6, ['merlin', 'assassin']);
    await ps[0].emit('room:start');
    await tick();
    for (let i = 0; i < 5; i++) {
      const lead = leader(ps);
      await lead.emit('game:act', { action: 'propose', arg: game(lead).seats.slice(0, game(lead).quests[game(lead).quest].size) });
      for (const b of ps) await b.emit('game:act', { action: 'vote', arg: false });
      await tick();
    }
    expect(game(ps[0])).toMatchObject({ phase: 'over', winner: 'evil' });
    expect(Object.keys(game(ps[0]).roles!)).toHaveLength(6);
    expect((await ps[5].emit('room:leave')).ok).toBe(true);
    ps[4].s.close();
    await tick(600);
    expect((await ps[0].emit('room:start')).error).toMatch(/P4 disconnected/);
    expect((await ps[0].emit('room:lobby')).ok).toBe(true);
    await tick();
    expect(ps[0].last!.room.members.map((m) => m.name)).toEqual(['P0', 'P1', 'P2', 'P3']);
  });

  it('hands the host to a connected player when the host vanishes mid-game', async () => {
    const { ps } = await table(5);
    await ps[0].emit('room:start');
    await tick();
    ps[0].s.close();
    await tick(700);
    expect(ps[1].last!.room.hostId).toBe(idOf(ps[1]));
  });
});
