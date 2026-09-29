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
