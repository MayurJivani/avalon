import type { PublicGame, PrivateView } from './engine.ts';
import type { SpecialRole } from './rules.ts';

export interface Member {
  id: string;
  name: string;
  connected: boolean;
  ready: boolean;
}

export interface RoomView {
  code: string;
  hostId: string;
  members: Member[];
  specials: SpecialRole[];
  started: number;
  game: PublicGame | null;
}

export interface StateMsg {
  me: string;
  room: RoomView;
  secret: PrivateView | null;
}

export type Ack = (res: { ok: true; code?: string } | { ok: false; error: string }) => void;
