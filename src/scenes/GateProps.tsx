import { useEffect, useRef, useState, type CSSProperties } from "react";
import { playBubblePop, playDrip, playValveTurn, startPour } from "@/lib/fileSounds";

// Gate scene additions drawn over the art (all coordinates in the 3840x1800 canvas):
// devil-silhouette logo on the lab sign, wall first-aid kit, the new background's live
// gauges + flowing liquid, and the faucet you can open.

const box = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: `${x / 38.4}%`, top: `${y / 18}%`, width: `${w / 38.4}%`, height: `${h / 18}%` });

// sign patch: biohazard painted out and the devil silhouette printed in its place (drip stays on top)
const SIGN_LOGO = "/scene/inline/gp-0.webp";
export function SignLogo() {
  return <img className="gate-layer gate-sign-logo" src={SIGN_LOGO} alt="" style={box(1788, 698, 126, 132)} draggable={false} />;
}

// wall first-aid box (firstaidbox.webp / openfirstaidbox.webp, toned to the room). Opened, there is nothing inside.
const KIT_BOX = box(2455, 272, 250, 128);
export function FirstAidKit({ open = false }: { open?: boolean }) {
  return (
    <>
      <img className="gate-layer gate-kit-img" src="/scene/kit-closed.webp" alt="" draggable={false} style={{ ...KIT_BOX, visibility: open ? "hidden" : "visible" }} />
      <img className="gate-layer gate-kit-img" src="/scene/kit-open.webp" alt="" draggable={false} style={{ ...KIT_BOX, visibility: open ? "visible" : "hidden" }} />
    </>
  );
}

// ---------------------------------------------------------------- background gauges + liquid
// The three dials of background_3840x1800.webp with their drawn needles painted out, plus live needles.
const DIALS = [
  { ...{ x: 1902, y: 92, s: 104, px: 1953.75, py: 143.75, img: "/scene/inline/gp-1.webp" }, r: 48, kind: "a", color: "#231b1d", cap: "#5d1b24" },
  { ...{ x: 2095, y: 55, s: 92, px: 2141, py: 101, img: "data:image/webp;base64,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" }, r: 42, kind: "b", color: "#231b1d", cap: "#5d1b24" },
  { ...{ x: 1025, y: 257, s: 88, px: 1068.75, py: 301.25, img: "data:image/webp;base64,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" }, r: 38, kind: "c", color: "#1d2a1a", cap: "#1d2a1a" },
] as const;
// green flow streaks along the pipes' glowing seams (canvas px)
const FLOWS = [
  { d: "M1505 293 L2205 293", dur: 2.6 },
  { d: "M2530 476 L3455 476", dur: 3.4 },
  { d: "M2530 438 L3455 438", dur: 4.1 },
  { d: "M0 436 L1300 436", dur: 5 },
  { d: "M926 60 L926 440", dur: 2.2 },
  { d: "M2292 150 L2292 232", dur: 1.4 },
];
// glass sections full of serum: bubbles rise inside
const GLASS = [{ x: 1550, y: 74, w: 46, h: 112 }, { x: 2266, y: 44, w: 54, h: 102 }];

export function GateBackdrop() {
  return (
    <>
      {DIALS.map((g, i) => (
        <span key={i} className="gb-dial" aria-hidden="true" style={box(g.x, g.y, g.s, g.s)}>
          <img src={g.img} alt="" draggable={false} />
          <svg viewBox="-1 -1 2 2" style={{ left: `${((g.px - g.r) - g.x) / g.s * 100}%`, top: `${((g.py - g.r) - g.y) / g.s * 100}%`, width: `${(2 * g.r) / g.s * 100}%`, height: `${(2 * g.r) / g.s * 100}%` }}>
            <g className={"gb-needle " + g.kind}>
              <polygon points="-0.07,0.14 0.07,0.14 0.03,-0.9 -0.03,-0.9" fill={g.color} />
            </g>
            <circle r="0.17" fill={g.cap} stroke="#0d0b0c" strokeWidth="0.05" />
            <circle r="0.06" cx="-0.04" cy="-0.04" fill="rgba(255,255,255,.35)" />
          </svg>
        </span>
      ))}
      <svg className="gate-props gb-flow" viewBox="0 0 3840 1800" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          {GLASS.map((g, i) => <clipPath key={i} id={"gbGlass" + i}><rect x={g.x} y={g.y} width={g.w} height={g.h} rx="10" /></clipPath>)}
        </defs>
        {FLOWS.map((f, i) => <path key={i} d={f.d} className="gb-stream" style={{ animationDuration: `${f.dur}s` }} />)}
        {GLASS.map((g, i) => (
          <g key={i} clipPath={`url(#gbGlass${i})`}>
            <rect x={g.x} y={g.y} width={g.w} height={g.h} className="gb-glow" style={{ animationDelay: `${-i * 0.7}s` }} />
            {[0.18, 0.42, 0.66, 0.3, 0.8, 0.55].map((fx, k) => (
              <circle key={k} className="gb-bubble" cx={g.x + g.w * fx} cy={g.y + g.h} r={2.5 + (k % 3)}
                style={{ animationDelay: `${-(k * 0.37 + i * 0.2)}s`, animationDuration: `${1.6 + (k % 3) * 0.45}s`, "--rise": `${-(g.h + 12)}px` } as CSSProperties} />
            ))}
          </g>
        ))}
      </svg>
    </>
  );
}

// ---------------------------------------------------------------- the faucet by the restricted door
// Click the wheel: it turns, serum pours out of the open pipe end, pools on the floor and boils
// away into smoke. It closes itself after a few seconds (or click again to close it sooner).
const FAUCET_BODY = "/scene/inline/gp-2.webp";
const FAUCET_WHEEL = "data:image/webp;base64,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";
const OUTLET = { x: 3202, y: 1440 };
const FLOOR_Y = 1522;
type Puff = { id: number; dx: number; s: number; d: number };
let puffId = 0;

export function Faucet({ tabIndex, onTag, onOpen }: { tabIndex: number; onTag?: (on: boolean) => void; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  const [spin, setSpin] = useState(0);
  const [pool, setPool] = useState(0);           // 0..1 puddle size
  const [puffs, setPuffs] = useState<Puff[]>([]);
  const auto = useRef(0);
  const toggle = () => {
    setSpin((s) => s + 1); playValveTurn();
    if (!open) onOpen?.();
    setOpen((o) => {
      window.clearTimeout(auto.current);
      if (!o) auto.current = window.setTimeout(() => { setOpen(false); setSpin((s) => s + 1); playValveTurn(); }, 6500);
      return !o;
    });
  };
  useEffect(() => () => window.clearTimeout(auto.current), []);
  useEffect(() => { if (!open) return; return startPour(); }, [open]);
  // the puddle fills while it pours and boils away when it stops
  useEffect(() => {
    const id = window.setInterval(() => setPool((p) => Math.max(0, Math.min(1, p + (open ? 0.05 : -0.035)))), 100);
    return () => window.clearInterval(id);
  }, [open]);
  // smoke rises off the puddle as long as there is one
  const steaming = pool > 0.02;
  useEffect(() => {
    if (!steaming) return;
    const id = window.setInterval(() => setPuffs((p) => [...p.slice(-28), { id: ++puffId, dx: Math.random() * 2 - 1, s: 0.7 + Math.random() * 0.8, d: 2 + Math.random() * 1.2 }]), 130);
    return () => window.clearInterval(id);
  }, [steaming]);
  const gone = (id: number) => setPuffs((p) => p.filter((x) => x.id !== id));
  return (
    <>
      <img className="gate-layer gate-faucet" src={FAUCET_BODY} alt="" style={box(3190, 1290, 426, 204)} draggable={false} />
      <img className={"gate-layer gate-faucet-wheel" + (spin ? " turn" : "")} key={spin} src={FAUCET_WHEEL} alt="" style={box(3214, 1292, 124, 56)} draggable={false} />
      <svg className={"gate-props gate-pour" + (open ? " on" : "")} viewBox="0 0 3840 1800" preserveAspectRatio="none" aria-hidden="true">
        <path className="pour-stream" d={`M${OUTLET.x} ${OUTLET.y} Q${OUTLET.x - 46} ${OUTLET.y + 4} ${OUTLET.x - 58} ${FLOOR_Y}`} />
        <path className="pour-core" d={`M${OUTLET.x} ${OUTLET.y} Q${OUTLET.x - 46} ${OUTLET.y + 4} ${OUTLET.x - 58} ${FLOOR_Y}`} />
        <ellipse className="pour-pool" cx={OUTLET.x - 62} cy={FLOOR_Y + 4} rx={8 + pool * 92} ry={3 + pool * 15} opacity={pool > 0 ? 0.25 + pool * 0.7 : 0} />
      </svg>
      <span className="gate-smoke" style={{ left: `${(OUTLET.x - 62) / 38.4}%`, top: `${FLOOR_Y / 18}%` }} aria-hidden="true">
        {puffs.map((p) => (
          <i key={p.id} onAnimationEnd={() => gone(p.id)} style={{ "--dx": p.dx, "--ps": p.s, animationDuration: `${p.d}s` } as CSSProperties} />
        ))}
      </span>
      <button type="button" className="faucet-hit" style={box(3200, 1286, 150, 160)} tabIndex={tabIndex}
        aria-label={open ? "Close the valve" : "Open the valve"} onClick={toggle}
        onPointerEnter={() => onTag?.(true)} onPointerLeave={() => onTag?.(false)} onFocus={() => onTag?.(true)} onBlur={() => onTag?.(false)} />
    </>
  );
}

// ---------------------------------------------------------------- slime dripping off the doors
// Tips are the drawn drip ends (found in the door art). Each one slowly swells a droplet, lets it
// fall to the floor and splash, on its own random rhythm.
type Tip = [number, number];
const LOCK_TIPS: Tip[] = [[1782, 656], [2174, 626], [2396, 754], [1858, 771], [1736, 957], [2159, 996], [2290, 1034], [1972, 1239], [2158, 1279], [1767, 1320]];
const CLOSED_TIPS: Tip[] = [[2959, 888], [2850, 985], [2927, 1137], [2884, 1298], [3194, 1070], [3210, 1260], [3281, 968], [3047, 1365], [2730, 854]];
const OPEN_TIPS: Tip[] = [[2959, 888], [2840, 984], [2895, 1136], [2865, 1298], [3214, 1070], [3280, 966], [3223, 1247], [2730, 853]];
const FLOOR = 1592;
const rnd = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
// progress (0..1) of an element's first running CSS animation: sounds follow the real animation, whatever
// paused or restarted it (scene hidden, tab in the background, etc.)
function loopPhase(el: Element | null | undefined): number | null {
  const a = el?.getAnimations?.()[0];
  const p = a?.effect?.getComputedTiming().progress;
  return typeof p === "number" ? p : null;
}

function DripSet({ tips, className, seed, sound }: { tips: Tip[]; className?: string; seed: number; sound: boolean }) {
  // a plink exactly when a drop touches the floor (dripFall reaches the floor at 91% of its loop)
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sound) return;
    const timers: number[] = [];
    tips.forEach(([x], i) => {
      const dur = 7 + rnd(i, seed) * 7;
      const next = () => {
        const phase = loopPhase(box.current?.children[i]?.querySelector("i"));
        if (phase === null) { timers.push(window.setTimeout(next, 500)); return; }
        let dt = ((((0.912 - phase) % 1) + 1) % 1) * dur;
        if (dt < 0.05) dt += dur;
        timers.push(window.setTimeout(() => { playDrip((x / 3840) * 2 - 1, 0.6 + rnd(i, seed + 3) * 0.6); timers.push(window.setTimeout(next, 120)); }, dt * 1000));
      };
      next();
    });
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [sound, tips, seed]);
  return (
    <div ref={box} className={"gate-drips " + (className ?? "")} aria-hidden="true">
      {tips.map(([x, y], i) => {
        const dur = 7 + rnd(i, seed) * 7, delay = -rnd(i, seed + 1) * dur;   // one drop every 7-14 s per tip
        const floor = FLOOR + (rnd(i, seed + 2) - 0.5) * 24;
        const st = { left: `${x / 38.4}%`, top: `${y / 18}%`, "--fall": `${(floor - y) / 38.4}cqw`, animationDuration: `${dur}s`, animationDelay: `${delay}s` } as CSSProperties;
        return (
          <span key={i} className="gate-drip" style={st}>
            <i style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }} />
            <b style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }} />
          </span>
        );
      })}
    </div>
  );
}
export function SlimeDrips({ live, doorOpen }: { live: boolean; doorOpen: boolean }) {
  return (
    <>
      <DripSet tips={LOCK_TIPS} seed={1} sound={live} />
      <DripSet tips={CLOSED_TIPS} className="slime-closed" seed={7} sound={live && !doorOpen} />
      <DripSet tips={OPEN_TIPS} className="slime-open-layer" seed={13} sound={live && doorOpen} />
    </>
  );
}

// ---------------------------------------------------------------- the keypad beside the cloning vessel = EXIT (back to the home page)
export function HomePad({ tabIndex, onHome, onTag }: { tabIndex: number; onHome: () => void; onTag?: (on: boolean) => void }) {
  return (
    <>
      <span className="gate-homepad-screen" style={box(1188, 870, 63, 30)} aria-hidden="true"><b>EXIT</b></span>
      <button type="button" className="gate-homepad" style={box(1172, 855, 104, 126)} tabIndex={tabIndex} aria-label="Exit to the home page" onClick={onHome}
        onPointerEnter={() => onTag?.(true)} onPointerLeave={() => onTag?.(false)} onFocus={() => onTag?.(true)} onBlur={() => onTag?.(false)} />
    </>
  );
}

// ---------------------------------------------------------------- cloning vessel: the art's own bubbles, set free
// The painted bubbles were lifted out of clonebase.webp (vessel-clean.webp is the tank with them inpainted away)
// and cut into an atlas (vessel-bubbles.webp). Each one starts where the artist drew it, rises to the surface,
// pops, and comes back up from the bottom. About half drift behind the specimen, the rest in front of it.
// Row: [centre x, centre y, w, h, atlas x, atlas y] in canvas px.
const VB_ATLAS = [256, 128];
const VB_ART: [number, number, number, number, number, number][] = [
  [816.0, 843.5, 18, 21, 114, 65],
  [917.0, 849.5, 16, 17, 194, 89],
  [928.5, 865.0, 17, 18, 120, 89],
  [929.5, 881.5, 23, 25, 79, 37],
  [924.5, 917.5, 15, 15, 74, 110],
  [699.0, 929.5, 16, 15, 90, 110],
  [928.0, 943.0, 24, 26, 25, 37],
  [714.0, 943.5, 22, 25, 103, 37],
  [823.0, 950.0, 14, 12, 202, 110],
  [701.0, 1015.0, 12, 14, 123, 110],
  [967.0, 1024.0, 12, 14, 136, 110],
  [957.5, 1041.0, 31, 36, 0, 0],
  [940.0, 1050.0, 18, 18, 138, 89],
  [658.5, 1069.0, 23, 28, 184, 0],
  [953.0, 1097.5, 22, 25, 126, 37],
  [692.5, 1106.5, 23, 21, 133, 65],
  [685.5, 1131.5, 25, 27, 208, 0],
  [651.0, 1131.5, 10, 13, 163, 110],
  [944.0, 1139.5, 18, 19, 45, 89],
  [710.5, 1151.0, 31, 30, 67, 0],
  [757.0, 1147.0, 16, 18, 157, 89],
  [943.0, 1163.0, 28, 30, 99, 0],
  [710.0, 1187.0, 22, 24, 195, 37],
  [671.5, 1187.5, 15, 17, 211, 89],
  [811.5, 1197.5, 19, 21, 157, 65],
  [921.0, 1200.5, 20, 27, 234, 0],
  [682.0, 1200.5, 14, 13, 174, 110],
  [718.5, 1204.0, 19, 18, 174, 89],
  [795.5, 1210.5, 17, 17, 227, 89],
  [889.5, 1210.5, 19, 19, 64, 89],
  [675.0, 1219.5, 20, 25, 149, 37],
  [816.5, 1216.0, 15, 16, 58, 110],
  [694.5, 1217.0, 13, 12, 217, 110],
  [863.0, 1228.5, 34, 33, 32, 0],
  [717.0, 1224.5, 22, 23, 0, 65],
  [790.5, 1230.0, 17, 20, 195, 65],
  [700.0, 1227.5, 12, 13, 189, 110],
  [895.0, 1239.5, 18, 19, 84, 89],
  [700.0, 1243.5, 16, 17, 0, 110],
  [681.0, 1253.5, 28, 29, 128, 0],
  [808.0, 1253.0, 16, 20, 213, 65],
  [781.0, 1258.0, 24, 24, 218, 37],
  [872.5, 1258.5, 23, 23, 23, 65],
  [724.0, 1263.5, 24, 25, 170, 37],
  [882.5, 1279.0, 21, 22, 69, 65],
  [708.0, 1283.5, 16, 19, 103, 89],
  [856.0, 1284.0, 22, 22, 91, 65],
  [967.5, 1286.5, 21, 17, 17, 110],
  [727.5, 1290.5, 21, 23, 47, 65],
  [815.5, 1291.0, 19, 20, 230, 65],
  [739.5, 1290.0, 13, 14, 149, 110],
  [927.0, 1304.5, 24, 27, 0, 37],
  [857.0, 1306.0, 28, 26, 50, 37],
  [741.5, 1305.5, 17, 21, 177, 65],
  [730.5, 1305.5, 15, 15, 107, 110],
  [784.0, 1310.0, 18, 20, 0, 89],
  [884.0, 1318.5, 26, 29, 157, 0],
  [754.5, 1325.0, 25, 20, 19, 89],
  [825.0, 1324.5, 18, 17, 39, 110],
  [751.0, 1330.5, 14, 9, 231, 110],
];
const VB = { x: 646, y: 800, w: 344, h: 535, surface: 816, floor: 1325 };
export const VESSEL_CLEAN_BOX = box(VB.x, VB.y, VB.w, VB.h);
type VBub = { i: number; cx: number; w: number; h: number; ax: number; ay: number; dur: number; delay: number; rise: number; back: boolean };
const VBUBS: VBub[] = VB_ART.map(([cx, cy, w, h, ax, ay], i) => {
  const start = VB.floor - h / 2, end = VB.surface + h / 2;
  const dur = Math.max(3.6, 7.2 - (Math.max(w, h) - 10) * 0.12) + rnd(i, 41) * 1.4;   // big bubbles rise faster
  const p0 = Math.min(0.88, Math.max(0, (start - cy) / (start - end))) * 0.9;           // where it sits in the art = where its loop starts
  return { i, cx, w, h, ax, ay, dur, delay: -p0 * dur, rise: ((end - start) / VB.h) * 100, back: rnd(i, 42) < 0.55 };
});
export function VesselBubbles({ live, layer }: { live: boolean; layer: "back" | "front" }) {
  const born = useRef(performance.now());
  const list = VBUBS.filter((b) => b.back === (layer === "back"));
  useEffect(() => {
    if (!live) return;
    const timers: number[] = [];
    VBUBS.forEach((b) => {                                            // the pops for both layers live on one instance
      if (b.i % 3 !== 0 && Math.max(b.w, b.h) < 20) return;           // only about a third of them make a sound
      const next = () => {
        const phase = loopPhase(document.querySelector(`.vessel-bubbles .vb[data-i="${b.i}"]`));
        if (phase === null) { timers.push(window.setTimeout(next, 500)); return; }
        let dt = ((((0.9 - phase) % 1) + 1) % 1) * b.dur;
        if (dt < 0.05) dt += b.dur;
        timers.push(window.setTimeout(() => { playBubblePop(Math.min(1, Math.max(b.w, b.h) / 26), -0.55 + ((b.cx - VB.x) / VB.w) * 0.2); timers.push(window.setTimeout(next, 120)); }, dt * 1000));
      };
      next();
    });
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [live]);
  return (
    <div className={"gate-layer vessel-bubbles " + layer} style={VESSEL_CLEAN_BOX} aria-hidden="true">
      {list.map((b) => (
        <i key={b.i} data-i={b.i} className="vb" style={{
          left: `${((b.cx - b.w / 2 - VB.x) / VB.w) * 100}%`, top: `${((VB.floor - b.h - VB.y) / VB.h) * 100}%`,
          width: `${(b.w / VB.w) * 100}%`, height: `${(b.h / VB.h) * 100}%`,
          backgroundSize: `${(VB_ATLAS[0]! / b.w) * 100}% ${(VB_ATLAS[1]! / b.h) * 100}%`,
          backgroundPosition: `${(b.ax / Math.max(1, VB_ATLAS[0]! - b.w)) * 100}% ${(b.ay / Math.max(1, VB_ATLAS[1]! - b.h)) * 100}%`,
          "--rise": `${b.rise}cqh`, animationDuration: `${b.dur}s, ${1.2 + rnd(b.i, 43) * 0.9}s`, animationDelay: `${b.delay}s, ${-rnd(b.i, 44) * 2}s`,
        } as CSSProperties} />
      ))}
    </div>
  );
}
