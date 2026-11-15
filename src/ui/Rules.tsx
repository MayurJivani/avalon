import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ALL_SPECIALS, EVIL_COUNT, QUEST_SIZES, TEAM, type Role } from '../../shared/rules.ts';
import { ROLES } from '../roles.ts';
import { Book, Cross } from './Icons.tsx';

const ROLE_ORDER: Role[] = ['merlin', 'percival', 'servant', ...ALL_SPECIALS.filter((r) => TEAM[r] === 'evil'), 'minion'];

const STEPS: [string, string, string][] = [
  ['選抜', 'Propose', 'The leader picks the quest team. The required size is shown on the quest track.'],
  ['投票', 'Vote', 'Everyone secretly approves or rejects. Votes flip together. A majority approves; a tie rejects, and leadership passes left.'],
  ['探索', 'Quest', 'Each team member secretly plays SUCCESS or FAIL. Good must play SUCCESS. One FAIL sinks the quest (quest 4 needs two at 7+ players). Cards are shuffled, so nobody learns who failed.'],
  ['暗殺', 'Assassinate', 'If good wins three quests, the Assassin gets one guess at Merlin. A hit steals the game for evil.'],
];

function RulesBody() {
  return (
    <div className="grid grid-cols-1 gap-10 text-left [&>section]:min-w-0">
      <section>
        <h3 className="font-display text-3xl uppercase">How a game is won</h3>
        <p className="mt-2 max-w-[65ch] text-bone">
          Arthur’s loyal servants and Mordred’s minions sit at one table, and only evil knows who is who.
          Five quests go out. <b className="text-lime">Good wins</b> with three successful quests and Merlin still hidden.
          <b className="text-blood"> Evil wins</b> with three failed quests, five rejected teams in a row on one quest, or by assassinating Merlin.
        </p>
      </section>

      <section>
        <h3 className="font-display text-3xl uppercase">Each round</h3>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2">
          {STEPS.map(([jp, t, d]) => (
            <li key={t} className="bg-soot p-4">
              <p className="flex items-baseline gap-2"><span className="font-jp text-blood">{jp}</span><span className="font-display text-2xl uppercase">{t}</span></p>
              <p className="mt-1 text-sm leading-relaxed text-bone">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="font-display text-3xl uppercase">The characters</h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {ROLE_ORDER.map((r) => (
            <li key={r} className="flex gap-3 bg-soot p-2">
              <img src={ROLES[r].art} alt="" className="printed h-24 w-20 shrink-0 object-cover" loading="lazy" />
              <div className="min-w-0 py-1">
                <p className="flex items-baseline gap-2">
                  <span className="font-gothic text-2xl leading-none" style={{ color: ROLES[r].banner }}>{ROLES[r].name}</span>
                  <span className={`label !text-[.6rem] ${TEAM[r] === 'evil' ? '!text-blood' : '!text-[#9fbf7a]'}`}>{TEAM[r] === 'evil' ? 'Evil' : 'Good'}</span>
                </p>
                <p className="mt-1 text-sm leading-snug text-bone">{ROLES[r].power}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-display text-3xl uppercase">Team sizes</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[26rem] text-center tabular">
            <thead>
              <tr className="label"><th className="py-2 text-left">Players</th><th>Evil</th>{[1, 2, 3, 4, 5].map((q) => <th key={q}>Q{q}</th>)}</tr>
            </thead>
            <tbody>
              {Object.entries(QUEST_SIZES).map(([n, sizes]) => (
                <tr key={n} className="border-t border-smoke">
                  <td className="py-2 text-left font-display text-xl">{n}</td>
                  <td className="text-blood">{EVIL_COUNT[+n]}</td>
                  {sizes.map((s, i) => <td key={i}>{s}{i === 3 && +n >= 7 ? <sup className="text-blood">*</sup> : ''}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-dim"><sup className="text-blood">*</sup> needs two FAIL cards to fail.</p>
      </section>
    </div>
  );
}

export function RulesButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [open]);
  return (
    <>
      <button className={`btn btn-ghost btn-sm ${className}`} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Book size={18} /> <span className="sr-only sm:not-sr-only">Rules</span>
      </button>
      {/* portal: headers create stacking contexts that would trap a fixed overlay */}
      {createPortal(<AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="How to play Avalon"
            className="fixed inset-0 z-[80] overflow-y-auto bg-ink/95 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div className="relative mx-auto max-w-4xl px-5 pb-16 pt-6" initial={{ y: 30 }} animate={{ y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}>
              <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between bg-ink/95 px-5 py-3">
                <h2 className="flex items-baseline gap-3 font-display text-[clamp(2.2rem,7vw,4rem)] uppercase leading-none">
                  How to play <span className="font-jp text-lg text-blood">掟</span>
                </h2>
                <button className="grid h-11 w-11 place-items-center text-cream hover:text-lime" onClick={() => setOpen(false)} aria-label="Close rules" autoFocus>
                  <Cross />
                </button>
              </div>
              <RulesBody />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </>
  );
}
