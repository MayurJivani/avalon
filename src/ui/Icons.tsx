// One authored icon family: 24px grid, 2px ink strokes, slightly crooked like hand-cut stencils.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 22, p: P) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p,
});

export const Crown = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M3.5 18.5 2.8 7.2l5 4.4L12 4l4.3 7.6 4.9-4.3-.8 11.2z" /><path d="M4 21h16" /></svg>
);
export const Eye = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M1.8 12.3C4.4 7.6 8 5.6 12 5.6s7.7 2.1 10.2 6.6c-2.6 4.5-6.2 6.4-10.2 6.4s-7.6-1.9-10.2-6.3z" /><circle cx="12" cy="12.1" r="3.1" fill="currentColor" /></svg>
);
export const Sword = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M14.4 3.2 20.8 3l-.3 6.4-9.8 9.6-3.3-3.3z" /><path d="m5 13.6 5.3 5.4M6.6 17.4l-3.3 3.3" /></svg>
);
export const Check = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M3.5 12.8 9 18.2 20.7 5.4" /></svg>
);
export const Cross = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M5 4.6 19.3 19.2M19 4.8 4.8 19" /></svg>
);
export const Copy = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M8.2 8.1h11.6v12.1H8.3z" /><path d="M15.8 8V3.8H4.1v12.3h4" /></svg>
);
export const SoundOn = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M3 9.2h4l5.6-4.6v14.8L7 14.8H3z" /><path d="M16 8.4c1.6 2.1 1.6 5 0 7.2M18.8 5.6c3.2 3.7 3.2 9.1 0 12.8" /></svg>
);
export const SoundOff = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M3 9.2h4l5.6-4.6v14.8L7 14.8H3z" /><path d="m16.2 9.2 5.4 5.6M21.6 9.2l-5.4 5.6" /></svg>
);
export const Skull = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 2.8c-4.8 0-8.2 3.2-8.2 7.6 0 2.6 1.2 4.4 3.1 5.6v3.3h10.3V16c1.9-1.2 3.1-3 3.1-5.6 0-4.4-3.5-7.6-8.3-7.6z" /><circle cx="8.6" cy="11" r="1.8" fill="currentColor" /><circle cx="15.4" cy="11" r="1.8" fill="currentColor" /><path d="M10 19.3v2M14 19.3v2" /></svg>
);
export const Seal = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 2.6 14.2 5l3.2-.5.6 3.2 2.8 1.7-1.3 3 1.3 3-2.8 1.6-.6 3.2-3.2-.5L12 21.4l-2.2-2.4-3.2.5-.6-3.2-2.8-1.6 1.3-3-1.3-3L6 7.7l.6-3.2 3.2.5z" /><circle cx="12" cy="12" r="3.6" /></svg>
);
export const Door = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M4 21V3.2h10.4V21M14.4 4.8 20 6.6v14.4M2 21h20" /><circle cx="11.6" cy="12.4" r=".9" fill="currentColor" /></svg>
);
export const Scroll = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M6 4h12.6v13.8a3 3 0 0 1-3 3H5.4a2.6 2.6 0 0 1-2.6-2.6v-1.4h12.4v1.2a2.8 2.8 0 0 0 5.6 0" /><path d="M9 8.4h6.4M9 12h6.4" /></svg>
);
export const Wifi = ({ size, ...p }: P) => (
  <svg {...base(size, p)}><path d="M2.2 9a15 15 0 0 1 19.6 0M5.4 12.5a10 10 0 0 1 13.2 0M8.7 16a5 5 0 0 1 6.6 0" /><circle cx="12" cy="19.4" r="1.1" fill="currentColor" /></svg>
);

/** Decorative occult glyphs for floating backgrounds. */
export const GLYPHS = [
  'M12 2v20M2 12h20M5 5l14 14M19 5 5 19',
  'M12 3 21 19H3zM12 9v6M12 17.5v.5',
  'M4 12a8 8 0 1 0 16 0 8 8 0 1 0-16 0M12 4v16M8 8h8',
  'M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10z',
  'M6 4c8 0 12 4 12 8s-4 8-12 8c4-2 6-5 6-8s-2-6-6-8z',
  'M12 4 19 8v8l-7 4-7-4V8zM12 4v16M5 8l14 8M19 8 5 16',
];
