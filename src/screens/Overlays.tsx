import { motion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import type { Proposal, Quest } from '../../shared/engine.ts';
import type { Member } from '../../shared/protocol.ts';
import { play } from '../sound.ts';
import { Check, Cross } from '../ui/Icons.tsx';

const ease = [0.16, 1, 0.3, 1] as const;

function Shell({ onClose, children, label }: { onClose: () => void; children: React.ReactNode; label: string }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5200);
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => { clearTimeout(t); removeEventListener('keydown', k); };
  }, [onClose]);
  return (
    <motion.div
      role="dialog"
      aria-label={label}
      className="fixed inset-0 z-40 flex cursor-pointer items-center justify-center overflow-y-auto bg-ink/85 p-4 backdrop-blur-[3px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="w-full max-w-4xl py-8 text-center">{children}</div>
      <span className="label absolute bottom-4 left-1/2 -translate-x-1/2">Tap anywhere to continue</span>
    </motion.div>
  );
}

function Stamp({ good, text, delay, quest }: { good: boolean; text: string; delay: number; quest?: boolean }) {
  useEffect(() => {
    const t = setTimeout(() => play(quest ? (good ? 'success' : 'fail') : good ? 'approve' : 'reject'), delay * 1000);
    return () => clearTimeout(t);
  }, [good, delay]);
  return (
    <motion.div
      className={`mx-auto mt-8 inline-block border-[6px] px-6 pb-1 pt-3 font-display text-[clamp(3rem,11vw,7rem)] uppercase leading-none ${good ? 'border-lime text-lime' : 'border-blood text-blood'}`}
      initial={{ scale: 3, opacity: 0, rotate: -14 }}
      animate={{ scale: 1, opacity: 1, rotate: -5 }}
      transition={{ delay, type: 'spring', stiffness: 500, damping: 18 }}
    >
      {text}
    </motion.div>
  );
}

export function VoteReveal({ p, members, onClose }: { p: Proposal; members: Member[]; onClose: () => void }) {
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? '?';
  const ids = Object.keys(p.votes);
  const yes = ids.filter((id) => p.votes[id]).length;
  useEffect(() => { play('paper'); const t = setTimeout(() => play('impact'), 900); return () => clearTimeout(t); }, []);
  return (
    <Shell onClose={onClose} label={`Vote ${p.approved ? 'approved' : 'rejected'}, ${yes} to ${ids.length - yes}`}>
      <p className="font-jp text-xl text-blood">投票</p>
      <h2 className="font-display text-[clamp(2.5rem,7vw,4.5rem)] uppercase">The votes are cast</h2>
      <p className="mt-1 text-bone">{name(p.leader)} proposed {p.team.map(name).join(', ')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3 [perspective:900px]">
        {ids.map((id, i) => (
          <motion.div
            key={id}
            className="w-[clamp(4.5rem,13vw,6.5rem)]"
            initial={{ y: 120, opacity: 0, rotate: (i % 2 ? 1 : -1) * 20 }}
            animate={{ y: 0, opacity: 1, rotate: (i % 3) - 1 }}
            transition={{ delay: i * 0.05, duration: 0.6, ease }}
          >
            <motion.div
              className="relative aspect-[3/4] [transform-style:preserve-3d]"
              initial={{ rotateY: 180 }}
              animate={{ rotateY: 0 }}
              transition={{ delay: 0.9, duration: 0.6, ease }}
            >
              <div className={`absolute inset-0 grid place-items-center [backface-visibility:hidden] ${p.votes[id] ? 'bg-lime text-ink' : 'bg-blood text-[#fff4ea]'}`}>
                <div>
                  {p.votes[id] ? <Check size={34} className="mx-auto" /> : <Cross size={34} className="mx-auto" />}
                  <div className="font-jp text-2xl">{p.votes[id] ? '賛' : '否'}</div>
                </div>
              </div>
              <div className="absolute inset-0 bg-plum-dk [backface-visibility:hidden] [transform:rotateY(180deg)]" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#0b0a0d 0 2px,transparent 2px 9px)' }} />
            </motion.div>
            <div className="mt-1.5 truncate font-gothic text-lg">{name(id)}</div>
          </motion.div>
        ))}
      </div>
      <Stamp good={p.approved} text={p.approved ? `Approved ${yes}–${ids.length - yes}` : `Rejected ${yes}–${ids.length - yes}`} delay={1.6} />
    </Shell>
  );
}

export function QuestReveal({ q, index, onClose }: { q: Quest; index: number; onClose: () => void }) {
  // shuffle so card order carries no information
  const cards = useMemo(() => {
    const c = Array.from({ length: q.team!.length }, (_, i) => i < q.fails!);
    for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
    return c;
  }, [q]);
  const good = q.result === 'success';
  const flipAt = (i: number) => 0.8 + i * 0.45;
  useEffect(() => {
    const ts = cards.map((_, i) => setTimeout(() => play('paper'), flipAt(i) * 1000));
    return () => ts.forEach(clearTimeout);
  }, [cards]);
  return (
    <Shell onClose={onClose} label={`Quest ${index + 1} ${good ? 'succeeded' : 'failed'} with ${q.fails} fail cards`}>
      <p className="font-jp text-xl text-lime">探索 {index + 1}</p>
      <h2 className="font-display text-[clamp(2.5rem,7vw,4.5rem)] uppercase">The cards are shuffled</h2>
      <div className="mt-8 flex flex-wrap justify-center gap-4 [perspective:900px]">
        {cards.map((fail, i) => (
          <motion.div
            key={i}
            className="relative aspect-[5/7] w-[clamp(5rem,15vw,8rem)] [transform-style:preserve-3d]"
            initial={{ rotateY: 180, y: 60, opacity: 0 }}
            animate={{ rotateY: 0, y: 0, opacity: 1 }}
            transition={{ rotateY: { delay: flipAt(i), duration: 0.5, ease }, y: { delay: i * 0.08 }, opacity: { delay: i * 0.08 } }}
          >
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-1 [backface-visibility:hidden] ${fail ? 'bg-blood text-[#fff4ea]' : 'paper'}`}>
              <span className="font-jp text-4xl">{fail ? '失敗' : '成功'}</span>
              <span className="font-display text-xl uppercase">{fail ? 'Fail' : 'Success'}</span>
            </div>
            <div className="absolute inset-0 bg-plum-dk [backface-visibility:hidden] [transform:rotateY(180deg)]" style={{ backgroundImage: 'repeating-linear-gradient(-45deg,#0b0a0d 0 2px,transparent 2px 9px)' }} />
          </motion.div>
        ))}
      </div>
      <Stamp quest good={good} text={good ? 'Quest succeeds' : 'Quest fails'} delay={flipAt(cards.length) + 0.2} />
      {q.failsNeeded > 1 && <p className="mt-3 text-bone">This quest needed {q.failsNeeded} fail cards to fall.</p>}
    </Shell>
  );
}
