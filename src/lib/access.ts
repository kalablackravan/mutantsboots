import { WL_API } from "@/config/wl";

// Access codes (WL-XXXXXXXXXXXX / FM-XXXXXXXXXXXX) are handed out in Discord. The slime door asks for one,
// /access/check says which form it opens (wl or fm) and returns the holder's wallet, already masked.
// The code itself lives only in memory for this page visit: never stored, never logged, never shown again.
export type AccessKind = "wl" | "fm";
export type Access = { code: string; kind: AccessKind; wallet: string; submitted: boolean; x?: string | undefined; discord?: string | undefined };

// After a successful injection the visitor's own details (kind, masked wallet, X, Discord: never the code)
// are remembered on this device, so the lab keeps letting them in and the clipboard can show their file.
const SAVE_KEY = "mf-injection";
type Saved = { kind: AccessKind; wallet: string; x?: string | undefined; discord?: string | undefined };
function loadSaved(): Saved | null {
  try { const v = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null"); return v && (v.kind === "wl" || v.kind === "fm") ? v : null; } catch { return null; }
}
function save(v: Saved) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(v)); } catch { /* private mode */ } }

let current: Access | null = null;
let granted = false;                                       // door already opened once this visit
if (typeof window !== "undefined") {
  const s = loadSaved();
  if (s) { current = { code: "", submitted: true, ...s }; granted = true; }   // already injected on this device: walk straight in
}
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
export const getAccess = () => current;
export const doorGranted = () => granted;
export function grantAccess(a: { code: string; kind: AccessKind; wallet: string; used?: boolean | undefined; x?: string | undefined; discord?: string | undefined }) {
  if (a.used) {                                            // code already injected: let them back in to see their file
    const s = loadSaved();
    const same = s && s.kind === a.kind ? s : null;
    current = { code: "", kind: a.kind, wallet: a.wallet || same?.wallet || "", submitted: true, x: a.x ?? same?.x, discord: a.discord ?? same?.discord };
  } else current = { code: a.code, kind: a.kind, wallet: a.wallet, submitted: false };
  granted = true; emit();
}
export function markSubmitted(x: string, discord: string) {
  if (!current) return;
  current = { ...current, code: "", submitted: true, x, discord };
  save({ kind: current.kind, wallet: current.wallet, x, discord });
  emit();
}
export function onAccess(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; }

export const cleanCode = (c: string) => c.trim().toUpperCase().replace(/\s+/g, "");
// WL-XXXX-XXXX-XXXX / FM-XXXX-XXXX-XXXX (A-Z, 2-9). Only used to spot an empty/obviously broken entry:
// the server is the judge, so anything that looks like a code is sent to /access/check.
export const CODE_RE = /^(WL|FM)-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
export const looksCode = (c: string) => c.length >= 6 && c.length <= 24;

// the server says "wl" for whitelist and "freemint" (or "fm") for free mint codes
const kindOf = (k?: string): AccessKind | null => {
  const v = (k ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (v === "wl" || v === "whitelist") return "wl";
  if (v === "fm" || v === "freemint") return "fm";
  return null;
};

async function post(path: string, body: unknown) {
  const r = await fetch(WL_API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data: { status?: string; kind?: string; wallet?: string; error?: string; x?: string; discord?: string; dc?: string } = {};
  try { data = await r.json(); } catch { /* empty */ }
  return { code: r.status, data };
}

export type CheckResult =
  | { ok: true; kind: AccessKind; wallet: string; used?: boolean; x?: string | undefined; discord?: string | undefined }
  | { ok: false; reason: "invalid" | "used" | "slow" | "down" };
export async function checkCode(raw: string): Promise<CheckResult> {
  const code = cleanCode(raw);
  if (!looksCode(code)) return { ok: false, reason: "invalid" };
  try {
    const { code: st, data } = await post("/access/check", { code });
    const kind = kindOf(data.kind);
    if (st === 200 && data.status === "ok" && kind) return { ok: true, kind, wallet: String(data.wallet ?? "") };
    if (st === 404) return { ok: false, reason: "invalid" };
    if (st === 409)                                          // already injected: the door still opens, the clipboard shows their file
      return { ok: true, used: true, kind: kind ?? (code.startsWith("FM") ? "fm" : "wl"), wallet: String(data.wallet ?? ""), x: data.x, discord: data.discord ?? data.dc };
    if (st === 429) return { ok: false, reason: "slow" };
    return { ok: false, reason: st >= 500 || st === 0 ? "down" : "invalid" };
  } catch { return { ok: false, reason: "down" }; }
}

export type SubmitResult =
  | { ok: true; kind: AccessKind }
  | { ok: false; reason: "invalid_x" | "invalid_discord" | "invalid_code" | "used" | "slow" | "down" | "error" };
export async function submitAccess(code: string, x: string, discord: string, website: string): Promise<SubmitResult> {
  try {
    const { code: st, data } = await post("/access/submit", { code, x, discord, website });
    if (st === 201 && data.status === "submitted") return { ok: true, kind: kindOf(data.kind) ?? (code.startsWith("FM") ? "fm" : "wl") };
    if (st === 400 && data.error === "invalid_x") return { ok: false, reason: "invalid_x" };
    if (st === 400 && data.error === "invalid_discord") return { ok: false, reason: "invalid_discord" };
    if (st === 404) return { ok: false, reason: "invalid_code" };
    if (st === 409) return { ok: false, reason: "used" };
    if (st === 429) return { ok: false, reason: "slow" };
    return { ok: false, reason: st >= 500 ? "down" : "error" };
  } catch { return { ok: false, reason: "down" }; }
}
