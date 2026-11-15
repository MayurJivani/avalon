import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import type { ReactNode } from 'react';
import type { Role } from '../../shared/rules.ts';
import { ROLES } from '../roles.ts';

/** Black art-nouveau frame drawn over the plum card stock. One corner, mirrored four times. */
function Ornament() {
  const corner = (
    <g fill="none" stroke="#0b0a0d" strokeLinecap="round">
      <path d="M22 140C22 70 40 30 70 22c26-7 44 8 40 28-3 16-22 20-30 9-6-8 0-18 8-17" strokeWidth="10" />
      <path d="M22 210c-6-36 4-64 22-74M150 22c-34-6-60 4-70 22" strokeWidth="7" />
      <path d="M36 92c10-20 28-30 44-26" strokeWidth="4" />
      <circle cx="86" cy="58" r="6" fill="#0b0a0d" stroke="none" />
    </g>
  );
  return (
    <svg viewBox="0 0 500 700" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <rect x="16" y="16" width="468" height="668" rx="22" fill="none" stroke="#0b0a0d" strokeWidth="6" />
      {corner}
      <g transform="translate(500 0) scale(-1 1)">{corner}</g>
      <g transform="translate(0 700) scale(1 -1)">{corner}</g>
      <g transform="translate(500 700) scale(-1 -1)">{corner}</g>
      <path d="M16 330c14 6 14 34 0 40M484 330c-14 6-14 34 0 40" fill="none" stroke="#0b0a0d" strokeWidth="8" />
    </svg>
  );
}

const Ribbon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
    <path d="M30 14C120 4 280 4 370 14l-10 26 10 26C280 76 120 76 30 66l10-26z" fill={color} stroke="#0b0a0d" strokeWidth="5" strokeLinejoin="round" />
    <path d="M30 14 4 22l14 18-14 18 26 8M370 14l26 8-14 18 14 18-26 8" fill={color} stroke="#0b0a0d" strokeWidth="5" strokeLinejoin="round" />
  </svg>
);

const Plate = ({ color }: { color: string }) => (
  <svg viewBox="0 0 400 140" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
    <path d="M14 18Q60 2 110 14t90 0 90 0 96 4l-6 52 6 52q-50 14-100 4t-90 0-90 0-92-4l4-52z" fill={color} stroke="#0b0a0d" strokeWidth="6" strokeLinejoin="round" />
  </svg>
);

export function CardFront({ role, children }: { role: Role; children?: ReactNode }) {
  const r = ROLES[role];
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[5%] bg-plum [container-type:inline-size]" style={{ backfaceVisibility: 'hidden' }}>
      <div className="absolute inset-0 opacity-40 mix-blend-multiply" style={{ backgroundImage: 'var(--grain)' }} />
      <div className="printed halftone absolute left-[11%] right-[11%] top-[13%] bottom-[27%] overflow-hidden border-[3px] border-ink bg-ink">
        <img src={r.art} alt={`${r.name}, ${r.title}`} className="h-full w-full object-cover" draggable={false} />
      </div>
      <Ornament />
      <div className="absolute left-[12%] right-[12%] top-[4.5%] h-[11%]">
        <Ribbon color={r.banner} />
        <div className="relative flex h-full items-center justify-center whitespace-nowrap font-gothic text-ink" style={{ fontSize: r.name.length > 10 ? '7.4cqw' : '10cqw' }}>
          {r.name}
        </div>
      </div>
      <div className="absolute left-[7%] right-[7%] bottom-[6%] h-[21%]">
        <Plate color={r.banner} />
        <p className="relative flex h-full items-center justify-center px-[10%] text-center font-type leading-[1.15] text-ink" style={{ fontSize: '5.6cqw' }}>
          {r.line}
        </p>
      </div>
      <div className="absolute right-[3.2%] top-[22%] font-jp text-cream [writing-mode:vertical-rl]" style={{ fontSize: '4.2cqw', textShadow: '0 1px 0 #0b0a0d' }} aria-hidden>
        {r.jp}
      </div>
      {children}
    </div>
  );
}

export function CardBack() {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-[5%] bg-plum-dk [container-type:inline-size]"
      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
    >
      <div
        className="absolute inset-[7%] opacity-60"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #0b0a0d 0 2px, transparent 2px 14px), repeating-linear-gradient(-45deg, #0b0a0d 0 2px, transparent 2px 14px)' }}
      />
      <Ornament />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3cqw]">
        <svg viewBox="0 0 120 120" className="w-[44%]" aria-hidden>
          <circle cx="60" cy="60" r="54" fill="#0b0a0d" stroke="#b6e33a" strokeWidth="2" strokeDasharray="3 5" />
          <path d="M14 60c14-22 30-32 46-32s32 10 46 32c-14 22-30 32-46 32S28 82 14 60z" fill="#efe4c8" stroke="#0b0a0d" strokeWidth="4" />
          <circle cx="60" cy="60" r="17" fill="#e2264a" />
          <circle cx="60" cy="60" r="7" fill="#0b0a0d" />
          <path d="M60 2v16M60 102v16M2 60h12M106 60h12" stroke="#b6e33a" strokeWidth="3" />
        </svg>
        <div className="font-display text-cream" style={{ fontSize: '13cqw', letterSpacing: '.02em' }}>AVALON</div>
        <div className="font-jp text-blood" style={{ fontSize: '5cqw' }}>アヴァロン</div>
      </div>
    </div>
  );
}

interface CardProps {
  role: Role | null;
  faceUp?: boolean;
  className?: string;
  tilt?: boolean;
  float?: boolean;
  children?: ReactNode;
}

/** A collectible card. Flips in 3D; tilts toward the pointer; never renders a face it was not given. */
export function Card({ role, faceUp = true, className = '', tilt = true, float = false, children }: CardProps) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [9, -9]), { stiffness: 200, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-11, 11]), { stiffness: 200, damping: 18 });
  const shine = useTransform([mx, my] as never, ([x, y]: number[]) =>
    `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgb(255 255 255 / .22), transparent 45%)`);

  return (
    <motion.div
      className={`relative aspect-[5/7] [perspective:1200px] ${className}`}
      animate={float ? { y: [0, -8, 0] } : undefined}
      transition={float ? { duration: 5, repeat: Infinity, ease: 'easeInOut' } : undefined}
      onPointerMove={tilt ? (e) => {
        const b = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - b.left) / b.width);
        my.set((e.clientY - b.top) / b.height);
      } : undefined}
      onPointerLeave={() => { mx.set(0.5); my.set(0.5); }}
    >
      <motion.div className="absolute inset-0" style={{ rotateX: tilt ? rx : 0, rotateY: tilt ? ry : 0, transformStyle: 'preserve-3d' }}>
        <motion.div
          className="absolute inset-0 rounded-[5%] shadow-[0_18px_40px_-12px_rgb(0_0_0/.85)]"
          style={{ transformStyle: 'preserve-3d' }}
          initial={false}
          animate={{ rotateY: faceUp ? 0 : 180 }}
          transition={{ type: 'spring', stiffness: 90, damping: 14 }}
        >
          {role && <CardFront role={role}>{children}</CardFront>}
          <CardBack />
          {tilt && <motion.div className="pointer-events-none absolute inset-0 rounded-[5%] mix-blend-soft-light" style={{ background: shine }} />}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
