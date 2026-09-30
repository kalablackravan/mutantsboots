import { useCallback, useEffect, useState, type CSSProperties, type SyntheticEvent } from "react";
import { Button } from "@/components/ui/button";
import { sceneImage, type SceneImage } from "@/config/cdn";
import { SCENE_LAYERS } from "./config";
import { ClassifiedFile } from "@/overlays/ClassifiedFile";
import { preloadFile } from "@/lib/fileArt";
import { startSubmergedBubbleLoop } from "@/lib/fileSounds";

type LayerBox = { left: number; top: number; width: number; height: number; objectPosition?: string };
type Props = { on: boolean; warm?: boolean; zoom?: "" | "zoom-from"; onDoor: () => void };

const position = (box: LayerBox): CSSProperties => ({
  left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%`,
  objectPosition: box.objectPosition,
});

function SceneLayer({ name, box, className = "", onLoad }: { name: SceneImage; box: LayerBox; className?: string; onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void }) {
  const hideOnError = (event: SyntheticEvent<HTMLImageElement>) => { event.currentTarget.hidden = true; };
  return <img className={`gate-layer ${className}`} src={sceneImage(name)} alt="" style={position(box)}
    decoding="sync" loading="eager" fetchPriority="high" draggable={false} onError={hideOnError} onLoad={onLoad} />;
}

export function Gate({ on, warm = false, zoom = "", onDoor }: Props) {
  const [open, setOpen] = useState(false);
  const [openReady, setOpenReady] = useState(false);
  const [cloneHover, setCloneHover] = useState(false);
  const [doorHover, setDoorHover] = useState(false);
  const [lockHover, setLockHover] = useState(false);
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
      <div id="gate-stage" inert={fileOpen} className={[open && openReady ? "slime-open" : "", cloneHover ? "clone-hover" : "", doorHover ? "door-hover" : "", fileOpen ? "file-open" : ""].filter(Boolean).join(" ")}>
        <SceneLayer name="bg.webp" box={SCENE_LAYERS.full} className="gate-background" />
        {/* toxic-green glow copy of the cloning machine: sits behind it, fades in + pulses on hover */}
        <div className="clone-glow-wrap" aria-hidden="true">
          <SceneLayer name="clonevessel.webp" box={SCENE_LAYERS.full} className="clone-glow" />
        </div>
        <SceneLayer name="chair.webp" box={SCENE_LAYERS.full} />
        <SceneLayer name="clonevessel.webp" box={SCENE_LAYERS.full} className="clone-body" />
        <div className="door-glow-wrap" aria-hidden="true">
          <SceneLayer name="closeddoor.webp" box={SCENE_LAYERS.full} className="door-glow" />
        </div>
        <SceneLayer name="closeddoor.webp" box={SCENE_LAYERS.full} className="slime-closed" />
        <div className="lock-glow-wrap" aria-hidden="true">
          <SceneLayer name="lockdoor.webp" box={SCENE_LAYERS.full} className="lock-glow" />
        </div>
        <SceneLayer name="lockdoor.webp" box={SCENE_LAYERS.full} />
        <SceneLayer name="opendoor.webp" box={SCENE_LAYERS.full} className="slime-open-layer"
          onLoad={(event) => { void event.currentTarget.decode().then(() => setOpenReady(true)).catch(() => setOpenReady(false)); }} />
        <SceneLayer name="bgsilhouette.webp" box={SCENE_LAYERS.full} className="gate-silhouette" />
        <button type="button" className="clone-hit" style={position(SCENE_LAYERS.cloneHit)}
          aria-label="Open the classified file" tabIndex={on ? 0 : -1}
          onPointerEnter={(event) => { if (event.pointerType === "mouse") setCloneHover(true); void preloadFile(); }}
          onPointerLeave={() => setCloneHover(false)} onFocus={() => setCloneHover(true)} onBlur={() => setCloneHover(false)}
          onClick={openFile} />
        <Button type="button" variant="ghost" className="slime-hit" style={position(SCENE_LAYERS.doorHit)}
          aria-label="Open Department of FOMO" tabIndex={on ? 0 : -1}
          onPointerEnter={(event) => { if (event.pointerType === "mouse") { setOpen(true); setDoorHover(true); } }}
          onPointerLeave={() => { setOpen(false); setDoorHover(false); }} onFocus={() => { setOpen(true); setDoorHover(true); }} onBlur={() => { setOpen(false); setDoorHover(false); }}
          onClick={() => { onDoor(); }} />
      </div>
      <div className="gate-overlay" aria-hidden="true" />
      {/* UI above the pulsing overlay, same frame as the stage, so the hint stays readable */}
      <div id="gate-ui" aria-hidden="true">
        <span className={"gate-tag clone-tag" + (cloneHover || fileBusy ? " on" : "")}
          style={{ left: `${SCENE_LAYERS.cloneHit.left + SCENE_LAYERS.cloneHit.width / 2}%`, top: `${SCENE_LAYERS.cloneHit.top}%` }}>
          {fileBusy ? "opening file…" : "▸ click to open file"}
        </span>
      </div>
      <ClassifiedFile open={fileOpen} onClose={closeFile} />
    </section>
  );
}