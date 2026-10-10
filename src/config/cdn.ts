// All scene artwork is served from this site itself (public/scene/art), so nothing points anywhere else.
export const CDN_BASE = "/scene/art/";

// Trait-scanner front view (blank CRT, transparent screen).
export const BLANK_DISPLAY = "/scene/art/blankdisplay.webp";

// Lab desk with see-through monitor screens and an empty top.
export const LAB_DESK = "/scene/art/lab-desk.webp";

// Gate background (pipes run to a faucet by the restricted door).
export const GATE_BG = "/scene/art/gate-bg.webp";
const SCENE_OVERRIDES: Partial<Record<SceneImage, string>> = { "bg.webp": GATE_BG };

export const sceneImage = (filename: SceneImage) => SCENE_OVERRIDES[filename] ?? CDN_BASE + filename;

export type SceneImage =
  | "bg.webp"
  | "bgsilhouette.webp"
  | "chair.webp"
  | "clonebase.webp"
  | "clonecables.webp"
  | "clonespecimen.webp"
  | "closeddoor.webp"
  | "lockdoor.webp"
  | "opendoor.webp"
  | "file_front.webp"
  | "file_inside.webp"
  | "file_back.webp"
  | "2ndbg.webp"
  | "clipboard.webp"
  | "clipboard_black_border_thin.webp"
  | "flask_black_border.webp"
  | "files_black_border.webp"
  | "frame_black_border.webp";

export const SCENE_IMAGES: SceneImage[] = [
  "bg.webp", "bgsilhouette.webp", "chair.webp", "clonebase.webp", "clonecables.webp", "clonespecimen.webp",
  "closeddoor.webp", "lockdoor.webp", "opendoor.webp",
];