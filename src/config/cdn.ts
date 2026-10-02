// Commit-pin the post-ENTER artwork so copied workspaces and deployments use the same files.
export const CDN_BASE = "https://cdn.jsdelivr.net/gh/0xDarkSeidBull/mutantboots@3dcd346e99e662649114e145eefd9aec54128f7e/site/frontend/WEBP_FILES/";

// Same pinned commit, site/assets folder (devil prints used in the classified file).
export const SITE_ASSETS = CDN_BASE.replace("/frontend/WEBP_FILES/", "/assets/");

// Pinned to the commit that introduced this room so every deployment keeps it.
export const LAB_ROOM_IMAGE = "https://cdn.jsdelivr.net/gh/0xDarkSeidBull/mutantboots@a6518976e76b03bb081162bd6564d48817dffc7d/site/frontend/WEBP_FILES/2ndbg.webp";

// Trait-scanner front view (blank CRT, transparent screen), pinned to the commit that added it.
export const BLANK_DISPLAY = "https://cdn.jsdelivr.net/gh/0xDarkSeidBull/mutantboots@cb588bd221bcd7b6ecfda0bf2d3b99242619de5c/site/frontend/WEBP_FILES/blankdisplay.webp";

// Lab desk with see-through monitor screens and an empty top (photoroompfp.webp), pinned to the commit that added it.
export const LAB_DESK = "https://cdn.jsdelivr.net/gh/0xDarkSeidBull/mutantboots@7c7a2d6f4959beb5e7f0ba87cc1fb4b65f7be18a/site/frontend/WEBP_FILES/photoroompfp.webp";

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
  | "file_back.webp"
  | "2ndbg.webp"
  | "desk.webp"
  | "clipboard.webp"
  | "clipboard_black_border_thin.webp"
  | "flask_black_border.webp"
  | "files_black_border.webp"
  | "frame_black_border.webp";

export const SCENE_IMAGES: SceneImage[] = [
  "bg.webp", "bgsilhouette.webp", "chair.webp", "clonebase.webp", "clonecables.webp", "clonespecimen.webp",
  "closeddoor.webp", "lockdoor.webp", "opendoor.webp",
];