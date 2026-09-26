import { useState } from "react";
import { art } from "@/lib/assets";
import { CLASSES } from "@/scenes/content";
import { CFG } from "@/scenes/config";
import { Overlay } from "./Overlay";

type P = { open: boolean; onClose: () => void };

// the staff wall: one framed fomie at a time, arrows step through the collection
const GALLERY = ["fomie1.webp"];
export function Gallery({ open, onClose }: P) {
  const [i, setI] = useState(0);
  const n = GALLERY.length;
  return (
    <Overlay id="gallery" open={open} label="the staff wall" onClose={onClose}>
      <div className="gal">
        <button type="button" id="galPrev" className="gal-arrow prev" aria-label="previous" disabled={n < 2} onClick={() => setI((i - 1 + n) % n)}>
          <img src={art("gallery-arrow.png")} alt="" draggable={false} />
        </button>
        <figure className="gal-frame"><img src={art(GALLERY[i])} alt={`fomie ${i + 1}`} draggable={false} /></figure>
        <button type="button" id="galNext" className="gal-arrow next" aria-label="next" disabled={n < 2} onClick={() => setI((i + 1) % n)}>
          <img src={art("gallery-arrow.png")} alt="" draggable={false} />
        </button>
      </div>
    </Overlay>
  );
}

// the noticeboard, read up close: the pinned sheets, nothing posted means blank sheets
const NOTES = ["l-note-blue.webp", "m-note-yellow.webp", "i-green.webp", "l-note-purple.webp", "m-note-green.webp"];
export function Notices({ open, onClose }: P) {
  return (
    <Overlay id="notices" open={open} label="noticeboard" onClose={onClose}>
      <div id="notes-col" className="notes">
        {NOTES.map((n, k) => (
          <div key={n} className="note" style={{ transform: `rotate(${[-2, 1.5, -1, 2, -1.5][k]}deg)` }}>
            <img src={art(n)} alt="" draggable={false} />
            {k === 0 && <p className="n-body">nothing new is pinned yet. the noticeboard moves before i do.</p>}
          </div>
        ))}
      </div>
    </Overlay>
  );
}

// the tray's papers on a clipboard
export function Tasks({ open, onClose, portrait }: P & { portrait: boolean }) {
  return (
    <Overlay id="tasks" open={open} label="tasks" onClose={onClose}>
      <div id="tw" className="tw" style={{ aspectRatio: portrait ? "712/1360" : "1044/1420" }}>
        <img src={art(portrait ? "tasks-mobile.png" : "tasks-clipboard.webp")} alt="" draggable={false} />
        <div id="tasks-page" className="tpage">
          <h2>tasks</h2>
          <p>the tray is empty for now. new work lands here when the department posts it.</p>
        </div>
      </div>
    </Overlay>
  );
}

// the folder, opened: the spread with the case on the right-hand page
export function Folder({ open, onClose, cls, handle }: P & { cls: string | null; handle: string }) {
  const c = cls ? CLASSES[cls] : null;
  const pg = CFG.page;
  return (
    <Overlay id="folder" open={open} label="your folder" onClose={onClose}>
      <div id="fw" className="fw" style={{ aspectRatio: String(CFG.folderAR) }}>
        <img src={art("08-spread.webp")} alt="" draggable={false} />
        <div id="page" className="fpage" style={{ left: pg.x + "%", top: pg.y + "%", width: pg.w + "%", height: pg.h + "%" }}>
          <p className="stamp">department of fomo</p>
          <p className="lbl">applicant</p>
          <p className="val">{handle || "unnamed"}</p>
          {c ? (<>
            <p className="lbl">classification</p>
            <p className="val cls">{c.name}</p>
            <p className="desc">{c.desc}</p>
          </>) : <p className="desc">the interview has not been finished.</p>}
        </div>
      </div>
    </Overlay>
  );
}

// the public notice framed in the corridor
export function Disclaimer({ open, onClose }: P) {
  return (
    <Overlay id="disclaimer" open={open} label="public notice" onClose={onClose}>
      <img className="disc-art" src={art("hit-disclaimer.png")} alt="public notice from the department of fomo" draggable={false} />
    </Overlay>
  );
}

// the portrait menu: the three signs
export function Menu({ open, onClose, go }: P & { go: (k: "gallery" | "notices" | "tasks") => void }) {
  const items = [["notices", "menu-noticeboard.webp", "noticeboard"], ["gallery", "menu-gallery.webp", "gallery"], ["tasks", "menu-tasks.webp", "tasks"]] as const;
  return (
    <Overlay id="menu" open={open} label="menu" onClose={onClose}>
      <nav className="msigns">
        {items.map(([k, img, l]) => (
          <button key={k} type="button" aria-label={l} onClick={() => go(k)}><img src={art(img)} alt="" draggable={false} /></button>
        ))}
      </nav>
    </Overlay>
  );
}

export function Socials({ open, onClose }: P) {
  return (
    <Overlay id="socials" open={open} label="socials" onClose={onClose}>
      <div id="soc-card" className="soc">
        <img className="soc-card" src={art("card-icon.webp")} alt="" draggable={false} />
        <div className="soc-row">
          <img src={art("X.webp")} alt="x" draggable={false} />
          <img src={art("telegram.webp")} alt="telegram" draggable={false} />
        </div>
      </div>
    </Overlay>
  );
}
