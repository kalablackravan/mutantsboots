import { useState, type CSSProperties, type SyntheticEvent } from "react";
import { Button } from "@/components/ui/button";
import { sceneImage, type SceneImage } from "@/config/cdn";
import { SCENE_LAYERS } from "./config";

type LayerBox = { left: number; top: number; width: number; height: number; objectPosition?: string };
type Props = { on: boolean; onDoor: () => void };

const position = (box: LayerBox): CSSProperties => ({
  left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%`,
  objectPosition: box.objectPosition,
});

function SceneLayer({ name, box, className = "" }: { name: SceneImage; box: LayerBox; className?: string }) {
  const hideOnError = (event: SyntheticEvent<HTMLImageElement>) => { event.currentTarget.hidden = true; };
  return <img className={`gate-layer ${className}`} src={sceneImage(name)} alt="" style={position(box)}
    decoding="async" draggable={false} onError={hideOnError} />;
}

export function Gate({ on, onDoor }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <section id="s-gate" className={"scene" + (on ? " on" : "")} aria-hidden={!on}>
      <div id="gate-stage" className={open ? "slime-open" : ""}>
        <SceneLayer name="bg.webp" box={SCENE_LAYERS.bg} className="gate-background" />
        <SceneLayer name="cloning.webp" box={SCENE_LAYERS.cloning} />
        <SceneLayer name="chair.webp" box={SCENE_LAYERS.chair} />
        <SceneLayer name="noaccess-door.webp" box={SCENE_LAYERS.noaccess} />
        <SceneLayer name="slime_door_closed.webp" box={SCENE_LAYERS.slime} className="slime-closed" />
        <SceneLayer name="slime_door_open.webp" box={SCENE_LAYERS.slime} className="slime-open-layer" />
        <SceneLayer name="bg_silhouette.webp" box={SCENE_LAYERS.silhouette} className="gate-silhouette" />
        <Button type="button" variant="ghost" className="slime-hit" style={position(SCENE_LAYERS.slime)}
          aria-label="Open Department of FOMO" tabIndex={on ? 0 : -1}
          onPointerEnter={(event) => { if (event.pointerType === "mouse") setOpen(true); }}
          onPointerLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
          onClick={onDoor} />
      </div>
    </section>
  );
}