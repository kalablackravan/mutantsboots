import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { playDenyBuzz, playKeyBeep } from "@/lib/fileSounds";
import { checkCode, type AccessKind } from "@/lib/access";

// Small "SECURE ACCESS TERMINAL" that pops up over a door's own code panel (not full screen).
//  mode "lock":   lockdown door, 4 boxes, every code -> NO ACCESS.
//  mode "access": slime door, [WL|FM]-[XXXX]-[XXXX]-[XXXX] boxes, CHECK -> /access/check.
// Typing, pasting and long-press paste go into one invisible input laid over the boxes.
const ART = "/scene/access-panel.webp";
const GROUPS = { access: [2, 4, 4, 4], lock: [4] } as const;
const MSG = { invalid: "CODE NOT VALID", used: "CODE ALREADY USED", slow: "TOO MANY TRIES", down: "LAB LINK DOWN" } as const;
type Grant = { code: string; kind: AccessKind; wallet: string; used?: boolean | undefined; x?: string | undefined; discord?: string | undefined };

let art: Promise<void> | null = null;
export function preloadAccessPanel() {
  if (typeof window === "undefined") return Promise.resolve();
  art ??= new Promise<void>((res) => { const i = new Image(); i.src = ART; i.decode().then(() => res(), () => res()); });
  return art;
}

export function AccessPanel({ open, mode, anchor, onClose, onGranted }: {
  open: boolean; mode: "lock" | "access"; anchor: { x: number; y: number }; onClose: () => void; onGranted?: (g: Grant) => void;
}) {
  const groups = GROUPS[mode];
  const total = groups.reduce((a, b) => a + b, 0);
  const [chars, setChars] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "granted" | "denied">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [focus, setFocus] = useState(false);
  const [ready, setReady] = useState(false);
  const [pos, setPos] = useState<CSSProperties>({ left: -9999, top: 0 });   // off-screen (not hidden: hidden inputs cannot take focus) until placed
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef(0);

  useEffect(() => {
    if (!open) { setChars(""); setState("idle"); setMsg(null); setReady(false); setPos({ left: -9999, top: 0 }); window.clearTimeout(timer.current); return; }
    let live = true;
    void preloadAccessPanel().then(() => { if (live) setReady(true); });
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => { live = false; window.removeEventListener("keydown", esc); };
  }, [open, onClose]);

  useEffect(() => { if (open && ready) input.current?.focus({ preventScroll: true }); }, [open, ready]);   // ready to type straight away

  // sit just above the door's own panel; stay on screen on small/narrow displays
  useLayoutEffect(() => {
    if (!open || !ready) return;
    const place = () => {
      const st = document.getElementById("gate-stage")?.getBoundingClientRect(); const el = box.current;
      if (!st || !el) return;
      const w = el.offsetWidth, h = el.offsetHeight;
      const ax = st.left + (anchor.x / 3840) * st.width, ay = st.top + (anchor.y / 1800) * st.height;
      const left = Math.min(Math.max(8, ax - w / 2), window.innerWidth - w - 8);
      const top = Math.min(Math.max(8, ay - h / 2), window.innerHeight - h - 8);   // over the door's own code panel
      setPos({ left, top });
    };
    place(); window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, ready, anchor.x, anchor.y]);

  const clean = (v: string) => (mode === "lock" ? v.replace(/\D/g, "") : v.toUpperCase().replace(/[^A-Z0-9]/g, "")).slice(0, total);
  const setFrom = (v: string) => { const c = clean(v); if (c.length > chars.length) playKeyBeep(); setChars(c); setMsg(null); if (state === "denied") setState("idle"); };
  const codeOf = (c: string) => { const out: string[] = []; let i = 0; for (const n of groups) { out.push(c.slice(i, i + n)); i += n; } return out.join("-"); };

  const check = async () => {
    if (state === "checking" || state === "granted") return;
    if (chars.length < total) { setMsg(mode === "lock" ? "ENTER 4 DIGITS" : "ENTER THE FULL CODE"); input.current?.focus(); return; }
    if (mode === "lock") {
      setState("denied"); setMsg("NO ACCESS"); playDenyBuzz();
      timer.current = window.setTimeout(onClose, 1500);
      return;
    }
    const code = codeOf(chars);
    setState("checking"); setMsg("CHECKING…");
    const r = await checkCode(code);
    if (r.ok) {
      setState("granted"); setMsg(r.used ? "ALREADY INJECTED · WELCOME BACK" : "ACCESS GRANTED");
      timer.current = window.setTimeout(() => { onGranted?.({ code, kind: r.kind, wallet: r.wallet, used: r.used, x: r.x, discord: r.discord }); setChars(""); }, 950);
      return;
    }
    playDenyBuzz(); setState("idle"); setMsg(MSG[r.reason]);
  };
  const paste = async () => {
    try { const t = await navigator.clipboard.readText(); if (t) setFrom(t); }
    catch { input.current?.focus(); }
  };

  if (!open) return null;
  let k = 0;
  return (
    <>
      <div className="apanel-catch" onPointerDown={onClose} aria-hidden="true" />
      {ready && (
        <div ref={box} className={"apanel " + mode + (state === "granted" ? " granted" : "") + (state === "denied" ? " denied" : "")} style={pos} role="dialog" aria-label="Secure access terminal">
          <img src={ART} alt="" draggable={false} />
          <div className="apanel-screen">
            <h3>SECURE ACCESS TERMINAL</h3>
            <p className="apanel-label">ENTER CODE:</p>
            <div className="apanel-boxes" onClick={() => input.current?.focus()}>
              {groups.map((n, g) => (
                <span key={g} className="apanel-group">
                  {g > 0 && <i className="apanel-dash">-</i>}
                  {Array.from({ length: n }, () => {
                    const i = k++;
                    return <b key={i} className={"apanel-cell" + (focus && i === Math.min(chars.length, total - 1) && state === "idle" ? " cur" : "") + (chars[i] ? " full" : "")}>{chars[i] ?? ""}</b>;
                  })}
                </span>
              ))}
              <input ref={input} className="apanel-input" value={chars} onChange={(e) => setFrom(e.target.value)}
                onPaste={(e) => { e.preventDefault(); setFrom(e.clipboardData.getData("text")); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void check(); } }}
                onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
                inputMode={mode === "lock" ? "numeric" : "text"} autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false}
                maxLength={total + 6} aria-label={mode === "lock" ? "4 digit code" : "Access code"} disabled={state === "checking" || state === "granted" || state === "denied"} />
            </div>
            <p className="apanel-msg" role="status">{msg ?? (mode === "access" ? "code from Discord · hold the boxes to paste" : "")}</p>
            <div className="apanel-actions">
              {mode === "access" && <button type="button" className="apanel-paste" onClick={() => void paste()} disabled={state !== "idle"}>PASTE</button>}
              <button type="button" className="apanel-check" onClick={() => void check()} disabled={state === "checking" || state === "granted" || state === "denied"}>CHECK <span aria-hidden="true">✔</span></button>
            </div>
          </div>
          <button type="button" className="apanel-close" onClick={onClose} aria-label="Close">×</button>
        </div>
      )}
    </>
  );
}
