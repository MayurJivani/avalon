import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { PublicGame, PrivateView } from '../../shared/engine.ts';
import type { Member } from '../../shared/protocol.ts';
import { act } from '../store.ts';
import { play } from '../sound.ts';
import { Hood, seatColor } from '../ui/bits.tsx';
import { Skull } from '../ui/Icons.tsx';

/** 3-2-1 that ticks on its own and never blocks input underneath once done. */
export function Countdown({ from = 3, onDone }: { from?: number; onDone: () => void }) {
  const [n, setN] = useState(from);
  useEffect(() => {
    if (n === 0) return onDone();
    play(n === 1 ? 'impact' : 'tick');
    const t = setTimeout(() => setN(n - 1), 800);
    return () => clearTimeout(t);
  }, [n]);
  return (
    <div className="grid h-[40vh] place-items-center" aria-live="assertive">
      <AnimatePresence mode="popLayout">
        {n > 0 && (
          <motion.span
            key={n}
            className="font-display text-[clamp(8rem,30vw,16rem)] leading-none text-blood"
            initial={{ scale: 2.2, opacity: 0, filter: 'blur(14px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            {n}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Assassination({ g, me, secret, members }: { g: PublicGame; me: string; secret: PrivateView; members: Member[] }) {
  const [intro, setIntro] = useState(true);
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const iAmAssassin = secret.role === 'assassin';
  const assassin = members.find((m) => m.id === g.assassin);
  const candidates = g.seats.filter((id) => id !== me && secret.sees[id] !== 'evil');

  useEffect(() => { play('assassin'); }, []);

  return (
    <motion.div
      className="fixed inset-0 z-30 overflow-y-auto"
      initial={{ backgroundColor: 'rgb(11 10 13 / 0)' }}
      animate={{ backgroundColor: 'rgb(11 10 13 / .94)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2 }}
      role="dialog"
      aria-label="The assassination"
    >
      <motion.div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(50% 60% at 50% 45%, transparent 30%, rgb(94 10 24 / .55) 100%)' }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.1, repeat: Infinity }}
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center px-5 py-10 text-center">
        <motion.p className="font-jp text-[clamp(3rem,12vw,7rem)] leading-none text-blood" initial={{ letterSpacing: '1em', opacity: 0 }} animate={{ letterSpacing: '0.1em', opacity: 1 }} transition={{ duration: 1.4 }}>
          暗殺
        </motion.p>
        <h2 className="mt-2 font-display text-[clamp(2.4rem,8vw,5rem)] uppercase leading-[.9]">The Assassin rises</h2>
        <p className="mt-3 max-w-[48ch] text-lg text-bone">
          Arthur’s servants won three quests. But if <b className="font-gothic text-2xl text-blood">{assassin?.name ?? 'the Assassin'}</b> names Merlin, the kingdom still falls.
        </p>

        {intro ? (
          <Countdown onDone={() => setIntro(false)} />
        ) : iAmAssassin ? (
          <motion.div className="mt-8 w-full" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <p className="font-display text-2xl uppercase text-cream">Who is Merlin?</p>
            <p className="text-sm text-dim">Talk it over with your allies. You strike once.</p>
            <ul className="mt-5 grid grid-cols-3 gap-3 sm:flex sm:flex-wrap sm:justify-center [&>li]:sm:w-36">
              {candidates.map((id) => {
                const m = members.find((x) => x.id === id)!;
                const on = target === id;
                return (
                  <li key={id}>
                    <motion.button
                      className="w-full bg-soot p-1"
                      animate={{ boxShadow: on ? '0 0 0 3px #e2264a, 0 0 40px rgb(226 38 74 / .45)' : '0 0 0 1px #3a3441' }}
                      whileHover={{ y: -4 }}
                      aria-pressed={on}
                      onClick={() => { play('click'); setTarget(id); }}
                    >
                      <Hood color={on ? '#e2264a' : seatColor(members.indexOf(m))} initial={m.name[0]?.toUpperCase() ?? '?'} />
                      <span className="mt-1 block truncate font-gothic text-lg">{m.name}</span>
                    </motion.button>
                  </li>
                );
              })}
            </ul>
            <button
              className="btn btn-blood mt-8 w-full max-w-sm !text-3xl"
              disabled={!target || busy}
              onClick={async () => { setBusy(true); play('assassin'); await act('assassinate', target); setBusy(false); }}
            >
              <Skull size={24} /> Strike
            </button>
          </motion.div>
        ) : (
          <motion.div className="mt-10 flex flex-col items-center gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div animate={{ scale: [1, 1.12, 1, 1.08, 1] }} transition={{ duration: 1.1, repeat: Infinity }} className="text-blood">
              <Skull size={64} />
            </motion.div>
            <p className="text-lg text-bone">The Assassin is choosing. {secret.role === 'merlin' ? 'Breathe. Do not look guilty.' : 'Hold your nerve.'}</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
