import { randomBytes, randomInt } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  type Game, createGame, propose, vote, playCard, assassinate, publicView, privateView,
} from '../shared/engine.ts';
import { type SpecialRole, ALL_SPECIALS, MAX_PLAYERS, recommendedSpecials, validateSpecials } from '../shared/rules.ts';
import type { Member, StateMsg } from '../shared/protocol.ts';

export interface Room {
  code: string;
  hostId: string;
  members: (Member & { token: string })[];
  specials: SpecialRole[];
  game: Game | null;
  started: number;
  touched: number;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O to avoid misreads
export const rooms = new Map<string, Room>();

export const cleanName = (n: unknown) =>
  typeof n === 'string' ? n.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 16) : '';
const err = (e: string) => { throw new Error(e); };

export function createRoom(token: string, name: string): Room {
  let code: string;
  do code = Array.from({ length: 5 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
  while (rooms.has(code));
  const id = randomBytes(6).toString('hex');
  const room: Room = {
    code, hostId: id, specials: recommendedSpecials(5), game: null, started: 0, touched: Date.now(),
    members: [{ id, token, name, connected: true, ready: true }],
  };
  rooms.set(code, room);
  return room;
}

/** Joins or reconnects. Same token = same seat, so refreshing never leaks or loses a role. */
export function joinRoom(room: Room, token: string, name: string) {
  const existing = room.members.find((m) => m.token === token);
  if (existing) {
    existing.connected = true;
    if (name && !room.game) existing.name = name;
    return existing;
  }
  if (room.game) err('This game is already underway.');
  if (room.members.length >= MAX_PLAYERS) err('The table is full (10 players).');
  if (!name) err('Choose a name first.');
  if (room.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) err('That name is taken at this table.');
  const m = { id: randomBytes(6).toString('hex'), token, name, connected: true, ready: false };
  room.members.push(m);
  return m;
}

export function leaveRoom(room: Room, id: string) {
  if (room.game && room.game.phase !== 'over') err('You cannot leave mid-game; close the tab to step away.');
  room.members = room.members.filter((m) => m.id !== id);
  if (room.hostId === id && room.members.length) room.hostId = room.members[0].id;
}

/** Hand the crown to the first connected member when the host has gone. */
export function passHost(room: Room) {
  const host = room.members.find((m) => m.id === room.hostId);
  if (host?.connected) return false;
  const next = room.members.find((m) => m.connected);
  if (!next) return false;
  room.hostId = next.id;
  next.ready = true;
  return true;
}

const requireHost = (room: Room, id: string) => room.hostId !== id && err('Only the host can do that.');

export function setSpecials(room: Room, by: string, specials: unknown) {
  requireHost(room, by);
  if (room.game) err('The game has started.');
  if (!Array.isArray(specials) || specials.some((s) => !ALL_SPECIALS.includes(s))) err('Unknown role.');
  room.specials = specials as SpecialRole[];
}

export function startGame(room: Room, by: string) {
  requireHost(room, by);
  if (room.game && room.game.phase !== 'over') err('A game is already running.');
  const seated = room.members;
  const gone = seated.filter((m) => !m.connected).map((m) => m.name);
  if (gone.length) err(`${gone.join(', ')} disconnected. Return to the lobby to play without them.`);
  if (seated.some((m) => !m.ready && m.id !== room.hostId)) err('Not everyone is ready.');
  const e = validateSpecials(room.specials, seated.length);
  if (e) err(e);
  const seats = seated.map((m) => m.id);
  for (let i = seats.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [seats[i], seats[j]] = [seats[j], seats[i]];
  }
  room.game = createGame(seats, room.specials, () => randomInt(1 << 30) / (1 << 30));
  room.started = Date.now();
}

export function backToLobby(room: Room, by: string) {
  requireHost(room, by);
  if (room.game && room.game.phase !== 'over') err('Finish the game first.');
  room.game = null;
  room.members = room.members.filter((m) => m.connected); // seats lost during the game would block the next start
  room.members.forEach((m) => (m.ready = m.id === room.hostId));
}

export function act(room: Room, by: string, action: string, arg: unknown) {
  const g = room.game ?? err('No game is running.');
  const fns: Record<string, () => string | null> = {
    propose: () => propose(g, by, arg as string[]),
    vote: () => vote(g, by, arg as boolean),
    quest: () => playCard(g, by, arg as boolean),
    assassinate: () => assassinate(g, by, arg as string),
  };
  const e = fns[action] ? fns[action]() : 'Unknown action.';
  if (e) err(e);
}

export function stateFor(room: Room, me: string): StateMsg {
  return {
    me,
    room: {
      code: room.code,
      hostId: room.hostId,
      members: room.members.map(({ token: _t, ...m }) => m),
      specials: room.specials,
      started: room.started,
      game: room.game && publicView(room.game),
    },
    secret: room.game && privateView(room.game, me),
  };
}

// ---------- persistence ----------
// shortcut: whole-file JSON snapshot; move to SQLite if rooms ever exceed a few thousand.
export function load(file: string) {
  try {
    for (const r of JSON.parse(readFileSync(file, 'utf8')) as Room[]) {
      r.members.forEach((m) => (m.connected = false));
      rooms.set(r.code, r);
    }
  } catch { /* first run */ }
}
let timer: NodeJS.Timeout | null = null;
export function save(file: string) {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file + '.tmp', JSON.stringify([...rooms.values()]));
    renameSync(file + '.tmp', file);
  }, 300);
}
export function sweep(maxIdleMs: number) {
  const now = Date.now();
  for (const [code, r] of rooms)
    if (!r.members.some((m) => m.connected) && now - r.touched > maxIdleMs) rooms.delete(code);
}
