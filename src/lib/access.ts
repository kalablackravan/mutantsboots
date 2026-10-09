import { WL_API } from "@/config/wl";

// Access codes (WL-XXXXXXXXXXXX / FM-XXXXXXXXXXXX) are handed out in Discord. The slime door asks for one,
// /access/check says which form it opens (wl or fm) and returns the holder's wallet, already masked.
// The code lives only in memory for this page visit: never stored, never logged, never shown again.
export type AccessKind = "wl" | "fm";
export type Access = { code: string; kind: AccessKind; wallet: string; submitted: boolean };

let current: Access | null = null;
let granted = false;                                       // door already opened once this visit
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
export const getAccess = () => current;
export const doorGranted = () => granted;
export function grantAccess(a: Omit<Access, "submitted">) { current = { ...a, submitted: false }; granted = true; emit(); }
export function markSubmitted() { if (current) { current = { ...current, code: "", submitted: true }; emit(); } }
export function onAccess(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; }

export const cleanCode = (c: string) => c.trim().toUpperCase().replace(/\s+/g, "");
// WL-XXXX-XXXX-XXXX / FM-XXXX-XXXX-XXXX (A-Z, 2-9). Only used to spot an empty/obviously broken entry:
// the server is the judge, so anything that looks like a code is sent to /access/check.
export const CODE_RE = /^(WL|FM)-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
export const looksCode = (c: string) => c.length >= 6 && c.length <= 24;

async function post(path: string, body: unknown) {
  const r = await fetch(WL_API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data: { status?: string; kind?: string; wallet?: string; error?: string } = {};
  try { data = await r.json(); } catch { /* empty */ }
  return { code: r.status, data };
}

export type CheckResult =
  | { ok: true; kind: AccessKind; wallet: string }
  | { ok: false; reason: "invalid" | "used" | "slow" | "down" };
export async function checkCode(raw: string): Promise<CheckResult> {
  const code = cleanCode(raw);
  if (!looksCode(code)) return { ok: false, reason: "invalid" };
  try {
    const { code: st, data } = await post("/access/check", { code });
    if (st === 200 && data.status === "ok" && (data.kind === "wl" || data.kind === "fm"))
      return { ok: true, kind: data.kind, wallet: String(data.wallet ?? "") };
    if (st === 404) return { ok: false, reason: "invalid" };
    if (st === 409) return { ok: false, reason: "used" };
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
    if (st === 201 && data.status === "submitted") return { ok: true, kind: data.kind === "fm" ? "fm" : "wl" };
    if (st === 400 && data.error === "invalid_x") return { ok: false, reason: "invalid_x" };
    if (st === 400 && data.error === "invalid_discord") return { ok: false, reason: "invalid_discord" };
    if (st === 404) return { ok: false, reason: "invalid_code" };
    if (st === 409) return { ok: false, reason: "used" };
    if (st === 429) return { ok: false, reason: "slow" };
    return { ok: false, reason: st >= 500 ? "down" : "error" };
  } catch { return { ok: false, reason: "down" }; }
}
