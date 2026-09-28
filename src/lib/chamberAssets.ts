// GitHub-backed, commit-pinned CDN: no dependency on a particular Lovable project
// or deployment origin when this site is cloned to another workspace or Vercel.
const CDN = "https://cdn.jsdelivr.net/gh/0xDarkSeidBull/mutantboots@37f3701c26e57d5427e9a2932b9593912bde772b/site/frontend/";

type ChamberAsset = "emptychamber (1).webp" | "brokenglasswindows (1).webp" |
  "closedcabinet.webp" | "opencabinet.webp" | "LAB-LOCKDOWN.webp";

export const chamberArt = (name: ChamberAsset) => CDN + encodeURIComponent(name);