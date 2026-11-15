import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { PublicGame, PrivateView, Proposal, Quest } from '../../shared/engine.ts';
import type { Member, RoomView } from '../../shared/protocol.ts';
import { act } from '../store.ts';
import { play } from '../sound.ts';
import { ROLES } from '../roles.ts';
import { Card } from '../ui/Card.tsx';
import { Hood, SoundToggle, seatColor } from '../ui/bits.tsx';
import { Check, Crown, Cross, Eye, Scroll, Seal, Skull, Sword, Wifi } from '../ui/Icons.tsx';
import { Knowledge } from './RoleReveal.tsx';
import { QuestReveal, VoteReveal } from './Overlays.tsx';
import { Assassination } from './Assassination.tsx';
import { RulesButton } from '../ui/Rules.tsx';

const ease = [0.16, 1, 0.3, 1] as const;

// ---------- quest track ----------
function QuestTrack({ g, names }: { g: PublicGame; names: (id: string) => string }) {
  return (
    <div className="w-full">
      <ol className="grid grid-cols-5 gap-1.5 sm:gap-3">
        {g.quests.map((q, i) => {
          const current = i === g.quest && !q.result;
          return (
            <li key={i} className="flex flex-col items-center">
              <motion.div
                layout
                className={`relative grid aspect-square w-full max-w-[5.5rem] place-items-center rounded-full border-[3px] ${
                  q.result === 'success' ? 'border-ink bg-lime text-ink' : q.result === 'fail' ? 'border-ink bg-blood text-[#fff4ea]' : current ? 'border-lime bg-ash text-cream' : 'border-smoke bg-soot text-dim'}`}
                animate={current ? { boxShadow: ['0 0 0 0 rgb(182 227 58 / .5)', '0 0 0 10px rgb(182 227 58 / 0)'] } : { boxShadow: '0 0 0 0 transparent' }}
                transition={current ? { duration: 1.8, repeat: Infinity } : { duration: 0.3 }}
                aria-label={`Quest ${i + 1}: team of ${q.size}${q.failsNeeded > 1 ? ', needs two fails' : ''}${q.result ? `, ${q.result} with ${q.fails} fails` : current ? ', current' : ''}`}
              >
                <AnimatePresence mode="popLayout">
                  {q.result ? (
                    <motion.span key="r" initial={{ scale: 2.4, rotate: -30, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
                      {q.result === 'success' ? <Check size={30} /> : <Skull size={30} />}
                    </motion.span>
                  ) : (
                    <motion.span key="n" className="font-display text-[clamp(1.6rem,5vw,2.6rem)] leading-none">{q.size}</motion.span>
                  )}
                </AnimatePresence>
                {q.failsNeeded > 1 && !q.result && (
                  <span className="absolute -right-1 -top-1 bg-blood px-1 font-display text-[.65rem] uppercase leading-tight text-[#fff4ea]" title="Two fail cards needed">2×</span>
                )}
              </motion.div>
              <span className="mt-1 text-[.65rem] font-bold uppercase tracking-wider text-dim">
                {q.result ? `${q.fails} fail${q.fails === 1 ? '' : 's'}` : `Quest ${i + 1}`}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-1.5 text-bone"><Crown size={16} className="text-yolk" /> <b className="font-gothic text-lg text-cream">{names(g.leader)}</b> leads</span>
        <span className="flex items-center gap-2" aria-label={`${g.rejects} of 5 teams rejected`}>
          <span className="label !text-[.62rem]">Rejected</span>
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              className={`h-3 w-3 rotate-45 ${i < g.rejects ? (i === 4 ? 'bg-blood' : 'bg-yolk') : 'border border-smoke'}`}
              animate={i < g.rejects ? { scale: [1.8, 1] } : { scale: 1 }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

// ---------- seat ----------
interface SeatProps {
  m: Member;
  index: number;
  g: PublicGame;
  me: string;
  secret: PrivateView;
  selected: boolean;
  selectable: boolean;
  onPick: () => void;
}

function Seat({ m, index, g, me, secret, selected, selectable, onPick }: SeatProps) {
  const onTeam = g.team?.includes(m.id) ?? false;
  const sight = secret.sees[m.id];
  const status = g.phase === 'vote' ? (g.voted.includes(m.id) ? 'sealed' : 'thinking') : g.phase === 'quest' && onTeam ? (g.played.includes(m.id) ? 'played' : 'questing') : null;
  const ring = selected || onTeam;
  return (
    <motion.button
      layout
      type="button"
      disabled={!selectable}
      onClick={() => { play('click'); onPick(); }}
      aria-pressed={selectable ? selected : undefined}
      aria-label={`${m.name}${m.id === me ? ' (you)' : ''}${g.leader === m.id ? ', leader' : ''}${onTeam ? ', on the team' : ''}${!m.connected ? ', disconnected' : ''}`}
      className="group relative w-full max-w-[7.5rem] text-left disabled:cursor-default lg:w-[7rem]"
      whileHover={selectable ? { y: -4 } : undefined}
      whileTap={selectable ? { scale: 0.95 } : undefined}
    >
      <motion.div
        className="relative bg-soot p-1"
        animate={{ boxShadow: ring ? `0 0 0 3px ${selected && !onTeam ? '#efe4c8' : '#b6e33a'}, 0 12px 24px -8px #000` : '0 0 0 1px #3a3441, 0 8px 18px -8px #000' }}
        transition={{ duration: 0.25 }}
      >
        <Hood color={seatColor(index)} initial={m.name[0]?.toUpperCase() ?? '?'} dim={!m.connected} />
        {g.leader === m.id && (
          <motion.span layoutId="crown" className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yolk p-1 text-ink shadow" transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
            <Crown size={16} />
          </motion.span>
        )}
        {onTeam && <span className="absolute -left-2 top-1/3 bg-lime p-1 text-ink shadow"><Sword size={14} /></span>}
        {sight && (
          <span
            className={`absolute -right-2 top-1/3 p-1 shadow ${sight === 'evil' ? 'bg-blood text-[#fff4ea]' : 'bg-volt text-ink'}`}
            title={sight === 'evil' ? 'You know this one serves Mordred' : 'Merlin… or Morgana'}
          >
            {sight === 'evil' ? <Skull size={14} /> : <Eye size={14} />}
          </span>
        )}
        {!m.connected && <span className="absolute inset-x-0 bottom-1 flex justify-center text-blood"><Wifi size={18} /></span>}
        <AnimatePresence>
          {status === 'sealed' || status === 'played' ? (
            <motion.span key="s" className="absolute bottom-1 right-1 text-lime" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
              <Seal size={22} />
            </motion.span>
          ) : status ? (
            <motion.span key="t" className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-yolk" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
          ) : null}
        </AnimatePresence>
      </motion.div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`truncate font-gothic text-lg leading-tight ${m.id === me ? 'text-lime' : 'text-cream'}`}>{m.name}</span>
        {m.id === me && <span className="label !text-[.55rem]">you</span>}
      </div>
    </motion.button>
  );
}

// ---------- action dock ----------
function Dock({ g, me, secret, names, pick, clearPick }: {
  g: PublicGame; me: string; secret: PrivateView; names: (id: string) => string; pick: string[]; clearPick: () => void;
}) {
  const size = g.quests[g.quest].size;
  const [busy, setBusy] = useState(false);
  const run = async (action: string, arg: unknown, sound: Parameters<typeof play>[0] = 'paper') => {
    if (busy) return;
    setBusy(true);
    play(sound);
    if (await act(action, arg)) clearPick();
    setBusy(false);
  };
  const TeamList = () => (
    <ul className="flex flex-wrap justify-center gap-1.5">
      {g.team!.map((id) => (
        <motion.li layoutId={`team-${id}`} key={id} className="flex items-center gap-1 bg-lime px-2 py-0.5 font-gothic text-lg text-ink"><Sword size={14} /> {names(id)}</motion.li>
      ))}
    </ul>
  );
  const Title = ({ jp, children }: { jp: string; children: React.ReactNode }) => (
    <h2 className="flex items-baseline justify-center gap-3 font-display text-[clamp(1.6rem,4.5vw,2.4rem)] uppercase leading-none">
      <span className="font-jp text-base text-blood">{jp}</span>{children}
    </h2>
  );

  let body: React.ReactNode;
  if (g.phase === 'propose' && g.leader === me) {
    body = (
      <>
        <Title jp="選抜">Choose {size} for quest {g.quest + 1}</Title>
        <p className="text-bone">Tap seats on the table. You may include yourself. <b className="tabular text-lime">{pick.length}/{size}</b> chosen.</p>
        <button className="btn mx-auto w-full max-w-sm" disabled={pick.length !== size || busy} onClick={() => run('propose', pick)}>
          Propose this team
        </button>
      </>
    );
  } else if (g.phase === 'propose') {
    body = (
      <>
        <Title jp="選抜">{names(g.leader)} is choosing</Title>
        <p className="text-bone">The leader picks {size} companions for quest {g.quest + 1}. Argue now; vote soon.</p>
      </>
    );
  } else if (g.phase === 'vote') {
    const mine = secret.myVote;
    body = (
      <>
        <Title jp="投票">Send this team?</Title>
        <TeamList />
        {mine === null ? (
          <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3">
            {[true, false].map((v) => (
              <motion.button
                key={String(v)}
                className={`relative flex aspect-[4/3] flex-col items-center justify-center gap-1 ${v ? 'bg-lime text-ink' : 'bg-blood text-[#fff4ea]'} torn-${v ? 'a' : 'b'} disabled:opacity-50`}
                whileHover={{ y: -6, rotate: v ? -2 : 2 }}
                whileTap={{ scale: 0.92, y: -30 }}
                disabled={busy}
                onClick={() => run('vote', v, v ? 'approve' : 'reject')}
              >
                {v ? <Check size={30} /> : <Cross size={30} />}
                <span className="font-display text-2xl uppercase">{v ? 'Approve' : 'Reject'}</span>
                <span className="font-jp text-sm">{v ? '賛成' : '反対'}</span>
              </motion.button>
            ))}
          </div>
        ) : (
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-2 text-bone">
            <Seal size={20} className="text-lime" /> Your vote ({mine ? 'approve' : 'reject'}) is sealed. {g.voted.length}/{g.seats.length} have voted.
          </motion.p>
        )}
      </>
    );
  } else if (g.phase === 'quest') {
    const onTeam = g.team!.includes(me);
    const mine = secret.myCard;
    body = (
      <>
        <Title jp="探索">Quest {g.quest + 1} is underway</Title>
        <TeamList />
        {onTeam && mine === null ? (
          <>
            <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3">
              {[true, false].map((v) => {
                const forbidden = !v && secret.team === 'good';
                return (
                  <motion.button
                    key={String(v)}
                    className={`relative flex aspect-[5/6] flex-col items-center justify-center gap-1 ${v ? 'paper' : 'bg-blood text-[#fff4ea]'} disabled:opacity-35`}
                    whileHover={forbidden ? undefined : { y: -6 }}
                    whileTap={forbidden ? undefined : { scale: 0.92, y: -30 }}
                    disabled={busy || forbidden}
                    onClick={() => run('quest', v, 'paper')}
                  >
                    <span className="font-jp text-4xl">{v ? '成功' : '失敗'}</span>
                    <span className="font-display text-2xl uppercase">{v ? 'Success' : 'Fail'}</span>
                  </motion.button>
                );
              })}
            </div>
            {secret.team === 'good' && <p className="text-sm text-dim">Servants of Arthur can only play SUCCESS.</p>}
          </>
        ) : (
          <p className="flex items-center justify-center gap-2 text-bone">
            {onTeam && <Seal size={20} className="text-lime" />}
            {onTeam ? 'Your card is in the pile. ' : ''}{g.played.length}/{g.team!.length} cards played.
          </p>
        )}
      </>
    );
  }
  return (
    <motion.section
      key={`${g.phase}-${g.quest}-${g.proposals.length}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease }}
      className="flex flex-col items-center gap-3 text-center"
      aria-live="polite"
    >
      {body}
    </motion.section>
  );
}

// ---------- chronicle ----------
function Chronicle({ g, names }: { g: PublicGame; names: (id: string) => string }) {
  const entries: ({ kind: 'p'; p: Proposal } | { kind: 'q'; q: Quest; i: number })[] = [];
  g.quests.forEach((q, i) => {
    g.proposals.filter((p) => p.quest === i).forEach((p) => entries.push({ kind: 'p', p }));
    if (q.result) entries.push({ kind: 'q', q, i });
  });
  entries.reverse();
  if (!entries.length) return <p className="text-sm text-dim">Nothing has happened yet. The first leader is thinking.</p>;
  return (
    <ol className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {entries.map((e) => e.kind === 'q' ? (
          <motion.li key={`q${e.i}`} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            className={`px-3 py-2 font-display text-lg uppercase ${e.q.result === 'success' ? 'bg-lime text-ink' : 'bg-blood text-[#fff4ea]'}`}>
            Quest {e.i + 1} {e.q.result === 'success' ? 'succeeded' : 'failed'} · {e.q.fails} fail{e.q.fails === 1 ? '' : 's'}
          </motion.li>
        ) : (
          <motion.li key={`p${e.p.quest}-${e.p.attempt}`} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="border-l border-smoke pl-3 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-bone">Q{e.p.quest + 1} · try {e.p.attempt} · <b className="text-cream">{names(e.p.leader)}</b></span>
              <span className={`font-display uppercase ${e.p.approved ? 'text-lime' : 'text-blood'}`}>{e.p.approved ? 'Approved' : 'Rejected'}</span>
            </div>
            <div className="text-dim">Team: {e.p.team.map(names).join(', ')}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(e.p.votes).map(([id, v]) => (
                <span key={id} className={`flex items-center gap-0.5 px-1 text-xs ${v ? 'bg-lime/15 text-lime' : 'bg-blood/15 text-[#ff8a9c]'}`}>
                  {v ? <Check size={11} /> : <Cross size={11} />}{names(id)}
                </span>
              ))}
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}

// ---------- my role peek ----------
function RolePeek({ secret, members, onClose }: { secret: PrivateView; members: Member[]; onClose: () => void }) {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <motion.div
      role="dialog"
      aria-label="Your secret role"
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-ink/90 p-5 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div className="flex w-full max-w-3xl flex-col items-center gap-6 md:flex-row" initial={{ y: 40 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()}>
        <button
          className="w-[min(64vw,280px)] shrink-0 touch-none select-none"
          aria-label="Press and hold to see your role"
          onPointerDown={() => { setHeld(true); play('paper'); }}
          onPointerUp={() => setHeld(false)}
          onPointerLeave={() => setHeld(false)}
          onKeyDown={(e) => e.key === ' ' && setHeld(true)}
          onKeyUp={() => setHeld(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Card role={secret.role} faceUp={held} tilt={false} />
        </button>
        <div className="w-full text-center md:text-left">
          <h2 className="font-display text-4xl uppercase">Your secret</h2>
          <p className="mt-1 text-bone">Press and hold the card. Release to hide it again.</p>
          <AnimatePresence>
            {held && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4">
                <p className="font-gothic text-4xl" style={{ color: ROLES[secret.role].banner }}>{ROLES[secret.role].name}</p>
                <p className="mt-2 text-cream">{ROLES[secret.role].power}</p>
                <div className="mt-3"><Knowledge secret={secret} members={members} /></div>
              </motion.div>
            )}
          </AnimatePresence>
          <button className="btn btn-ghost btn-sm mt-6" onClick={onClose}>Close</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------- board ----------
export function Board({ room, me, secret }: { room: RoomView; me: string; secret: PrivateView }) {
  const g = room.game!;
  const names = (id: string) => room.members.find((m) => m.id === id)?.name ?? '???';
  const [pick, setPick] = useState<string[]>([]);
  const [peek, setPeek] = useState(false);
  const [log, setLog] = useState(false);
  const [overlay, setOverlay] = useState<{ kind: 'vote'; p: Proposal } | { kind: 'quest'; q: Quest; i: number } | null>(null);
  const seen = useRef({ p: g.proposals.length, q: g.quests.filter((q) => q.result).length });

  // a new closed vote or finished quest triggers its reveal; the quest outranks the vote that preceded it
  useEffect(() => {
    const doneQ = g.quests.filter((q) => q.result).length;
    if (doneQ > seen.current.q) {
      const i = doneQ - 1;
      setOverlay({ kind: 'quest', q: g.quests[i], i });
    } else if (g.proposals.length > seen.current.p) {
      setOverlay({ kind: 'vote', p: g.proposals[g.proposals.length - 1] });
    }
    seen.current = { p: g.proposals.length, q: doneQ };
  }, [g.proposals.length, g.quests]);

  useEffect(() => setPick([]), [g.phase, g.leader]);

  const leaderPicking = g.phase === 'propose' && g.leader === me;
  const size = g.quests[g.quest].size;
  const toggle = (id: string) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < size ? [...p, id] : p));

  const seated = g.seats.map((id) => room.members.find((m) => m.id === id)!).filter(Boolean);
  const myIdx = g.seats.indexOf(me);
  const n = seated.length;
  const seatIndex = (id: string) => room.members.findIndex((m) => m.id === id);

  return (
    <main className="relative mx-auto flex min-h-[100dvh] max-w-[1500px] flex-col px-3 pb-6 pt-3 md:px-6">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="font-display text-2xl tracking-wide">AVALON</span>
          <span className="hidden font-display text-lg text-dim sm:inline">· {room.code}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setPeek(true)}><Eye size={18} /> My role</button>
          <button className="btn btn-ghost btn-sm lg:hidden" aria-expanded={log} onClick={() => setLog(!log)}><Scroll size={18} /> <span className="sr-only sm:not-sr-only">Chronicle</span></button>
          <RulesButton />
          <SoundToggle />
        </div>
      </header>

      <div className="mt-3 grid flex-1 gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-5">
          {/* table */}
          <LayoutGroup>
            <section aria-label="The round table" className={`relative ${g.seats.length > 8 ? 'lg:min-h-[740px]' : 'lg:min-h-[640px]'}`}>
              <div className="pointer-events-none absolute inset-[6%] hidden rounded-[50%] border-2 border-dashed border-plum-dk lg:block" aria-hidden />
              <div className="pointer-events-none absolute inset-[16%] hidden rounded-[50%] bg-[radial-gradient(closest-side,#221e27,transparent)] lg:block" aria-hidden />
              <div className="relative z-10 mx-auto mb-5 w-full max-w-[34rem] lg:pointer-events-none lg:absolute lg:left-1/2 lg:top-1/2 lg:mb-0 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:px-6">
                <p className="mb-2 hidden text-center font-jp text-sm text-plum lg:block" aria-hidden>円卓 · THE ROUND TABLE</p>
                <QuestTrack g={g} names={names} />
              </div>
              <ul className="grid grid-cols-3 justify-items-center gap-x-2 gap-y-4 sm:grid-cols-5 lg:block">
                {seated.map((m, i) => {
                  const angle = ((i - myIdx + n) % n) / n * Math.PI * 2 + Math.PI / 2; // me at the bottom
                  const style = { '--x': `${Math.cos(angle) * 43}%`, '--y': `${Math.sin(angle) * 41}%` } as React.CSSProperties;
                  return (
                    <li key={m.id} className="ring-seat flex w-full justify-center lg:w-auto" style={style}>
                      <Seat
                        m={m} index={seatIndex(m.id)} g={g} me={me} secret={secret}
                        selected={pick.includes(m.id)}
                        selectable={leaderPicking}
                        onPick={() => toggle(m.id)}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          </LayoutGroup>

          {/* action */}
          <div className="sticky bottom-0 z-20 -mx-3 border-t-2 border-plum bg-ink/95 px-3 py-4 backdrop-blur md:static md:mx-0 md:border-2 md:bg-soot md:p-6">
            <AnimatePresence mode="wait"><Dock g={g} me={me} secret={secret} names={names} pick={pick} clearPick={() => setPick([])} /></AnimatePresence>
          </div>
        </div>

        <aside className={`${log ? 'block' : 'hidden'} lg:block`} aria-label="Chronicle">
          <div className="lg:sticky lg:top-3 lg:max-h-[calc(100dvh-1.5rem)] lg:overflow-y-auto">
            <h2 className="mb-3 flex items-baseline gap-2 border-b-2 border-plum pb-1 font-display text-2xl uppercase">
              Chronicle <span className="font-jp text-sm text-dim">年代記</span>
            </h2>
            <Chronicle g={g} names={names} />
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {overlay?.kind === 'vote' && <VoteReveal key="v" p={overlay.p} members={room.members} onClose={() => setOverlay(null)} />}
        {overlay?.kind === 'quest' && <QuestReveal key="q" q={overlay.q} index={overlay.i} onClose={() => setOverlay(null)} />}
        {peek && <RolePeek key="peek" secret={secret} members={room.members} onClose={() => setPeek(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {g.phase === 'assassin' && !overlay && <Assassination key="a" g={g} me={me} secret={secret} members={room.members} />}
      </AnimatePresence>
    </main>
  );
}
