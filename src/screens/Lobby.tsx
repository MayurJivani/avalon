import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useState } from 'react';
import { useStore } from '../store.ts';
import { play } from '../sound.ts';
import { ROLES } from '../roles.ts';
import {
  ALL_SPECIALS, BASIC_SPECIALS, EVIL_COUNT, MAX_PLAYERS, MIN_PLAYERS, TEAM, recommendedSpecials, validateSpecials,
  type SpecialRole,
} from '../../shared/rules.ts';
import { Ransom } from '../ui/Ransom.tsx';
import { Hood, SoundToggle, seatColor, Glyphs } from '../ui/bits.tsx';
import { Check, Copy, Crown, Door } from '../ui/Icons.tsx';

export function Lobby() {
  const { state, send } = useStore();
  const [copied, setCopied] = useState(false);
  const room = state!.room;
  const me = state!.me;
  const isHost = room.hostId === me;
  const n = room.members.length;
  const meMember = room.members.find((m) => m.id === me)!;
  const problem = validateSpecials(room.specials, n);
  const notReady = room.members.filter((m) => !m.ready && m.id !== room.hostId);
  const offline = room.members.filter((m) => !m.connected);
  const link = `${location.origin}/r/${room.code}`;

  const toggle = (r: SpecialRole) => {
    play('click');
    let next = room.specials.includes(r) ? room.specials.filter((x) => x !== r) : [...room.specials, r];
    // keep pairs coherent so the host is not fighting the validator
    if (r === 'merlin' && !next.includes('merlin')) next = next.filter((x) => !['assassin', 'percival', 'morgana'].includes(x));
    if (r === 'merlin' && next.includes('merlin') && !next.includes('assassin')) next.push('assassin');
    if (r === 'assassin' && next.includes('assassin') && !next.includes('merlin')) next.push('merlin');
    if (r === 'assassin' && !next.includes('assassin')) next = next.filter((x) => !['merlin', 'percival', 'morgana'].includes(x));
    if (r === 'morgana' && next.includes('morgana') && !next.includes('percival')) next.push('percival');
    if (r === 'percival' && !next.includes('percival')) next = next.filter((x) => x !== 'morgana');
    if (r === 'percival' && next.includes('percival') && !next.includes('merlin')) next.push('merlin', 'assassin');
    send('room:specials', [...new Set(next)]);
  };

  const copy = async () => {
    play('paper');
    try { await navigator.clipboard.writeText(link); } catch { prompt('Copy this invitation link', link); }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const startBlock = problem ?? (offline.length ? `${offline.map((m) => m.name).join(', ')} disconnected.`
    : notReady.length ? `Waiting for ${notReady.map((m) => m.name).join(', ')} to be ready.` : null);

  return (
    <main className="relative mx-auto min-h-[100dvh] max-w-[1300px] px-4 pb-16 pt-4 md:px-8">
      <Glyphs count={6} />
      <header className="relative z-10 flex items-center justify-between gap-3">
        <button className="btn btn-ghost btn-sm" onClick={() => send('room:leave')}><Door size={18} /> Leave</button>
        <span className="font-jp text-sm text-dim">集会所 · The Gathering</span>
        <SoundToggle />
      </header>

      <section className="relative z-10 mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label mb-3">Room code · speak it aloud</p>
          <Ransom text={room.code} size="clamp(3rem,10vw,6rem)" seed={room.code.charCodeAt(0)} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-cream" onClick={copy}>
            {copied ? <Check size={20} /> : <Copy size={20} />} {copied ? 'Link copied' : 'Copy invite link'}
          </button>
        </div>
      </section>

      <div className="relative z-10 mt-10 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        {/* the gathering */}
        <section aria-labelledby="players-h">
          <div className="flex items-baseline justify-between border-b-2 border-plum pb-2">
            <h2 id="players-h" className="font-display text-3xl uppercase">The gathering</h2>
            <span className="font-display text-2xl tabular text-lime">{n}<span className="text-dim">/{MAX_PLAYERS}</span></span>
          </div>
          <LayoutGroup>
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {room.members.map((m, i) => (
                  <motion.li
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: -40, rotate: -8, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, rotate: (i % 3) - 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6, rotate: 12, filter: 'blur(6px)' }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: i * 0.04 }}
                    className="relative bg-soot p-2 pb-3 shadow-[0_10px_24px_-10px_#000]"
                  >
                    <div className="relative overflow-hidden">
                      <Hood color={seatColor(i)} initial={m.name[0]?.toUpperCase() ?? '?'} dim={!m.connected} />
                      {m.id === room.hostId && (
                        <span className="absolute left-1 top-1 flex items-center gap-1 bg-yolk px-1.5 py-0.5 font-display text-xs uppercase text-ink"><Crown size={14} /> Host</span>
                      )}
                      {m.id === me && <span className="absolute right-1 top-1 bg-cream px-1.5 py-0.5 font-display text-xs uppercase text-ink">You</span>}
                    </div>
                    <div className="mt-2 truncate font-gothic text-2xl leading-none">{m.name}</div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                      <motion.span
                        className="h-2 w-2 rounded-full"
                        style={{ background: m.connected ? '#b6e33a' : '#e2264a' }}
                        animate={m.connected ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <span className={m.connected ? (m.ready || m.id === room.hostId ? 'text-lime' : 'text-dim') : 'text-blood'}>
                        {!m.connected ? 'Lost in the fog' : m.id === room.hostId ? 'Presiding' : m.ready ? 'Ready' : 'Not ready'}
                      </span>
                    </div>
                  </motion.li>
                ))}
                {Array.from({ length: Math.max(0, MIN_PLAYERS - n) }, (_, i) => (
                  <motion.li layout key={`empty-${i}`} className="grid min-h-[13rem] place-items-center border-2 border-dashed border-smoke p-3 text-center text-dim" exit={{ opacity: 0 }}>
                    <span><span className="block font-jp text-2xl text-smoke">空席</span><span className="label">Empty chair</span></span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </LayoutGroup>
          {n < MIN_PLAYERS && (
            <p className="mt-4 text-bone">Avalon needs at least {MIN_PLAYERS} players. Send the invite link to {MIN_PLAYERS - n} more.</p>
          )}
        </section>

        {/* the rite */}
        <section aria-labelledby="rite-h" className="relative">
          <div className="flex items-baseline justify-between border-b-2 border-plum pb-2">
            <h2 id="rite-h" className="font-display text-3xl uppercase">The rite</h2>
            <span className="text-sm text-bone">
              <b className="text-[#9fbf7a]">{n >= MIN_PLAYERS ? n - EVIL_COUNT[n] : '–'} good</b> ·{' '}
              <b className="text-blood">{n >= MIN_PLAYERS ? EVIL_COUNT[n] : '–'} evil</b>
            </span>
          </div>

          {isHost && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => send('room:specials', BASIC_SPECIALS)}>Basic game</button>
              <button className="btn btn-ghost btn-sm" onClick={() => send('room:specials', recommendedSpecials(Math.max(n, MIN_PLAYERS)))}>Recommended for {Math.max(n, MIN_PLAYERS)}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => send('room:specials', [])}>Servants only</button>
            </div>
          )}

          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ALL_SPECIALS.map((r) => {
              const on = room.specials.includes(r);
              const evil = TEAM[r] === 'evil';
              return (
                <li key={r}>
                  <button
                    disabled={!isHost}
                    aria-pressed={on}
                    onClick={() => toggle(r)}
                    className={`group relative flex w-full items-center gap-2 p-1.5 pr-2 text-left transition-[background,box-shadow] disabled:cursor-default ${on ? 'bg-ash' : 'bg-soot opacity-55 hover:opacity-90'}`}
                    style={{ boxShadow: on ? `inset 0 0 0 2px ${evil ? '#e2264a' : '#9fbf7a'}` : 'inset 0 0 0 1px #3a3441' }}
                  >
                    <img src={ROLES[r].art} alt="" className={`printed h-14 w-12 object-cover ${on ? '' : 'grayscale'}`} />
                    <span className="min-w-0">
                      <span className="block truncate font-gothic text-xl leading-none">{ROLES[r].name}</span>
                      <span className={`label !text-[.6rem] ${evil ? '!text-blood' : '!text-[#9fbf7a]'}`}>{evil ? 'Mordred' : 'Arthur'}</span>
                    </span>
                    {on && <Check size={16} className="absolute right-1.5 top-1.5 text-lime" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-dim">
            Remaining seats are filled with Loyal Servants and Minions of Mordred.
            {!isHost && ' Only the host can change the rite.'}
          </p>

          <div className="mt-8">
            {isHost ? (
              <>
                <button
                  className="btn w-full !min-h-[4rem] !text-3xl"
                  disabled={!!startBlock}
                  onClick={() => { play('impact'); send('room:start'); }}
                >
                  Begin the game
                </button>
                {startBlock && <p className="mt-3 font-semibold text-yolk" role="status">{startBlock}</p>}
              </>
            ) : (
              <>
                <button
                  className={`btn w-full !min-h-[4rem] !text-3xl ${meMember.ready ? 'btn-ghost' : ''}`}
                  onClick={() => { play('click'); send('room:ready', !meMember.ready); }}
                >
                  {meMember.ready ? 'Not ready' : 'I am ready'}
                </button>
                <div className="mt-4 flex items-center gap-3 text-bone" role="status">
                  <motion.span className="font-jp text-xl text-lime" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2.4, repeat: Infinity }}>待</motion.span>
                  The host will begin when the table is full and everyone is ready.
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
