// Commit-pin the post-ENTER artwork so copied workspaces and deployments use the same files.
export const CDN_BASE = "https://cdn.jsdelivr.net/gh/0xDarkSeidBull/mutantboots@612f905d05f0b9a431438ed9e45f0f452030761c/site/frontend/WEBP_FILES/";

// Same pinned commit, site/assets folder (devil prints used in the classified file).
export const SITE_ASSETS = CDN_BASE.replace("/frontend/WEBP_FILES/", "/assets/");

export const sceneImage = (filename: SceneImage) => CDN_BASE + filename;

export type SceneImage =
  | "bg.webp"
  | "bgsilhouette.webp"
  | "chair.webp"
  | "clonevessel.webp"
  | "clonebase.webp"
  | "clonecables.webp"
  | "clonespecimen.webp"
  | "closeddoor.webp"
  | "lockdoor.webp"
  | "opendoor.webp"
  | "bestspread.webp"
  | "file_front.webp"
  | "file_inside.webp"
  | "file_back.webp";

export const SCENE_IMAGES: SceneImage[] = [
  "bg.webp", "bgsilhouette.webp", "chair.webp", "clonebase.webp", "clonecables.webp", "clonespecimen.webp",
  "closeddoor.webp", "lockdoor.webp", "opendoor.webp",
];