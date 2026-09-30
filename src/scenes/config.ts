/* Reconstructed CFG: the layout map app.js reads. Every box is in room-art pixels on the
   3840x1800 canvas shared by bg.webp (corridor) and 01-room-open.png (room). Values marked
   "inferred" were fitted to the artwork (floor line, desk top, wall) because the original
   CFG was not supplied; adjust them here only. */
export type Box = { x: number; y: number; w: number; h: number };

const DESK = 1150; // desk-top resting line in 01-room-open.png

export const CFG = {
  art: {
    canvas: { w: 3840, h: 1800 },
    // room (desk pieces)
    bell: { x: 950, y: DESK - 142, w: 180, h: 148 },
    folder: { x: 1180, y: DESK, w: 316, h: 162 },
    review: { x: 1180, y: DESK, w: 316, h: 162 },
    socials: { x: 1560, y: DESK + 60, w: 252, h: 140 },
    tasks: { x: 2060, y: DESK, w: 442, h: 182 },
    menu: { x: 2790, y: DESK - 150, w: 150, h: 210 },
    gallery: { x: 560, y: 360, w: 552, h: 396 },
    board: { x: 2440, y: 300, w: 835, h: 661 },
    crumple: { x: 2330, y: DESK + 110, w: 98, h: 97 },
    exit: { x: 950, y: 1270, w: 190, h: 90 }, // the EXIT carved into the desk
  },
  // portrait: bell and menu pinned to the window edges (see artBox edge logic in app.js)
  artPortrait: {
    bell: { edge: "left", inset: 16 },
    menu: { edge: "right", inset: 16 },
  } as Record<string, { edge: "left" | "right"; inset: number }>,
  // the clerk's bubble: tail tip just above his head
  bubble: { cx: 1920, tip: 610, maxw: 1100 },
  // noticeboard sheet boxes, % of the board art (from the paper layers' own alpha bounds)
  papers: {
    1: { x: 61.7, y: 17.1, w: 23.1, h: 13.9 },
    2: { x: 27.3, y: 41.1, w: 22.9, h: 14.2 },
    3: { x: 17.6, y: 61.9, w: 23.2, h: 15.4 },
    4: { x: 53.8, y: 33.3, w: 23.7, h: 21.5 },
    5: { x: 61.8, y: 58.1, w: 24.2, h: 23.4 },
    6: { x: 12.3, y: 15.6, w: 24.9, h: 25.4 },
  } as Record<number, Box>,
  folderAR: 2440 / 1404,
  // the writable page inside 08-spread (% of the spread)
  page: { x: 56, y: 8, w: 37, h: 82 },
  WIDE_RATIO: 1.6,
};

// Every WEBP_FILES layer is a complete 3840 × 1800 transparent canvas with its
// own artwork already positioned. Overlay the canvases without cropping or offsets.
export const SCENE_LAYERS = {
  full: { left: 0, top: 0, width: 100, height: 100 },
  // Transparent bounds of closeddoor.webp/opendoor.webp on the same canvas.
  doorHit: { left: 2593 / 3840 * 100, top: 376 / 1800 * 100, width: 916 / 3840 * 100, height: 1228 / 1800 * 100 },
  // Main body of clonevessel.webp (gauges + tube + base) on the same canvas: hover area for the glow.
  cloneHit: { left: 495 / 3840 * 100, top: 515 / 1800 * 100, width: 685 / 3840 * 100, height: 1045 / 1800 * 100 },
  // Transparent bounds of lockdoor.webp (middle lab lockdown door): hover area for the red glow.
  lockHit: { left: 1470 / 3840 * 100, top: 303 / 1800 * 100, width: 982 / 3840 * 100, height: 1315 / 1800 * 100 },
} as const;

// Cloning machine split into layers on the same canvas (base / specimen / cables);
// the three pressure gauges get live needles (pivot + dial radius in canvas px).
export const CLONE = {
  gauges: [
    { cx: 566, cy: 813, r: 20, dur: 1.7, delay: 0 },    // 1: side gauge
    { cx: 879, cy: 543, r: 37, dur: 2.3, delay: 0.2 },  // 2: big top gauge
    { cx: 962, cy: 573, r: 22, dur: 1.4, delay: 0.45 }, // 3: small top gauge
  ],
} as const;

// Lab lockdown door: the sign's text strip and the two red beacons (canvas px -> %).
export const LOCK = {
  sign: { left: 1846 / 38.4, top: 400 / 18, width: (2088 - 1846) / 38.4, height: (452 - 400) / 18 },
  beacons: [{ x: 1665 / 38.4, y: 435 / 18 }, { x: 2246 / 38.4, y: 436 / 18 }],
} as const;

// Classified file: bestspread.webp is a full 3840x1800 canvas with the open folder embedded in
// place. The folder is rebuilt from three crops of it that each turn on the spine (x 2027):
// front cover (left half), the page-1/2 sheet, and the back half (papers). Boxes are % of the canvas.
const cbox = (x0: number, y0: number, x1: number, y1: number) => ({ left: x0 / 38.4, top: y0 / 18, width: (x1 - x0) / 38.4, height: (y1 - y0) / 18 });
export const FILE_LAYOUT = {
  src: { left: [653, 62, 2027, 1669], right: [2027, 62, 3435, 1669], paper: [2208, 148, 3245, 1526] } as const,
  cover: cbox(2027, 62, 3401, 1669),     // front cover: closed = lying over the right half
  back: cbox(2027, 62, 3435, 1669),       // back half with the papers
  sheet: cbox(2208, 148, 3245, 1526),      // page 1 (front) / page 2 (back)
  sheetOrigin: (2027 - 2208) / (3245 - 2208) * 100,
  // page 3 sits on the top paper of the back half (% of the back-half box)
  paperInBack: { left: (2208 - 2027) / (3435 - 2027) * 100, top: (148 - 62) / (1669 - 62) * 100, width: (3245 - 2208) / (3435 - 2027) * 100, height: (1526 - 148) / (1669 - 62) * 100 },
  // horizontal shift (% of canvas) that centres whatever is showing: closed front, open spread, closed back
  shift: { closed: (1920 - (2027 + 3401) / 2) / 38.4, open: (1920 - (653 + 3435) / 2) / 38.4, back: (1920 - (619 + 2027) / 2) / 38.4 },
  leftClip: "polygon(4.29% 5.16%, 3.06% 6.91%, 3.28% 9.40%, 1.16% 10.02%, 0.07% 11.51%, 0.29% 17.73%, 1.31% 19.60%, 2.91% 21.03%, 2.62% 22.96%, 0.51% 24.08%, 0.07% 25.76%, 0.95% 29.00%, 2.26% 30.49%, 3.78% 34.10%, 2.47% 48.23%, 6.11% 51.84%, 6.77% 54.39%, 7.86% 55.38%, 8.08% 57.37%, 7.86% 58.18%, 4.37% 60.17%, 3.28% 61.54%, 3.28% 71.69%, 1.89% 77.47%, 2.11% 80.02%, 1.16% 81.08%, 0.66% 84.32%, 1.67% 85.25%, 1.46% 89.23%, 2.26% 90.85%, 5.97% 93.53%, 10.04% 93.59%, 11.72% 94.09%, 12.66% 95.89%, 13.97% 96.52%, 16.16% 96.08%, 19.29% 96.39%, 22.78% 93.34%, 25.40% 93.34%, 28.31% 94.84%, 33.11% 93.96%, 36.39% 94.09%, 39.37% 97.14%, 44.76% 96.52%, 46.65% 98.20%, 49.64% 99.32%, 54.00% 98.51%, 62.52% 98.26%, 64.92% 97.39%, 66.89% 97.39%, 68.85% 98.51%, 71.25% 98.63%, 76.27% 96.64%, 77.37% 96.64%, 79.26% 97.57%, 82.75% 97.76%, 87.77% 96.95%, 89.96% 96.08%, 93.52% 96.02%, 96.22% 97.14%, 99.13% 96.33%, 99.93% 95.27%, 99.93% 4.04%, 95.12% 4.23%, 86.32% 2.92%, 81.73% 3.42%, 80.28% 2.92%, 74.16% 3.24%, 70.96% 2.74%, 68.70% 3.86%, 60.48% 3.73%, 53.06% 4.29%, 51.82% 3.80%, 49.27% 3.92%, 47.74% 2.86%, 44.10% 2.49%, 41.48% 1.56%, 25.91% 1.80%, 24.16% 0.00%, 20.60% 0.00%, 13.61% 3.24%, 10.33% 3.48%, 7.57% 4.60%)",
  rightClip: "polygon(95.74% 5.10%, 92.76% 4.67%, 91.12% 3.48%, 87.36% 3.42%, 85.51% 1.12%, 82.32% 0.68%, 66.12% 0.93%, 47.73% 0.50%, 44.96% 1.68%, 13.00% 2.55%, 9.52% 3.55%, 1.07% 3.48%, 0.00% 4.04%, 0.07% 95.33%, 2.34% 96.08%, 7.32% 95.52%, 9.23% 95.96%, 10.80% 97.32%, 14.63% 97.14%, 15.55% 96.70%, 41.34% 96.89%, 42.26% 98.01%, 43.54% 98.44%, 50.85% 99.07%, 53.98% 98.57%, 55.68% 97.32%, 59.94% 96.83%, 62.00% 98.57%, 69.03% 98.94%, 70.24% 99.69%, 73.15% 99.88%, 80.11% 98.26%, 86.58% 97.51%, 88.42% 95.46%, 90.77% 95.64%, 91.83% 95.27%, 93.39% 93.59%, 93.75% 91.97%, 95.45% 91.79%, 96.95% 90.91%, 97.66% 88.24%, 99.64% 86.43%, 99.43% 64.97%, 98.15% 63.29%, 96.09% 62.54%, 96.16% 61.05%, 97.51% 60.11%, 98.01% 59.05%, 98.08% 52.83%, 96.02% 51.15%, 95.81% 48.48%, 93.89% 45.99%, 93.89% 44.06%, 94.67% 42.87%, 98.37% 41.01%, 99.29% 39.89%, 99.93% 20.66%, 97.87% 18.48%, 97.59% 16.61%, 99.29% 15.18%, 99.29% 9.27%, 98.79% 8.15%)",
  paperClip: "polygon(1.45% 0.29%, 0.96% 1.38%, 0.29% 1.45%, 0.19% 12.77%, 0.68% 12.92%, 0.19% 21.99%, 0.77% 22.50%, 0.96% 24.38%, 0.19% 25.25%, 0.00% 46.01%, 0.48% 50.73%, 0.00% 88.32%, 0.96% 88.46%, 0.96% 89.40%, 1.45% 89.48%, 1.16% 92.67%, 0.00% 93.03%, 1.06% 94.56%, 1.06% 95.57%, 0.00% 95.65%, 0.00% 96.66%, 0.96% 96.88%, 1.06% 97.68%, 1.83% 98.26%, 4.34% 98.48%, 4.63% 97.97%, 8.39% 98.26%, 8.68% 97.53%, 10.03% 97.53%, 13.31% 98.26%, 14.95% 99.42%, 45.61% 99.64%, 47.93% 99.27%, 48.99% 99.71%, 72.03% 99.85%, 78.50% 98.48%, 82.35% 97.10%, 83.70% 97.10%, 83.99% 97.68%, 88.14% 94.85%, 89.49% 94.85%, 89.68% 95.28%, 92.48% 92.45%, 99.13% 90.28%, 99.90% 89.48%, 99.90% 88.39%, 98.36% 87.30%, 98.36% 86.28%, 99.81% 84.69%, 97.88% 62.41%, 97.69% 61.03%, 96.53% 59.65%, 97.20% 56.31%, 96.72% 50.51%, 96.24% 50.15%, 96.72% 4.79%, 95.85% 4.21%, 95.85% 3.12%, 96.53% 2.61%, 94.79% 0.22%, 61.72% 0.58%, 59.69% 1.16%, 55.45% 1.02%, 52.75% 2.10%, 50.82% 1.89%, 48.41% 3.27%, 47.06% 3.27%, 46.38% 2.25%, 44.94% 1.74%, 44.36% 0.44%, 44.26% 0.80%, 42.82% 0.80%, 42.53% 0.29%, 35.20% 0.29%, 35.10% 0.65%, 31.24% 0.94%, 26.52% 0.73%, 26.23% 0.22%, 16.10% 0.15%, 13.69% 1.31%, 9.64% 1.23%, 8.49% 0.44%, 5.40% 0.00%)",
} as const;

export type Frame = { scale: number; ox: number; oy: number };
// artFrame() from app.js: cover-fit, centred; on wide screens fit and pin to the top.
export function artFrame(vw: number, vh: number): Frame {
  const c = CFG.art.canvas;
  const wide = vw / vh >= CFG.WIDE_RATIO;
  const scale = wide ? Math.min(vw / c.w, vh / c.h) : Math.max(vw / c.w, vh / c.h);
  return { scale, ox: (vw - c.w * scale) / 2, oy: wide ? 0 : (vh - c.h * scale) / 2 };
}
export function artBox(k: string, f: Frame, vw: number, vh: number): Box {
  const b = CFG.art[k as keyof Omit<typeof CFG.art, "canvas">] as Box | undefined;
  if (!b) return { x: 0, y: 0, w: 0, h: 0 };
  const p = vw <= vh ? CFG.artPortrait[k] : undefined;
  if (!p) return b;
  const x = p.edge === "right" ? (vw - p.inset - b.w * f.scale - f.ox) / f.scale : (p.inset - f.ox) / f.scale;
  return { ...b, x };
}
export const px = (b: Box, f: Frame) => ({
  left: f.ox + b.x * f.scale,
  top: f.oy + b.y * f.scale,
  width: b.w * f.scale,
  height: b.h * f.scale,
});

// Chamber objects share the 1672 × 941 source artwork's coordinates. Widths alone
// set their scale; each supplied image retains its own original aspect ratio.
export const CHAMBER = {
  width: 1672,
  height: 941,
  window: { x: 300, y: 265, w: 240 },
  door: { x: 680, y: 205, w: 310 },
  cabinet: { x: 1250, y: 430, w: 245 },
} as const;
