import { useEffect, useRef, useState } from "react";
import { art } from "@/lib/assets";
import { CFG, px, type Frame } from "./config";
import labDoor from "@/assets/fomies/LAB-LOCKDOWN.webp.asset.json";

const STOPS = CFG.GATE_STOPS;
const HOME = STOPS.indexOf("door");

type Props = {
  on: boolean;
  f: Frame;
  vw: number;
  portrait: boolean;
  onDoor: () => void;
  onFrame: () => void;
  onVent: () => void;
  onLab: () => void;
  onBathroom: () => void;
};

// the corridor. landscape shows the whole wall; portrait crops to one stop and swipes (placeGate).
export function Gate({ on, f, vw, portrait, onDoor, onFrame, onVent, onLab, onBathroom }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const [stop, setStop] = useState(HOME);
  const [drag, setDrag] = useState<number | null>(null);
  const sw = useRef<{ x: number; y: number; lx: number; base: number; lock: null | "x" | "y"; vx: number; t: number } | null>(null);
  const swiped = useRef(false);
  const c = CFG.art.canvas;
  const lo = vw - (f.ox + c.w * f.scale), hi = -f.ox;
  const shift = (s: number) => {
    const b = CFG.art[STOPS[s] ?? "door"];
    return Math.max(lo, Math.min(hi, vw / 2 - (f.ox + (b.x + b.w / 2) * f.scale)));
  };
  useEffect(() => { if (!portrait) setStop(HOME); }, [portrait]);
  const tx = !portrait ? 0 : drag ?? shift(stop);

  const down = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" || !portrait) return;
    sw.current = { x: e.clientX, y: e.clientY, lx: e.clientX, base: tx, lock: null, vx: 0, t: e.timeStamp };
  };
  const move = (e: React.PointerEvent) => {
    const g = sw.current; if (!g) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.lock) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; g.lock = Math.abs(dx) >= Math.abs(dy) ? "x" : "y"; }
    if (g.lock !== "x") return;
    const dt = e.timeStamp - g.t; if (dt > 0) g.vx = (e.clientX - g.lx) / dt;
    g.lx = e.clientX; g.t = e.timeStamp;
    let s = g.base + dx;
    if (s > hi) s = hi + (s - hi) * 0.3; else if (s < lo) s = lo + (s - lo) * 0.3;
    setDrag(s);
  };
  const up = (e: React.PointerEvent) => {
    const g = sw.current; sw.current = null; if (!g || g.lock !== "x") return;
    const dx = (e.type === "pointercancel" ? g.lx : e.clientX) - g.x;
    swiped.current = true; setTimeout(() => (swiped.current = false), 400);
    if (Math.abs(dx) >= 60 || Math.abs(g.vx) >= 0.45) {
      const dir = Math.abs(dx) >= 60 ? dx : g.vx;
      setStop((s) => Math.max(0, Math.min(STOPS.length - 1, s + (dir < 0 ? 1 : -1))));
    }
    setDrag(null);
  };

  const act: Record<string, () => void> = { door: onDoor, frame: onFrame, vent: onVent, lab: onLab, bathroom: onBathroom };
  const labels: Record<string, string> = { door: "department of fomo", frame: "public notice", vent: "the vent", lab: "laboratory door", bathroom: "wc" };
  const whole = px({ x: 0, y: 0, w: c.w, h: c.h }, f);
  const hit = (k: string) => (
    <button key={k} type="button" className="hit" aria-label={labels[k]} style={px(CFG.art[k], f)}
      onPointerEnter={() => setHover(k)} onPointerLeave={() => setHover(null)}
      onFocus={() => setHover(k)} onBlur={() => setHover(null)}
      onClick={() => { if (!swiped.current) act[k]?.(); }} tabIndex={on ? 0 : -1} />
  );
  return (
    <section id="s-gate" className={"scene" + (on ? " on" : "")} aria-hidden={!on}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div id="gate-stage" style={{ transform: tx ? `translateX(${tx.toFixed(1)}px)` : undefined, transition: drag !== null ? "none" : undefined }}>
        <img className="layer full" src={art("bg.webp")} alt="" style={whole} draggable={false} />
        <img className="layer crop" src={art("hit-bathroom.webp")} alt="" style={px(CFG.art.bathroom, f)} draggable={false} />
        <img id="hi-bathroom" className={"layer crop hi" + (hover === "bathroom" ? " on" : "")} src={art("hover-bathroom.webp")} alt="" style={px(CFG.art.bathroom, f)} draggable={false} />
        <img id="hi-frame" className={"layer crop" + (hover === "frame" ? " on" : "")} src={art("hit-disclaimer.png")} alt="" style={px(CFG.art.frame, f)} draggable={false} />
        <img className="layer crop" src={art("hit-room.webp")} alt="" style={px(CFG.art.door, f)} draggable={false} />
        <img id="hi-door" className={"layer crop hi" + (hover === "door" ? " on" : "")} src={art("hover-room.webp")} alt="" style={px(CFG.art.door, f)} draggable={false} />
        <img id="hi-vent" className={"layer crop" + (hover === "vent" ? " peek" : "")} src={art("hit-vent.webp")} alt="" style={px(CFG.art.vent, f)} draggable={false} />
        <img className="layer crop" src={`https://project--c6a959cc-e1f1-46a3-b9dd-2dadabdbb271.lovable.app${labDoor.url}`} alt="" style={px(CFG.art.lab, f)} draggable={false} />
        {STOPS.map(hit)}
      </div>
    </section>
  );
}
