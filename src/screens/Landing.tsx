import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { useStore } from '../store.ts';
import { play } from '../sound.ts';
import { Ransom } from '../ui/Ransom.tsx';
import { Glyphs, SoundToggle, Barcode } from '../ui/bits.tsx';
import { GLYPHS } from '../ui/Icons.tsx';
import hero from '../art/hero.svg';
import halo from '../art/hero-halo.svg';

const ease = [0.16, 1, 0.3, 1] as const;

export function Landing() {
  const { name, setName, send } = useStore();
  const urlCode = location.pathname.match(/^\/r\/([A-Z]{5})$/i)?.[1]?.toUpperCase() ?? '';
  const [code, setCode] = useState(urlCode);
  const [busy, setBusy] = useState(false);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 20 });
  const sy = useSpring(py, { stiffness: 60, damping: 20 });
  const heroX = useTransform(sx, (v) => v * 18);
  const heroY = useTransform(sy, (v) => v * 12);
  const haloX = useTransform(sx, (v) => v * -26);
  const haloY = useTransform(sy, (v) => v * -18);
  const titleX = useTransform(sx, (v) => v * -8);

  const go = async (e: FormEvent, ev: 'room:create' | 'room:join') => {
    e.preventDefault();
    if (busy) return;
    play('paper');
    setBusy(true);
    await send(ev, { name, code });
    setBusy(false);
  };

  return (
    <main
      className="relative min-h-[100dvh] overflow-hidden"
      onPointerMove={(e) => { px.set(e.clientX / innerWidth - 0.5); py.set(e.clientY / innerHeight - 0.5); }}
    >
      <Glyphs count={12} />
      <div className="pointer-events-none absolute -right-6 top-10 select-none font-jp text-[clamp(5rem,14vw,13rem)] leading-none text-plum-dk/70 [writing-mode:vertical-rl]" aria-hidden>
        円卓の裏切り
      </div>

      <header className="relative z-20 flex items-center justify-between px-5 pt-4 md:px-10">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#efe4c8" strokeWidth="1.4" aria-hidden><circle cx="12" cy="12" r="10.5" /><path d={GLYPHS[5]} /></svg>
          <span className="label hidden sm:inline">Round Table Records · Side A</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="label hidden md:inline">(Tintagel, Cornwall)</span>
          <SoundToggle />
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-[1400px] grid-cols-1 gap-y-8 px-5 pb-28 pt-4 md:px-10 lg:grid-cols-[1.15fr_.85fr] lg:pt-2">
        {/* poster */}
        <div className="relative lg:col-span-2 lg:row-start-1">
          <motion.div style={{ x: haloX, y: haloY }} className="pointer-events-none absolute right-[-12%] top-[-4%] w-[min(90vw,560px)] lg:right-[4%] lg:top-[-6%]" aria-hidden>
            <motion.img src={halo} alt="" className="w-full" animate={{ rotate: 360 }} transition={{ duration: 120, ease: 'linear', repeat: Infinity }} />
          </motion.div>
          <motion.img
            src={hero}
            alt="The Hollow King: a crowned, shadow-faced king holding a sword point-down"
            style={{ x: heroX, y: heroY }}
            className="printed pointer-events-none absolute right-[-18%] top-[-2%] z-0 w-[min(78vw,520px)] drop-shadow-[0_30px_40px_rgb(0_0_0/.7)] lg:right-[6%] lg:top-[-4%]"
            initial={{ opacity: 0, y: 60, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.4, ease, delay: 0.3 }}
          />

          <motion.h1 style={{ x: titleX }} className="relative z-10 pt-[38vw] [text-shadow:0_6px_24px_rgb(0_0_0/.6)] sm:pt-[30vw] lg:pt-[5.5rem]">
            <span className="sr-only">Avalon</span>
            <span aria-hidden className="flex font-display text-[clamp(6.5rem,24vw,22rem)] leading-[.8] text-cream">
              {'AVALON'.split('').map((ch, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  style={{ marginLeft: i ? '-0.02em' : 0, color: i === 3 ? '#e2264a' : undefined }}
                  initial={{ y: '60%', opacity: 0, rotate: i % 2 ? 8 : -8 }}
                  animate={{ y: i === 2 ? '-6%' : i === 4 ? '5%' : '0%', opacity: 1, rotate: i === 2 ? -4 : i === 5 ? 3 : 0 }}
                  transition={{ duration: 0.9, ease, delay: 0.1 + i * 0.07 }}
                >
                  {ch}
                </motion.span>
              ))}
            </span>
            <motion.span
              aria-hidden
              className="absolute left-[4%] top-[58%] z-20 whitespace-nowrap font-jp text-[clamp(2.2rem,8vw,7rem)] text-blood lg:top-[48%]"
              style={{ textShadow: '0 0 1px #000' }}
              initial={{ clipPath: 'inset(0 100% 0 0)', rotate: -4 }}
              animate={{ clipPath: 'inset(0 0% 0 0)', rotate: -4 }}
              transition={{ duration: 1.1, ease, delay: 0.9 }}
            >
              王国は滅びる
            </motion.span>
          </motion.h1>

          <div className="relative z-20 mt-6 flex flex-wrap items-end gap-x-6 gap-y-3">
            <Ransom text="LOYALTY IS A LIE." size="clamp(1.6rem,4.4vw,3.2rem)" seed={4} delay={1.1} />
          </div>
        </div>

        {/* copy */}
        <motion.div
          className="relative z-20 max-w-xl self-start lg:row-start-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 1.5 }}
        >
          <h2 className="font-display text-[clamp(2.2rem,5vw,3.6rem)] text-lime">The kingdom is falling.</h2>
          <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-bone">
            Some serve the king. Some serve the darkness. Nobody knows who to trust.
            Five to ten players, five quests, and one Assassin waiting for the seer to slip.
          </p>
          <div className="mt-6 flex items-center gap-4 text-dim">
            <Barcode className="h-7 w-20 text-cream" />
            <span className="label">5–10 players · 30 min · voice chat recommended</span>
          </div>
        </motion.div>

        {/* entry slip */}
        <motion.div
          className="relative z-30 w-full max-w-md justify-self-start lg:row-start-2 lg:justify-self-end"
          initial={{ opacity: 0, rotate: 6, y: 50 }}
          animate={{ opacity: 1, rotate: -1.5, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 1.3 }}
        >
          <div className="tape -top-3 left-8 rotate-[-6deg]" />
          <div className="tape -top-2 right-10 rotate-[8deg]" />
          <div className="paper torn-a p-6 pt-8 shadow-2xl sm:p-8">
            <label className="block">
              <span className="font-display text-xl uppercase text-ink">Your name at the table</span>
              <input
                className="field mt-2"
                value={name}
                maxLength={16}
                placeholder="e.g. Gawain"
                autoComplete="nickname"
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <form onSubmit={(e) => go(e, 'room:create')} className="mt-4">
              <button className="btn w-full" disabled={!name.trim() || busy}>Create a room</button>
            </form>
            <div className="my-5 flex items-center gap-3 text-[#5c5244]">
              <span className="h-px flex-1 bg-current" />
              <span className="font-jp text-sm">または</span>
              <span className="h-px flex-1 bg-current" />
            </div>
            <form onSubmit={(e) => go(e, 'room:join')} className="flex gap-2">
              <label className="sr-only" htmlFor="code">Room code</label>
              <input
                id="code"
                className="field min-w-0 flex-1 font-display !text-2xl uppercase tracking-[.25em]"
                value={code}
                maxLength={5}
                placeholder="CODE"
                autoCapitalize="characters"
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              />
              <button className="btn btn-blood shrink-0" disabled={!name.trim() || code.length !== 5 || busy}>Join</button>
            </form>
            {urlCode && <p className="mt-3 text-sm font-semibold text-[#5c5244]">You were summoned to room {urlCode}. Choose a name and join.</p>}
          </div>
        </motion.div>
      </section>

      <div className="absolute bottom-0 left-0 right-0 z-20 overflow-hidden bg-lime py-2 text-ink" aria-hidden>
        <div className="marquee">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center">
              {['Trust no one', '裏切り者', 'Five quests', '忠誠は嘘', 'One assassin', '暗殺者', 'Merlin is watching', '円卓'].map((t, i) => (
                <span key={i} className={`flex items-center gap-5 px-5 ${i % 2 ? 'font-jp text-lg' : 'font-display text-xl uppercase'}`}>
                  {t}
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d={GLYPHS[3]} /></svg>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-14 right-5 z-20 hidden border-2 border-cream px-2 py-1 text-center leading-none md:block" aria-hidden>
        <div className="font-display text-sm text-cream">OCCULT</div>
        <div className="bg-cream px-1 font-display text-lg text-ink">ADVISORY</div>
        <div className="font-sans text-[.55rem] font-bold tracking-widest text-cream">EXPLICIT BETRAYAL</div>
      </div>
    </main>
  );
}
