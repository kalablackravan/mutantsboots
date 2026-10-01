import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LAB_FX } from "./config";
import { playHangup, playPhoneRing, playPickup, playVoice } from "@/lib/fileSounds";

type Box = { left: number; top: number; width: number; height: number };
const at = (b: Box): CSSProperties => ({ left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%` });

// The wall phone. It rings a few seconds after you walk in. Pick up: "Leave... or die." and the line dies.
// Still in the lab 20 s later, it rings again. Pick up: "You are finished." and you are thrown out to the home page.
type Phase = "wait" | "ring1" | "talk1" | "quiet" | "ring2" | "talk2";
const FIRST_RING_MS = 3500;
const SECOND_RING_MS = 20000;

export function LabPhone({ on, paused, tabIndex, onTag }: { on: boolean; paused: boolean; tabIndex: number; onTag: (k: string | null) => void }) {
  const [phase, setPhase] = useState<Phase>("wait");
  const timer = useRef(0);
  const ringing = phase === "ring1" || phase === "ring2";

  // leaving the lab resets the story: next visit it rings once more from the start
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (!on) { setPhase("wait"); window.speechSynthesis?.cancel(); return; }
    if (phase === "wait") timer.current = window.setTimeout(() => setPhase("ring1"), FIRST_RING_MS);
    if (phase === "quiet") timer.current = window.setTimeout(() => setPhase("ring2"), SECOND_RING_MS);
    return () => window.clearTimeout(timer.current);
  }, [on, phase]);

  // the bell, every 3 s while it rings (silent while an item is open in front of you)
  useEffect(() => {
    if (!on || !ringing || paused) return;
    playPhoneRing();
    const id = window.setInterval(playPhoneRing, 3000);
    return () => window.clearInterval(id);
  }, [on, ringing, paused]);

  const pick = () => {
    if (!ringing) return;
    playPickup();
    if (phase === "ring1") {
      setPhase("talk1");
      window.setTimeout(() => playVoice("Leave... or die.", () => { playHangup(); setPhase("quiet"); }), 700);
    } else {
      setPhase("talk2");
      window.setTimeout(() => playVoice("You are finished.", () => {
        playHangup();
        window.setTimeout(() => window.location.assign("/"), 1300);
      }), 700);
    }
  };

  const p = LAB_FX.phone;
  return (
    <>
      <svg className={"lab-rings" + (ringing ? " on" : "")} style={at(p.rings)} viewBox="0 0 60 60" aria-hidden="true">
        <circle cx="10" cy="50" r="4.5" />
        <path d="M10 36 A14 14 0 0 1 24 50" />
        <path d="M10 25 A25 25 0 0 1 35 50" />
        <path d="M10 14 A36 36 0 0 1 46 50" />
      </svg>
      <span className={"lab-phone-led" + (ringing ? " on" : "")} style={{ left: `${p.led.x}%`, top: `${p.led.y}%` }} aria-hidden="true" />
      <button type="button" className={"lab-phone" + (ringing ? " ringing" : "") + (phase.startsWith("talk") ? " talking" : "")}
        style={at(p.hit)} tabIndex={tabIndex} aria-label={ringing ? "Answer the ringing phone" : "Wall phone"}
        onPointerEnter={() => onTag("phone")} onPointerLeave={() => onTag(null)} onFocus={() => onTag("phone")} onBlur={() => onTag(null)}
        onClick={pick} />
    </>
  );
}
