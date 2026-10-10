import type { CSSProperties } from "react";

// Out-of-nowhere numbers scratched / chalked / pencilled around the rooms. Pure hype: none of them is a real code.
// x / y are canvas pixels on the 3840x1800 art (% = x/38.4, y/18); rot in degrees.
type Mark = { t: string; x: number; y: number; rot: number; size: number; kind: "chalk" | "scratch" | "pencil" };
const GATE: Mark[] = [
  { t: "4 1 7", x: 1240, y: 1500, rot: -7, size: 1.55, kind: "chalk" },
  { t: "09", x: 3010, y: 1330, rot: 5, size: 1.1, kind: "scratch" },
];
const LAB: Mark[] = [
  { t: "2 8 0 6", x: 3040, y: 560, rot: -4, size: 1.35, kind: "scratch" },
  { t: "73", x: 1090, y: 700, rot: 8, size: 1.15, kind: "pencil" },
  { t: "5 · 1 · 3 · 8", x: 2440, y: 1330, rot: -2, size: 1.0, kind: "chalk" },
];

export function WallScrawl({ room }: { room: "gate" | "lab" }) {
  return (
    <>
      {(room === "gate" ? GATE : LAB).map((m, i) => (
        <span key={i} className={"wall-scrawl " + m.kind} aria-hidden="true"
          style={{ left: `${m.x / 38.4}%`, top: `${m.y / 18}%`, fontSize: `${m.size}cqw`, transform: `rotate(${m.rot}deg)` } as CSSProperties}>{m.t}</span>
      ))}
    </>
  );
}
