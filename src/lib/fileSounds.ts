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
  try {
    const m = master(0.5); if (!m) return; const { c, out } = m; const t = m.t + delay;
    const soft = c.createBiquadFilter(); soft.type = "lowpass"; soft.frequency.value = 8000; soft.connect(out);
    thump(c, soft, t, 70, 32, 0.4, 1.0);                                                                      // heavy body hits
    thump(c, soft, t + 0.01, 160, 80, 0.12, 0.5);
    burst(c, soft, t, 0.18, (x) => (x < 0.05 ? x / 0.05 : Math.pow(1 - x, 2)), [{ type: "lowpass", f: 1200, to: [[300, 0.18]] }], 1.0, [0.8, 1.2]); // implosion
    burst(c, soft, t + 0.02, 0.08, (x) => Math.pow(1 - x, 3), [{ type: "highpass", f: 1600 }], 0.9, [1, 1]);  // glass crack
    for (let i = 0; i < 22; i++) {                                                                            // glass shards
      const at = t + 0.03 + Math.pow(Math.random(), 1.6) * 0.6;
      const f = 1800 + Math.random() * 3200, dur = 0.04 + Math.random() * 0.08;
      const lvl = Math.max(0.004, (0.04 + Math.random() * 0.08) * (1 - (at - t) / 0.75));
      const o = c.createOscillator(); o.type = "sine"; o.frequency.value = f;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(lvl, at + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g); g.connect(soft); o.start(at); o.stop(at + dur + 0.02);
    }
    // electrical sparks: crackly buzz bursts that fade out
    for (let i = 0; i < 6; i++) {
      const at = t + 0.12 + i * 0.09 + Math.random() * 0.05;
      burst(c, soft, at, 0.06 + Math.random() * 0.05, (x) => Math.pow(1 - x, 1.5), [{ type: "bandpass", f: 3500 + Math.random() * 2000, q: 2 }], 0.35 * (1 - i / 7), [0.1, 2], [1, 4]);
    }
    const hum = c.createOscillator(); hum.type = "sawtooth"; hum.frequency.value = 50;
    const hl = c.createBiquadFilter(); hl.type = "lowpass"; hl.frequency.value = 400;
    const hg = c.createGain(); hg.gain.setValueAtTime(0.0001, t + 0.05); hg.gain.exponentialRampToValueAtTime(0.12, t + 0.1); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    hum.connect(hl); hl.connect(hg); hg.connect(soft); hum.start(t + 0.05); hum.stop(t + 0.85);
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
