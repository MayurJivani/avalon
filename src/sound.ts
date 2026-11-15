// All sound is synthesised with WebAudio: no assets, and nothing plays until the player turns sound on.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let drone: { stop: () => void } | null = null;
export let soundOn = localStorage.getItem('avalon:sound') === '1';

function ac() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, { type = 'sine' as OscillatorType, vol = 0.2, at = 0, slide = 0 } = {}) {
  const c = ac();
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, { freq = 2000, q = 1, vol = 0.15, at = 0 } = {}) {
  const c = ac();
  const t = c.currentTime + at;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master!);
  src.start(t);
}

const fx = {
  click: () => { tone(1800, 0.04, { type: 'square', vol: 0.05 }); noise(0.03, { freq: 4000, vol: 0.08 }); },
  paper: () => noise(0.25, { freq: 2600, q: 0.6, vol: 0.22 }),
  impact: () => { tone(90, 0.9, { vol: 0.5, slide: 0.4 }); noise(0.5, { freq: 180, vol: 0.4 }); },
  approve: () => [392, 494, 587].forEach((f, i) => tone(f, 0.6, { type: 'triangle', vol: 0.12, at: i * 0.07 })),
  reject: () => { tone(146, 0.5, { type: 'sawtooth', vol: 0.1 }); tone(155, 0.5, { type: 'sawtooth', vol: 0.1 }); },
  success: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 1.1, { type: 'triangle', vol: 0.12, at: i * 0.09 })),
  fail: () => { [110, 116.5, 164].forEach((f) => tone(f, 1.4, { type: 'sawtooth', vol: 0.09, slide: 0.8 })); noise(0.6, { freq: 300, vol: 0.3 }); },
  assassin: () => { tone(55, 2.5, { vol: 0.5, slide: 0.5 }); tone(1320, 1.2, { type: 'sawtooth', vol: 0.05, slide: 0.25, at: 0.05 }); noise(1.2, { freq: 900, q: 4, vol: 0.25 }); },
  tick: () => tone(880, 0.08, { type: 'square', vol: 0.06 }),
};
export type Fx = keyof typeof fx;

export function play(name: Fx) {
  if (soundOn) try { fx[name](); } catch { /* audio unavailable */ }
}

function startDrone() {
  const c = ac();
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.06, c.currentTime + 4);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain).connect(lp.frequency);
  const oscs = [55, 82.4, 110.6, 164.2].map((f, i) => {
    const o = c.createOscillator();
    o.type = i % 2 ? 'sawtooth' : 'triangle';
    o.frequency.value = f;
    o.detune.value = (i - 1.5) * 7;
    o.connect(lp);
    o.start();
    return o;
  });
  lp.connect(g).connect(master!);
  lfo.start();
  return {
    stop() {
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1);
      [...oscs, lfo].forEach((o) => o.stop(c.currentTime + 1.1));
    },
  };
}

export function setSound(on: boolean) {
  soundOn = on;
  localStorage.setItem('avalon:sound', on ? '1' : '0');
  if (on && !drone) drone = startDrone();
  if (!on && drone) { drone.stop(); drone = null; }
}

/** Browsers block audio until a gesture; resume the drone on the first one. */
export function armSound() {
  const go = () => { if (soundOn && !drone) drone = startDrone(); };
  window.addEventListener('pointerdown', go, { once: true });
}
