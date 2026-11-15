import type { Role } from '../shared/rules.ts';
import merlin from './art/portraits/merlin.svg';
import percival from './art/portraits/percival.svg';
import servant from './art/portraits/servant.svg';
import assassin from './art/portraits/assassin.svg';
import morgana from './art/portraits/morgana.svg';
import mordred from './art/portraits/mordred.svg';
import oberon from './art/portraits/oberon.svg';
import minion from './art/portraits/minion.svg';

export interface RoleMeta {
  name: string;
  jp: string;
  title: string;
  line: string; // short atmospheric line on the card
  power: string; // plain rules text
  art: string;
  banner: string; // ribbon colour
  glow: string;
}

export const ROLES: Record<Role, RoleMeta> = {
  merlin: {
    name: 'Merlin', jp: 'マーリン', title: 'The Seer', art: merlin, banner: '#8fb0ff', glow: '#4d86ff',
    line: 'He sees the rot. He must never be seen seeing it.',
    power: 'You know the servants of Mordred, all except Mordred himself. If good wins three quests, the Assassin will hunt you. Guide without being found.',
  },
  percival: {
    name: 'Percival', jp: 'パーシヴァル', title: 'The Faithful', art: percival, banner: '#e6c75e', glow: '#d9b53a',
    line: 'Two lights in the dark. One of them is lying.',
    power: 'You see Merlin and Morgana, but cannot tell which is which. Protect the true seer.',
  },
  servant: {
    name: 'Loyal Servant', jp: 'アーサーの忠臣', title: 'Of Arthur', art: servant, banner: '#a9c98a', glow: '#9fbf7a',
    line: 'No visions. No secrets. Only a vote and a blade.',
    power: 'You have no special knowledge. Read the table, approve honest teams, and play SUCCESS on every quest.',
  },
  assassin: {
    name: 'Assassin', jp: '暗殺者', title: 'The Knife', art: assassin, banner: '#f0606f', glow: '#e2264a',
    line: 'Patience. One strike is all it takes.',
    power: 'You know your fellow minions. If good completes three quests, you get one chance to name Merlin and steal the victory.',
  },
  morgana: {
    name: 'Morgana', jp: 'モルガナ', title: 'The False Seer', art: morgana, banner: '#cf86d6', glow: '#b04fb8',
    line: 'Wear his light like a stolen crown.',
    power: 'You know your fellow minions. Percival sees you exactly as he sees Merlin. Make him trust the wrong one.',
  },
  mordred: {
    name: 'Mordred', jp: 'モードレッド', title: 'The Hidden Prince', art: mordred, banner: '#d54a5c', glow: '#b3122e',
    line: 'Even the seer’s eye slides off him.',
    power: 'You know your fellow minions, and Merlin cannot see you. Hide in plain sight.',
  },
  oberon: {
    name: 'Oberon', jp: 'オベロン', title: 'The Outcast', art: oberon, banner: '#b6e33a', glow: '#b6e33a',
    line: 'He serves the dark, and the dark does not know his face.',
    power: 'You are evil, but you do not know the other minions and they do not know you. Merlin can still see you.',
  },
  minion: {
    name: 'Minion of Mordred', jp: 'モードレッドの手先', title: 'The Rot', art: minion, banner: '#ec8a4c', glow: '#d0642a',
    line: 'Smile. Approve. Sabotage.',
    power: 'You know your fellow minions. Slip onto quests and play FAIL when it counts.',
  },
};
