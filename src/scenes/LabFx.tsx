import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { LAB_FX } from "./config";
import { DEVIL_1, DEVIL_2 } from "@/lib/fileArt";
import { gaugeSound } from "@/lib/fileSounds";

type Box = { left: number; top: number; width: number; height: number };
const at = (b: Box): CSSProperties => ({ left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%` });

// ---------------------------------------------------------------- desk clipboard print
// clipboard.webp (2400x1792) is drawn at an angle. The page below is laid out flat in
// 1000x1300 page units and mapped onto the top sheet (TL 330,600 · TR 1280,200 · BL 1070,1380).
const PAGE = "matrix(0.95 -0.4 0.5692 0.6 330 600)";
export function ClipboardPrint({ box, hot }: { box: Box; hot: boolean }) {
  return (
    <svg className={"lab-print" + (hot ? " hot" : "")} style={at(box)} viewBox="0 0 2400 1792" preserveAspectRatio="none" aria-hidden="true">
      <g transform={PAGE}>
        <text className="lp-title" x="60" y="240" textLength="880" lengthAdjust="spacingAndGlyphs">MUTATION INJECTION</text>
        <text className="lp-title" x="60" y="330" textLength="440" lengthAdjust="spacingAndGlyphs">PROTOCOL</text>
        <text className="lp-body" x="60" y="400">Send your <tspan className="b">Zcash wallet</tspan>. This is a</text>
        <text className="lp-body" x="60" y="447">mutation core injection. If the</text>
        <text className="lp-body" x="60" y="494">virus accepts you, you <tspan className="b">mutate</tspan>. If</text>
        <text className="lp-body" x="60" y="541">not, you stay <tspan className="b">immune</tspan>.</text>

        <rect className="lp-dash" x="60" y="570" width="880" height="80" />
        <circle className="lp-n" cx="104" cy="610" r="24" /><text className="lp-nt" x="104" y="621">1</text>
        <text className="lp-body b" x="145" y="623">follow @mutatedfoots on X ↗</text>

        <circle className="lp-n dim" cx="104" cy="700" r="24" /><text className="lp-nt" x="104" y="711">2</text>
        <text className="lp-label" x="145" y="711">YOUR X USERNAME</text>
        <rect className="lp-input" x="60" y="735" width="880" height="75" />
        <text className="lp-ph" x="85" y="784">@your_x_username</text>

        <circle className="lp-n" cx="104" cy="850" r="24" /><text className="lp-nt" x="104" y="861">3</text>
        <text className="lp-label" x="145" y="861">SUBJECT WALLET</text>
        <rect className="lp-input" x="60" y="885" width="880" height="75" />
        <text className="lp-ph" x="85" y="934">Inject Zcash Wallet Here...</text>

        <rect className="lp-btn" x="60" y="990" width="880" height="85" />
        <rect className="lp-btn-edge" x="60" y="1069" width="880" height="7" />
        <text className="lp-btn-t" x="500" y="1050" textLength="640" lengthAdjust="spacingAndGlyphs">INITIATE INFECTION</text>

        <text className="lp-link" x="60" y="1130">already injected? check status ›</text>
        <rect className="lp-link-u" x="60" y="1139" width="620" height="4" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------- everything alive on the wall
export function LabFx({ live, onTag }: { live: boolean; onTag?: (k: string | null) => void }) {
  return (
    <>
      {LAB_FX.tubes.map((t, i) => (
        <span key={i} className="lab-tube" aria-hidden="true"
          style={{ ...at(t.box), "--tp": `${t.p}s`, "--td": `${t.d}s`, "--tc": t.c } as CSSProperties}>
          <b /><i />
        </span>
      ))}
      <Gauges live={live} />
      {LAB_FX.tvs.map((tv, i) => <Tv key={i} box={tv.box} devil={tv.devil} label={tv.label} />)}
      {LAB_FX.tanks.map((tk, i) => <Tank key={i} hit={tk.hit} valve={tk.valve} onHover={(h) => onTag?.(h ? "tank" + i : null)} />)}
    </>
  );
}

// ---------------------------------------------------------------- pressure gauges
// The drawn needles are painted over by a fresh dial; gauge 1 builds pressure and vents
// every cycle, and the hiss is fired from its own animation loop so sound and needle never drift.
const TICKS = Array.from({ length: 12 }, (_, k) => k * 30);
function Gauges({ live }: { live: boolean }) {
  const snd = useRef<ReturnType<typeof gaugeSound> | null>(null);
  useEffect(() => {
    if (!live) return;
    const s = gaugeSound(); snd.current = s; s.pulse();
    return () => { s.stop(); snd.current = null; };
  }, [live]);
  const again = useCallback(() => snd.current?.pulse(), []);
  return (
    <>
      {LAB_FX.gauges.map((g, i) => (
        <svg key={i} className="lab-gauge" viewBox="-1 -1 2 2" aria-hidden="true" style={{
          left: `${(g.cx - g.r) / 38.4}%`, top: `${(g.cy - g.r) / 18}%`, width: `${(2 * g.r) / 38.4}%`, height: `${(2 * g.r) / 18}%`,
        }}>
          <defs>
            <radialGradient id={`lgf${i}`} cx="45%" cy="40%" r="65%">
              <stop offset="0" stopColor="#b3c6c8" /><stop offset="1" stopColor="#8ea3a6" />
            </radialGradient>
          </defs>
          <circle r="0.92" fill={`url(#lgf${i})`} />
          {TICKS.map((a) => (
            <line key={a} className={"lg-tick" + (a === 120 ? " red" : "")} x1="0" y1="-0.62" x2="0" y2="-0.8" transform={`rotate(${a})`} />
          ))}
          <g className={"lg-needle " + g.kind + (live ? " run" : "")} onAnimationIteration={g.kind === "build" ? again : undefined}>
            <polygon points="-0.055,0.16 0.055,0.16 0.022,-0.76 -0.022,-0.76" />
          </g>
          <circle r="0.15" className="lg-pin" />
          <circle r="0.9" className="lg-glass" />
        </svg>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- CCTV feed in a TV screen
export function Tv({ box, devil, label, big = false }: { box?: Box; devil: 1 | 2; label: string; big?: boolean }) {
  return (
    <div className={"lab-tv" + (devil === 2 ? " night" : "") + (big ? " big" : "")} style={box ? at(box) : undefined} aria-hidden="true">
      <div className="tv-art"><img src={devil === 1 ? DEVIL_1 : DEVIL_2} alt="" draggable={false} /></div>
      <i className="tv-scan" /><i className="tv-noise" /><i className="tv-roll" />
      <span className="tv-rec"><i />REC</span><span className="tv-id">{label}</span>
      <b className="tv-focus" />
      <i className="tv-cut" /><i className="tv-glass" />
    </div>
  );
}

// ---------------------------------------------------------------- gas cylinders: smoke only while the cursor is on them
type Puff = { id: number; dx: number; s: number; d: number };
let puffId = 0;
function Tank({ hit, valve, onHover }: { hit: Box; valve: { x: number; y: number }; onHover?: (h: boolean) => void }) {
  const [on, setOn] = useState(false);
  const [puffs, setPuffs] = useState<Puff[]>([]);
  const touch = useRef(0);
  useEffect(() => {
    if (!on) return;
    const add = () => setPuffs((p) => [...p.slice(-36), { id: ++puffId, dx: Math.random() * 2.4 - 1.2, s: 0.8 + Math.random() * 0.7, d: 1.8 + Math.random() * 1.1 }]);
    add();
    const t = window.setInterval(add, 110);
    return () => window.clearInterval(t);
  }, [on]);
  useEffect(() => () => window.clearTimeout(touch.current), []);
  const gone = (id: number) => setPuffs((p) => p.filter((x) => x.id !== id));
  return (
    <>
      <span className="lab-tank-hit" style={at(hit)} aria-hidden="true"
        onPointerEnter={(e) => { if (e.pointerType === "mouse") { setOn(true); onHover?.(true); } }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") { setOn(false); onHover?.(false); } }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          setOn(true); window.clearTimeout(touch.current);
          touch.current = window.setTimeout(() => setOn(false), 1800);
        }} />
      <span className="lab-smoke" style={{ left: `${valve.x}%`, top: `${valve.y}%` }} aria-hidden="true">
        {puffs.map((p) => (
          <i key={p.id} onAnimationEnd={() => gone(p.id)}
            style={{ "--dx": p.dx, "--ps": p.s, animationDuration: `${p.d}s` } as CSSProperties} />
        ))}
      </span>
    </>
  );
}

// ---------------------------------------------------------------- wall keypad = EXIT
export function ExitPad({ tabIndex, onExit, onTag }: { tabIndex: number; onExit: () => void; onTag?: (k: string | null) => void }) {
  const p = LAB_FX.exitPad;
  return (
    <>
      <span className="lab-exitpad-screen" style={at(p.screen)} aria-hidden="true"><b>EXIT</b></span>
      <span className="lab-exitpad-key" style={at(p.key)} aria-hidden="true" />
      <button type="button" className="lab-exitpad" style={at(p.hit)} tabIndex={tabIndex} aria-label="Exit the lab" onClick={onExit}
        onPointerEnter={() => onTag?.("exit")} onPointerLeave={() => onTag?.(null)} onFocus={() => onTag?.("exit")} onBlur={() => onTag?.(null)} />
    </>
  );
}

// ---------------------------------------------------------------- dead machine by the gas tanks: OUT OF SERVICE
export function OutOfService() {
  const q = LAB_FX.oos;
  return (
    <svg className="lab-oos" style={at(q.box)} viewBox="0 0 152 76" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <clipPath id="oosClip"><polygon points={q.poly} /></clipPath>
        <pattern id="oosScan" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1.2" fill="rgba(0,0,0,.35)" /></pattern>
      </defs>
      <g clipPath="url(#oosClip)">
        <rect width="152" height="76" fill="#140405" />
        <g className="oos-glow">
          <circle cx="36" cy="38" r="15" fill="none" stroke="#ff4a3d" strokeWidth="4.2" />
          <line x1="25.4" y1="27.4" x2="46.6" y2="48.6" stroke="#ff4a3d" strokeWidth="4.2" />
          <text x="98" y="35" textAnchor="middle" className="oos-t">OUT OF</text>
          <text x="98" y="54" textAnchor="middle" className="oos-t">SERVICE</text>
        </g>
        <rect width="152" height="76" fill="url(#oosScan)" />
              </g>
    </svg>
  );
}
