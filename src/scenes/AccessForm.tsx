import { useEffect, useState, type FormEvent } from "react";
import { getAccess, markSubmitted, onAccess, submitAccess, type Access } from "@/lib/access";
import { playInject } from "@/lib/fileSounds";

// The injection form on the lab clipboard. It only opens with an access code from the slime door:
// WL code -> whitelist injection, FM code -> free mint injection. The wallet comes from Discord (shown
// masked, read-only). Nothing about the code is shown or kept after it is sent.
const X_URL = "https://x.com/mutatedfoots";
const INJECT_MS = 2400;
const looksX = (h: string) => /^@?[A-Za-z0-9_]{1,15}$/.test(h.trim());
const cleanX = (h: string) => h.trim().replace(/^@/, "");
const looksDiscord = (d: string) => /^[A-Za-z0-9_.]{2,32}(#\d{4})?$/.test(d.trim());
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TITLE = { wl: "WHITELIST INJECTION", fm: "FREE MINT INJECTION" } as const;
type Err = "follow" | "x" | "discord" | "invalid_code" | "used" | "slow" | "down" | "error" | null;
const MSG: Record<Exclude<Err, null>, string> = {
  follow: "Follow @mutatedfoots on X before the injection.",
  x: "Use your X username (letters, numbers, _ only).",
  discord: "Use your Discord username (as shown in Discord).",
  invalid_code: "Code not valid. Get a new one in Discord.",
  used: "This code was already used.",
  slow: "Too many tries, wait a bit.",
  down: "Could not reach the lab. Try again in a minute.",
  error: "Something went wrong. Try again.",
};

export function AccessForm({ active }: { active: boolean }) {
  const [acc, setAcc] = useState<Access | null>(getAccess());
  useEffect(() => onAccess(() => setAcc(getAccess())), []);
  const [x, setX] = useState(""); const [discord, setDiscord] = useState(""); const [trap, setTrap] = useState("");
  const [followed, setFollowed] = useState(false);
  const [busy, setBusy] = useState(false); const [injecting, setInjecting] = useState(false);
  const [err, setErr] = useState<Err>(null);
  const [done, setDone] = useState<null | "wl" | "fm">(null);
  useEffect(() => { if (!active) return; setErr(null); setInjecting(false); setBusy(false); }, [active]);

  const inject = async (e: FormEvent) => {
    e.preventDefault(); if (busy || !acc || acc.submitted) return;
    if (!followed) return setErr("follow");
    if (!looksX(x)) return setErr("x");
    if (!looksDiscord(discord)) return setErr("discord");
    setErr(null); setBusy(true); setInjecting(true); playInject();
    const [res] = await Promise.all([submitAccess(acc.code, cleanX(x), discord.trim(), trap), wait(INJECT_MS)]);
    setInjecting(false); setBusy(false);
    if (res.ok) { markSubmitted(cleanX(x), discord.trim()); setDone(res.kind); return; }
    setErr(res.reason === "invalid_x" ? "x" : res.reason === "invalid_discord" ? "discord" : res.reason);
  };

  if (done || acc?.submitted) {
    const kind = acc?.kind ?? done ?? "wl";
    const role = kind === "fm" ? "MUTANT" : "INFECTED";
    return (
      <div className="wl wl-result wl-k-infected">
        <span className="cf-stamp-ink wl-mutated">YOU ARE INFECTED</span>
        <p className="wl-big">{kind === "fm" ? "FREE MINT SERUM INJECTED." : "WHITELIST SERUM INJECTED."}</p>
        <dl className="wl-file">
          <div><dt>Injection</dt><dd>{kind === "fm" ? "Free Mint" : "Whitelist"}</dd></div>
          <div><dt>X</dt><dd>{acc?.x ? "@" + acc.x : "on file"}</dd></div>
          <div><dt>Discord</dt><dd>{acc?.discord || "on file"}</dd></div>
          <div><dt>Wallet</dt><dd>{acc?.wallet || "on file"}</dd></div>
        </dl>
        <p className="wl-text">Your <b>{role}</b> role arrives in Discord within a minute.</p>
      </div>
    );
  }
  if (!acc) return (
    <div className="wl wl-center">
      <p className="wl-big red">ACCESS CODE REQUIRED</p>
      <p className="wl-text">The injection form only opens with an access code. Get yours in the mutatedfoots Discord, then enter it at the slime door.</p>
    </div>
  );
  if (injecting) return (
    <div className="wl wl-center wl-injecting" aria-live="polite">
      <svg className="wl-syringe" viewBox="0 0 240 60" aria-hidden="true">
        <rect className="wl-barrel" x="40" y="16" width="150" height="28" rx="5" />
        <rect className="wl-serum" x="44" y="20" width="142" height="20" rx="3" />
        <g className="wl-plunger"><rect x="6" y="22" width="44" height="16" rx="2" /><rect x="0" y="12" width="8" height="36" rx="2" /></g>
        <rect className="wl-hub" x="190" y="22" width="12" height="16" rx="2" />
        <rect className="wl-needle" x="202" y="28" width="34" height="4" rx="2" />
        <circle className="wl-drop" cx="238" cy="30" r="3" />
        {[70, 100, 130, 160].map((v) => <rect key={v} x={v} y="16" width="2" height="9" className="wl-tick" />)}
      </svg>
      <div className="wl-bar"><i /></div>
      <p className="wl-mono wl-blink">INJECTING SERUM M1…</p>
      <p className="wl-text dim">binding virus to <b>@{cleanX(x)}</b></p>
    </div>
  );
  return (
    <form className="wl wl-form" onSubmit={inject} noValidate>
      <h3>{TITLE[acc.kind]}</h3>
      <p className="wl-text">Access granted. Your <b>wallet is already on file</b> from Discord. Finish the protocol to inject.</p>
      <p className="wl-subject">subject wallet <b>{acc.wallet || "on file"}</b></p>
      <a className={"wl-follow" + (followed ? " done" : "")} href={X_URL} target="_blank" rel="noopener noreferrer" onClick={() => { setFollowed(true); if (err === "follow") setErr(null); }}>
        <span className="wl-n">1</span>{followed ? "following @mutatedfoots ✓" : "follow @mutatedfoots on X ↗"}
      </a>
      <label className="wl-field">
        <span><i className="wl-n">2</i>your X username</span>
        <input value={x} onChange={(e) => setX(e.target.value)} placeholder="@your_x_username" autoComplete="off" spellCheck={false} autoCapitalize="off" aria-label="X username" aria-invalid={err === "x"} />
      </label>
      <label className="wl-field">
        <span><i className="wl-n">3</i>your discord username</span>
        <input value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="discord_username" autoComplete="off" spellCheck={false} autoCapitalize="off" aria-label="Discord username" aria-invalid={err === "discord"} />
      </label>
      <input className="wl-trap" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} aria-hidden="true" />
      {err && <p className="wl-text wl-err red" role="alert">{MSG[err]}</p>}
      <button type="submit" className="wl-btn" disabled={busy}>INITIATE INFECTION</button>
    </form>
  );
}
