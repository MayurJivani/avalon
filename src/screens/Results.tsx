import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { RoomView } from '../../shared/protocol.ts';
import { TEAM } from '../../shared/rules.ts';
import { useStore } from '../store.ts';
import { play } from '../sound.ts';
import { Card } from '../ui/Card.tsx';
import { Ransom } from '../ui/Ransom.tsx';
import { Glyphs, SoundToggle } from '../ui/bits.tsx';
import { Check, Cross, Skull } from '../ui/Icons.tsx';
import { Countdown } from './Assassination.tsx';

const ease = [0.16, 1, 0.3, 1] as const;

/** The strike, replayed for everyone: countdown, then the target's card turns. */
function Strike({ room, onDone }: { room: RoomView; onDone: () => void }) {
  const g = room.game!;
  const target = g.assassinTarget!;
  const role = g.roles![target];
  const name = room.members.find((m) => m.id === target)?.name;
  const [stage, setStage] = useState<'count' | 'flip'>('count');
  useEffect(() => {
    if (stage !== 'flip') return;
    play(role === 'merlin' ? 'fail' : 'success');
    const t = setTimeout(onDone, 3400);
    return () => clearTimeout(t);
  }, [stage]);
  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink px-5 text-center" exit={{ opacity: 0 }} onClick={onDone}>
      <p className="font-jp text-2xl text-blood">一撃</p>
      <h1 className="font-display text-[clamp(2.4rem,8vw,5rem)] uppercase leading-[.9]">The Assassin strikes <span className="font-gothic normal-case text-blood">{name}</span></h1>
      {stage === 'count' ? (
        <Countdown onDone={() => setStage('flip')} />
      ) : (
        <motion.div className="mt-6 w-[min(60vw,260px)]" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
          <Card role={role} faceUp tilt={false} />
          <motion.p
            className={`mt-4 font-display text-4xl uppercase ${role === 'merlin' ? 'text-blood' : 'text-lime'}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          >
            {role === 'merlin' ? 'Merlin is slain' : 'Not Merlin'}
          </motion.p>
        </motion.div>
      )}
      <span className="label absolute bottom-5">Tap to skip</span>
    </motion.div>
  );
}

export function Results({ room, me }: { room: RoomView; me: string }) {
  const g = room.game!;
  const send = useStore((s) => s.send);
  const [strike, setStrike] = useState(!!g.assassinTarget);
  const good = g.winner === 'good';
  const isHost = room.hostId === me;
  const names = (id: string) => room.members.find((m) => m.id === id)?.name ?? '???';
  useEffect(() => { if (!strike) play(good ? 'success' : 'fail'); }, [strike]);

  return (
    <main
      className={`relative min-h-[100dvh] overflow-hidden ${good ? 'text-ink' : 'text-cream'}`}
      style={{
        background: good
          ? 'radial-gradient(80% 60% at 50% 0%, #fff6dc 0%, transparent 70%), linear-gradient(180deg, #efe4c8, #c9d6a8)'
          : 'radial-gradient(80% 60% at 50% 0%, #6e0f22 0%, transparent 70%), linear-gradient(180deg, #2b1838, #0b0a0d 70%)',
      }}
    >
      <Glyphs count={10} color={good ? '#b39a4e' : '#b3122e'} />
      <AnimatePresence>{strike && <Strike key="s" room={room} onDone={() => setStrike(false)} />}</AnimatePresence>

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-5">
        <header className="flex justify-end"><SoundToggle /></header>
        {!strike && (
          <>
            <section className="text-center">
              <motion.p className={`font-jp text-[clamp(2rem,8vw,4rem)] ${good ? 'text-[#8a6d16]' : 'text-blood'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {good ? 'アーサーの勝利' : 'モードレッドの勝利'}
              </motion.p>
              <div className="mt-2 flex justify-center">
                <Ransom text={good ? 'ARTHUR PREVAILS' : 'MORDRED REIGNS'} size="clamp(2.2rem,8vw,5.5rem)" seed={good ? 3 : 9} className="justify-center" />
              </div>
              <motion.p className={`mx-auto mt-5 max-w-[50ch] text-lg ${good ? 'text-[#3d3424]' : 'text-bone'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
                {g.reason}
              </motion.p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {isHost ? (
                  <>
                    <button className={`btn ${good ? '' : 'btn-blood'}`} onClick={() => { play('impact'); send('room:start'); }}>Rematch, same rite</button>
                    <button className={`btn ${good ? 'btn-ghost !text-ink' : 'btn-ghost'}`} onClick={() => send('room:lobby')}>Back to lobby</button>
                  </>
                ) : (
                  <p className="label !text-current">The host can start a rematch or return everyone to the lobby.</p>
                )}
                <button className="btn btn-ghost" style={good ? { color: '#0b0a0d' } : undefined} onClick={() => send('room:leave')}>Leave room</button>
              </div>
            </section>

            <section className="mt-12" aria-labelledby="unmasked">
              <h2 id="unmasked" className="font-display text-3xl uppercase">Unmasked</h2>
              <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {g.seats.map((id, i) => {
                  const role = g.roles![id];
                  const evil = TEAM[role] === 'evil';
                  return (
                    <motion.li key={id} initial={{ opacity: 0, y: 40, rotate: -6 }} animate={{ opacity: 1, y: 0, rotate: (i % 3) - 1 }} transition={{ delay: 0.3 + i * 0.08, duration: 0.7, ease }}>
                      <Card role={role} />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="truncate font-gothic text-2xl">{names(id)}{id === me ? ' (you)' : ''}</span>
                        <span className={`shrink-0 px-1.5 font-display text-xs uppercase ${evil ? 'bg-blood text-[#fff4ea]' : 'bg-[#3f5a2e] text-cream'}`}>{evil ? 'Evil' : 'Good'}</span>
                      </div>
                      {g.assassinTarget === id && <span className="mt-1 flex items-center gap-1 text-sm font-bold text-blood"><Skull size={14} /> Assassin’s target</span>}
                    </motion.li>
                  );
                })}
              </ul>
            </section>

            <section className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.4fr]" aria-label="History">
              <div>
                <h2 className="font-display text-3xl uppercase">The quests</h2>
                <ol className="mt-4 flex flex-col gap-2">
                  {g.quests.map((q, i) => (
                    <li key={i} className={`flex items-center justify-between gap-3 px-3 py-2 ${q.result === 'success' ? 'bg-[#9fbf7a] text-ink' : q.result === 'fail' ? 'bg-crimson text-[#fff4ea]' : good ? 'bg-black/5' : 'bg-white/5'}`}>
                      <span className="font-display text-xl uppercase">Quest {i + 1}</span>
                      <span className="text-sm">{q.team ? q.team.map(names).join(', ') : 'Not attempted'}</span>
                      <span className="font-display uppercase">{q.result ? `${q.result} · ${q.fails} fail${q.fails === 1 ? '' : 's'}` : '—'}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <h2 className="font-display text-3xl uppercase">Every vote</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[28rem] text-sm tabular">
                    <thead>
                      <tr className="text-left">
                        <th className="py-1 pr-2 font-display font-normal uppercase">Team</th>
                        {g.seats.map((id) => <th key={id} className="max-w-[4rem] truncate px-1 py-1 font-gothic text-base font-normal">{names(id)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {g.proposals.map((p, k) => (
                        <tr key={k} className="border-t border-current/15">
                          <td className="py-1.5 pr-2">
                            <b>Q{p.quest + 1}.{p.attempt}</b> {names(p.leader)}: {p.team.map(names).join(', ')}{' '}
                            <b className={p.approved ? (good ? 'text-[#3f5a2e]' : 'text-lime') : 'text-blood'}>{p.approved ? 'approved' : 'rejected'}</b>
                          </td>
                          {g.seats.map((id) => (
                            <td key={id} className="px-1 text-center" aria-label={p.votes[id] ? 'approve' : 'reject'}>
                              {p.votes[id] ? <Check size={16} className="inline" /> : <Cross size={16} className="inline text-blood" />}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
