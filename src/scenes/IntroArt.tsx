import type { CSSProperties } from "react";
import { sceneImage, type SceneImage } from "@/config/cdn";
import { homepageArt } from "@/lib/homepageAsset";
import { FirstAidKit, GateBackdrop, SignLogo } from "./GateProps";

// Home screen: the broken-wall art (homepage.webp, 1821x864) with the CURRENT gate room showing
// through the hole. The full art sits underneath as a fallback, the gate layers go on top of it,
// and a second copy of the art with the hole masked out puts the rubble back in front.
const HOLE_SVG = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1821 864' preserveAspectRatio='none'><filter id='b'><feGaussianBlur stdDeviation='2.5'/></filter><path fill='#000' fill-rule='evenodd' filter='url(#b)' d='M0 0H1821V864H0Z M455 235 L520 228 L560 222 L600 215 L650 212 L700 205 L740 190 L800 185 L860 182 L900 185 L960 190 L1000 175 L1060 165 L1100 155 L1160 150 L1220 160 L1280 165 L1330 180 L1360 215 L1395 255 L1430 295 L1445 340 L1450 400 L1445 460 L1430 520 L1420 570 L1395 615 L1340 640 L1280 660 L1220 680 L1150 700 L1100 712 L1000 715 L900 712 L800 705 L720 690 L660 660 L600 635 L540 612 L490 590 L460 550 L445 500 L425 450 L420 400 L430 340 L440 290Z'/></svg>";
const HOLE_MASK = `url("data:image/svg+xml,${encodeURIComponent(HOLE_SVG)}")`;
// where the 3840x1800 gate canvas sits inside the 1821x864 art (scale .345, top-left 272,139)
const SCENE: CSSProperties = { left: `${272 / 18.21}%`, top: `${139 / 8.64}%`, width: `${(3840 * 0.345) / 18.21}%`, height: `${(1800 * 0.345) / 8.64}%` };
const LAYERS: SceneImage[] = ["bg.webp", "chair.webp", "clonebase.webp", "clonespecimen.webp", "clonecables.webp", "closeddoor.webp", "lockdoor.webp"];
const FULL: CSSProperties = { left: 0, top: 0, width: "100%", height: "100%" };

export function IntroArt() {
  return (
    <div className="intro-frame" aria-hidden="true">
      <img className="intro-art" src={homepageArt} alt="" draggable={false} />
      <div className="intro-scene" style={SCENE}>
        <img className="gate-layer" src={sceneImage("bg.webp")} alt="" style={FULL} draggable={false} />
        <GateBackdrop />
        {LAYERS.slice(1, 5).map((n) => <img key={n} className="gate-layer" src={sceneImage(n)} alt="" style={FULL} draggable={false} />)}
        <FirstAidKit />
        {LAYERS.slice(5).map((n) => <img key={n} className="gate-layer" src={sceneImage(n)} alt="" style={FULL} draggable={false} />)}
        <SignLogo />
        <img className="gate-layer" src={sceneImage("bgsilhouette.webp")} alt="" style={FULL} draggable={false} />
      </div>
      <img className="intro-art intro-rubble" src={homepageArt} alt="" draggable={false} style={{ maskImage: HOLE_MASK, WebkitMaskImage: HOLE_MASK }} />
    </div>
  );
}
