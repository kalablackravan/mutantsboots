import type { CSSProperties } from "react";

// Three single digits per room, painted straight onto the wall (old faded paint, patchy, part of the plaster).
// Pure hype: none of them is a real code.
// x / y = CENTRE of the digit in canvas pixels on the 3840x1800 art (% = x/38.4, y/18); size in cqw; rot in degrees.
type Mark = { t: string; x: number; y: number; rot: number; size: number };
const GATE: Mark[] = [
  { t: "0", x: 296, y: 601, rot: -6, size: 3.6 },    // left wall, above the test tubes
  { t: "7", x: 2560, y: 880, rot: 5, size: 3.6 },    // wall between the two doors
  { t: "1", x: 3111, y: 270, rot: 3, size: 3.3 },  // top right wall, above the restricted door
];
const LAB: Mark[] = [
  { t: "8", x: 601, y: 411, rot: -7, size: 3.6 },    // above the noticeboard
  { t: "5", x: 2754, y: 210, rot: -5, size: 3.6 },   // top wall, right of the tubes
  { t: "1", x: 3275, y: 1232, rot: 4, size: 3.3 }, // between CCTV cabinet and out-of-service machine
];

export function WallScrawl({ room }: { room: "gate" | "lab" }) {
  const id = "wall-paint-" + room;
  return (
    <>
      {/* rough brush edge + patchy coverage so the digit reads as paint on plaster, not a font on top */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="3" seed="3" result="p" />
          <feColorMatrix in="p" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.7" result="m" />
          <feComposite in="d" in2="m" operator="in" />
        </filter>
      </svg>
      {(room === "gate" ? GATE : LAB).map((m, i) => (
        <span key={i} className="wall-scrawl" aria-hidden="true"
          style={{ left: `${m.x / 38.4}%`, top: `${m.y / 18}%`, fontSize: `${m.size}cqw`, "--r": `${m.rot}deg`, filter: `url(#${id})` } as CSSProperties}>{m.t}</span>
      ))}
    </>
  );
}
