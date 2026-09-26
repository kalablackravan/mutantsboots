import { useEffect, useState } from "react";
import { artFrame, type Frame } from "@/scenes/config";

export function useViewport() {
  const [vp, setVp] = useState<{ vw: number; vh: number } | null>(null);
  useEffect(() => {
    const on = () => setVp({ vw: innerWidth, vh: innerHeight });
    on();
    addEventListener("resize", on);
    return () => removeEventListener("resize", on);
  }, []);
  return vp;
}
export function useFrame(): { f: Frame; vw: number; vh: number; portrait: boolean } | null {
  const vp = useViewport();
  if (!vp) return null;
  return { f: artFrame(vp.vw, vp.vh), ...vp, portrait: vp.vw <= vp.vh };
}
