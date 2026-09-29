import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { sceneImage } from "@/config/cdn";
import { FILE_LAYOUT as F } from "@/scenes/config";
import { DEVIL_1, DEVIL_2, SPECIMENS, SPECIMEN_STRIP } from "@/lib/fileArt";
import { playPageTurn } from "@/lib/paperSound";

type Box = { left: number; top: number; width: number; height: number };
const at = (b: Box): CSSProperties => ({ left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%` });
const ART = sceneImage("centrespread.webp");
// the top sheet of centrespread.webp, cut out along its torn edge (mirrored for the back of the page)
const paper = (mirror = false): CSSProperties => ({
  backgroundImage: `url(${ART})`, backgroundSize: F.sheetBg.size, backgroundPosition: F.sheetBg.pos,
  clipPath: F.sheetClip, transform: mirror ? "scaleX(-1)" : undefined,
});
const TURN_MS = 1150;

export function ClassifiedFile({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [turned, setTurned] = useState(false);
  const [turning, setTurning] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Esc closes; the file resets to page 1 once it has faded out
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => { setTurned(false); setTurning(false); }, 450);
      return () => clearTimeout(t);
    }
    root.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open, onClose]);

  // shrink a page's type a little if its text would not fit on the sheet (any screen size)
  useLayoutEffect(() => {
    if (!open) return;
    const fit = () => root.current?.querySelectorAll<HTMLElement>(".cfile-page").forEach((el) => {
      let k = 1; el.style.setProperty("--k", "1");
      while (el.scrollHeight > el.clientHeight + 1 && k > 0.7) { k -= 0.03; el.style.setProperty("--k", k.toFixed(2)); }
    });
    fit();
    const ro = new ResizeObserver(fit);
    if (root.current) ro.observe(root.current);
    void document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [open]);

  const turn = () => {
    if (turned || turning) return; // only page 1 turns; after page 3 there is nothing left to turn
    playPageTurn();
    setTurning(true); setTurned(true);
    setTimeout(() => setTurning(false), TURN_MS + 50);
  };
  const outside = (e: MouseEvent) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div ref={root} tabIndex={-1} className={"cfile" + (open ? " on" : "")} role="dialog" aria-modal="true"
      aria-label="Top classified file" aria-hidden={!open} inert={!open} onClick={outside}>
      <div className="cfile-stage" onClick={outside}>
        <img className="cfile-art" src={ART} alt="" draggable={false} />
        <div className="cfile-hit" style={at(F.folder)} />

        {/* left: inner cover of the folder */}
        <div className="cfile-cover" style={at(F.cover)}>
          <span className="cfile-stamp">TOP SECRET</span>
          <h2 className="cfile-title">TOP<br />CLASSIFIED<br />INFO</h2>
          <dl className="cfile-meta">
            <div><dt>CASE FILE</dt><dd>Nº M1-606</dd></div>
            <div><dt>PROJECT</dt><dd>SERUM M1</dd></div>
            <div><dt>SUBJECT</dt><dd>MUTATED FOOTS</dd></div>
            <div><dt>CLEARANCE</dt><dd>LEVEL 5 · EYES ONLY</dd></div>
          </dl>
          <span className="cfile-stamp conf">CONFIDENTIAL</span>
        </div>

        {/* page 3: the next sheet in the stack, revealed when page 1 turns */}
        <div className={"cfile-sheet" + (turning ? " shade" : "")} style={at(F.sheet)}>
          <div className="cfile-paper" style={paper()} />
          <div className="cfile-page">
            <header className="cf-head"><b>EVIDENCE</b><span>RECOVERED PRINTS · PAGE 3/3</span></header>
            <p className="cf-small">Specimen prints pulled from the vessel log before the purge. Every one of them walked out.</p>
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
                <figcaption><b>DEVIL II · DARK SOVEREIGN</b><small>no face on record · nobody has seen it. yet.</small></figcaption>
              </figure>
            </div>
            <footer className="cf-end">604 escaped · 2 unlogged · status: uncontained<br />— end of file —</footer>
            <span className="cfile-stamp paper-stamp copy">DO NOT COPY</span>
          </div>
        </div>

        {/* page 1 (front) / page 2 (back): turns over the spine onto the cover */}
        <div className={"cfile-leaf" + (turned ? " turned" : "") + (turning ? " turning" : "")}
          style={{ ...at(F.sheet), transformOrigin: `${F.spineOrigin}% 50%` }}>
          <div className="cfile-face front" onClick={turn}>
            <div className="cfile-paper" style={paper()} />
            <div className="cfile-page">
              <header className="cf-head"><b>INCIDENT REPORT</b><span>PROJECT M1 · PAGE 1/3</span></header>
              <p className="cf-small">Filed by: <span className="redact">Dr. ███████</span> · Clearance: Level 5</p>
              <h3>01 · CONTROL SPECIMENS</h3>
              <p>Every Foot admitted to the lab was logged as a <b>control specimen</b>: normal, stable, predictable.</p>
              <h3>02 · SERUM M1</h3>
              <p>The lab engineered Serum M1 for one purpose: to grow guards for the <b>Zcash shielded pool</b>. The protocol was simple. 250 ml per specimen, and the vessel returned a perfect copy of the original Foot.</p>
              <h3>03 · THE MUTATION</h3>
              <p>Then the specimens went into the clone vessel. The 250 ml of M1 met their DNA and bonded with it. Traits shifted. Colours bled. The copies stopped being copies.</p>
              <p className="cf-strong">They mutated.</p>
              <button type="button" className="cfile-turn" tabIndex={turned ? -1 : 0}
                onClick={(e) => { e.stopPropagation(); turn(); }}>continued on next page · turn ➜</button>
            </div>
          </div>
          <div className="cfile-face back">
            <div className="cfile-paper" style={paper(true)} />
            <div className="cfile-page">
              <header className="cf-head"><b>INCIDENT REPORT</b><span>CONTINUED · PAGE 2/3</span></header>
              <h3>04 · THE LEAK</h3>
              <p>At 03:13 a single vial cracked. Serum M1 vaporised into the vents and reached every room of the lab in under a minute. When the alarms finally went quiet, <b>606 mutants</b> stood where the specimens had been.</p>
              <h3>05 · THE ESCAPE</h3>
              <p><b>604</b> broke containment and made it to <b>Zcash</b>. These are the generative mutants. No two carry the same DNA.</p>
              <h3>06 · UNLOGGED</h3>
              <p><b>2</b> were never logged. Both are Devil 1/1s: things that should never have existed.</p>
              <p><b>DEVIL I · HELLSPAWN.</b> Revealed. CAM 01 recorded it seconds before the feed was cut.</p>
              <p><b>DEVIL II · DARK SOVEREIGN.</b> Still hidden. CAM 02 holds one black silhouette and two red eyes.</p>
              <p className="cf-quote">"Nobody has seen it. Yet."</p>
              <p className="cf-note">Addendum: the vessel glass is still warm. Nobody has switched it on.</p>
              <span className="cfile-stamp paper-stamp unc">UNCONTAINED</span>
            </div>
          </div>
        </div>
      </div>
      <p className="cfile-hint">click or tap outside the file to close</p>
    </div>
  );
}
