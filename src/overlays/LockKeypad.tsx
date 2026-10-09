import { useEffect, useRef, useState, type FormEvent } from "react";
import { playDenyBuzz, playKeyBeep } from "@/lib/fileSounds";
import { checkCode, cleanCode, type AccessKind } from "@/lib/access";

// Door keypad close-up (Rusty Access Denied Keypad, 1027 x 1531 art px).
//  mode "lock":   lockdown door. Fingers / mouse only; any 4 digits -> NO ACCESS.
//  mode "access": slime door. Type (or tap) an access code WL-/FM-XXXXXXXXXXXX; the red button checks it.
const SRC = "/scene/keypad-denied.webp";
const W = 1027, H = 1531;
const COLS = [354, 520, 686], ROWS = [520, 640, 762, 884], BW = 150, BH = 104;
const KEYS = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["*", "0", "#"]];
const pct = (x: number, y: number, w: number, h: number) => ({ left: `${((x - w / 2) / W) * 100}%`, top: `${((y - h / 2) / H) * 100}%`, width: `${(w / W) * 100}%`, height: `${(h / H) * 100}%` });
const MSG = { invalid: "CODE NOT VALID", used: "CODE ALREADY USED", slow: "TOO MANY TRIES, WAIT A BIT", down: "LAB LINK DOWN" } as const;

// the keypad art is decoded before the close-up shows, so the screen and the machine appear together
let artReady: Promise<void> | null = null;
export function preloadKeypad() {
  if (typeof window === "undefined") return Promise.resolve();
  artReady ??= new Promise<void>((res) => { const i = new Image(); i.src = SRC; i.decode().then(() => res(), () => res()); });
  return artReady;
}

export function LockKeypad({ open, onClose, mode = "lock", onGranted }: {
  open: boolean; onClose: () => void; mode?: "lock" | "access"; onGranted?: (a: { code: string; kind: AccessKind; wallet: string }) => void;
}) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "denied" | "checking" | "granted">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const timer = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) { setCode(""); setState("idle"); setMsg(null); setReady(false); return; }
    let live = true;
    void preloadKeypad().then(() => { if (live) { setReady(true); if (mode === "access") requestAnimationFrame(() => input.current?.focus()); } });
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => { live = false; window.removeEventListener("keydown", esc); window.clearTimeout(timer.current); };
  }, [open, onClose, mode]);

  const flash = (k: string) => { setPressed(k); window.setTimeout(() => setPressed((p) => (p === k ? null : p)), 130); playKeyBeep(); };
  const check = async () => {
    if (state === "checking" || state === "granted") return;
    const c = cleanCode(code);
    setState("checking"); setMsg(null);
    const r = await checkCode(c);
    if (r.ok) {
      setState("granted");
      timer.current = window.setTimeout(() => { onGranted?.({ code: c, kind: r.kind, wallet: r.wallet }); setCode(""); }, 900);
      return;
    }
    playDenyBuzz(); setState("idle"); setMsg(MSG[r.reason]);
  };
  const press = (k: string) => {
    if (mode === "lock") {
      if (state === "denied") return;
      flash(k);
      if (k === "*" || k === "#") return;
      const next = (code + k).slice(0, 4); setCode(next);
      if (next.length === 4) timer.current = window.setTimeout(() => { setState("denied"); playDenyBuzz(); timer.current = window.setTimeout(onClose, 1500); }, 250);
      return;
    }
    if (state === "checking" || state === "granted") return;
    flash(k); setMsg(null);
    if (k === "*") setCode((c) => c.slice(0, -1));            // * = delete
    else if (k === "#") setCode((c) => (c.length < 15 ? c + "-" : c));
    else setCode((c) => (c.length < 15 ? c + k : c));
  };
  const red = () => {
    if (mode === "lock") { if (state === "denied") return; flash("clear"); setCode(""); return; }
    flash("clear"); void check();
  };
  const submit = (e: FormEvent) => { e.preventDefault(); void check(); };
  if (!open) return null;
  return (
    <div className={"lockpad" + (ready ? "" : " waiting")} role="dialog" aria-label="Door keypad" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {ready && (
        <div className="lockpad-box">
          <img src={SRC} alt="" draggable={false} decoding="sync" />
          {mode === "lock" ? (
            <div className={"lockpad-screen" + (state === "denied" ? " denied" : "")} style={pct(528, 307, 452, 228)}>
              {state === "denied" ? <b>NO ACCESS</b> : (<><small>ENTER CODE</small><b>{[0, 1, 2, 3].map((i) => (i < code.length ? "•" : "_")).join(" ")}</b></>)}
            </div>
          ) : (
            <form className={"lockpad-screen access" + (state === "granted" ? " granted" : "") + (msg ? " denied" : "")} style={pct(528, 307, 452, 228)} onSubmit={submit}>
              <small>{state === "granted" ? "ACCESS GRANTED" : state === "checking" ? "CHECKING…" : msg ?? "ENTER ACCESS CODE"}</small>
              <input ref={input} value={code} onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/\s+/g, "").slice(0, 15)); setMsg(null); }}
                placeholder="WL-XXXXXXXXXXXX" spellCheck={false} autoComplete="off" autoCapitalize="characters" aria-label="Access code"
                disabled={state === "checking" || state === "granted"} />
            </form>
          )}
          {KEYS.map((row, r) => row.map((k, c) => (
            <button key={k} type="button" tabIndex={-1} className={"lockpad-key" + (pressed === k ? " down" : "")}
              style={pct(COLS[c]!, ROWS[r]!, BW, BH)} aria-label={k} onPointerDown={(e) => { e.preventDefault(); press(k); }} />
          )))}
          <button type="button" tabIndex={-1} className={"lockpad-key round" + (pressed === "clear" ? " down" : "")} style={pct(512, 1140, 190, 190)}
            aria-label={mode === "access" ? "enter" : "clear"} onPointerDown={(e) => { e.preventDefault(); red(); }} />
          <button type="button" className="lockpad-close" onClick={onClose} aria-label="Close keypad">×</button>
          {mode === "access" && <p className="lockpad-help">type your code from Discord · red button to enter · ✱ deletes · # types -</p>}
        </div>
      )}
    </div>
  );
}
