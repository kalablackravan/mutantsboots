import { useEffect, useRef, useState, type FormEvent } from "react";
import { WL_API } from "@/config/wl";

type Phase = "live" | "closed" | "results";
type Kind = "received" | "incubating" | "immune" | "mutated" | "rejected" | "invalid" | "slow" | "down" | "closed";
const KEY = "mf_wl_wallet";
// quick shape check in the browser; the lab server also verifies the checksum
const looksZcash = (w: string) => /^(t[13][1-9A-HJ-NP-Za-km-z]{33}|zs1[02-9ac-hj-np-z]{75}|u1[02-9ac-hj-np-z]{100,600})$/i.test(w);
const short = (w: string) => (w.length > 18 ? `${w.slice(0, 8)}…${w.slice(-6)}` : w);
const remember = (w: string) => { try { localStorage.setItem(KEY, w); } catch { /* private mode */ } };
const recall = () => { try { return localStorage.getItem(KEY) ?? ""; } catch { return ""; } };

type ApiData = { phase?: Phase; status?: string; result?: string; submitted?: boolean; error?: string };
async function api(path: string, init?: RequestInit) {
  const r = await fetch(WL_API + path, { ...init, headers: { "Content-Type": "application/json" } });
  let data: ApiData = {};
  try { data = await r.json(); } catch { /* empty */ }
  return { code: r.status, data };
}

export function WlClipboard({ active }: { active: boolean }) {
  const [phase, setPhase] = useState<Phase | "down" | null>(null);
  const [screen, setScreen] = useState<"form" | "status">("form");
  const [wallet, setWallet] = useState("");
  const [trap, setTrap] = useState("");                  // honeypot (bots fill it, people never see it)
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<Kind | null>(null);
  const [subject, setSubject] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {                                     // every time the clipboard is picked up
    if (!active) return;
    setKind(null); setBusy(false); setWallet(recall());
    let live = true;
    api("/wl/phase").then(({ data }) => {
      if (!live) return;
      const p = data.phase || "live"; setPhase(p); setScreen(p === "live" ? "form" : "status");
    }).catch(() => live && setPhase("down"));
    return () => { live = false; };
  }, [active]);

  const clean = () => { const w = wallet.trim(); return /^(zs1|u1)/i.test(w) ? w.toLowerCase() : w; };

  const inject = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return;
    const w = clean(); setSubject(w);
    if (!looksZcash(w)) return setKind("invalid");
    setBusy(true);
    try {
      const { code, data } = await api("/wl/submit", { method: "POST", body: JSON.stringify({ wallet: w, website: trap }) });
      if (code === 201 || data.status === "received") { remember(w); setKind("received"); }
      else if (data.status === "already") { remember(w); setKind("incubating"); }
      else if (code === 403) { setPhase(data.phase || "closed"); setKind("closed"); }
      else if (code === 429) setKind("slow");
      else setKind("invalid");
    } catch { setKind("down"); }
    setBusy(false);
  };

  const scan = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return;
    const w = clean(); setSubject(w);
    if (!looksZcash(w)) return setKind("invalid");
    setBusy(true);
    try {
      const { code, data } = await api("/wl/status?wallet=" + encodeURIComponent(w));
      if (code === 429) setKind("slow");
      else if (code !== 200) setKind("invalid");
      else if (data.phase === "results") setKind(data.result === "mutated" ? "mutated" : "rejected");
      else setKind(data.submitted ? "incubating" : "immune");
      if (data.phase) setPhase(data.phase);
    } catch { setKind("down"); }
    setBusy(false);
  };

  const back = (to: "form" | "status") => { setKind(null); setScreen(to); requestAnimationFrame(() => input.current?.focus()); };

  if (phase === null) return <div className="wl wl-loading"><p className="wl-blink">LINKING TO LAB…</p></div>;

  if (kind) return (
    <div className={"wl wl-result wl-k-" + kind}>
      {kind === "received" && <>
        <span className="cf-stamp-ink wl-stamp">VIRUS RECEIVED</span>
        <p className="wl-big">WE GOT YOUR ZCASH VIRUS.</p>
        <p className="wl-text wl-blink">INCUBATION STARTED…</p>
        <p className="wl-subject">subject <b>{short(subject)}</b></p>
        <button type="button" className="wl-link" onClick={() => back("status")}>check your status ›</button>
      </>}
      {kind === "incubating" && <>
        <p className="wl-big">SUBJECT ALREADY INCUBATING…</p>
        <p className="wl-big red">WE HAVE YOUR VIRUS.</p>
        <p className="wl-text">Wait for the final mutation results.</p>
        <p className="wl-subject">subject <b>{short(subject)}</b></p>
      </>}
      {kind === "immune" && <>
        <p className="wl-big cold">SUBJECT IS IMMUNE</p>
        <p className="wl-text cold">(NO VIRUS DETECTED)</p>
        <p className="wl-text">But you can still get infected. Follow the instructions on the next page to initiate your mutation.</p>
        {phase === "live"
          ? <button type="button" className="wl-btn" onClick={() => back("form")}>GET INFECTED</button>
          : <p className="wl-text dim">Injections are closed for this phase.</p>}
      </>}
      {kind === "mutated" && <>
        <span className="cf-stamp-ink wl-mutated">YOU ARE MUTATED</span>
        <p className="wl-text">Infection successful. <b>Welcome to the horde.</b></p>
        <p className="wl-subject">subject <b>{short(subject)}</b></p>
      </>}
      {kind === "rejected" && <>
        <p className="wl-immune">YOU ARE IMMUNE</p>
        <p className="wl-text">Your system rejected the virus. Try to catch the infection in the next phase.</p>
        <p className="wl-subject">subject <b>{short(subject)}</b></p>
      </>}
      {kind === "invalid" && <>
        <p className="wl-big red">INVALID SPECIMEN</p>
        <p className="wl-text">That is not a Zcash mainnet address. Use a <b>t1 / t3</b>, <b>zs1</b> or <b>u1</b> address.</p>
      </>}
      {kind === "slow" && <><p className="wl-big red">TOO MANY INJECTIONS</p><p className="wl-text">Slow down. Try again in a few minutes.</p></>}
      {kind === "down" && <><p className="wl-big red">LAB LINK DOWN</p><p className="wl-text">Could not reach the lab. Try again in a minute.</p></>}
      {kind === "closed" && <><p className="wl-big">INJECTIONS CLOSED</p><p className="wl-text">The incubation window is over. Results soon.</p></>}
      {kind !== "received" && kind !== "immune" && (
        <button type="button" className="wl-link" onClick={() => back(phase === "live" && kind !== "incubating" ? "form" : "status")}>‹ back</button>
      )}
    </div>
  );

  if (phase === "down") return (
    <div className="wl wl-result"><p className="wl-big red">LAB LINK DOWN</p><p className="wl-text">Could not reach the lab. Close the clipboard and try again.</p></div>
  );

  if (screen === "form" && phase === "live") return (
    <form className="wl" onSubmit={inject} noValidate>
      <h3>MUTATION INJECTION PROTOCOL</h3>
      <p className="wl-text">Send your <b>Zcash wallet address</b>. This is a mutation core injection. If the virus accepts you, you will <b>mutate</b>. If not, you remain <b>immune</b>.</p>
      <label className="wl-field">
        <span>subject wallet</span>
        <input ref={input} value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="Inject Zcash Wallet Here..."
          autoComplete="off" spellCheck={false} autoCapitalize="off" aria-label="Zcash wallet address" />
      </label>
      <input className="wl-trap" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} aria-hidden="true" />
      <button type="submit" className="wl-btn" disabled={busy}>{busy ? "INJECTING…" : "INITIATE INFECTION"}</button>
      <button type="button" className="wl-link" onClick={() => back("status")}>already injected? check status ›</button>
    </form>
  );

  return (
    <form className="wl" onSubmit={scan} noValidate>
      <h3>{phase === "results" ? "MUTATION RESULTS" : "SUBJECT STATUS SCAN"}</h3>
      <p className="wl-text">{phase === "results"
        ? "The infection has run its course. Enter your Zcash wallet to see what it did to you."
        : "Enter the Zcash wallet you injected to check your infection status."}</p>
      <label className="wl-field">
        <span>subject wallet</span>
        <input ref={input} value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="Paste Zcash Wallet Here..."
          autoComplete="off" spellCheck={false} autoCapitalize="off" aria-label="Zcash wallet address" />
      </label>
      <button type="submit" className="wl-btn" disabled={busy}>{busy ? "SCANNING…" : phase === "results" ? "REVEAL RESULT" : "SCAN SUBJECT"}</button>
      {phase === "live" && <button type="button" className="wl-link" onClick={() => back("form")}>‹ back to injection</button>}
    </form>
  );
}
