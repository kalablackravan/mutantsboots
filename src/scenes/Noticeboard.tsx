import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { playPageTurn, startCreepyMusic } from "@/lib/fileSounds";

// Lab 7 noticeboard: four pencilled papers about the scientists who worked here, plus the two devils' prints.
// The writing is real text on the papers (you can see it from across the room); click a paper and it comes up
// in the middle of the screen, a slow horror track plays while you read, click anywhere to put it back.
type Kind = "stained" | "small" | "form";
const ART: Record<Kind, { src: string; ratio: number }> = {
  stained: { src: "/scene/nb-stained.webp", ratio: 679 / 900 },
  small: { src: "/scene/nb-paper.webp", ratio: 470 / 700 },
  form: { src: "/scene/nb-form.webp", ratio: 989 / 900 },
};
type Paper = { id: string; kind: Kind; x: number; y: number; w: number; rot: number; flip?: boolean; pad: [number, number, number, number]; body: ReactNode };

const Sketch = ({ d, red, className = "" }: { d: string; red?: string; className?: string }) => (
  <svg className={"nb-sketch " + className} viewBox="0 0 100 60" aria-hidden="true">
    <path d={d} />
    {red && <path className="red" d={red} />}
  </svg>
);

const PAPERS: Paper[] = [
  {
    id: "voss", kind: "stained", x: 7.3, y: 11.5, w: 23.5, rot: 2, pad: [14, 12, 7, 14],
    body: (<>
      <p className="nb-h">PERSONNEL FILE 01</p>
      <p className="nb-name">Dr. Elias Voss</p>
      <p>Head of Genetics · <u>Level 5</u></p>
      <p>Wrote Serum M1. Ran the clone vessel night trials himself.</p>
      <p className="nb-status">STATUS: <b>DECEASED</b></p>
      <p>Found 03:16 beside Vessel B. No wounds.</p>
      <p>Blood: <s>M1 reaction</s> unknown virus. <b>Not ours.</b></p>
      <p className="nb-quote">last line in his notebook: "the copies are looking back at m—"</p>
      <Sketch d="M8 40 L52 20 M52 20 L60 16 M60 16 L66 22 M60 16 L54 10 M14 37 L20 44 M24 34 L30 41 M34 30 L40 37 M42 27 L48 34 M72 48 Q78 30 84 48 Q84 56 78 56 Q72 56 72 48" />
    </>),
  },
  {
    id: "raskin", kind: "small", x: 40.5, y: 14.5, w: 17, rot: -3, pad: [20, 12, 10, 12],
    body: (<>
      <p className="nb-name">Dr. Ivo Raskin</p>
      <p>vessel technician</p>
      <p className="nb-status">STATUS: <b>???</b></p>
      <p>coat found in the drain. torn. teeth marks, foot-sized.</p>
      <p className="nb-quote">did they eat him??</p>
      <Sketch d="M30 50 Q22 34 34 24 Q46 16 54 26 Q62 38 52 50 Q42 58 30 50 M28 22 L22 10 M38 18 L36 4 M50 20 L56 6 M58 30 L70 22" />
    </>),
  },
  {
    id: "kessler", kind: "stained", x: 66, y: 9.5, w: 25, rot: -6, flip: true, pad: [14, 14, 7, 12],
    body: (<>
      <p className="nb-h">PERSONNEL FILE 02</p>
      <p className="nb-name">Dr. Mara Kessler</p>
      <p>Containment officer · night shift. Keeper of <b>TANK 000</b> &amp; <b>TANK 001</b>.</p>
      <p className="nb-status">STATUS: <b>MISSING</b></p>
      <p>Body never found. Last frame on CAM 02: walking towards Tank 001. Then the feed shows two red eyes.</p>
      <p className="nb-quote">someone wrote under it: "the Sovereign took her soul"</p>
      <Sketch d="M50 8 Q34 10 32 30 Q30 50 36 58 L64 58 Q70 50 68 30 Q66 10 50 8 M38 20 L32 12 M62 20 L68 12" red="M42 30 h5 M55 30 h5" />
    </>),
  },
  {
    id: "orlov", kind: "form", x: 34.5, y: 51, w: 29, rot: 1, pad: [16, 12, 12, 17],
    body: (<>
      <p className="nb-h">LAB 7 · STAFF STATUS REPORT</p>
      <p><i>Subject:</i> <b className="nb-name in">Dr. Nadia Orlov</b></p>
      <p><i>Post:</i> serum chemist · M1 batch 606</p>
      <p><i>Exposure:</i> 03:13 leak, Room 2</p>
      <p><i>Cause of death:</i> <b>UNKNOWN VIRUS</b> (strain not on file)</p>
      <p><i>Body:</i> gone from morgue drawer 6</p>
      <p><i>Status:</i> <span className="nb-box on">✗</span> deceased <span className="nb-box" /> missing <span className="nb-box" /> unknown</p>
      <p className="nb-quote circled">Hellspawn's skull matches her X-ray.</p>
    </>),
  },
];

function PaperArt({ p, big = false }: { p: Paper; big?: boolean }) {
  const a = ART[p.kind];
  return (
    <div className={"nb-paper-art k-" + p.kind + (big ? " big" : "")} style={{ aspectRatio: String(a.ratio) } as CSSProperties}>
      <img src={a.src} alt="" draggable={false} style={p.flip ? { transform: "scaleX(-1)" } : undefined} />
      <div className="nb-ink" style={{ inset: `${p.pad[0]}% ${p.pad[1]}% ${p.pad[2]}% ${p.pad[3]}%` }}>{p.body}</div>
    </div>
  );
}

export function Noticeboard({ live, onReading }: { live: boolean; onReading?: (on: boolean) => void }) {
  const [open, setOpen] = useState<Paper | null>(null);
  const music = useRef<ReturnType<typeof startCreepyMusic> | null>(null);
  const read = (p: Paper) => { setOpen(p); playPageTurn(); };
  const close = () => setOpen(null);
  useEffect(() => {
    onReading?.(!!open);
    if (!open) return;
    const m = startCreepyMusic(); music.current = m;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("keydown", esc); m.stop(0.8); music.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => { if (!live) setOpen(null); }, [live]);
  return (
    <>
      <div className="nb-board" style={{ left: `${500 / 38.4}%`, top: `${556 / 18}%`, width: `${630 / 38.4}%`, height: `${424 / 18}%` }}>
        <img className="nb-board-art" src="/scene/lab-noticeboard.webp" alt="" draggable={false} />
        {PAPERS.map((p) => (
          <button key={p.id} type="button" className="nb-paper" tabIndex={live ? 0 : -1} aria-label={`Read the note about ${p.id}`}
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, transform: `rotate(${p.rot}deg)` }} onClick={() => read(p)}>
            <PaperArt p={p} />
          </button>
        ))}
      </div>
      {open && typeof document !== "undefined" && createPortal(
        <div className="nb-read" role="dialog" aria-label="Note" onPointerDown={close}>
          <div className={"nb-read-paper k-" + open.kind} style={{ transform: `rotate(${open.rot / 2}deg)` }}><PaperArt p={open} big /></div>
          <p className="nb-read-hint">click anywhere to put it back</p>
        </div>, document.body)}
    </>
  );
}
