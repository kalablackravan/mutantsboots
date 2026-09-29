import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { sceneImage } from "@/config/cdn";
import { FILE_LAYOUT as F } from "@/scenes/config";
import { DEVIL_1, DEVIL_2, INK_HEAVY, INK_LIGHT, SPECIMENS, SPECIMEN_STRIP } from "@/lib/fileArt";
import { playBookPull, playCoverFlip, playFloorDrop, playPageTurn } from "@/lib/fileSounds";

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
    playBookPull();
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
                <div className="cf-art cf-outer" style={crop(F.src.left, F.leftClip)} />
                <i className="cf-tab left"><b>M1-606</b></i>
                <div className="cf-outer-ui">
                  <div className="cf-printbox ink"><span>CASE FILE Nº</span><b>M1-606</b><span>RETURN TO ARCHIVE · SUB-LEVEL 3</span></div>
                  <span className="cf-stamp-ink big closed">CASE CLOSED</span>
                  <div className="cf-printfoot ink"><i /><span>PROPERTY OF LAB 7 · DO NOT REMOVE</span></div>
                </div>
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
                <div className="cf-art cf-outer" style={crop(F.src.left, F.leftClip, true)} />
                <i className="cf-tab right"><b>M1-606</b></i>
                <div className="cf-outer-ui">
                  <div className="cf-printbox ink"><span>CASE FILE Nº</span><b>M1-606</b><span>PROJECT SERUM M1 · MUTATED FOOTS</span></div>
                  <span className="cf-stamp-ink big">TOP SECRET</span>
                  <div className="cf-printfoot ink"><i /><span>CLASSIFIED · EYES ONLY</span></div>
                </div>
              </div>
              <div className="cf-face back">
                <div className="cf-art cf-outer" style={crop(F.src.left, F.leftClip)} />
                <div className="cf-inside">
                  <span className="cf-stamp-ink">TOP SECRET</span>
                  <h2 className="cfile-title ink">TOP<br />CLASSIFIED<br />INFO</h2>
                  <dl className="cfile-meta ink">
                    <div><dt>CASE FILE</dt><dd>Nº M1-606</dd></div>
                    <div><dt>PROJECT</dt><dd>SERUM M1</dd></div>
                    <div><dt>SUBJECT</dt><dd>MUTATED FOOTS</dd></div>
                    <div><dt>CLEARANCE</dt><dd>LEVEL 5 · EYES ONLY</dd></div>
                  </dl>
                  <span className="cf-stamp-ink conf">CONFIDENTIAL</span>
                </div>
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
