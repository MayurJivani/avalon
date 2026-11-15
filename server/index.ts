import express from 'express';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { Server, type Socket } from 'socket.io';
import * as R from './rooms.ts';
import type { Ack } from '../shared/protocol.ts';

const PORT = Number(process.env.PORT ?? 3001);
const DATA = resolve(process.env.DATA_DIR ?? 'data', 'rooms.json');
const HOST_GRACE_MS = Number(process.env.HOST_GRACE_MS ?? 20_000);

R.load(DATA);
const app = express();
app.get('/health', (_req, res) => res.send('ok'));
const dist = resolve('dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
}
const http = createServer(app);
const io = new Server(http, { cors: { origin: process.env.CORS_ORIGIN ?? false } });

function broadcast(room: R.Room) {
  room.touched = Date.now();
  for (const s of io.sockets.sockets.values())
    if (s.data.code === room.code) s.emit('state', R.stateFor(room, s.data.id));
  R.save(DATA);
}

io.on('connection', (socket: Socket) => {
  const token = socket.handshake.auth?.token;
  if (typeof token !== 'string' || token.length < 16 || token.length > 64) return void socket.disconnect();

  const current = (): R.Room => {
    const room = R.rooms.get(socket.data.code);
    if (!room) throw new Error('You are not in a room.');
    return room;
  };
  /** Every handler goes through here: errors become an ack, success re-broadcasts. */
  const on = (ev: string, fn: (arg: any) => R.Room | void) =>
    socket.on(ev, (arg: unknown, ack?: Ack) => {
      const reply: Ack = typeof ack === 'function' ? ack : () => {};
      try {
        const room = fn(arg) ?? current();
        broadcast(room);
        reply({ ok: true, code: room.code });
      } catch (e) {
        reply({ ok: false, error: (e as Error).message });
      }
    });

  const enter = (room: R.Room, id: string) => {
    for (const s of io.sockets.sockets.values()) // one live socket per seat
      if (s.id !== socket.id && s.data.code === room.code && s.data.id === id) s.disconnect();
    socket.data.code = room.code;
    socket.data.id = id;
  };

  on('room:create', ({ name }) => {
    const n = R.cleanName(name);
    if (!n) throw new Error('Choose a name first.');
    const room = R.createRoom(token, n);
    enter(room, room.hostId);
    return room;
  });
  on('room:join', ({ code, name }) => {
    const room = R.rooms.get(String(code ?? '').toUpperCase().trim());
    if (!room) throw new Error('No room with that code. Check the letters.');
    enter(room, R.joinRoom(room, token, R.cleanName(name)).id);
    return room;
  });
  on('room:leave', () => {
    const room = current();
    R.leaveRoom(room, socket.data.id);
    socket.data.code = null;
    socket.emit('left');
    return room;
  });
  on('room:ready', (ready) => {
    const m = current().members.find((x) => x.id === socket.data.id)!;
    m.ready = !!ready;
  });
  on('room:specials', (s) => R.setSpecials(current(), socket.data.id, s));
  on('room:start', () => R.startGame(current(), socket.data.id));
  on('room:lobby', () => R.backToLobby(current(), socket.data.id));
  on('game:act', ({ action, arg }) => R.act(current(), socket.data.id, String(action), arg));

  socket.on('disconnect', () => {
    const room = R.rooms.get(socket.data.code);
    if (!room) return;
    const m = room.members.find((x) => x.id === socket.data.id);
    if (!m) return;
    const stillHere = [...io.sockets.sockets.values()].some((s) => s.data.code === room.code && s.data.id === m.id);
    if (stillHere) return;
    m.connected = false;
    broadcast(room);
    setTimeout(() => {
      if (m.connected) return;
      if (!room.game) R.leaveRoom(room, m.id); // stale lobby seats would block the start
      else R.passHost(room);
      if (room.members.length) broadcast(room);
      else R.rooms.delete(room.code);
    }, HOST_GRACE_MS);
  });
});

setInterval(() => R.sweep(6 * 3600_000), 600_000).unref();
http.listen(PORT, () => console.log(`avalon server on :${PORT}`));
