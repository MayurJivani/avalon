import { motion } from 'motion/react';

const FONTS = ['var(--font-display)', 'var(--font-slab)', 'var(--font-mono-ransom)', 'var(--font-gothic)', 'var(--font-type)', 'var(--font-jp)'];
const PAPERS: [string, string][] = [
  ['#efe4c8', '#0b0a0d'], ['#0b0a0d', '#efe4c8'], ['#e2264a', '#fff4ea'], ['#b6e33a', '#0b0a0d'],
  ['#4d86ff', '#0b0a0d'], ['#d9b53a', '#0b0a0d'], ['#5d4a6e', '#efe4c8'], ['#f1ede4', '#b3122e'], ['#2a6b5a', '#efe4c8'],
];
const TORN = ['torn-a', 'torn-b', 'torn-c', ''];

// deterministic per-letter pick, so a title never reshuffles between renders
const pick = (seed: number, n: number) => Math.abs(Math.floor(Math.sin(seed * 12.9898) * 43758.5453)) % n;

interface Props {
  text: string;
  className?: string;
  seed?: number;
  size?: string; // CSS font-size of the base letter
  animate?: boolean;
  delay?: number;
}

/** Cut-out magazine letters. Spaces become gaps; the accessible name is the plain text. */
export function Ransom({ text, className = '', seed = 1, size = '2rem', animate = true, delay = 0 }: Props) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-[.08em] gap-y-[.15em] ${className}`} style={{ fontSize: size }} aria-label={text} role="text">
      {text.split(' ').map((word, w, words) => (
        // each word stays on one line; only the gaps between words may wrap
        <span key={w} className="inline-flex items-center gap-x-[.08em]" style={{ marginRight: w < words.length - 1 ? '.35em' : 0 }}>
          {[...word].map((ch, j) => {
        const i = words.slice(0, w).join(' ').length + (w ? 1 : 0) + j;
        const s = seed * 31 + i * 7 + ch.charCodeAt(0);
        const [bg, fg] = PAPERS[pick(s, PAPERS.length)];
        const rot = (pick(s + 3, 13) - 6) * 1.1;
        const scale = 0.86 + pick(s + 5, 5) * 0.06;
        return (
          <motion.span
            key={i}
            aria-hidden
            className={`relative inline-block px-[.12em] pt-[.08em] pb-[.02em] leading-none uppercase ${TORN[pick(s + 9, TORN.length)]}`}
            style={{ background: bg, color: fg, fontFamily: FONTS[pick(s + 1, FONTS.length)], fontSize: `${scale}em`, boxShadow: '0 2px 4px rgb(0 0 0 / .45)' }}
            initial={animate ? { opacity: 0, y: -18, rotate: rot * 3, scale: 1.4 } : false}
            animate={{ opacity: 1, y: 0, rotate: rot, scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18, delay: delay + i * 0.045 }}
          >
            {ch}
          </motion.span>
        );
          })}
        </span>
      ))}
    </span>
  );
}
