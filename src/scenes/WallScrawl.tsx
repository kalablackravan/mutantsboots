import type { CSSProperties } from "react";

// Single digits scratched / chalked on the walls. Pure hype: none of them is a real code.
// x / y = CENTRE of the digit in canvas pixels on the 3840x1800 art (% = x/38.4, y/18); size in cqw; rot in degrees.
type Mark = { t: string; x: number; y: number; rot: number; size: number; kind: "chalk" | "scratch" };
const GATE: Mark[] = [
  { t: "0", x: 296, y: 601, rot: -6, size: 2.6, kind: "chalk" },     // left wall, above the test tubes
  { t: "9", x: 1354, y: 1222, rot: 4, size: 2.2, kind: "chalk" },    // between vessel and lockdown door
  { t: "7", x: 2554, y: 831, rot: 7, size: 2.4, kind: "scratch" },   // wall between the two doors (top)
  { t: "8", x: 2570, y: 957, rot: -5, size: 2.4, kind: "scratch" },  // wall between the two doors (below the 7)
  { t: "1", x: 3111, y: 270, rot: 3, size: 2.4, kind: "chalk" },     // top right wall, above the restricted door
  { t: "7", x: 3696, y: 717, rot: -12, size: 1.8, kind: "scratch" }, // far right, beside the pipe
];
const LAB: Mark[] = [
  { t: "8", x: 601, y: 411, rot: -8, size: 2.6, kind: "chalk" },     // above the noticeboard
  { t: "4", x: 350, y: 681, rot: 5, size: 2.6, kind: "chalk" },      // left of the noticeboard
  { t: "3", x: 1362, y: 220, rot: 6, size: 2.6, kind: "chalk" },     // top wall, left of the tubes
  { t: "5", x: 2754, y: 210, rot: -6, size: 2.6, kind: "chalk" },    // top wall, right of the tubes
  { t: "8", x: 3555, y: 601, rot: 4, size: 2.6, kind: "scratch" },   // right wall, beside the exit pipe
  { t: "4", x: 2624, y: 881, rot: -10, size: 2.2, kind: "scratch" }, // wall right of the desk monitors
  { t: "4", x: 861, y: 1142, rot: 3, size: 2.4, kind: "chalk" },     // lower wall, right of the small TV table
  { t: "1", x: 1262, y: 1182, rot: 5, size: 2.4, kind: "scratch" },  // lower wall, left of the desk
  { t: "1", x: 3275, y: 1232, rot: -8, size: 2.2, kind: "chalk" },   // between CCTV cabinet and out-of-service machine
];

export function WallScrawl({ room }: { room: "gate" | "lab" }) {
  return (
    <>
      {(room === "gate" ? GATE : LAB).map((m, i) => (
        <span key={i} className={"wall-scrawl " + m.kind} aria-hidden="true"
          style={{ left: `${m.x / 38.4}%`, top: `${m.y / 18}%`, fontSize: `${m.size}cqw`, "--r": `${m.rot}deg` } as CSSProperties}>{m.t}</span>
      ))}
    </>
  );
}
