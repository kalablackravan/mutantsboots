import { useEffect, useRef, useState } from "react";
import { sceneImage } from "@/config/cdn";

// Serum M1 as a real WebGL flask (Three.js). The scene module (and three itself) is loaded lazily
// on the client inside useEffect, so SSR never touches WebGL and the lab loads no 3D code until
// the flask is actually opened. Falls back to the flat art if WebGL is unavailable.
export function MutatedFlask3D({ active, className = "" }: { active: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!active || failed) return;
    let gone = false;
    let scene: { dispose: () => void } | null = null;
    import("@/lib/flask3d/createFlaskScene")
      .then(({ createFlaskScene }) => {
        if (gone || !ref.current) return;
        try { scene = createFlaskScene(ref.current, { still: window.matchMedia("(prefers-reduced-motion: reduce)").matches }); }
        catch { setFailed(true); }
      })
      .catch(() => setFailed(true));
    return () => { gone = true; scene?.dispose(); };
  }, [active, failed]);
  if (failed) return <img className={"lv-flask-canvas " + className} src={sceneImage("flask_black_border.webp")} alt="Serum M1 flask" draggable={false} />;
  return <canvas ref={ref} className={"lv-flask-canvas lv-flask-3d " + className} role="img" aria-label="Serum M1 flask, drag to turn it" />;
}
