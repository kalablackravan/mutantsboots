// All file sounds are synthesised with Web Audio: nothing to host, nothing that can fail to load.
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// white noise shaped by an envelope, with random "flutter" steps (paper / cardboard texture)
type Range = [number, number];
function noise(c: AudioContext, seconds: number, shape: (t: number) => number, flutter: Range = [0.55, 1.45], stepMs: Range = [12, 42]) {
  const [f0, f1] = flutter, [s0, s1] = stepMs;
  const n = Math.max(1, Math.floor(c.sampleRate * seconds));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  let f = 1, next = 0;
  for (let i = 0; i < n; i++) {
    if (i >= next) {
      f = f0 + Math.random() * (f1 - f0);
      next = i + Math.floor(c.sampleRate * (s0 + Math.random() * (s1 - s0)) / 1000);
    }
    d[i] = (Math.random() * 2 - 1) * shape(i / n) * f;
  }
  return buf;
}

type Filter = { type: BiquadFilterType; f: number; q?: number; to?: [number, number][] };
function burst(c: AudioContext, out: AudioNode, at: number, seconds: number, shape: (t: number) => number, filters: Filter[], gain: number,
  flutter?: Range, stepMs?: Range) {
  const src = c.createBufferSource();
  src.buffer = noise(c, seconds, shape, flutter, stepMs);
  let node: AudioNode = src;
  for (const fl of filters) {
    const bq = c.createBiquadFilter(); bq.type = fl.type; bq.Q.value = fl.q ?? 0.8;
    bq.frequency.setValueAtTime(fl.f, at);
    for (const [hz, dt] of fl.to ?? []) bq.frequency.exponentialRampToValueAtTime(hz, at + dt);
    node.connect(bq); node = bq;
  }
  const g = c.createGain(); g.gain.value = gain; node.connect(g); g.connect(out);
  src.start(at);
}

// a low body "thump": sine that drops in pitch and dies fast
function thump(c: AudioContext, out: AudioNode, at: number, f0: number, f1: number, dur: number, gain: number) {
  const o = c.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain, at + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g); g.connect(out); o.start(at); o.stop(at + dur + 0.02);
}

function master(volume: number) {
  const c = audio(); if (!c) return null;
  const out = c.createGain(); out.gain.value = volume; out.connect(c.destination);
  return { c, out, t: c.currentTime + 0.01 };
}

/** a thin paper page turning over (forward or back) */
export function playPageTurn() {
  try {
    const m = master(0.55); if (!m) return; const { c, out, t } = m;
    burst(c, out, t, 0.62, (x) => (x < 0.12 ? x / 0.12 : Math.pow(1 - (x - 0.12) / 0.88, 1.6)) * (0.6 + 0.4 * Math.sin(Math.PI * x)),
      [{ type: "highpass", f: 500 }, { type: "bandpass", f: 1200, q: 0.9, to: [[4200, 0.25], [1800, 0.62]] }], 1);
    burst(c, out, t + 0.82, 0.09, (x) => Math.pow(1 - x, 3), [{ type: "lowpass", f: 1400 }], 0.9);
  } catch { /* sound is optional */ }
}

/** the stiff cardboard cover swinging over: lower, heavier swoosh and a firmer landing */
export function playCoverFlip() {
  try {
    const m = master(0.6); if (!m) return; const { c, out, t } = m;
    burst(c, out, t, 0.78, (x) => (x < 0.15 ? x / 0.15 : Math.pow(1 - (x - 0.15) / 0.85, 1.3)) * (0.7 + 0.3 * Math.sin(Math.PI * x)),
      [{ type: "highpass", f: 220 }, { type: "bandpass", f: 520, q: 0.8, to: [[1800, 0.3], [800, 0.78]] }], 1.1, [0.7, 1.3], [20, 60]);
    burst(c, out, t + 0.84, 0.12, (x) => Math.pow(1 - x, 2.5), [{ type: "lowpass", f: 900 }], 1.1);
    thump(c, out, t + 0.84, 130, 70, 0.14, 0.55);
  } catch { /* sound is optional */ }
}

/** the file arriving: a soft, warm slide and a gentle felt-like settle on the desk (no scratchy friction) */
export function playFileArrive() {
  try {
    const m = master(0.85); if (!m) return; const { c, out, t } = m;
    const bell = (x: number) => Math.pow(Math.sin(Math.PI * Math.min(1, x)), 2);
    burst(c, out, t, 0.5, bell, [{ type: "lowpass", f: 520, q: 0.5, to: [[1400, 0.22], [620, 0.5]] }], 0.9, [1, 1]);
    thump(c, out, t + 0.46, 160, 100, 0.18, 0.32);
    burst(c, out, t + 0.46, 0.05, (x) => Math.pow(1 - x, 2), [{ type: "lowpass", f: 700 }], 0.25, [1, 1]);
    burst(c, out, t + 0.5, 0.22, bell, [{ type: "bandpass", f: 1800, q: 0.7 }], 0.06, [1, 1]);
  } catch { /* sound is optional */ }
}

/** the file hitting the floor: heavy thud, cardboard slap, a small bounce, then paper settling */
export function playFloorDrop(delay = 0.47) {
  try {
    const m = master(0.75); if (!m) return; const { c, out } = m; const t = m.t + delay;
    thump(c, out, t, 95, 48, 0.24, 1.0);
    burst(c, out, t, 0.07, (x) => Math.pow(1 - x, 2), [{ type: "lowpass", f: 450 }], 1.2);
    burst(c, out, t, 0.045, (x) => Math.pow(1 - x, 2), [{ type: "bandpass", f: 1300, q: 1 }], 0.7);
    thump(c, out, t + 0.13, 115, 70, 0.1, 0.35);
    burst(c, out, t + 0.13, 0.04, (x) => Math.pow(1 - x, 2), [{ type: "lowpass", f: 700 }], 0.4);
    burst(c, out, t + 0.16, 0.22, (x) => Math.pow(1 - x, 2) * Math.sin(Math.PI * Math.min(1, x * 3)),
      [{ type: "bandpass", f: 2600, q: 0.9 }], 0.25);
  } catch { /* sound is optional */ }
}

/** Creates and unlocks the shared audio context during a visitor gesture. */
export function primeSceneAudio() {
  try { audio(); } catch { /* sound is optional */ }
}

/** A wet pneumatic release, steel latch, and heavy laboratory gate movement. */
export function playGateOpen() {
  try {
    const m = master(0.72); if (!m) return; const { c, out, t } = m;
    thump(c, out, t, 105, 48, 0.28, 0.8);
    burst(c, out, t + 0.04, 0.32, (x) => Math.pow(1 - x, 1.6),
      [{ type: "highpass", f: 180 }, { type: "bandpass", f: 920, q: 1.4, to: [[340, 0.32]] }], 0.72, [0.8, 1.2], [8, 20]);
    burst(c, out, t + 0.2, 0.95, (x) => Math.sin(Math.PI * x) * Math.pow(1 - x, 0.45),
      [{ type: "lowpass", f: 780, q: 0.65, to: [[260, 0.95]] }], 0.5, [0.72, 1.28], [18, 55]);
    thump(c, out, t + 0.92, 82, 42, 0.22, 0.7);
  } catch { /* sound is optional */ }
}

/** Starts a quiet submerged bubbling loop and returns its stop function. */
export function startSubmergedBubbleLoop(): () => void {
  try {
    const c = audio();
    if (!c) return () => undefined;
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, c.currentTime);
    out.gain.exponentialRampToValueAtTime(0.18, c.currentTime + 0.12);
    out.connect(c.destination);

    const bed = c.createBufferSource();
    bed.buffer = noise(c, 1.4, () => 0.24, [0.8, 1.15], [38, 90]);
    bed.loop = true;
    const lowpass = c.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 420;
    bed.connect(lowpass); lowpass.connect(out); bed.start();

    let stopped = false;
    const bubble = () => {
      if (stopped) return;
      const at = c.currentTime + 0.01;
      const oscillator = c.createOscillator();
      oscillator.type = "sine";
      const start = 120 + Math.random() * 130;
      oscillator.frequency.setValueAtTime(start, at);
      oscillator.frequency.exponentialRampToValueAtTime(start * (1.5 + Math.random() * 0.65), at + 0.12);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.17 + Math.random() * 0.13, at + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.15);
      oscillator.connect(gain); gain.connect(out); oscillator.start(at); oscillator.stop(at + 0.17);
    };
    bubble();
    const timer = window.setInterval(bubble, 150 + Math.random() * 120);

    return () => {
      if (stopped) return;
      stopped = true;
      window.clearInterval(timer);
      const at = c.currentTime;
      out.gain.cancelScheduledValues(at);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), at);
      out.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
      window.setTimeout(() => { try { bed.stop(); out.disconnect(); } catch { /* already stopped */ } }, 180);
    };
  } catch {
    return () => undefined;
  }
}
