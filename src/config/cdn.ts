// Pin this artwork to the same public GitHub-backed CDN revision as the entry image.
// Changing hosts or revisions requires updating only this base URL.
export const CDN_BASE = "https://cdn.jsdelivr.net/gh/0xDarkSeidBull/mutantboots@66846a4d64a4ff64a622efaa06f04db5cf7ff08b/site/frontend/webp/";

export const sceneImage = (filename: SceneImage) => CDN_BASE + filename;

export type SceneImage =
  | "bg.webp"
  | "bg_silhouette.webp"
  | "chair.webp"
  | "cloning.webp"
  | "noaccess-door.webp"
  | "slime_door_closed.webp"
  | "slime_door_open.webp";

export const SCENE_IMAGES: SceneImage[] = [
  "bg.webp", "cloning.webp", "chair.webp", "noaccess-door.webp",
  "slime_door_closed.webp", "slime_door_open.webp", "bg_silhouette.webp",
];