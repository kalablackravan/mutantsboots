import { useEffect, useState } from "react";

// traits.ts holds 91 embedded sprites; load it only once the lab actually needs it.
type TraitsModule = typeof import("./traits");
let mod: Promise<TraitsModule> | null = null;
export const loadTraits = () => (mod ??= import("./traits"));
export function useTraits(): TraitsModule | null {
  const [m, setM] = useState<TraitsModule | null>(null);
  useEffect(() => { let live = true; void loadTraits().then((x) => { if (live) setM(x); }); return () => { live = false; }; }, []);
  return m;
}
