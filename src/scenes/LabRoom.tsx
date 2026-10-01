import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { sceneImage, type SceneImage } from "@/config/cdn";
import { FILE_LAYOUT as F, LAB } from "./config";
import { loadAndDecode } from "@/lib/scenePreload";
import { INK_HEAVY } from "@/lib/fileArt";
import { playFileArrive, playFloorDrop, playGlassBreak, playPageTurn, startSubmergedBubbleLoop } from "@/lib/fileSounds";

type Item = "clipboard" | "flask" | "files";
type Box = { left: number; top: number; width: number; height: number };
const at = (b: Box): CSSProperties => ({ left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%` });
const FULL: Box = { left: 0, top: 0, width: 100, height: 100 };
const ITEMS: { id: Item; img: SceneImage; label: string }[] = [
  { id: "clipboard", img: "clipboard.webp", label: "▸ clipboard" },
  { id: "flask", img: "flask_black_border.webp", label: "▸ serum m1" },
  { id: "files", img: "files_black_border.webp", label: "▸ files" },
];

// Everything the room and its three views need, decoded before the door lets anyone in.
const LAB_IMAGES: SceneImage[] = ["2ndbg.webp", "desk.webp", "clipboard.webp", "flask_black_border.webp",
  "files_black_border.webp", "clipboard_black_border_thin.webp", "bestspread.webp"];
let ready: Promise<void> | null = null;
export function preloadLab(timeoutMs = 8000): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  ready ??= Promise.race([
    Promise.all(LAB_IMAGES.map((n) => loadAndDecode(sceneImage(n)))).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
  return ready;
}

export function LabRoom({ on, zoom = "", onExit }: { on: boolean; zoom?: "" | "zoom-from"; onExit: () => void }) {
  const [hover, setHover] = useState<Item | null>(null);
  const [view, setView] = useState<Item | null>(null);
  useEffect(() => { if (!on) { setView(null); setHover(null); } }, [on]);
  const open = (it: Item) => { setHover(null); setView(it); if (it === "files") playPageTurn(); else playFileArrive(); };
  const close = useCallback(() => setView(null), []);
  return (
    <section id="s-lab" className={"scene" + (on ? " on" : "") + (zoom ? " " + zoom : "") + (view ? " viewing" : "")} aria-hidden={!on}>
      <div id="lab-stage" inert={!!view} className={view ? "viewing" : ""}>
        <img className="gate-layer" src={sceneImage("2ndbg.webp")} alt="" style={at(FULL)} draggable={false} />
        <img className="gate-layer" src={sceneImage("desk.webp")} alt="" style={at(FULL)} draggable={false} />
        {ITEMS.map((it) => (
          <img key={it.id} className={"gate-layer lab-item" + (hover === it.id ? " hot" : "")} src={sceneImage(it.img)} alt=""
            style={at(LAB.items[it.id].img)} draggable={false} />
        ))}
        {ITEMS.map((it) => (
          <button key={it.id} type="button" className="lab-hit" style={at(LAB.items[it.id].hit)} aria-label={`Open ${it.id}`}
            tabIndex={on && !view ? 0 : -1}
            onPointerEnter={(e) => { if (e.pointerType === "mouse") setHover(it.id); }} onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(it.id)} onBlur={() => setHover(null)} onClick={() => open(it.id)} />
        ))}
      </div>
      <div className="lab-shade" aria-hidden="true" />
      <div id="lab-ui" aria-hidden="true">
        {ITEMS.map((it) => (
          <span key={it.id} className={"gate-tag clone-tag lab-tag" + (hover === it.id && !view ? " on" : "")}
            style={{ left: `${LAB.items[it.id].hit.left + LAB.items[it.id].hit.width / 2}%`, top: `${LAB.items[it.id].hit.top}%` }}>{it.label}</span>
        ))}
      </div>
      <button type="button" className="lab-room-exit lab-exit" tabIndex={on && !view ? 0 : -1} onClick={onExit}>EXIT</button>
      <LabView item={view} onClose={close} />
    </section>
  );
}

// ---------------------------------------------------------------- the three close-up views
function LabView({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const [shown, setShown] = useState<Item | null>(null);      // keeps the content while it fades out
  const [dropping, setDropping] = useState(false);
  // put it back = let it fall: clipboard and files thud on the floor, the flask shatters
  const drop = useCallback(() => {
    if (!item || dropping) return;
    setDropping(true);
    if (item === "flask") playGlassBreak(0.42); else playFloorDrop(0.42);
    // clear the content in the same tick so the dropped item never pops back during the fade-out
    window.setTimeout(() => { setShown(null); onClose(); setDropping(false); }, 560);
  }, [item, dropping, onClose]);
  useEffect(() => {
    if (item) { setShown(item); return; }
    const t = setTimeout(() => setShown(null), 320); return () => clearTimeout(t);
  }, [item]);
  useEffect(() => {
    if (!item) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") drop(); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [item, drop]);
  useEffect(() => {
    if (item !== "flask" || dropping) return;
    return startSubmergedBubbleLoop();
  }, [item, dropping]);
  const outside = (e: MouseEvent) => { if (e.target === e.currentTarget) drop(); };
  return (
    <div className={"lab-view" + (item ? " on" : "") + (dropping ? " dropping" : "")} role="dialog" aria-modal="true" aria-hidden={!item} inert={!item}
      aria-label={shown ?? "lab item"} onClick={outside} style={{ "--ink-heavy": `url(${INK_HEAVY})` } as CSSProperties}>
      {shown === "clipboard" && (
        <div className={"lv-clipboard" + (dropping ? " drop" : "")} key={"c" + String(item)}>
          <img src={sceneImage("clipboard_black_border_thin.webp")} alt="" draggable={false} />
          <div className="lv-clip-paper">
            <h3>SERUM M1 · BATCH CHECK</h3>
            <p className="lv-sub">Lab 7 · Sub-Level 3 · shift log</p>
            <ul>
              <li className="done">Control specimens logged <b>(606)</b></li>
              <li className="done">Clone vessel pressure nominal</li>
              <li className="done"><b>250 ml</b> dose measured per specimen</li>
              <li className="done">Vessel liquid temperature stable</li>
              <li>Vial seals inspected</li>
              <li>Containment drill</li>
            </ul>
            <p className="lv-sign">Checked by: <span className="redact">████████</span></p>
          </div>
        </div>
      )}
      {shown === "flask" && (
        <div className={"lv-flask" + (dropping ? " drop" : "")} key={"f" + String(item)}>
          <FlaskSpin active={item === "flask"} />
          <article className="lv-serum">
            <p className="lv-kicker">specimen agent · batch M1-606</p>
            <h2>SERUM M1</h2>
            <dl>
              <div><dt>Purpose</dt><dd>Grow guard clones for the <b>Zcash shielded pool</b></dd></div>
              <div><dt>Dose</dt><dd><b>250 ml</b> per control specimen</dd></div>
              <div><dt>Action</dt><dd>Bonds with host <b>DNA</b>. Traits shift. Copies stop being copies.</dd></div>
              <div><dt>Stability</dt><dd><b>Unstable.</b> Vaporises on contact with air.</dd></div>
              <div><dt>Incident</dt><dd>Vial cracked at <b>03:13</b>. Lab-wide exposure.</dd></div>
              <div><dt>Result</dt><dd><b>606 mutants.</b> 604 reached Zcash · 2 unlogged.</dd></div>
            </dl>
            <span className="cf-stamp-ink lv-hazard">HAZARD · LEVEL 5</span>
          </article>
        </div>
      )}
      {shown === "files" && (
        <div className={"lv-files" + (dropping ? " drop" : "")} key={"p" + String(item)}>
          <div className="lv-paper" style={{
            backgroundImage: `url(${sceneImage("bestspread.webp")})`,
            backgroundSize: `${(3840 / (F.src.paper[2] - F.src.paper[0])) * 100}% ${(1800 / (F.src.paper[3] - F.src.paper[1])) * 100}%`,
            backgroundPosition: `${(F.src.paper[0] / (3840 - (F.src.paper[2] - F.src.paper[0]))) * 100}% ${(F.src.paper[1] / (1800 - (F.src.paper[3] - F.src.paper[1]))) * 100}%`,
            clipPath: F.paperClip,
          }} />
          <div className="lv-page">
            <h3>SPECIMEN TRANSFER LOG</h3>
            <p className="lv-sub">Archive copy · do not remove from Lab 7</p>
            <table>
              <thead><tr><th>ID</th><th>Logged</th><th>Status</th></tr></thead>
              <tbody>
                <tr><td>SPC-017</td><td>02:48</td><td className="bad">escaped</td></tr>
                <tr><td>SPC-233</td><td>02:51</td><td className="bad">escaped</td></tr>
                <tr><td>SPC-418</td><td>02:55</td><td className="bad">escaped</td></tr>
                <tr><td>SPC-590</td><td>03:02</td><td className="bad">escaped</td></tr>
                <tr><td>SPC-???</td><td>—</td><td>never logged</td></tr>
                <tr><td>SPC-???</td><td>—</td><td>never logged</td></tr>
              </tbody>
            </table>
            <p className="lv-note">Headcount at 03:14: <b>606</b>. Headcount at 03:15: <b>2</b>.</p>
          </div>
        </div>
      )}
      <p className="lv-hint">click outside to put it back</p>
    </div>
  );
}

// ---------------------------------------------------------------- Serum M1 turntable
// The flask is round, so a true 3D spin keeps its outline and turns what is inside it.
// Every frame, each row inside the glass is mapped onto a cylinder and rotated; the
// black outline and glass rim stay put. One flat image, a real-looking 3D turn.
const FLASK_BOX = [264, 110, 958, 1166] as const; // content of flask_black_border.webp (1236x1305)
function FlaskSpin({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [flat, setFlat] = useState(false);
  useEffect(() => {
    if (!active) return;
    const cv = ref.current; if (!cv) return;
    let raf = 0, stopped = false;
    const img = new Image(); img.crossOrigin = "anonymous"; img.src = sceneImage("flask_black_border.webp");
    img.decode().then(() => {
      if (stopped) return;
      const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const W = Math.max(8, Math.round(r.width * dpr)), H = Math.max(8, Math.round(r.height * dpr));
      cv.width = W; cv.height = H;
      const ctx = cv.getContext("2d", { willReadFrequently: true }); if (!ctx) throw new Error("no 2d");
      const [x0, y0, x1, y1] = FLASK_BOX;
      ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0, 0, 0, W, H);
      const src = ctx.getImageData(0, 0, W, H);                 // throws if the CDN ever drops CORS -> flat fallback
      const out = new ImageData(new Uint8ClampedArray(src.data), W, H);
      const N = 2048, SIN = new Float32Array(N);
      for (let k = 0; k < N; k++) SIN[k] = Math.sin((2 * Math.PI * k) / N);
      const dst: number[] = [], phi: number[] = [], row: number[] = [];
      const rowCx = new Float32Array(H), rowRi = new Float32Array(H);
      const edge = Math.max(2, W * 0.018);
      for (let y = 0; y < H; y++) {
        let L = -1, R = -1;
        for (let x = 0; x < W; x++) if ((src.data[(y * W + x) * 4 + 3] ?? 0) > 40) { if (L < 0) L = x; R = x; }
        if (L < 0) continue;
        const cx = (L + R) / 2, rad = (R - L) / 2, ri = rad - Math.max(rad * 0.14, edge);
        if (ri < 2) continue;
        rowCx[y] = cx; rowRi[y] = ri;
        for (let x = Math.ceil(cx - ri); x <= Math.floor(cx + ri); x++) {
          const s = Math.max(-1, Math.min(1, (x - cx) / ri));
          dst.push((y * W + x) * 4); phi.push(Math.round((Math.asin(s) / (2 * Math.PI)) * N + N) % N); row.push(y);
        }
      }
      const D = Int32Array.from(dst), P = Int32Array.from(phi), Y = Int32Array.from(row), sd = src.data, od = out.data;
      const t0 = performance.now(), period = 6000;
      const frame = (now: number) => {
        if (stopped) return;
        const t = Math.floor((((now - t0) % period) / period) * N);
        for (let i = 0; i < D.length; i++) {
          const y = Y[i]!, u = (P[i]! + t) & (N - 1);
          const sx = Math.round(rowCx[y]! + SIN[u]! * rowRi[y]!), so = (y * W + sx) * 4, o = D[i]!;
          od[o] = sd[so]!; od[o + 1] = sd[so + 1]!; od[o + 2] = sd[so + 2]!; od[o + 3] = sd[so + 3]!;
        }
        ctx.putImageData(out, 0, 0);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }).catch(() => setFlat(true));
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }, [active]);
  return (
    <div className="lv-flask-stage">
      {flat
        ? <img className="lv-flask-canvas wobble" src={sceneImage("flask_black_border.webp")} alt="Serum M1 flask" draggable={false} />
        : <canvas ref={ref} className="lv-flask-canvas" role="img" aria-label="Serum M1 flask, turning" />}
      <i className="lv-flask-shadow" />
    </div>
  );
}
