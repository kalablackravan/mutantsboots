// Commit-pin the post-ENTER artwork so copied workspaces and deployments use the same files.
export const CDN_BASE = "https://cdn.jsdelivr.net/gh/0xDarkSeidBull/mutantboots@271c5fe0644a2f858f8a85fb5fd4312afa116c70/site/frontend/WEBP_FILES/";

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