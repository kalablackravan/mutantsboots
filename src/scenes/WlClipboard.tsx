import { useEffect, useRef, useState, type FormEvent } from "react";
import { WL_API } from "@/config/wl";
import { playInject, playScan } from "@/lib/fileSounds";

type Phase = "live" | "closed" | "results";
type Kind = "infected" | "incubating" | "immune" | "mutated" | "rejected" | "invalid" | "badx" | "follow" | "slow" | "down" | "closed";
const X_URL = "https://x.com/mutatedfoots";
const INJECT_MS = 2400;                                    // length of the in-form injection animation
const SCAN_MS = 1700;                                      // length of the status scan animation
// DNA helix for the scanner (two strands + rungs)
const HELIX = (() => {
  const a: string[] = [], b: string[] = [], rungs: [number, number, number][] = [];
  for (let y = 8; y <= 112; y += 2) { const s = Math.sin(y / 11) * 26; a.push(`${60 + s},${y}`); b.push(`${60 - s},${y}`); if (y % 8 === 0) rungs.push([60 + s, 60 - s, y]); }
  return { a: "M" + a.join("L"), b: "M" + b.join("L"), rungs };
})();
// quick shape checks in the browser; the lab server verifies the wallet checksum too
const looksZcash = (w: string) => /^(t[13][1-9A-HJ-NP-Za-km-z]{33}|zs1[02-9ac-hj-np-z]{75}|u1[02-9ac-hj-np-z]{100,600})$/i.test(w);
const looksX = (h: string) => /^@?[A-Za-z0-9_]{1,15}$/.test(h);
const cleanWallet = (w: string) => { const s = w.trim(); return /^(zs1|u1)/i.test(s) ? s.toLowerCase() : s; };
const cleanX = (h: string) => h.trim().replace(/^@/, "");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ApiData = { phase?: Phase; status?: string; result?: string; submitted?: boolean; error?: string; x?: string | null; wallet?: string };
async function api(path: string, init?: RequestInit) {
  const r = await fetch(WL_API + path, { ...init, headers: { "Content-Type": "application/json" } });
  let data: ApiData = {};
  try { data = await r.json(); } catch { /* empty */ }
  return { code: r.status, data };
}

function Subject({ x, wallet }: { x?: string | null | undefined; wallet?: string | undefined }) {
  if (!x && !wallet) return null;
  return (
    <p className="wl-subject">subject{x && <> <b>{x}</b></>}{x && wallet && " · "}{wallet && <b>{wallet}</b>}</p>
  );
}

export function WlClipboard({ active }: { active: boolean }) {
  const [phase, setPhase] = useState<Phase | "down" | null>(null);
  const [screen, setScreen] = useState<"form" | "status">("form");
  const [wallet, setWallet] = useState("");
  const [xh, setXh] = useState("");
  const [query, setQuery] = useState("");
  const [followed, setFollowed] = useState(false);
  const [trap, setTrap] = useState("");                  // honeypot (bots fill it, people never see it)
  const [busy, setBusy] = useState(false);
  const [injecting, setInjecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [kind, setKind] = useState<Kind | null>(null);
  const [subj, setSubj] = useState<{ x?: string | null | undefined; wallet?: string | undefined }>({});
  const first = useRef<HTMLInputElement>(null);

  const blank = () => { setWallet(""); setXh(""); setQuery(""); setTrap(""); setSubj({}); setKind(null); setBusy(false); setInjecting(false); setScanning(false); setFollowed(false); };

  useEffect(() => {                                       // every time the clipboard is picked up: clean sheet
    if (!active) return;
    blank();
    let live = true;
    api("/wl/phase").then(({ data }) => {
      if (!live) return;
      const p = data.phase || "live"; setPhase(p); setScreen(p === "live" ? "form" : "status");
    }).catch(() => live && setPhase("down"));
    return () => { live = false; };
  }, [active]);

  // "back" always returns to an empty injection form (or the empty scan when the form is closed)
  const back = () => { blank(); setScreen(phase === "live" ? "form" : "status"); requestAnimationFrame(() => first.current?.focus()); };
  const toStatus = () => { blank(); setScreen("status"); requestAnimationFrame(() => first.current?.focus()); };

  const inject = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return;
    const w = cleanWallet(wallet), x = cleanX(xh);
    if (!followed) return setKind("follow");
    if (!looksX(x)) return setKind("badx");
    if (!looksZcash(w)) return setKind("invalid");
    setBusy(true); setInjecting(true); playInject();
    try {
      const [res] = await Promise.all([api("/wl/submit", { method: "POST", body: JSON.stringify({ wallet: w, x, website: trap }) }), wait(INJECT_MS)]);
      const { code, data } = res;
      setSubj({ x: data.x ?? "@" + x, wallet: data.wallet });
      if (code === 201 || data.status === "received") setKind("infected");
      else if (data.status === "already") setKind("incubating");
      else if (code === 403) { setPhase(data.phase || "closed"); setKind("closed"); }
      else if (code === 429) setKind("slow");
      else if (data.error === "invalid_x") setKind("badx");
      else setKind("invalid");
    } catch { setKind("down"); }
    setInjecting(false); setBusy(false);
  };

  const scan = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return;
    const raw = query.trim();
    const q = looksZcash(cleanWallet(raw)) ? cleanWallet(raw) : looksX(raw) ? "@" + cleanX(raw) : "";
    if (!q) return setKind("invalid");
    setBusy(true); setScanning(true); playScan();
    try {
      const [{ code, data }] = await Promise.all([api("/wl/status?q=" + encodeURIComponent(q)), wait(SCAN_MS)]);
      setSubj(data.x || data.wallet ? { x: data.x, wallet: data.wallet } : { x: q.startsWith("@") ? q : null, wallet: q.startsWith("@") ? undefined : `${q.slice(0, 6)}…${q.slice(-4)}` });
      if (code === 429) setKind("slow");
      else if (code !== 200) setKind("invalid");
      else if (data.phase === "results") setKind(data.result === "mutated" ? "mutated" : "rejected");
      else setKind(data.submitted ? "incubating" : "immune");
      if (data.phase) setPhase(data.phase);
    } catch { setKind("down"); }
    setScanning(false); setBusy(false);
  };

  if (phase === null) return <div className="wl wl-center"><p className="wl-blink wl-mono">LINKING TO LAB…</p></div>;
  if (phase === "down") return (
    <div className="wl wl-center"><p className="wl-big red">LAB LINK DOWN</p><p className="wl-text">Could not reach the lab. Close the clipboard and try again.</p></div>
  );

  if (injecting) return (                                    // the injection, right on the form
    <div className="wl wl-center wl-injecting" aria-live="polite">
      <svg className="wl-syringe" viewBox="0 0 240 60" aria-hidden="true">
        <rect className="wl-barrel" x="40" y="16" width="150" height="28" rx="5" />
        <rect className="wl-serum" x="44" y="20" width="142" height="20" rx="3" />
        <g className="wl-plunger"><rect x="6" y="22" width="44" height="16" rx="2" /><rect x="0" y="12" width="8" height="36" rx="2" /></g>
        <rect className="wl-hub" x="190" y="22" width="12" height="16" rx="2" />
        <rect className="wl-needle" x="202" y="28" width="34" height="4" rx="2" />
        <circle className="wl-drop" cx="238" cy="30" r="3" />
        {[70, 100, 130, 160].map((x) => <rect key={x} x={x} y="16" width="2" height="9" className="wl-tick" />)}
      </svg>
      <div className="wl-bar"><i /></div>
      <p className="wl-mono wl-blink">INJECTING SERUM M1…</p>
      <p className="wl-text dim">binding virus to <b>@{cleanX(xh)}</b></p>
    </div>
  );

  if (scanning) return (                                     // the scanner sweeping the subject
    <div className="wl wl-center wl-scanning" aria-live="polite">
      <div className="wl-scanbox">
        <svg className="wl-dna" viewBox="0 0 120 120" aria-hidden="true">
          <path d={HELIX.a} /><path d={HELIX.b} />
          {HELIX.rungs.map(([x1, x2, y]) => <line key={y} x1={x1} x2={x2} y1={y} y2={y} />)}
        </svg>
        <i className="wl-laser" />
      </div>
      <div className="wl-bar"><i /></div>
      <p className="wl-mono wl-blink">SCANNING SUBJECT…</p>
      <p className="wl-text dim">{query.trim().length > 20 ? `${query.trim().slice(0, 8)}…${query.trim().slice(-6)}` : query.trim()}</p>
    </div>
  );

  if (kind) return (
    <div className={"wl wl-result wl-k-" + kind}>
      {kind === "infected" && <>
        <span className="cf-stamp-ink wl-mutated">YOU ARE INFECTED</span>
        <p className="wl-big">WE GOT YOUR ZCASH VIRUS.</p>
        <p className="wl-text wl-blink">INCUBATION STARTED…</p>
        <Subject {...subj} />
        <button type="button" className="wl-link" onClick={toStatus}>check your status ›</button>
      </>}
      {kind === "incubating" && <>
        <p className="wl-big">SUBJECT ALREADY INCUBATING…</p>
        <p className="wl-big red">WE HAVE YOUR VIRUS.</p>
        <p className="wl-text">Wait for the final mutation results.</p>
        <Subject {...subj} />
      </>}
      {kind === "immune" && <>
        <p className="wl-big cold">SUBJECT IS IMMUNE</p>
        <p className="wl-text cold">(NO VIRUS DETECTED)</p>
        <p className="wl-text">But you can still get infected. Follow the instructions on the next page to initiate your mutation.</p>
        {phase === "live"
          ? <button type="button" className="wl-btn" onClick={back}>GET INFECTED</button>
          : <p className="wl-text dim">Injections are closed for this phase.</p>}
      </>}
      {kind === "mutated" && <>
        <span className="cf-stamp-ink wl-mutated">YOU ARE MUTATED</span>
        <p className="wl-text">Infection successful. <b>Welcome to the horde.</b></p>
        <Subject {...subj} />
      </>}
      {kind === "rejected" && <>
        <p className="wl-immune">YOU ARE IMMUNE</p>
        <p className="wl-text">Your system rejected the virus. Try to catch the infection in the next phase.</p>
        <Subject {...subj} />
      </>}
      {kind === "follow" && <><p className="wl-big red">FOLLOW FIRST</p><p className="wl-text">Follow <b>@mutatedfoots</b> on X before the injection.</p></>}
      {kind === "badx" && <><p className="wl-big red">INVALID X HANDLE</p><p className="wl-text">Use your X username, like <b>@mutatedfoots</b> (letters, numbers, _ only).</p></>}
      {kind === "invalid" && <>
        <p className="wl-big red">INVALID SPECIMEN</p>
        <p className="wl-text">{screen === "status" ? "Enter your Zcash wallet or your @X username." : <>That is not a Zcash mainnet address. Use a <b>t1 / t3</b>, <b>zs1</b> or <b>u1</b> address.</>}</p>
      </>}
      {kind === "slow" && <><p className="wl-big red">TOO MANY INJECTIONS</p><p className="wl-text">Slow down. Try again in a few minutes.</p></>}
      {kind === "down" && <><p className="wl-big red">LAB LINK DOWN</p><p className="wl-text">Could not reach the lab. Try again in a minute.</p></>}
      {kind === "closed" && <><p className="wl-big">INJECTIONS CLOSED</p><p className="wl-text">The incubation window is over. Results soon.</p></>}
      {kind !== "infected" && kind !== "immune" && <button type="button" className="wl-link" onClick={back}>‹ back</button>}
    </div>
  );

  if (screen === "form" && phase === "live") return (
    <form className="wl wl-form" onSubmit={inject} noValidate>
      <h3>MUTATION INJECTION PROTOCOL</h3>
      <p className="wl-text">Send your <b>Zcash wallet</b>. This is a mutation core injection. If the virus accepts you, you <b>mutate</b>. If not, you stay <b>immune</b>.</p>
      <a className={"wl-follow" + (followed ? " done" : "")} href={X_URL} target="_blank" rel="noopener noreferrer" onClick={() => setFollowed(true)}>
        <span className="wl-n">1</span>{followed ? "following @mutatedfoots ✓" : "follow @mutatedfoots on X ↗"}
      </a>
      <label className="wl-field">
        <span><i className="wl-n">2</i>your X username</span>
        <input ref={first} value={xh} onChange={(e) => setXh(e.target.value)} placeholder="@your_x_username"
          autoComplete="off" spellCheck={false} autoCapitalize="off" aria-label="X username" />
      </label>
      <label className="wl-field">
        <span><i className="wl-n">3</i>subject wallet</span>
        <input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="Inject Zcash Wallet Here..."
          autoComplete="off" spellCheck={false} autoCapitalize="off" aria-label="Zcash wallet address" />
      </label>
      <input className="wl-trap" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} aria-hidden="true" />
      <button type="submit" className="wl-btn" disabled={busy}>INITIATE INFECTION</button>
      <button type="button" className="wl-link" onClick={toStatus}>already injected? check status ›</button>
    </form>
  );

  return (
    <form className="wl wl-form" onSubmit={scan} noValidate>
      <h3>{phase === "results" ? "MUTATION RESULTS" : "SUBJECT STATUS SCAN"}</h3>
      <p className="wl-text">{phase === "results"
        ? "The infection has run its course. Enter your Zcash wallet or @X username to see what it did to you."
        : "Enter the Zcash wallet or the @X username you injected with."}</p>
      <label className="wl-field">
        <span>wallet or @x username</span>
        <input ref={first} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="zs1… / u1… / t1… or @username"
          autoComplete="off" spellCheck={false} autoCapitalize="off" aria-label="Zcash wallet or X username" />
      </label>
      <button type="submit" className="wl-btn" disabled={busy}>{busy ? "SCANNING…" : phase === "results" ? "REVEAL RESULT" : "SCAN SUBJECT"}</button>
      {phase === "live" && <button type="button" className="wl-link" onClick={back}>‹ back to injection</button>}
    </form>
  );
}
