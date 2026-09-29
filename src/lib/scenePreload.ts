import { SCENE_IMAGES, sceneImage } from "@/config/cdn";

// Fetch AND decode every post-ENTER layer before the visitor presses ENTER,
// so the whole scene can appear in one frame instead of layer by layer.
let ready: Promise<void> | null = null;

const loadAndDecode = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = "sync";
    img.src = src;
    const done = () => resolve();
    if (typeof img.decode === "function") img.decode().then(done, done);
    else { img.onload = done; img.onerror = done; }
  });

export function preloadScene(timeoutMs = 12000): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  ready ??= Promise.race([
    Promise.all(SCENE_IMAGES.map((name) => loadAndDecode(sceneImage(name)))).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)), // never trap the visitor on a slow network
  ]);
  return ready;
}
