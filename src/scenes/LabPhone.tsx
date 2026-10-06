import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LAB_FX } from "./config";
import { playClip, playHangup, playPhoneBreak, playPhoneRing, playPhoneSpark, playPickup, SFX } from "@/lib/fileSounds";

type Box = { left: number; top: number; width: number; height: number };
const at = (b: Box): CSSProperties => ({ left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%` });
const box = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: `${x / 38.4}%`, top: `${y / 18}%`, width: `${w / 38.4}%`, height: `${h / 18}%` });

// The wall phone. It rings a few seconds after you walk in. Pick up: the call plays (telephone-call.mp3),
// the line goes dead and the phone blows apart on the wall. From then on it stays broken and smoking,
// across leaving the lab, going home and coming back. Only a page reload brings it back.
let BROKEN = false;
const listeners = new Set<() => void>();
function breakPhone() { BROKEN = true; listeners.forEach((f) => f()); }
export function usePhoneBroken() {
  const [b, setB] = useState(BROKEN);
  useEffect(() => { const f = () => setB(BROKEN); listeners.add(f); f(); return () => { listeners.delete(f); }; }, []);
  return b;
}

type Phase = "wait" | "ring" | "talk";
const FIRST_RING_MS = 3500;
// phone-intact.webp / phone-broken.webp: our own wall with the old phone + keypad taken off and the new
// phone (phone.webp / brokenphone.webp) mounted; the broken one also carries soot and cracks on the wall.
const PHONE_ART = box(1180, 700, 325, 400);
const SPARKS = [{ x: 1427, y: 909, d: 2.3 }, { x: 1452, y: 884, d: 3.1 }, { x: 1424, y: 956, d: 4.7 }];
const SMOKE = [{ x: 1427, y: 905 }, { x: 1424, y: 952 }];

export function LabPhone({ on, paused, tabIndex, onTag, onSay }: {
  on: boolean; paused: boolean; tabIndex: number; onTag: (k: string | null) => void;
  onSay: (line: string | null) => void; onBlackout?: () => void;
}) {
  const broken = usePhoneBroken();
  const [phase, setPhase] = useState<Phase>("wait");
  const [flash, setFlash] = useState(false);
  const timer = useRef(0);
  const busy = useRef(false);
  const ringing = phase === "ring" && !broken;
  const call = useRef<{ stop: () => void } | null>(null);
  const onRef = useRef(on); onRef.current = on;            // the call ends 12 s after the click: was the visitor still here?

  // walk in: a few seconds later it rings (never again once it is broken)
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (!on || broken) { if (!on && phase !== "wait") { const c = call.current; call.current = null; c?.stop(); setPhase("wait"); onSay(null); busy.current = false; } return; }
    if (phase === "wait") timer.current = window.setTimeout(() => setPhase("ring"), FIRST_RING_MS);
    return () => window.clearTimeout(timer.current);
  }, [on, phase, broken, onSay]);

  // the bell, every 3 s while it rings (silent while an item is open in front of you)
  useEffect(() => {
    if (!on || !ringing || paused) return;
    playPhoneRing();
    const id = window.setInterval(playPhoneRing, 3000);
    return () => window.clearInterval(id);
  }, [on, ringing, paused]);

  // pick up: the call plays, then the phone blows
  const pick = () => {
    if (broken) { playPhoneSpark(); return; }
    if (!ringing || busy.current) return;
    busy.current = true;
    playPickup();
    setPhase("talk");
    window.setTimeout(() => {
      onSay("▸ ON THE LINE…");
      const c = playClip(SFX.telephoneCall, 1); call.current = c;
      void c.done.then(() => {
        if (call.current !== c || !onRef.current) return;      // hung up by leaving the lab: no explosion
        call.current = null; onSay(null); busy.current = false;
        playHangup(); playPhoneBreak(); breakPhone();
        setFlash(true); window.setTimeout(() => setFlash(false), 450);
      });
    }, 600);
  };

  // while broken and you are in the room: a spark now and then, in time with the drawn sparks
  const born = useRef(performance.now());
  useEffect(() => {
    if (!on || !broken) return;
    const timers: number[] = [];
    SPARKS.forEach((s) => {
      const next = () => {
        const now = (performance.now() - born.current) / 1000;
        const phase = (now % s.d) / s.d;
        const dt = ((((0.93 - phase) % 1) + 1) % 1) * s.d || s.d;
        timers.push(window.setTimeout(() => { if (!paused) playPhoneSpark(); next(); }, dt * 1000));
      };
      next();
    });
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [on, broken, paused]);

  const p = LAB_FX.phone;
  return (
    <>
      <img className="gate-layer lab-phone-art" src="/scene/phone-intact.webp" alt="" draggable={false} style={{ ...PHONE_ART, visibility: broken ? "hidden" : "visible" }} />
      <img className="gate-layer lab-phone-art" src="/scene/phone-broken.webp" alt="" draggable={false} style={{ ...PHONE_ART, visibility: broken ? "visible" : "hidden" }} />
      {broken && (
        <>
          {SMOKE.map((m, k) => <div key={k} className={"phone-smoke s" + k} style={{ left: `${m.x / 38.4}%`, top: `${m.y / 18}%` }} aria-hidden="true"><i /><i /><i /><i /><i /></div>)}
          {SPARKS.map((s, i) => <span key={i} className="phone-spark" style={{ left: `${s.x / 38.4}%`, top: `${s.y / 18}%`, animationDuration: `${s.d}s` }} aria-hidden="true" />)}
        </>
      )}
      {flash && <span className="phone-flash" style={{ left: `${1427 / 38.4}%`, top: `${925 / 18}%` }} aria-hidden="true" />}
      {!broken && (
        <>
          <svg className={"lab-rings" + (ringing ? " on" : "")} style={at(p.rings)} viewBox="0 0 60 60" aria-hidden="true">
            <circle cx="10" cy="50" r="4.5" />
            <path d="M10 36 A14 14 0 0 1 24 50" />
            <path d="M10 25 A25 25 0 0 1 35 50" />
            <path d="M10 14 A36 36 0 0 1 46 50" />
          </svg>
        </>
      )}
      <button type="button" className={"lab-phone" + (ringing ? " ringing" : "") + (phase === "talk" ? " talking" : "")}
        aria-disabled={!ringing && !broken}
        style={at(p.hit)} tabIndex={tabIndex} aria-label={broken ? "Broken wall phone" : ringing ? "Answer the ringing phone" : "Wall phone"}
        onPointerEnter={() => onTag("phone")} onPointerLeave={() => onTag(null)} onFocus={() => onTag("phone")} onBlur={() => onTag(null)}
        onClick={pick} />
    </>
  );
}
