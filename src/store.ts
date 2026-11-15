import { create } from 'zustand';
import { io } from 'socket.io-client';
import type { StateMsg } from '../shared/protocol.ts';

function token() {
  let t = localStorage.getItem('avalon:token');
  if (!t) {
    t = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('avalon:token', t);
  }
  return t;
}

export const socket = io({ auth: { token: token() }, autoConnect: true });

interface Store {
  state: StateMsg | null;
  connected: boolean;
  error: string | null;
  name: string;
  setName: (n: string) => void;
  clearError: () => void;
  send: (ev: string, arg?: unknown) => Promise<boolean>;
}

export const useStore = create<Store>((set) => ({
  state: null,
  connected: socket.connected,
  error: null,
  name: localStorage.getItem('avalon:name') ?? '',
  setName: (name) => {
    localStorage.setItem('avalon:name', name);
    set({ name });
  },
  clearError: () => set({ error: null }),
  send: (ev, arg) =>
    new Promise((resolve) => {
      socket.timeout(8000).emit(ev, arg, (err: unknown, res?: { ok: boolean; error?: string; code?: string }) => {
        if (err || !res) return set({ error: 'The connection is lost. Retrying…' }), resolve(false);
        if (!res.ok) return set({ error: res.error ?? 'Something went wrong.' }), resolve(false);
        if (res.code && location.pathname !== `/r/${res.code}`) history.replaceState(null, '', `/r/${res.code}`);
        resolve(true);
      });
    }),
}));

socket.on('state', (state: StateMsg) => useStore.setState({ state }));
socket.on('left', () => {
  useStore.setState({ state: null });
  history.replaceState(null, '', '/');
});
socket.on('connect', () => {
  useStore.setState({ connected: true });
  // rejoin the room in the URL on every (re)connect; the token keeps the same seat
  const code = location.pathname.match(/^\/r\/([A-Z]{5})$/i)?.[1];
  const { name, state } = useStore.getState();
  if (code && (name || state)) useStore.getState().send('room:join', { code, name });
});
socket.on('disconnect', () => useStore.setState({ connected: false }));

export const act = (action: string, arg?: unknown) => useStore.getState().send('game:act', { action, arg });
