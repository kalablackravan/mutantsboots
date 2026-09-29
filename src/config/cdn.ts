// Commit-pin the post-ENTER artwork so copied workspaces and deployments use the same files.
export const CDN_BASE = "https://cdn.jsdelivr.net/gh/0xDarkSeidBull/mutantboots@3d3a5e711cfce4e65b0c187081ec14679326cb7e/site/frontend/WEBP_FILES/";

export const sceneImage = (filename: SceneImage) => CDN_BASE + filename;

export type SceneImage =
  | "bg.webp"
  | "bgsilhouette.webp"
  | "chair.webp"
  | "clonevessel.webp"
  | "closeddoor.webp"
  | "lockdoor.webp"
  | "opendoor.webp";

export const SCENE_IMAGES: SceneImage[] = [
  "bg.webp", "bgsilhouette.webp", "chair.webp", "clonevessel.webp",
  "closeddoor.webp", "lockdoor.webp", "opendoor.webp",
];