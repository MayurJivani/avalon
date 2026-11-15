import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useStore } from '../store.ts';
import { setSound, soundOn, play } from '../sound.ts';
import { SoundOff, SoundOn, GLYPHS, Cross } from './Icons.tsx';

const SEAT_COLORS = ['#b6e33a', '#e2264a', '#4d86ff', '#d9b53a', '#cf86d6', '#ec8a4c', '#8fd3c4', '#efe4c8', '#9f7aea', '#f0606f'];
export const seatColor = (i: number) => SEAT_COLORS[i % SEAT_COLORS.length];

/** Anonymous hooded figure: every player looks the same shape, so nothing leaks through art. */
export function Hood({ color, initial, size, dim }: { color: string; initial: string; size?: number; dim?: boolean }) {
  return (
    <svg viewBox="0 0 64 72" width={size ?? '100%'} height={size ? size * 1.125 : undefined} className="block" aria-hidden style={{ opacity: dim ? 0.35 : 1 }}>
      <rect width="64" height="72" fill="#151318" />
      <circle cx="32" cy="30" r="22" fill={color} opacity=".18" />
      <path d="M6 72c0-16 8-26 14-30-3-6-4-12-2-19C21 10 27 6 32 6s11 4 14 17c2 7 1 13-2 19 6 4 14 14 14 30z" fill={color} stroke="#0b0a0d" strokeWidth="3" strokeLinejoin="round" />
      <path d="M20 36c0-11 5-18 12-18s12 7 12 18c-3 5-7 7-12 7s-9-2-12-7z" fill="#0b0a0d" />
      <circle cx="27.5" cy="32" r="1.6" fill={color} />
      <circle cx="36.5" cy="32" r="1.6" fill={color} />
      <text x="32" y="64" textAnchor="middle" fontFamily="Anton" fontSize="14" fill="#0b0a0d">{initial}</text>
    </svg>
  );
}

export function SoundToggle() {
  const [on, setOn] = useState(soundOn);
  return (
    <button
      className="grid h-11 w-11 place-items-center text-cream transition-colors hover:text-lime"
      aria-label={on ? 'Turn sound off' : 'Turn sound on'}
      aria-pressed={on}
      onClick={() => { setSound(!on); setOn(!on); if (!on) play('click'); }}
    >
      {on ? <SoundOn /> : <SoundOff />}
    </button>
  );
}

/** Slow drifting occult glyphs. Purely decorative. */
export function Glyphs({ count = 10, color = '#5d4a6e' }: { count?: number; color?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const x = (i * 37 + 11) % 100;
        const y = (i * 53 + 7) % 100;
        const s = 18 + ((i * 13) % 34);
        return (
          <motion.svg
            key={i}
            viewBox="0 0 24 24"
            width={s}
            height={s}
            className="absolute"
            style={{ left: `${x}%`, top: `${y}%` }}
            fill="none"
            stroke={color}
            strokeWidth="1.4"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0.25, 0.7], y: [0, -24, 0], rotate: [0, i % 2 ? 40 : -40, 0] }}
            transition={{ duration: 14 + (i % 5) * 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
          >
            <path d={GLYPHS[i % GLYPHS.length]} />
          </motion.svg>
        );
      })}
    </div>
  );
}

/** Server rejections land here as a torn red slip. */
export function ErrorSlip() {
  const { error, clearError } = useStore();
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          role="alert"
          className="torn-b fixed bottom-6 left-1/2 z-[90] flex w-[min(92vw,30rem)] items-center gap-3 bg-blood px-5 py-4 text-[#fff4ea] shadow-xl"
          initial={{ opacity: 0, y: 40, x: '-50%', rotate: -3 }}
          animate={{ opacity: 1, y: 0, x: '-50%', rotate: -1 }}
          exit={{ opacity: 0, y: 30, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 400, damping: 26 }}
          onAnimationComplete={() => setTimeout(clearError, 4200)}
        >
          <span className="flex-1 font-semibold">{error}</span>
          <button className="grid h-9 w-9 place-items-center" onClick={clearError} aria-label="Dismiss"><Cross size={18} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Barcode({ className = '' }: { className?: string }) {
  const bars = [3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1];
  let x = 0;
  return (
    <svg viewBox="0 0 70 26" className={className} aria-hidden>
      {bars.map((w, i) => { const r = i % 2 ? null : <rect key={i} x={x} width={w} height="26" fill="currentColor" />; x += w + 0.5; return r; })}
    </svg>
  );
}

export function Spinner({ label = 'Summoning…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-dim" role="status">
      <motion.svg viewBox="0 0 48 48" width="56" height="56" animate={{ rotate: 360 }} transition={{ duration: 6, ease: 'linear', repeat: Infinity }} aria-hidden>
        <circle cx="24" cy="24" r="20" fill="none" stroke="#5d4a6e" strokeWidth="2" strokeDasharray="4 6" />
        <path d={GLYPHS[1]} transform="translate(12 12)" fill="none" stroke="#b6e33a" strokeWidth="1.6" />
      </motion.svg>
      <span className="label">{label}</span>
    </div>
  );
}
