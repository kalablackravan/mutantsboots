// Commit-pin the post-ENTER artwork so copied workspaces and deployments use the same files.
export const CDN_BASE = "https://cdn.jsdelivr.net/gh/0xDarkSeidBull/mutantboots@07a772c0147b805dc71e1f5f76d8ed71a6f00adf/site/frontend/WEBP_FILES/";

// Same pinned commit, site/assets folder (devil prints used in the classified file).
export const SITE_ASSETS = CDN_BASE.replace("/frontend/WEBP_FILES/", "/assets/");

export const sceneImage = (filename: SceneImage) => CDN_BASE + filename;

export type SceneImage =
  | "bg.webp"
  | "bgsilhouette.webp"
  | "chair.webp"
  | "clonevessel.webp"
  | "closeddoor.webp"
  | "lockdoor.webp"
  | "opendoor.webp"
  | "bestspread.webp"
  | "file_front.webp"
  | "file_inside.webp"
  | "file_back.webp";

export const SCENE_IMAGES: SceneImage[] = [
  "bg.webp", "bgsilhouette.webp", "chair.webp", "clonevessel.webp",
  "closeddoor.webp", "lockdoor.webp", "opendoor.webp",
];