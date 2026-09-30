import { useCallback, useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";
import { Button } from "@/components/ui/button";
import { sceneImage, type SceneImage } from "@/config/cdn";
import { CLONE, LOCK, SCENE_LAYERS } from "./config";
import { ClassifiedFile } from "@/overlays/ClassifiedFile";
import { preloadFile } from "@/lib/fileArt";
import { playGateOpen, startSubmergedBubbleLoop } from "@/lib/fileSounds";

type LayerBox = { left: number; top: number; width: number; height: number; objectPosition?: string };
type Props = { on: boolean; warm?: boolean; zoom?: "" | "zoom-from"; onDoor: () => void; onLab: () => void };

const position = (box: LayerBox): CSSProperties => ({
  left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%`,
  objectPosition: box.objectPosition,
});

function SceneLayer({ name, box, className = "", onLoad }: { name: SceneImage; box: LayerBox; className?: string; onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void }) {
  const hideOnError = (event: SyntheticEvent<HTMLImageElement>) => { event.currentTarget.hidden = true; };
  return <img className={`gate-layer ${className}`} src={sceneImage(name)} alt="" style={position(box)}
    decoding="sync" loading="eager" fetchPriority="high" draggable={false} onError={hideOnError} onLoad={onLoad} />;
}

// A pressure gauge needle: parked on LOW, sweeps LOW -> HIGH in a loop while active,
// and when released it falls back from wherever it is (no jump).
function Gauge({ cx, cy, r, dur, delay, active }: { cx: number; cy: number; r: number; dur: number; delay: number; active: boolean }) {
  const needle = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = needle.current; if (!el) return;
    if (active) { el.style.transition = ""; el.style.transform = ""; el.classList.add("run"); return; }
    if (!el.classList.contains("run")) return;
    const now = getComputedStyle(el).transform;
    el.classList.remove("run"); el.style.transform = now === "none" ? "" : now;
    void el.getBoundingClientRect();
    el.style.transition = "transform .7s cubic-bezier(.5,0,.75,0)";
    el.style.transform = "rotate(-120deg)";
  }, [active]);
  return (
    <span className="gauge" aria-hidden="true" style={{
      left: `${(cx - r) / 38.4}%`, top: `${(cy - r) / 18}%`, width: `${(2 * r) / 38.4}%`, height: `${(2 * r) / 18}%`,
      "--gd": `${dur}s`, "--gdl": `${delay}s`,
    } as CSSProperties}>
      <span ref={needle} className="gauge-needle" /><span className="gauge-pin" />
    </span>
  );
}

// "LAB LOCKDOWN" re-typed Matrix style: every letter rains random glyphs, then locks in, left to right.
const GLYPHS = "01234567890123456789ABCDEFGHJKLMNPQRSTUVWXYZ#$%&*+=<>";
function MatrixSign({ active }: { active: boolean }) {
  const WORD = "LAB LOCKDOWN";
  const [text, setText] = useState(WORD);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const lock = [...WORD].map((_, i) => 180 + i * 85 + Math.random() * 60);
    const tick = () => {
      const t = performance.now() - start;
      setText([...WORD].map((ch, i) => (ch === " " || t >= (lock[i] ?? 0) ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join(""));
      if (t >= Math.max(...lock)) window.clearInterval(id);
    };
    const id = window.setInterval(tick, 45); tick();
    return () => window.clearInterval(id);
  }, [active]);
  return (
    <div className={"matrix-sign" + (active ? " on" : "")} aria-hidden="true" style={{
      left: `${LOCK.sign.left}%`, top: `${LOCK.sign.top}%`, width: `${LOCK.sign.width}%`, height: `${LOCK.sign.height}%`,
    }}>
      <span className="matrix-rain" /><b>{text}</b>
    </div>
  );
}

export function Gate({ on, warm = false, zoom = "", onDoor, onLab }: Props) {
  const [open, setOpen] = useState(false);
  const [openReady, setOpenReady] = useState(false);
  const [cloneHover, setCloneHover] = useState(false);
  const [lockHover, setLockHover] = useState(false);
  const lastDoorSound = useRef(0);
  const doorSound = () => { const now = performance.now(); if (now - lastDoorSound.current > 1200) { lastDoorSound.current = now; playGateOpen(); } };
  const [fileOpen, setFileOpen] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  useEffect(() => { if (on) void preloadFile(); }, [on]); // file art is ready long before anyone clicks
  useEffect(() => {
    if (!on || !cloneHover || fileOpen) return;
    return startSubmergedBubbleLoop();
  }, [on, cloneHover, fileOpen]);
  const openFile = async () => {
    if (fileBusy || fileOpen) return;
    setFileBusy(true); await preloadFile(); setFileBusy(false); // never open onto a blank page
    setCloneHover(false); setFileOpen(true);
  };
  const closeFile = useCallback(() => setFileOpen(false), []);
  return (
    <section id="s-gate" className={"scene" + (on ? " on" : warm ? " warm" : "") + (zoom ? " " + zoom : "")} aria-hidden={!on}>
      <div id="gate-stage" inert={fileOpen} className={[open && openReady ? "slime-open" : "", cloneHover ? "clone-hover" : "", fileOpen ? "file-open" : ""].filter(Boolean).join(" ")}>
        <SceneLayer name="bg.webp" box={SCENE_LAYERS.full} className="gate-background" />
        <SceneLayer name="chair.webp" box={SCENE_LAYERS.full} />
        <SceneLayer name="clonebase.webp" box={SCENE_LAYERS.full} className="clone-body" />
        {CLONE.gauges.map((g, i) => <Gauge key={i} {...g} active={cloneHover && !fileOpen} />)}
        <SceneLayer name="clonespecimen.webp" box={SCENE_LAYERS.full} className="clone-specimen" />
        <SceneLayer name="clonecables.webp" box={SCENE_LAYERS.full} className="clone-cables" />
        <SceneLayer name="closeddoor.webp" box={SCENE_LAYERS.full} className="slime-closed" />
        <SceneLayer name="lockdoor.webp" box={SCENE_LAYERS.full} />
        <SceneLayer name="opendoor.webp" box={SCENE_LAYERS.full} className="slime-open-layer"
          onLoad={(event) => { void event.currentTarget.decode().then(() => setOpenReady(true)).catch(() => setOpenReady(false)); }} />
        <SceneLayer name="bgsilhouette.webp" box={SCENE_LAYERS.full} className="gate-silhouette" />
        <button type="button" className="clone-hit" style={position(SCENE_LAYERS.cloneHit)}
          aria-label="Open the classified file" tabIndex={on ? 0 : -1}
          onPointerEnter={(event) => { if (event.pointerType === "mouse") setCloneHover(true); void preloadFile(); }}
          onPointerLeave={() => setCloneHover(false)} onFocus={() => setCloneHover(true)} onBlur={() => setCloneHover(false)}
          onClick={openFile} />
        <button type="button" className="lock-hit" style={position(SCENE_LAYERS.lockHit)}
          aria-label="Open lab lockdown room" tabIndex={on ? 0 : -1}
          onPointerEnter={(event) => { if (event.pointerType === "mouse") setLockHover(true); }}
          onPointerLeave={() => setLockHover(false)} onClick={onLab} />
        <Button type="button" variant="ghost" className="slime-hit" style={position(SCENE_LAYERS.doorHit)}
          aria-label="Open Department of FOMO" tabIndex={on ? 0 : -1}
          onPointerEnter={(event) => { if (event.pointerType === "mouse") { setOpen(true); doorSound(); } }}
          onPointerLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
          onClick={() => { onDoor(); }} />
      </div>
      <div className="gate-overlay" aria-hidden="true" />
      {/* UI above the pulsing overlay, same frame as the stage, so the hint stays readable */}
      <div id="gate-ui" aria-hidden="true">
        <div className={"alarm" + (lockHover && !fileOpen ? " on" : "")}>
          <i className="alarm-wash" />
          {LOCK.beacons.map((b, i) => (
            <span key={i} className="beacon" style={{ left: `${b.x}%`, top: `${b.y}%`, "--bd": `${i * -0.55}s` } as CSSProperties}>
              <i className="beacon-beam" /><i className="beacon-lamp" />
            </span>
          ))}
        </div>
        <MatrixSign active={lockHover && !fileOpen} />
        <span className={"gate-tag clone-tag" + (cloneHover || fileBusy ? " on" : "")}
          style={{ left: `${SCENE_LAYERS.cloneHit.left + SCENE_LAYERS.cloneHit.width / 2}%`, top: `${SCENE_LAYERS.cloneHit.top}%` }}>
          {fileBusy ? "opening file…" : "▸ click to open file"}
        </span>
      </div>
      <ClassifiedFile open={fileOpen} onClose={closeFile} />
    </section>
  );
}