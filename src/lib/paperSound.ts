// A real-sounding page turn, synthesised with Web Audio (no audio file to host or load):
// a filtered paper swoosh with random flutter, then a soft slap as the sheet lands.
let ctx: AudioContext | null = null;

function noise(c: AudioContext, seconds: number, shape: (t: number) => number) {
  const n = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  let flutter = 1, next = 0;
  for (let i = 0; i < n; i++) {
    if (i >= next) { flutter = 0.55 + Math.random() * 0.9; next = i + Math.floor(c.sampleRate * (0.012 + Math.random() * 0.03)); }
    d[i] = (Math.random() * 2 - 1) * shape(i / n) * flutter;
  }
  return buf;
}

export function playPageTurn(volume = 0.55) {
  if (typeof window === "undefined") return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const c = ctx, t0 = c.currentTime + 0.01;
    const out = c.createGain(); out.gain.value = volume; out.connect(c.destination);

    // the sheet lifting and sweeping over
    const sw = c.createBufferSource();
    sw.buffer = noise(c, 0.62, (t) => (t < 0.12 ? t / 0.12 : Math.pow(1 - (t - 0.12) / 0.88, 1.6)) * (0.6 + 0.4 * Math.sin(Math.PI * t)));
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 500;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(1200, t0);
    bp.frequency.exponentialRampToValueAtTime(4200, t0 + 0.25);
    bp.frequency.exponentialRampToValueAtTime(1800, t0 + 0.62);
    sw.connect(hp).connect(bp).connect(out);
    sw.start(t0);

    // the page settling on the other side
    const sl = c.createBufferSource();
    sl.buffer = noise(c, 0.09, (t) => Math.pow(1 - t, 3));
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400;
    const g = c.createGain(); g.gain.value = 0.9;
    sl.connect(lp).connect(g).connect(out);
    sl.start(t0 + 0.82);
  } catch { /* sound is a nice-to-have */ }
}
