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

/** A smooth sci-fi door: soft pneumatic "pssh", a gentle motor glide and a quiet settle. */
export function playDoorOpen() {
  try {
    const m = master(1.0); if (!m) return; const { c, out, t } = m;
    const bell = (x: number) => Math.pow(Math.sin(Math.PI * Math.min(1, x)), 2);
    burst(c, out, t, 0.38, (x) => (x < 0.06 ? x / 0.06 : Math.pow(1 - (x - 0.06) / 0.94, 2.2)),
      [{ type: "bandpass", f: 2400, q: 0.7, to: [[1300, 0.38]] }, { type: "lowpass", f: 3200 }], 0.32, [1, 1]);
    burst(c, out, t + 0.08, 0.62, bell, [{ type: "lowpass", f: 420, q: 0.6, to: [[1150, 0.3], [520, 0.62]] }], 0.55, [1, 1]);
    const o = c.createOscillator(); o.type = "triangle";
    o.frequency.setValueAtTime(105, t + 0.08); o.frequency.exponentialRampToValueAtTime(168, t + 0.6);
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.66);
    o.connect(lp); lp.connect(g); g.connect(out); o.start(t + 0.08); o.stop(t + 0.7);
    thump(c, out, t + 0.62, 120, 78, 0.13, 0.24);
  } catch { /* sound is optional */ }
}

/** Lockdown alert: a soft two-note chime with a light echo, repeating quietly while active. Returns stop(). */
export function startAlertLoop(period = 1.1): () => void {
  try {
    const c = audio(); if (!c) return () => undefined;
    const out = c.createGain(); out.gain.setValueAtTime(0.0001, c.currentTime);
    out.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 0.2); out.connect(c.destination);
    const echo = c.createDelay(); echo.delayTime.value = 0.19;
    const fb = c.createGain(); fb.gain.value = 0.28;
    const tone = c.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 1800;
    echo.connect(fb); fb.connect(tone); tone.connect(echo); echo.connect(out);
    const note = (at: number, f: number, dur: number) => {
      for (const [mul, lvl] of [[1, 1], [2, 0.14]] as const) {
        const o = c.createOscillator(); o.type = "sine"; o.frequency.value = f * mul;
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(lvl, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        o.connect(g); g.connect(out); g.connect(echo); o.start(at); o.stop(at + dur + 0.02);
      }
    };
    let next = c.currentTime + 0.05, stopped = false;
    const schedule = () => {
      while (!stopped && next < c.currentTime + 0.4) { note(next, 659.3, 0.2); note(next + 0.2, 523.3, 0.3); next += period; }
    };
    schedule();
    const timer = window.setInterval(schedule, 120);
    return () => {
      if (stopped) return; stopped = true; window.clearInterval(timer);
      const at = c.currentTime; out.gain.cancelScheduledValues(at);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), at); out.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
      window.setTimeout(() => { try { out.disconnect(); echo.disconnect(); } catch { /* done */ } }, 400);
    };
  } catch { return () => undefined; }
}

/** The Serum M1 flask hitting the floor: a crack, a spray of glass shards and a small splash. */
export function playGlassBreak(delay = 0.42) {
  try {
    const m = master(0.5); if (!m) return; const { c, out } = m; const t = m.t + delay;
    const soft = c.createBiquadFilter(); soft.type = "lowpass"; soft.frequency.value = 7000; soft.connect(out);
    burst(c, soft, t, 0.06, (x) => Math.pow(1 - x, 3), [{ type: "highpass", f: 1400 }], 1.0, [1, 1]);           // crack
    thump(c, soft, t, 190, 110, 0.07, 0.35);                                                                 // glass on floor
    for (let i = 0; i < 26; i++) {                                                                          // shards scattering
      const at = t + 0.01 + Math.pow(Math.random(), 1.8) * 0.55;
      const f = 2100 + Math.random() * 3000, dur = 0.04 + Math.random() * 0.09;
      const lvl = Math.max(0.004, (0.05 + Math.random() * 0.1) * (1 - (at - t) / 0.7));
      const o = c.createOscillator(); o.type = "sine"; o.frequency.value = f;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(lvl, at + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g); g.connect(soft); o.start(at); o.stop(at + dur + 0.02);
    }
    burst(c, soft, t + 0.02, 0.35, (x) => Math.pow(1 - x, 2.5), [{ type: "bandpass", f: 3400, q: 0.8 }], 0.3, [0.3, 1.7], [5, 18]);
    burst(c, soft, t + 0.03, 0.32, (x) => Math.sin(Math.PI * Math.min(1, x * 2.2)) * Math.pow(1 - x, 1.5),   // serum splash
      [{ type: "bandpass", f: 900, q: 0.9, to: [[500, 0.3]] }], 0.45, [0.6, 1.4], [10, 30]);
  } catch { /* sound is optional */ }
}

function tone(c: AudioContext, out: AudioNode, at: number, f: number, dur: number, lvl: number, type: OscillatorType = "sine") {
  const o = c.createOscillator(); o.type = type; o.frequency.value = f;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(lvl, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g); g.connect(out); o.start(at); o.stop(at + dur + 0.02);
}

/** WL injection (~2.4 s, matches the syringe): soft plunger push, serum blips, a rising charge, a small "done" chime. */
export function playInject() {
  try {
    const m = master(1.1); if (!m) return; const { c, out, t } = m;
    const bell = (x: number) => Math.pow(Math.sin(Math.PI * Math.min(1, x)), 2);
    burst(c, out, t, 2.2, (x) => bell(x) * 0.8, [{ type: "lowpass", f: 600, q: 0.7, to: [[1100, 1.8], [700, 2.2]] }], 0.5, [1, 1]);
    for (let i = 0; i < 14; i++) {
      const at = t + 0.25 + i * 0.13 + Math.random() * 0.05, f = 380 + Math.random() * 380;
      const o = c.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(f, at); o.frequency.exponentialRampToValueAtTime(f * 1.7, at + 0.06);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.07, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
      o.connect(g); g.connect(out); o.start(at); o.stop(at + 0.1);
    }
    const o = c.createOscillator(); o.type = "triangle";
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(520, t + 2.2);
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1200;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.4);
    g.gain.setValueAtTime(0.06, t + 2.0); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
    o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + 2.35);
    thump(c, out, t + 2.25, 900, 600, 0.04, 0.12);
    tone(c, out, t + 2.3, 880, 0.35, 0.09); tone(c, out, t + 2.39, 1320, 0.4, 0.08);
  } catch { /* sound is optional */ }
}

/** WL status scan (~1.7 s): scanner sweep hum, steady beeps, a "scan complete" two-tone. */
export function playScan() {
  try {
    const m = master(1.3); if (!m) return; const { c, out, t } = m;
    const o = c.createOscillator(); o.type = "triangle";
    o.frequency.setValueAtTime(160, t); o.frequency.linearRampToValueAtTime(480, t + 0.75); o.frequency.linearRampToValueAtTime(160, t + 1.5);
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.15);
    g.gain.setValueAtTime(0.05, t + 1.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.55);
    o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + 1.6);
    for (let i = 0; i < 5; i++) tone(c, out, t + 0.1 + i * 0.28, 1150, 0.05, 0.08);
    tone(c, out, t + 1.55, 988, 0.12, 0.1); tone(c, out, t + 1.66, 1480, 0.22, 0.09);
  } catch { /* sound is optional */ }
}

/** Lab pressure gauge: pulse() plays one cycle (an elevator-style ding when the needle tops out),
 *  timed to the 4.2s "build" needle animation. stop() fades it out. */
export function gaugeSound(period = 4.2): { pulse: () => void; stop: () => void } {
  const none = { pulse: () => undefined, stop: () => undefined };
  try {
    const c = audio(); if (!c) return none;
    const out = c.createGain(); out.gain.value = 0.26; out.connect(c.destination);
    let stopped = false;
    const pulse = () => {
      if (stopped) return;
      try {
        // elevator-style "ding" the moment the needle hits the top of the dial (55% of the cycle)
        const at = c.currentTime + 0.02 + period * 0.55;
        tone(c, out, at, 1318.5, 1.9, 0.2);          // E6 strike, long ring
        tone(c, out, at, 2637, 0.9, 0.05);           // octave shimmer
        tone(c, out, at, 3639, 0.35, 0.025);         // bell partial (x2.76)
        tone(c, out, at + 0.004, 1321, 1.6, 0.06);   // slight beat, like a real chime
      } catch { /* sound is optional */ }
    };
    const stop = () => {
      if (stopped) return; stopped = true;
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      window.setTimeout(() => { try { out.disconnect(); } catch { /* gone */ } }, 260);
    };
    return { pulse, stop };
  } catch {
    return none;
  }
}

/** CRT power-on: relay clunk, degauss thrum and the thin high whine settling in. */
export function playCrtOn() {
  try {
    const m = master(0.55); if (!m) return; const { c, out, t } = m;
    thump(c, out, t, 120, 60, 0.12, 0.6);
    burst(c, out, t, 0.05, (x) => Math.pow(1 - x, 2), [{ type: "bandpass", f: 1800, q: 1.2 }], 0.5);
    const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(48, t); o.frequency.linearRampToValueAtTime(62, t + 0.45);
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 260;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + 0.55);
    const w = c.createOscillator(); w.type = "sine"; w.frequency.setValueAtTime(9000, t + 0.05); w.frequency.exponentialRampToValueAtTime(15600, t + 0.4);
    const wg = c.createGain(); wg.gain.setValueAtTime(0.0001, t + 0.05); wg.gain.exponentialRampToValueAtTime(0.025, t + 0.15); wg.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    w.connect(wg); wg.connect(out); w.start(t + 0.05); w.stop(t + 0.95);
  } catch { /* sound is optional */ }
}

/** Short terminal blip for the scanner buttons. */
export function playBlip(up = true) {
  try {
    const m = master(0.35); if (!m) return; const { c, out, t } = m;
    tone(c, out, t, up ? 1320 : 990, 0.06, 0.12, "square");
    tone(c, out, t + 0.05, up ? 1760 : 1320, 0.07, 0.08, "square");
  } catch { /* sound is optional */ }
}

/** CRT smashing on the floor: tube implodes (deep boom + suck), glass bursts, sparks fizz and die. */
export function playTvBreak(delay = 0.42) {
  // A CRT dying, not glass shattering (that is the flask): the picture collapses with a falling
  // "peeew" + static, the tube implodes with a dull pop, the set hits the floor, then electric
  // arcs crackle out and the mains hum dies. Only a few low, crunchy glass bits, no tinkling.
  try {
    const m = master(0.5); if (!m) return; const { c, out } = m; const t0 = m.t;
    const soft = c.createBiquadFilter(); soft.type = "lowpass"; soft.frequency.value = 7000; soft.connect(out);
    // picture collapsing as it falls (starts right away)
    const pw = c.createOscillator(); pw.type = "sine";
    pw.frequency.setValueAtTime(7200, t0); pw.frequency.exponentialRampToValueAtTime(900, t0 + delay * 0.9);
    const pg = c.createGain(); pg.gain.setValueAtTime(0.0001, t0); pg.gain.exponentialRampToValueAtTime(0.05, t0 + 0.03);
    pg.gain.exponentialRampToValueAtTime(0.0001, t0 + delay * 0.95);
    pw.connect(pg); pg.connect(soft); pw.start(t0); pw.stop(t0 + delay + 0.05);
    burst(c, soft, t0, delay * 0.9, (x) => 0.6 * (1 - x), [{ type: "bandpass", f: 4200, q: 0.6, to: [[1800, delay * 0.9]] }], 0.22, [0.2, 1.8], [2, 9]);
    const t = t0 + delay;
    // tube implosion: dull low "whoomp-pop"
    burst(c, soft, t, 0.16, (x) => (x < 0.04 ? x / 0.04 : Math.pow(1 - x, 2.2)), [{ type: "lowpass", f: 2200, to: [[180, 0.14]] }], 1.0, [0.9, 1.1]);
    thump(c, soft, t, 95, 40, 0.22, 0.8);
    // the heavy plastic/metal set landing
    thump(c, soft, t + 0.05, 58, 26, 0.5, 1.0);
    thump(c, soft, t + 0.06, 240, 120, 0.09, 0.45);
    // a few crunchy glass bits (noise, low, no ringing)
    for (let i = 0; i < 5; i++) {
      burst(c, soft, t + 0.04 + i * 0.05 + Math.random() * 0.04, 0.04 + Math.random() * 0.04, (x) => Math.pow(1 - x, 2), [{ type: "bandpass", f: 1600 + Math.random() * 1400, q: 1.1 }], 0.35 * (1 - i / 6), [0.3, 1.7], [2, 8]);
    }
    // electric arcs "zzzt" fading out
    zap(c, soft, t + 0.22, 0.32, 0.22);
    zap(c, soft, t + 0.62, 0.18, 0.14);
    zap(c, soft, t + 0.9, 0.1, 0.08);
    // mains hum dying
    const hum = c.createOscillator(); hum.type = "sawtooth"; hum.frequency.setValueAtTime(60, t + 0.1); hum.frequency.exponentialRampToValueAtTime(35, t + 1.3);
    const hl = c.createBiquadFilter(); hl.type = "lowpass"; hl.frequency.value = 380;
    const hg = c.createGain(); hg.gain.setValueAtTime(0.0001, t + 0.1); hg.gain.exponentialRampToValueAtTime(0.1, t + 0.18); hg.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    hum.connect(hl); hl.connect(hg); hg.connect(soft); hum.start(t + 0.1); hum.stop(t + 1.35);
  } catch { /* sound is optional */ }
}

// ---------------------------------------------------------------- the wall phone
// old bell-style ring: two quick trills (440+480 Hz, warbled) per call
export function playPhoneRing() {
  try {
    const m = master(0.22); if (!m) return;
    const { c, out } = m; const t = m.t + 0.01;
    for (const start of [0, 0.55]) {
      for (let k = 0; k < 8; k++) {
        const at = t + start + k * 0.05;
        tone(c, out, at, 440, 0.045, 0.16, "square"); tone(c, out, at, 480, 0.045, 0.14, "square");
      }
    }
  } catch { /* sound is optional */ }
}
/** handset off the hook: clunk + a line hiss */
export function playPickup() {
  try {
    const m = master(0.4); if (!m) return;
    const { c, out, t } = m;
    thump(c, out, t, 180, 70, 0.12, 0.5);
    burst(c, out, t + 0.05, 3.2, (x) => 0.35 * (1 - x * 0.4), [{ type: "bandpass", f: 1800, q: 0.6 }], 0.08, [0.8, 1.2], [20, 60]);
  } catch { /* sound is optional */ }
}
/** the line goes dead: three busy beeps */
export function playHangup() {
  try {
    const m = master(0.22); if (!m) return;
    const { c, out } = m; const t = m.t + 0.01;
    thump(c, out, t, 140, 60, 0.1, 0.4);
    for (let k = 0; k < 3; k++) { tone(c, out, t + 0.25 + k * 0.42, 480, 0.24, 0.16, "square"); tone(c, out, t + 0.25 + k * 0.42, 620, 0.24, 0.12, "square"); }
  } catch { /* sound is optional */ }
}
/** a low, slow, distorted voice over the line; calls done() when it has finished (or after a fallback delay) */
export function playVoice(text: string, done?: () => void) {
  let finished = false;
  const t0 = performance.now();
  // never shorter than ~2.2 s, so the on-screen line stays up even where the browser has no voice
  const end = () => {
    if (finished) return; finished = true;
    window.setTimeout(() => done?.(), Math.max(0, 2200 - (performance.now() - t0)));
  };
  try {
    const m = master(0.18);
    if (m) {   // a low drone under the voice so it sounds like a bad line
      const { c, out, t } = m;
      tone(c, out, t, 55, 2.4, 0.3, "sawtooth"); tone(c, out, t, 58, 2.4, 0.2, "sawtooth");
    }
    const s = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (s) {
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = 0.05; u.rate = 0.62; u.volume = 1;
      const en = s.getVoices().find((v) => /en[-_](US|GB)/i.test(v.lang) && /male|david|daniel|fred|alex/i.test(v.name)) ?? s.getVoices().find((v) => /^en/i.test(v.lang));
      if (en) u.voice = en;
      u.onend = end; u.onerror = end;
      s.speak(u);
    }
  } catch { /* voice is optional */ }
  window.setTimeout(end, 4200);
}

// ---------------------------------------------------------------- CCTV feed: the line hums, crackles, and cuts out ("zzzt… zzzt")
function zap(c: AudioContext, out: AudioNode, at: number, dur: number, lvl: number) {
  // electrical buzz chopped by a fast square LFO, over crackly noise
  const o = c.createOscillator(); o.type = "square"; o.frequency.value = 96 + Math.random() * 30;
  const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1200; bp.Q.value = 0.7;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(lvl, at + 0.01); g.gain.setValueAtTime(lvl, at + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  const lfo = c.createOscillator(); lfo.type = "square"; lfo.frequency.value = 20 + Math.random() * 12;
  const depth = c.createGain(); depth.gain.value = lvl * 0.9; lfo.connect(depth); depth.connect(g.gain);
  o.connect(bp); bp.connect(g); g.connect(out);
  o.start(at); o.stop(at + dur + 0.02); lfo.start(at); lfo.stop(at + dur + 0.02);
  burst(c, out, at, dur, (x) => (x < 0.05 ? x / 0.05 : 1 - x * 0.5), [{ type: "highpass", f: 1500 }], lvl * 1.4, [0.1, 1.8], [6, 30]);
}
/** Loop for an open CCTV feed: low mains hum + random crackle, a hard "cut" every `cutEvery` s
 *  (first one `firstCut` s in, matching the picture's own cut), small ticks on the picture jolts. */
export function startCamStatic(firstCut: number, cutEvery: number, jolts: number[], joltEvery: number): () => void {
  try {
    const c = audio(); if (!c) return () => undefined;
    const out = c.createGain(); out.gain.value = 0.32; out.connect(c.destination);
    const t0 = c.currentTime + 0.05;
    const hum = c.createOscillator(); hum.type = "sawtooth"; hum.frequency.value = 60;
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 320;
    const hg = c.createGain(); hg.gain.setValueAtTime(0.0001, t0); hg.gain.exponentialRampToValueAtTime(0.05, t0 + 0.4);
    hum.connect(lp); lp.connect(hg); hg.connect(out); hum.start(t0);
    const timers: number[] = [];
    let alive = true;
    const crackle = () => {
      if (!alive) return;
      try { burst(c, out, c.currentTime + 0.01, 0.03 + Math.random() * 0.1, (x) => 1 - x, [{ type: "bandpass", f: 2500 + Math.random() * 2500, q: 0.8 }], 0.12 + Math.random() * 0.15, [0.1, 1.9], [3, 14]); } catch { /* optional */ }
      timers.push(window.setTimeout(crackle, 280 + Math.random() * 1100));
    };
    crackle();
    const cut = () => { if (alive) try { zap(c, out, c.currentTime + 0.01, 0.42, 0.22); } catch { /* optional */ } };
    timers.push(window.setTimeout(() => { cut(); timers.push(window.setInterval(cut, cutEvery * 1000)); }, firstCut * 1000));
    for (const j of jolts) {
      const tickJolt = () => { if (alive) try { zap(c, out, c.currentTime + 0.01, 0.1, 0.12); } catch { /* optional */ } };
      timers.push(window.setTimeout(() => { tickJolt(); timers.push(window.setInterval(tickJolt, joltEvery * 1000)); }, j * 1000));
    }
    return () => {
      alive = false; timers.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      window.setTimeout(() => { try { hum.stop(); out.disconnect(); } catch { /* gone */ } }, 220);
    };
  } catch {
    return () => undefined;
  }
}

// elevator-style ding (same voice as the lab gauge)
function ding(c: AudioContext, out: AudioNode, at: number) {
  tone(c, out, at, 1318.5, 1.9, 0.2); tone(c, out, at, 2637, 0.9, 0.05);
  tone(c, out, at, 3639, 0.35, 0.025); tone(c, out, at + 0.004, 1321, 1.6, 0.06);
}
/** Cloning vessel gauges: a ding the first time the needle tops out (`first` s from now), then every `every` s. */
export function startGaugeDings(first: number, every: number): () => void {
  try {
    const c = audio(); if (!c) return () => undefined;
    const out = c.createGain(); out.gain.value = 0.26; out.connect(c.destination);
    const timers: number[] = [];
    const hit = () => { try { ding(c, out, c.currentTime + 0.01); } catch { /* optional */ } };
    timers.push(window.setTimeout(() => { hit(); timers.push(window.setInterval(hit, every * 1000)); }, first * 1000));
    return () => {
      timers.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      window.setTimeout(() => { try { out.disconnect(); } catch { /* gone */ } }, 320);
    };
  } catch {
    return () => undefined;
  }
}

// ---------------------------------------------------------------- gate faucet
/** a rusty valve wheel being turned: a squeal over a couple of metal clicks */
export function playValveTurn() {
  try {
    const m = master(0.28); if (!m) return;
    const { c, out, t } = m;
    const o = c.createOscillator(); o.type = "sawtooth";
    o.frequency.setValueAtTime(620, t); o.frequency.linearRampToValueAtTime(900, t + 0.18); o.frequency.linearRampToValueAtTime(700, t + 0.42);
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 3;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(bp); bp.connect(g); g.connect(out); o.start(t); o.stop(t + 0.5);
    thump(c, out, t + 0.02, 260, 140, 0.06, 0.25); thump(c, out, t + 0.3, 240, 120, 0.06, 0.2);
  } catch { /* sound is optional */ }
}
/** liquid pouring onto the floor (loop) with a fizz as it boils off; returns stop() */
export function startPour(): () => void {
  try {
    const c = audio(); if (!c) return () => undefined;
    const out = c.createGain(); out.gain.value = 0.0001; out.connect(c.destination);
    const t = c.currentTime;
    out.gain.exponentialRampToValueAtTime(0.3, t + 0.3);
    let alive = true; const timers: number[] = [];
    const splash = () => {
      if (!alive) return;
      try {
        burst(c, out, c.currentTime + 0.01, 0.5, (x) => 0.6 + 0.4 * Math.sin(x * 9), [{ type: "bandpass", f: 700 + Math.random() * 500, q: 1.2 }], 0.22, [0.5, 1.5], [8, 30]);
        burst(c, out, c.currentTime + 0.05, 0.4, (x) => 1 - x, [{ type: "highpass", f: 3500 }], 0.05, [0.3, 1.6], [3, 12]);
      } catch { /* optional */ }
      timers.push(window.setTimeout(splash, 380));
    };
    splash();
    return () => {
      alive = false; timers.forEach((id) => window.clearTimeout(id));
      const n = c.currentTime;
      out.gain.cancelScheduledValues(n); out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), n);
      out.gain.exponentialRampToValueAtTime(0.0001, n + 0.4);
      // last fizz as the puddle boils away
      try { burst(c, c.destination, n + 0.1, 1.6, (x) => (1 - x) * (1 - x), [{ type: "highpass", f: 2500 }], 0.05, [0.4, 1.6], [4, 16]); } catch { /* optional */ }
      window.setTimeout(() => { try { out.disconnect(); } catch { /* gone */ } }, 500);
    };
  } catch {
    return () => undefined;
  }
}

// ---------------------------------------------------------------- the devils laughing at you through the CCTV
// Formant-synthesised "HA-HA-HA": a buzzy glottal tone pushed through vowel formants, an
// octave-down growl under it, a little distortion and a slapback echo like a cheap camera mic.
function laughSyllable(c: AudioContext, out: AudioNode, at: number, f0: number, f1: number, dur: number, gain: number) {
  const src = c.createOscillator(); src.type = "sawtooth";
  src.frequency.setValueAtTime(f0, at); src.frequency.exponentialRampToValueAtTime(f1, at + dur);
  const sub = c.createOscillator(); sub.type = "square";
  sub.frequency.setValueAtTime(f0 / 2, at); sub.frequency.exponentialRampToValueAtTime(f1 / 2, at + dur);
  const vib = c.createOscillator(); vib.frequency.value = 7; const vibG = c.createGain(); vibG.gain.value = f0 * 0.04;
  vib.connect(vibG); vibG.connect(src.frequency);
  const mix = c.createGain(); mix.gain.value = 1; src.connect(mix);
  const subG = c.createGain(); subG.gain.value = 0.45; sub.connect(subG); subG.connect(mix);
  const env = c.createGain(); env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.03); env.gain.setValueAtTime(gain, at + dur * 0.55);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  // "a" vowel formants
  for (const [f, q, g] of [[720, 7, 1], [1150, 9, 0.6], [2550, 12, 0.25]] as const) {
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q;
    const fg = c.createGain(); fg.gain.value = g; mix.connect(bp); bp.connect(fg); fg.connect(env);
  }
  env.connect(out);
  // breathy "h" at the start of each syllable
  burst(c, out, at, 0.07, (x) => 1 - x, [{ type: "bandpass", f: 1600, q: 0.8 }], gain * 0.8, [0.6, 1.4], [6, 20]);
  for (const o of [src, sub, vib]) { o.start(at); o.stop(at + dur + 0.05); }
}
/** devil 2 (Dark Sovereign) = deep and slow, devil 1 (Hellspawn) = higher and manic */
export function playDevilLaugh(devil: 1 | 2): { len: number; stop: () => void } {
  const none = { len: 0, stop: () => undefined };
  try {
    const c = audio(); if (!c) return none;
    const out = c.createGain(); out.gain.value = 0.55;
    const shaper = c.createWaveShaper(); const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = (i / 255) * 2 - 1; curve[i] = Math.tanh(x * 2.4); }
    shaper.curve = curve;
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200;
    const dly = c.createDelay(1); dly.delayTime.value = 0.23; const fb = c.createGain(); fb.gain.value = 0.32;
    out.connect(shaper); shaper.connect(lp); lp.connect(c.destination);
    lp.connect(dly); dly.connect(fb); fb.connect(dly); fb.connect(c.destination);
    const t = c.currentTime + 0.05;
    const deep = devil === 2;
    const n = deep ? 6 : 8, step = deep ? 0.26 : 0.17, len = deep ? 0.19 : 0.12;
    let base = deep ? 96 : 175;
    for (let i = 0; i < n; i++) {
      const at = t + i * step;
      laughSyllable(c, out, at, base, base * 0.86, len, 0.22);
      base *= deep ? 0.95 : 0.965;
    }
    const tail = t + n * step + 0.05;
    laughSyllable(c, out, tail, base * 1.08, base * 0.62, deep ? 0.9 : 0.6, 0.24);   // long final "HAAA"
    const total = n * step + (deep ? 1.0 : 0.7);
    const cut = () => { try { out.disconnect(); fb.disconnect(); lp.disconnect(); } catch { /* gone */ } };
    const timer = window.setTimeout(cut, (total + 1.6) * 1000);
    return { len: total, stop: () => { window.clearTimeout(timer); cut(); } };
  } catch {
    return none;
  }
}

// ---------------------------------------------------------------- intro: slow creepy ambience
// A cold drone (two detuned saws + a sub + a throbbing minor second) breathing through a slow
// filter, a faint double heartbeat, ghostly phrygian pads that bloom and fade, and rare glassy
// "drips" far away in a long reverb. All synthesised, no files. Starts silent, fades in, and stop()
// fades it out. If the browser has not allowed sound yet it simply waits (resume happens on the
// first click/key/touch, see primeSceneAudio).
export function startCreepyMusic(): { stop: (fade?: number) => void; setMuted: (m: boolean) => void } {
  const none = { stop: () => undefined, setMuted: () => undefined };
  try {
    const c = audio(); if (!c) return none;
    const master = c.createGain(); master.gain.value = 0.0001; master.connect(c.destination);
    const user = c.createGain(); user.gain.value = 1; user.connect(master);
    // long dark reverb (generated impulse: noise with a slow exponential tail, darker over time)
    const len = Math.floor(c.sampleRate * 3.6), imp = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = imp.getChannelData(ch); let lp = 0;
      for (let i = 0; i < len; i++) { const k = 1 - i / len; lp += (Math.random() * 2 - 1 - lp) * (0.08 + 0.5 * k); d[i] = lp * Math.pow(k, 2.4); }
    }
    const verb = c.createConvolver(); verb.buffer = imp;
    const wet = c.createGain(); wet.gain.value = 0.7; verb.connect(wet); wet.connect(user);
    const dry = c.createGain(); dry.gain.value = 0.55; dry.connect(user);
    const bus = c.createGain(); bus.gain.value = 1; bus.connect(dry); bus.connect(verb);

    const nodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
    const osc = (type: OscillatorType, f: number, g: number, dest: AudioNode = bus, detune = 0) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
      const gn = c.createGain(); gn.gain.value = g; o.connect(gn); gn.connect(dest); o.start(); nodes.push(o); return { o, gn };
    };
    // drone
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 230; lp.Q.value = 3; lp.connect(bus);
    osc("sawtooth", 55, 0.1, lp); osc("sawtooth", 55, 0.08, lp, 9); osc("sine", 27.5, 0.22);
    const lfo = c.createOscillator(); lfo.frequency.value = 0.045; const lfoG = c.createGain(); lfoG.gain.value = 110;
    lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start(); nodes.push(lfo);            // the filter slowly breathes
    const minor = osc("sine", 58.27, 0.0001);                                               // Bb against A: the uneasy beat
    const trem = c.createOscillator(); trem.frequency.value = 0.07; const tremG = c.createGain(); tremG.gain.value = 0.06;
    trem.connect(tremG); tremG.connect(minor.gn.gain); trem.start(); nodes.push(trem);
    osc("sine", 110.0, 0.0001); // placeholder octave pad, kept silent so the graph stays simple

    const timers: number[] = []; let alive = true; let muted = false;
    const running = () => alive && c.state === "running";
    const tone2 = (f: number, at: number, dur: number, peak: number, type: OscillatorType = "sine", vib = 0) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f;
      if (vib) { const v = c.createOscillator(); v.frequency.value = 4.2 + Math.random(); const vg = c.createGain(); vg.gain.value = f * vib; v.connect(vg); vg.connect(o.frequency); v.start(at); v.stop(at + dur + 0.1); }
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g); g.connect(bus); o.start(at); o.stop(at + dur + 0.1);
    };
    // heartbeat: a very quiet double thump about every 2.2 s
    const beat = () => {
      if (running()) {
        const t = c.currentTime + 0.02;
        for (const [dt, pk] of [[0, 0.5], [0.34, 0.32]] as const) {
          const o = c.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(70, t + dt); o.frequency.exponentialRampToValueAtTime(34, t + dt + 0.22);
          const g = c.createGain(); g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(pk * 0.5, t + dt + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.3);
          o.connect(g); g.connect(dry); o.start(t + dt); o.stop(t + dt + 0.35);
        }
      }
      timers.push(window.setTimeout(beat, 2200));
    };
    // ghostly pads: two or three phrygian notes that swell for ~7 s
    const NOTES = [164.81, 174.61, 220.0, 246.94, 329.63, 349.23, 440.0];
    const pad = () => {
      if (running()) {
        const t = c.currentTime + 0.05; const n = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < n; i++) tone2(NOTES[Math.floor(Math.random() * NOTES.length)]! * (Math.random() < 0.2 ? 2 : 1), t + i * 0.9, 6 + Math.random() * 3, 0.05, "triangle", 0.004);
      }
      timers.push(window.setTimeout(pad, 8000 + Math.random() * 5000));
    };
    // far-away glassy drips
    const drip = () => {
      if (running()) {
        const t = c.currentTime + 0.02; const f = 1500 + Math.random() * 1400;
        const o = c.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.25);
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.connect(g); g.connect(verb); g.connect(dry); o.start(t); o.stop(t + 0.4);
      }
      timers.push(window.setTimeout(drip, 3500 + Math.random() * 6000));
    };
    // a rare low metallic groan (filtered noise sweeping down)
    const groan = () => {
      if (running()) {
        const t = c.currentTime + 0.05, d = 4.5;
        const b = c.createBuffer(1, Math.floor(c.sampleRate * d), c.sampleRate), ch = b.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
        const src = c.createBufferSource(); src.buffer = b;
        const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 14;
        bp.frequency.setValueAtTime(260, t); bp.frequency.exponentialRampToValueAtTime(95, t + d);
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + d * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        src.connect(bp); bp.connect(g); g.connect(bus); src.start(t); nodes.push(src);
      }
      timers.push(window.setTimeout(groan, 20000 + Math.random() * 15000));
    };
    timers.push(window.setTimeout(beat, 1500), window.setTimeout(pad, 2500), window.setTimeout(drip, 4000), window.setTimeout(groan, 14000));

    master.gain.setValueAtTime(0.0001, c.currentTime);
    master.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 5);                       // slow fade in
    return {
      setMuted: (m: boolean) => { muted = m; user.gain.cancelScheduledValues(c.currentTime); user.gain.setTargetAtTime(m ? 0.0001 : 1, c.currentTime, 0.25); },
      stop: (fade = 1.2) => {
        if (!alive) return; alive = false; timers.forEach((id) => window.clearTimeout(id));
        const t = c.currentTime;
        master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t);
        master.gain.exponentialRampToValueAtTime(0.0001, t + fade);
        window.setTimeout(() => { for (const n of nodes) { try { n.stop(); } catch { /* already stopped */ } } try { master.disconnect(); } catch { /* gone */ } }, fade * 1000 + 200);
        void muted;
      },
    };
  } catch {
    return none;
  }
}

// ---------------------------------------------------------------- recorded voice clips (public/sfx)
// Phone voice + the two devils' laughs are pre-rendered (neural TTS / processed, see public/sfx).
// Decoded once into the shared AudioContext; play() returns the clip length and a stop().
const clipCache = new Map<string, Promise<AudioBuffer | null>>();
export function loadClip(url: string): Promise<AudioBuffer | null> {
  let p = clipCache.get(url);
  if (!p) {
    p = (async () => {
      try {
        const c = audio(); if (!c) return null;
        const res = await fetch(url); if (!res.ok) return null;
        return await c.decodeAudioData(await res.arrayBuffer());
      } catch { return null; }
    })();
    clipCache.set(url, p);
  }
  return p;
}
export const SFX = {
  phoneLeave: "/sfx/phone-leave.mp3", phoneFinished: "/sfx/phone-finished.mp3",
  laughSovereign: "/sfx/laugh-sovereign.mp3", laughHellspawn: "/sfx/laugh-hellspawn.mp3",
} as const;
export function preloadVoices() { Object.values(SFX).forEach((u) => { void loadClip(u); }); }
/** Plays a clip; resolves `done` when it ends (or right away if it could not play). */
export function playClip(url: string, volume = 1): { stop: () => void; done: Promise<number> } {
  let src: AudioBufferSourceNode | null = null, g: GainNode | null = null, stopped = false;
  const done = loadClip(url).then((buf) => new Promise<number>((resolve) => {
    const c = audio();
    if (!buf || !c || stopped) { resolve(0); return; }
    src = c.createBufferSource(); src.buffer = buf;
    g = c.createGain(); g.gain.value = volume; src.connect(g); g.connect(c.destination);
    src.onended = () => resolve(buf.duration);
    src.start();
  }));
  return {
    done,
    stop: () => {
      stopped = true;
      try {
        const c = audio();
        if (g && c) { g.gain.setTargetAtTime(0.0001, c.currentTime, 0.06); window.setTimeout(() => { try { src?.stop(); } catch { /* ended */ } }, 300); }
      } catch { /* gone */ }
    },
  };
}

// ---------------------------------------------------------------- gate ambience
/** Pipes: a low rushing flow with bubbles gurgling through it. */
export function startPipeFlow(): () => void {
  try {
    const c = audio(); if (!c) return () => undefined;
    const out = c.createGain(); out.gain.value = 0.0001; out.connect(c.destination);
    out.gain.exponentialRampToValueAtTime(0.2, c.currentTime + 1.5);
    const len = c.sampleRate * 4, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    let lp = 0; for (let i = 0; i < len; i++) { lp += ((Math.random() * 2 - 1) - lp) * 0.06; d[i] = lp * 3; }
    const rush = c.createBufferSource(); rush.buffer = b; rush.loop = true;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 420; bp.Q.value = 0.9;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.13; const lg = c.createGain(); lg.gain.value = 160;
    lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
    const rg = c.createGain(); rg.gain.value = 0.35; rush.connect(bp); bp.connect(rg); rg.connect(out); rush.start();
    let alive = true; const timers: number[] = [];
    const bubble = () => {
      if (!alive) return;
      if (c.state === "running") {
        const t = c.currentTime + 0.01, f = 220 + Math.random() * 260, n = 1 + Math.floor(Math.random() * 3);
        for (let k = 0; k < n; k++) {
          const o = c.createOscillator(); o.type = "sine"; const at = t + k * 0.07;
          o.frequency.setValueAtTime(f, at); o.frequency.exponentialRampToValueAtTime(f * 2.4, at + 0.06);
          const g = c.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.18, at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
          o.connect(g); g.connect(out); o.start(at); o.stop(at + 0.1);
        }
      }
      timers.push(window.setTimeout(bubble, 260 + Math.random() * 900));
    };
    bubble();
    return () => {
      alive = false; timers.forEach((id) => window.clearTimeout(id));
      const t = c.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      window.setTimeout(() => { try { rush.stop(); lfo.stop(); out.disconnect(); } catch { /* gone */ } }, 700);
    };
  } catch { return () => undefined; }
}
/** One slime drop landing: a wet plink, panned to where it fell (-1 left .. 1 right). */
export function playDrip(pan = 0, size = 1) {
  try {
    const m = master(0.11 * size); if (!m) return; const { c, out, t } = m;
    const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); out.disconnect(); out.connect(p); p.connect(c.destination);
    const f = 900 + Math.random() * 700;
    const o = c.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.045);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.14);
    burst(c, out, t, 0.05, (x) => 1 - x, [{ type: "bandpass", f: 3200, q: 1 }], 0.25);
  } catch { /* sound is optional */ }
}
/** Cloning vessel status lights: blue = soft tick, red = monitor beep. */
export function playVesselBlip(red: boolean) {
  try {
    const m = master(red ? 0.05 : 0.03); if (!m) return; const { c, out, t } = m;
    tone(c, out, t, red ? 880 : 1760, red ? 0.09 : 0.04, 0.9, red ? "square" : "sine");
  } catch { /* sound is optional */ }
}
/** Lockdown door: something slams into it from inside, chains rattle, lights fail, it growls. */
export function playDoorBurst() {
  try {
    const m = master(0.6); if (!m) return; const { c, out, t } = m;
    thump(c, out, t, 58, 26, 0.6, 1); burst(c, out, t, 0.35, (x) => Math.pow(1 - x, 2), [{ type: "lowpass", f: 900, to: [[120, 0.3]] }], 0.9);
    thump(c, out, t + 0.62, 52, 24, 0.5, 0.85); burst(c, out, t + 0.62, 0.3, (x) => Math.pow(1 - x, 2), [{ type: "lowpass", f: 800 }], 0.7);
    for (let i = 0; i < 26; i++) {                                   // chain links clanking
      const at = t + 0.03 + Math.random() * 1.4, f = 2200 + Math.random() * 3200;
      const o = c.createOscillator(); o.type = "triangle"; o.frequency.value = f;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.12 * (1 - (at - t) / 1.6), at + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.09 + Math.random() * 0.1);
      o.connect(g); g.connect(out); o.start(at); o.stop(at + 0.25);
    }
    const cr = c.createOscillator(); cr.type = "sawtooth"; cr.frequency.setValueAtTime(70, t + 0.1); cr.frequency.linearRampToValueAtTime(110, t + 0.7); cr.frequency.linearRampToValueAtTime(60, t + 1.4);
    const cb = c.createBiquadFilter(); cb.type = "bandpass"; cb.frequency.value = 520; cb.Q.value = 6;
    const cg = c.createGain(); cg.gain.setValueAtTime(0.0001, t + 0.1); cg.gain.exponentialRampToValueAtTime(0.16, t + 0.3); cg.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    cr.connect(cb); cb.connect(cg); cg.connect(out); cr.start(t + 0.1); cr.stop(t + 1.6);       // metal groaning under the strain
    zap(c, out, t + 0.12, 0.18, 0.2); zap(c, out, t + 0.34, 0.1, 0.16); zap(c, out, t + 0.75, 0.22, 0.18);     // lights shorting out
    const gr = c.createOscillator(); gr.type = "sawtooth"; gr.frequency.setValueAtTime(48, t + 0.25); gr.frequency.linearRampToValueAtTime(38, t + 1.3);
    const gm = c.createOscillator(); gm.frequency.value = 23; const gmg = c.createGain(); gmg.gain.value = 0.5;
    const gg = c.createGain(); gg.gain.setValueAtTime(0.0001, t + 0.25); gg.gain.exponentialRampToValueAtTime(0.22, t + 0.5); gg.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    gm.connect(gmg); gmg.connect(gg.gain);
    const gl = c.createBiquadFilter(); gl.type = "lowpass"; gl.frequency.value = 380;
    gr.connect(gl); gl.connect(gg); gg.connect(out); gr.start(t + 0.25); gr.stop(t + 1.45); gm.start(t + 0.25); gm.stop(t + 1.45);   // growl behind the door
  } catch { /* sound is optional */ }
}

// ---------------------------------------------------------------- lab: horror room tone + flickering tubes
/** Fluorescent hum, a cold dissonant drone, metal creaks, distant wails and whispers. duck() lowers it while an item is open. */
export function startLabHorror(): { stop: () => void; duck: (on: boolean) => void } {
  const none = { stop: () => undefined, duck: () => undefined };
  try {
    const c = audio(); if (!c) return none;
    const out = c.createGain(); out.gain.value = 0.0001; out.connect(c.destination);
    out.gain.exponentialRampToValueAtTime(0.42, c.currentTime + 3);
    const duckG = c.createGain(); duckG.gain.value = 1; duckG.connect(out);
    const len = Math.floor(c.sampleRate * 2.8), imp = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = imp.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const verb = c.createConvolver(); verb.buffer = imp; const wet = c.createGain(); wet.gain.value = 0.55; verb.connect(wet); wet.connect(duckG);
    const bus = c.createGain(); bus.connect(duckG); bus.connect(verb);
    const nodes: AudioScheduledSourceNode[] = [];
    const hum = c.createOscillator(); hum.type = "sawtooth"; hum.frequency.value = 100;
    const hb = c.createBiquadFilter(); hb.type = "bandpass"; hb.frequency.value = 300; hb.Q.value = 2.5;
    const hg = c.createGain(); hg.gain.value = 0.035; hum.connect(hb); hb.connect(hg); hg.connect(bus); hum.start(); nodes.push(hum);
    for (const [f, g] of [[41.2, 0.12], [43.65, 0.09], [61.7, 0.05]] as const) {
      const o = c.createOscillator(); o.type = "sine"; o.frequency.value = f; const gg = c.createGain(); gg.gain.value = g; o.connect(gg); gg.connect(bus); o.start(); nodes.push(o);
    }
    let alive = true; const timers: number[] = [];
    const every = (fn: () => void, lo: number, hi: number, first: number) => {
      const run = () => { if (!alive) return; if (c.state === "running") { try { fn(); } catch { /* optional */ } } timers.push(window.setTimeout(run, lo + Math.random() * (hi - lo))); };
      timers.push(window.setTimeout(run, first));
    };
    every(() => {                                        // metal creak
      const t = c.currentTime + 0.02, d = 1.2 + Math.random();
      const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(80 + Math.random() * 60, t); o.frequency.linearRampToValueAtTime(50 + Math.random() * 40, t + d);
      const b = c.createBiquadFilter(); b.type = "bandpass"; b.frequency.setValueAtTime(900, t); b.frequency.linearRampToValueAtTime(400, t + d); b.Q.value = 9;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + d * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(b); b.connect(g); g.connect(bus); o.start(t); o.stop(t + d + 0.05);
    }, 9000, 17000, 4000);
    every(() => {                                        // a far-away wail through the vents
      const t = c.currentTime + 0.05, d = 3 + Math.random() * 1.5, f = 380 + Math.random() * 220;
      const o = c.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.35, t + d * 0.35); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + d);
      const v = c.createOscillator(); v.frequency.value = 5.5; const vg = c.createGain(); vg.gain.value = f * 0.02; v.connect(vg); vg.connect(o.frequency);
      const b = c.createBiquadFilter(); b.type = "bandpass"; b.frequency.value = 900; b.Q.value = 3;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + d * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(b); b.connect(g); g.connect(verb); o.start(t); o.stop(t + d + 0.1); v.start(t); v.stop(t + d + 0.1);
    }, 22000, 38000, 9000);
    every(() => {                                        // whispering air
      const t = c.currentTime + 0.02, d = 1.6 + Math.random();
      burst(c, verb, t, d, (x) => Math.sin(Math.PI * x) * (0.6 + 0.4 * Math.sin(x * 40)), [{ type: "bandpass", f: 1500 + Math.random() * 1500, q: 4, to: [[900, d]] }], 0.05, [0.4, 1.6], [30, 90]);
    }, 14000, 26000, 7000);
    return {
      duck: (on: boolean) => { duckG.gain.setTargetAtTime(on ? 0.3 : 1, c.currentTime, 0.3); },
      stop: () => {
        alive = false; timers.forEach((id) => window.clearTimeout(id));
        const t = c.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        window.setTimeout(() => { nodes.forEach((n) => { try { n.stop(); } catch { /* stopped */ } }); try { out.disconnect(); } catch { /* gone */ } }, 900);
      },
    };
  } catch { return none; }
}
/** A glass tube flickering: off = short electric crackle, on = buzzing re-strike. */
export function playTubeFlicker(on: boolean, pan = 0) {
  try {
    const m = master(on ? 0.06 : 0.045); if (!m) return; const { c, out, t } = m;
    const p = c.createStereoPanner(); p.pan.value = pan; out.disconnect(); out.connect(p); p.connect(c.destination);
    if (on) { zap(c, out, t, 0.14, 0.5); tone(c, out, t + 0.02, 120, 0.12, 0.25, "square"); }
    else burst(c, out, t, 0.06, (x) => (x < 0.2 ? 1 : 0.3), [{ type: "highpass", f: 2000 }], 0.6, [0.2, 1.8], [2, 6]);
  } catch { /* sound is optional */ }
}
