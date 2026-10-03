import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { sceneImage } from "@/config/cdn";
import { FILE_LAYOUT as F } from "@/scenes/config";
import { DEVIL_1, DEVIL_2, INK_HEAVY, INK_LIGHT, SPECIMENS, SPECIMEN_STRIP } from "@/lib/fileArt";
import { playCoverFlip, playFileArrive, playFloorDrop, playPageTurn } from "@/lib/fileSounds";

type Box = { left: number; top: number; width: number; height: number };
type Stage = "closed" | "spread1" | "spread2" | "back";
type Leaf = "cover" | "sheet" | "back";
const at = (b: Box): CSSProperties => ({ left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%` });
const ART = sceneImage("bestspread.webp");
const FLIP_MS = 1100;

// a crop of bestspread.webp that exactly fills its element, cut along the art's torn outline
const crop = (src: readonly [number, number, number, number], clip: string, mirror = false): CSSProperties => {
  const [x0, y0, x1, y1] = src; const w = x1 - x0, h = y1 - y0;
  return {
    backgroundImage: `url(${ART})`,
    backgroundSize: `${(3840 / w) * 100}% ${(1800 / h) * 100}%`,
    backgroundPosition: `${(x0 / (3840 - w)) * 100}% ${(y0 / (1800 - h)) * 100}%`,
    clipPath: clip, transform: mirror ? "scaleX(-1)" : undefined,
  };
};

// Cover faces are pre-rendered images of the exact inked look (multiply ink, worn stamps, tab):
// a flat picture has no live blending, so it cannot flicker while the file slides or turns.
const TAB = 4; // % of face width captured beyond the cover for the tab
// The baked faces carry a thick black ink border; these alpha masks (same size as each face) peel
// ~11px of that outer ink off so only a thin outline is left.
const THIN_EDGE: Record<"file_front.webp" | "file_inside.webp" | "file_back.webp", string> = {
  "file_front.webp": "url(data:image/webp;base64,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)",
  "file_inside.webp": "url(data:image/webp;base64,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)",
  "file_back.webp": "url(data:image/webp;base64,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)",
};
function Baked({ name, left, width }: { name: "file_front.webp" | "file_inside.webp" | "file_back.webp"; left: number; width: number }) {
  const src = sceneImage(name);
  const mask = THIN_EDGE[name];
  return (
    <div className="cf-baked" style={{ left: `${left}%`, width: `${width}%`, "--baked": mask } as CSSProperties}>
      <img src={src} alt="" draggable={false} decoding="sync" style={{ maskImage: mask, WebkitMaskImage: mask }} />
    </div>
  );
}

export function ClassifiedFile({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>("closed");
  const [coverTop, setCoverTop] = useState(true);            // cover above the pages while closed / swinging to or from closed
  const [moving, setMoving] = useState<{ leaf: Leaf; dir: "fwd" | "rev" } | null>(null);
  const [motion, setMotion] = useState<"" | "pull" | "drop">("");
  const busy = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  // every time the file is called up it arrives closed, slid out like a book pulled off a shelf.
  // Layout effect: the entrance class is in place before the first paint, so nothing jumps.
  useLayoutEffect(() => {
    if (!open) return;
    setStage("closed"); setCoverTop(true); setMoving(null); setMotion("pull"); busy.current = true;
    playFileArrive();
    root.current?.focus();
    const t = setTimeout(() => { setMotion(""); busy.current = false; }, 640);
    return () => clearTimeout(t);
  }, [open]);

  const flip = (leaf: Leaf, dir: "fwd" | "rev", to: Stage, after?: () => void) => {
    busy.current = true; setMoving({ leaf, dir }); setStage(to);
    setTimeout(() => { setMoving(null); busy.current = false; after?.(); }, FLIP_MS + 40);
  };

  const drop = useCallback(() => {
    if (motion === "drop") return;
    busy.current = true; setMotion("drop"); playFloorDrop();
    setTimeout(() => {
      onClose(); setMotion(""); setStage("closed"); setCoverTop(true); busy.current = false;
    }, 580);
  }, [motion, onClose]);

  const next = () => {
    if (busy.current) return;
    if (stage === "closed") { playCoverFlip(); setCoverTop(true); flip("cover", "fwd", "spread1", () => setCoverTop(false)); }
    else if (stage === "spread1") { playPageTurn(); flip("sheet", "fwd", "spread2"); }
    else if (stage === "spread2") { playCoverFlip(); flip("back", "fwd", "back"); } // after the last page the file closes from the back
    else drop();
  };
  const prev = () => {
    if (busy.current) return;
    if (stage === "spread1") { playCoverFlip(); setCoverTop(true); flip("cover", "rev", "closed"); }
    else if (stage === "spread2") { playPageTurn(); flip("sheet", "rev", "spread1"); }
  };

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") drop();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  });

  // shrink a page's type a little only if its text would overflow the sheet (any screen size)
  useLayoutEffect(() => {
    if (!open) return;
    // overflow = the text itself running past the page (absolutely placed stamps may poke out)
    const over = (el: HTMLElement) => {
      let bottom = 0;
      for (const c of Array.from(el.children) as HTMLElement[]) {
        if (getComputedStyle(c).position !== "absolute") bottom = Math.max(bottom, c.offsetTop + c.offsetHeight);
      }
      return bottom > el.clientHeight - (parseFloat(getComputedStyle(el).paddingBottom) || 0) + 1;
    };
    const fit = () => root.current?.querySelectorAll<HTMLElement>(".cf-page").forEach((el) => {
      let k = 1; el.style.setProperty("--k", "1");
      while (over(el) && k > 0.7) { k -= 0.03; el.style.setProperty("--k", k.toFixed(2)); }
    });
    fit();
    const ro = new ResizeObserver(fit);
    if (root.current) ro.observe(root.current);
    void document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [open]);

  const onClick = (e: MouseEvent) => {
    if (busy.current) return;
    if (stage === "back") { drop(); return; }                      // closed from the back: any click drops it
    const t = e.target as HTMLElement;
    if (t.closest(".cf-arrow")) return;
    if (stage === "closed" && t.closest(".cf-cover")) { next(); return; } // click the closed file to open it
    if (t.closest(".cf-leaf")) return;                             // reading: clicks on the paper do nothing
    drop();                                                        // anywhere else: the file falls
  };

  const shift = stage === "closed" ? F.shift.closed : stage === "back" ? F.shift.back : F.shift.open;
  const turn = (deg: number, z: number): CSSProperties => ({ transform: `rotateY(${deg}deg)`, zIndex: z });
  const mv = (leaf: Leaf) => (moving?.leaf === leaf ? ` moving ${moving.dir}` : "");
  const reading = stage === "spread1" || stage === "spread2";
  const edgeL = F.src.left[0] / 38.4 + F.shift.open;   // open spread edges on the canvas (%)
  const edgeR = F.src.right[2] / 38.4 + F.shift.open;
  const hint = stage === "closed" ? "click the file to open it"
    : stage === "back" ? "click anywhere to drop the file"
    : "turn pages with the arrows or ← → keys · click outside to drop the file";

  return (
    <div ref={root} tabIndex={-1} data-stage={stage} className={"cfile" + (open ? " on" : "") + (motion === "drop" ? " dropping" : "")} role="dialog"
      aria-modal="true" aria-label="Top classified file" aria-hidden={!open} inert={!open} onClick={onClick}
      style={{ "--ink-heavy": `url(${INK_HEAVY})`, "--ink-light": `url(${INK_LIGHT})` } as CSSProperties}>
      <div className="cfile-stage">
        <div className={"cf-motion" + (motion ? " " + motion : "")}>
          <div className="cf-folder" style={{ transform: `translateX(${shift}%)` }}>

            {/* back half: papers + page 3 on top; after the last page it swings over and closes the file */}
            <div className={"cf-leaf cf-backleaf" + mv("back")} style={{ ...at(F.back), ...turn(stage === "back" ? -180 : 0, stage === "back" ? 40 : 10) }}>
              <div className="cf-face front">
                <div className="cf-art" style={crop(F.src.right, F.rightClip)} />
                <div className="cf-paper-area" style={at(F.paperInBack)}>
                  <div className="cf-page">
                    <header className="cf-head"><b>EVIDENCE</b><span>RECOVERED PRINTS · 3/3</span></header>
                    <p className="cf-small">Specimen prints pulled from the <b>vessel log</b> before the purge. <b>Every one of them walked out.</b></p>
                    <div className="cf-prints">
                      {SPECIMENS.map((s, i) => (
                        <figure className="cf-print" key={s.id} style={{ "--r": `${s.rot}deg` } as CSSProperties}>
                          <i className="cf-tape" />
                          <span className="cf-print-img" style={{ backgroundImage: `url(${SPECIMEN_STRIP})`, backgroundPosition: `${(i * 100) / 3}% 0` }} />
                          <figcaption><b>{s.id}</b> · escaped<small>{s.traits}</small></figcaption>
                        </figure>
                      ))}
                    </div>
                    <div className="cf-cams">
                      <figure className="cf-cam">
                        <span className="cf-cam-frame">
                          <img src={DEVIL_1} alt="Devil I, Hellspawn" draggable={false} />
                          <i className="cf-scan" /><span className="cf-ts">CAM 01 · 03:14:52</span><span className="cf-rec">● REC</span>
                        </span>
                        <figcaption><b>DEVIL I · HELLSPAWN</b><small>revealed · last frame before the feed was cut</small></figcaption>
                      </figure>
                      <figure className="cf-cam lost">
                        <span className="cf-cam-frame">
                          <img src={DEVIL_2} alt="Devil II, Dark Sovereign, silhouette only" draggable={false} />
                          <i className="cf-scan" /><span className="cf-ts">CAM 02 · SIGNAL LOST</span>
                        </span>
                        <figcaption><b>DEVIL II · DARK SOVEREIGN</b><small>no face on record · <b>nobody has seen it. yet.</b></small></figcaption>
                      </figure>
                    </div>
                    <footer className="cf-end"><b>604 escaped · 2 unlogged</b> · status: uncontained</footer>
                    <span className="cf-stamp-ink paper-stamp copy">DO NOT COPY</span>
                  </div>
                </div>
              </div>
              <div className="cf-face back">
                <Baked name="file_back.webp" left={-TAB} width={100 + TAB} />
              </div>
            </div>

            {/* page 1 (front) / page 2 (back) */}
            <div className={"cf-leaf cf-sheet" + mv("sheet")}
              style={{ ...at(F.sheet), transformOrigin: `${F.sheetOrigin}% 50%`, ...turn(stage === "spread2" || stage === "back" ? -180 : 0, 20) }}>
              <div className="cf-face front">
                <div className="cf-art" style={crop(F.src.paper, F.paperClip)} />
                <div className="cf-page">
                  <header className="cf-head"><b>INCIDENT REPORT</b><span>PROJECT M1 · 1/3</span></header>
                  <p className="cf-small">Filed by: <span className="redact">Dr. ███████</span> · Clearance: <b>Level 5</b></p>
                  <h3>01 · CONTROL SPECIMENS</h3>
                  <p>Every Foot admitted to the lab was logged as a <b>control specimen</b>: normal, stable, predictable.</p>
                  <h3>02 · SERUM M1</h3>
                  <p>The lab engineered <b>Serum M1</b> for one purpose: to grow guards for the <b>Zcash shielded pool</b>. The protocol was simple. <b>250 ml</b> per specimen, and the vessel returned a <b>perfect copy</b> of the original Foot.</p>
                  <h3>03 · THE MUTATION</h3>
                  <p>Then the specimens went into the <b>clone vessel</b>. The 250 ml of M1 met their <b>DNA</b> and bonded with it. Traits shifted. Colours bled. The copies stopped being copies.</p>
                  <p className="cf-strong">They mutated.</p>
                </div>
              </div>
              <div className="cf-face back">
                <div className="cf-art" style={crop(F.src.paper, F.paperClip, true)} />
                <div className="cf-page">
                  <header className="cf-head"><b>INCIDENT REPORT</b><span>CONTINUED · 2/3</span></header>
                  <h3>04 · THE LEAK</h3>
                  <p>At <b>03:13</b> a single vial <b>cracked</b>. Serum M1 vaporised into the vents and reached every room of the lab in under a minute. When the alarms finally went quiet, <b>606 mutants</b> stood where the specimens had been.</p>
                  <h3>05 · THE ESCAPE</h3>
                  <p><b>604</b> broke containment and made it to <b>Zcash</b>. These are the <b>generative mutants</b>. No two carry the same DNA.</p>
                  <h3>06 · UNLOGGED</h3>
                  <p><b>2</b> were never logged. Both are <b>Devil 1/1s</b>: things that should never have existed.</p>
                  <p><b className="red">DEVIL I · HELLSPAWN.</b> Revealed. <b>CAM 01</b> recorded it seconds before the feed was cut.</p>
                  <p><b className="red">DEVIL II · DARK SOVEREIGN.</b> Still hidden. <b>CAM 02</b> holds one black silhouette and two red eyes.</p>
                  <p className="cf-quote">"Nobody has seen it. Yet."</p>
                  <p className="cf-note">Addendum: the vessel glass is still warm. <b>Nobody has switched it on.</b></p>
                  <span className="cf-stamp-ink paper-stamp unc">UNCONTAINED</span>
                </div>
              </div>
            </div>

            {/* front cover: outside shown while closed, inside (TOP CLASSIFIED INFO) once opened */}
            <div className={"cf-leaf cf-cover" + mv("cover")} style={{ ...at(F.cover), ...turn(stage === "closed" ? 0 : -180, coverTop ? 30 : 5) }}>
              <div className="cf-face front">
                <Baked name="file_front.webp" left={0} width={100 + TAB} />
              </div>
              <div className="cf-face back">
                <Baked name="file_inside.webp" left={0} width={100} />
              </div>
            </div>

          </div>
          <button type="button" className="cf-arrow left" aria-label="Previous page" tabIndex={reading ? 0 : -1}
            style={{ left: `calc(${edgeL}% - 4.4cqw)` }} onClick={(e) => { e.stopPropagation(); prev(); }}>
            <svg viewBox="0 0 60 100" aria-hidden="true"><path d="M50 8 L10 50 L50 92 Z" /></svg>
          </button>
          <button type="button" className="cf-arrow right" aria-label="Next page" tabIndex={reading ? 0 : -1}
            style={{ left: `calc(${edgeR}% + 1.8cqw)` }} onClick={(e) => { e.stopPropagation(); next(); }}>
            <svg viewBox="0 0 60 100" aria-hidden="true"><path d="M10 8 L50 50 L10 92 Z" /></svg>
          </button>
        </div>
      </div>
      <p className="cfile-hint">{hint}</p>
    </div>
  );
}
