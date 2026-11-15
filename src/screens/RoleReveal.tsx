import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type { PrivateView } from '../../shared/engine.ts';
import type { Member } from '../../shared/protocol.ts';
import { ROLES } from '../roles.ts';
import { play } from '../sound.ts';
import { Card } from '../ui/Card.tsx';
import { Eye, Skull } from '../ui/Icons.tsx';

/** What the player secretly knows, in words. */
export function Knowledge({ secret, members }: { secret: PrivateView; members: Member[] }) {
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? '???';
  const ids = Object.keys(secret.sees);
  const lines: Record<string, [string, string]> = {
    merlin: ['These souls serve Mordred', 'Mordred himself is hidden from you.'],
    percival: ['One of these is Merlin. One is Morgana.', 'Protect the true seer.'],
    oberon: ['', 'You walk alone. No one knows you, and you know no one.'],
    servant: ['', 'You see nothing. Trust your instincts and the votes.'],
  };
  const [head, foot] = lines[secret.role] ?? ['Your fellow servants of Mordred', ids.length ? 'Oberon, if present, is hidden from you.' : 'You have no known allies.'];
  return (
    <div className="text-left">
      {ids.length > 0 && <p className="label mb-2">{head}</p>}
      {ids.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {ids.map((id) => (
            <li key={id} className={`flex items-center gap-1.5 px-2.5 py-1 font-gothic text-xl ${secret.sees[id] === 'evil' ? 'bg-blood text-[#fff4ea]' : 'bg-volt text-ink'}`}>
              {secret.sees[id] === 'evil' ? <Skull size={16} /> : <Eye size={16} />} {name(id)}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-sm text-bone">{foot}</p>
    </div>
  );
}

export function RoleReveal({ secret, members, onDone }: { secret: PrivateView; members: Member[]; onDone: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const r = ROLES[secret.role];
  const evil = secret.team === 'evil';

  const flip = () => {
    if (flipped) return;
    setFlipped(true);
    play('paper');
    setTimeout(() => play(evil ? 'fail' : 'success'), 450);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto bg-ink"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
    >
      <AnimatePresence>
        {flipped && (
          <motion.div
            key="burst"
            className="pointer-events-none fixed inset-0"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: evil
                ? 'radial-gradient(60% 50% at 50% 40%, rgb(179 18 46 / .55), transparent 70%), repeating-conic-gradient(from 0deg at 50% 40%, rgb(226 38 74 / .12) 0 4deg, transparent 4deg 14deg)'
                : 'radial-gradient(60% 50% at 50% 40%, rgb(217 181 58 / .4), transparent 70%), repeating-conic-gradient(from 0deg at 50% 40%, rgb(239 228 200 / .1) 0 3deg, transparent 3deg 12deg)',
            }}
          />
        )}
      </AnimatePresence>

      <div className="relative mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center gap-8 px-5 py-10 md:flex-row md:gap-14">
        <motion.div
          className="w-[min(78vw,340px)] shrink-0"
          initial={{ y: 80, opacity: 0, rotate: -6 }}
          animate={flipped && evil ? { y: 0, opacity: 1, rotate: [0, -3, 3, -2, 0], x: [0, -8, 8, -4, 0] } : { y: 0, opacity: 1, rotate: flipped ? 0 : -3 }}
          transition={{ duration: flipped ? 0.5 : 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <button className="block w-full" onClick={flip} aria-label={flipped ? `${r.name} card` : 'Turn over your role card'} disabled={flipped}>
            <Card role={secret.role} faceUp={flipped} float={!flipped} />
          </button>
        </motion.div>

        <div className="w-full max-w-md text-center md:text-left">
          <AnimatePresence mode="wait">
            {!flipped ? (
              <motion.div key="pre" exit={{ opacity: 0, y: -10 }}>
                <p className="font-jp text-2xl text-blood">運命</p>
                <h1 className="mt-2 font-display text-[clamp(3rem,9vw,5.5rem)] uppercase">Your fate is dealt</h1>
                <p className="mt-4 text-lg text-bone">Shield your screen. Then tap the card to learn who you truly are.</p>
                <button className="btn mt-6" onClick={flip}>Turn the card</button>
              </motion.div>
            ) : (
              <motion.div key="post" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}>
                <p className={`font-display text-xl uppercase tracking-wide ${evil ? 'text-blood' : 'text-yolk'}`}>
                  {evil ? 'Minion of Mordred' : 'Loyal to Arthur'}
                </p>
                <h1 className="mt-1 font-gothic text-[clamp(3.2rem,10vw,6rem)] leading-[.9]" style={{ color: r.banner }}>{r.name}</h1>
                <p className="font-jp text-lg text-dim">{r.jp} · {r.title}</p>
                <p className="mt-4 text-lg leading-relaxed text-cream">{r.power}</p>
                <div className="mt-5 border-t-2 border-dashed border-smoke pt-4">
                  <Knowledge secret={secret} members={members} />
                </div>
                <button className={`btn mt-7 w-full ${evil ? 'btn-blood' : ''}`} onClick={() => { play('impact'); onDone(); }}>
                  Confirm identity
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
