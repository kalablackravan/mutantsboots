import { useState, type CSSProperties, type SyntheticEvent } from "react";
import { Button } from "@/components/ui/button";
import { sceneImage, type SceneImage } from "@/config/cdn";
import { SCENE_LAYERS } from "./config";

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
  return (
    <section id="s-gate" className={"scene" + (on ? " on" : warm ? " warm" : "") + (zoom ? " " + zoom : "")} aria-hidden={!on}>
      <div id="gate-stage" className={open && openReady ? "slime-open" : ""}>
        <SceneLayer name="bg.webp" box={SCENE_LAYERS.full} className="gate-background" />
        <SceneLayer name="bgsilhouette.webp" box={SCENE_LAYERS.full} />
        <SceneLayer name="chair.webp" box={SCENE_LAYERS.full} />
        <SceneLayer name="clonevessel.webp" box={SCENE_LAYERS.full} />
        <SceneLayer name="closeddoor.webp" box={SCENE_LAYERS.full} className="slime-closed" />
        <SceneLayer name="lockdoor.webp" box={SCENE_LAYERS.full} />
        <SceneLayer name="opendoor.webp" box={SCENE_LAYERS.full} className="slime-open-layer"
          onLoad={(event) => { void event.currentTarget.decode().then(() => setOpenReady(true)).catch(() => setOpenReady(false)); }} />
        <Button type="button" variant="ghost" className="slime-hit" style={position(SCENE_LAYERS.doorHit)}
          aria-label="Open Department of FOMO" tabIndex={on ? 0 : -1}
          onPointerEnter={(event) => { if (event.pointerType === "mouse") setOpen(true); }}
          onPointerLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
          onClick={onDoor} />
      </div>
      <div className="gate-overlay" aria-hidden="true" />
    </section>
  );
}