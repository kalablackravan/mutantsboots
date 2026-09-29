// Commit-pin the post-ENTER artwork so copied workspaces and deployments use the same files.
export const CDN_BASE = "https://cdn.jsdelivr.net/gh/0xDarkSeidBull/mutantboots@8ad728132c842cd45f3f264b1a136bd98ba96aa9/site/frontend/WEBP_FILES/";

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