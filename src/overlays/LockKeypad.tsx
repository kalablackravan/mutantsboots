import { useEffect, useRef, useState } from "react";
import { playDenyBuzz, playKeyBeep } from "@/lib/fileSounds";

// The lockdown door's keypad, brought up close. Only fingers / the mouse can press it (no typing on the
// keyboard). Any 4-digit code is refused for now: NO ACCESS, then it goes away.
// Positions are in the keypad art's own pixels (Rusty Access Denied Keypad, 1027 x 1531).
const W = 1027, H = 1531;
const COLS = [354, 520, 686], ROWS = [520, 640, 762, 884], BW = 150, BH = 104;
const KEYS = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["*", "0", "#"]];
const pct = (x: number, y: number, w: number, h: number) => ({ left: `${((x - w / 2) / W) * 100}%`, top: `${((y - h / 2) / H) * 100}%`, width: `${(w / W) * 100}%`, height: `${(h / H) * 100}%` });

export function LockKeypad({ open, onClose, onDenied }: { open: boolean; onClose: () => void; onDenied?: () => void }) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "denied">("idle");
  const [pressed, setPressed] = useState<string | null>(null);
  const timer = useRef(0);
  useEffect(() => {
    if (!open) { setCode(""); setState("idle"); return; }
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("keydown", esc); window.clearTimeout(timer.current); };
  }, [open, onClose]);
  const press = (k: string) => {
    if (state === "denied") return;
    setPressed(k); window.setTimeout(() => setPressed((p) => (p === k ? null : p)), 130);
    playKeyBeep();
    if (k === "*" || k === "#") return;
    const next = (code + k).slice(0, 4);
    setCode(next);
    if (next.length === 4) {
      timer.current = window.setTimeout(() => {
        setState("denied"); playDenyBuzz(); onDenied?.();
        timer.current = window.setTimeout(onClose, 1500);
      }, 250);
    }
  };
  const clear = () => { if (state === "denied") return; setPressed("clear"); window.setTimeout(() => setPressed(null), 160); playKeyBeep(); setCode(""); };
  if (!open) return null;
  return (
    <div className="lockpad" role="dialog" aria-label="Door keypad" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lockpad-box">
        <img src="/scene/keypad-denied.webp" alt="" draggable={false} />
        <div className={"lockpad-screen" + (state === "denied" ? " denied" : "")} style={pct(528, 307, 452, 228)}>
          {state === "denied" ? <b>NO ACCESS</b> : (
            <>
              <small>ENTER CODE</small>
              <b>{[0, 1, 2, 3].map((i) => (i < code.length ? "•" : "_")).join(" ")}</b>
            </>
          )}
        </div>
        {KEYS.map((row, r) => row.map((k, c) => (
          <button key={k} type="button" tabIndex={-1} className={"lockpad-key" + (pressed === k ? " down" : "")}
            style={pct(COLS[c]!, ROWS[r]!, BW, BH)} aria-label={k} onPointerDown={(e) => { e.preventDefault(); press(k); }} />
        )))}
        <button type="button" tabIndex={-1} className={"lockpad-key round" + (pressed === "clear" ? " down" : "")} style={pct(512, 1140, 190, 190)}
          aria-label="clear" onPointerDown={(e) => { e.preventDefault(); clear(); }} />
        <button type="button" className="lockpad-close" onClick={onClose} aria-label="Close keypad">×</button>
      </div>
    </div>
  );
}
