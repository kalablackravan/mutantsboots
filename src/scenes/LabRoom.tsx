import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { sceneImage, type SceneImage } from "@/config/cdn";
import { FILE_LAYOUT as F, LAB, LAB_FX } from "./config";
import { loadAndDecode } from "@/lib/scenePreload";
import { DEVIL_1, DEVIL_2, INK_HEAVY } from "@/lib/fileArt";
import { AccessForm } from "./AccessForm";
import { Noticeboard } from "./Noticeboard";
import { getAccess, onAccess } from "@/lib/access";
import { ClipboardPrint, ExitPad, LabFx, OutOfService } from "./LabFx";
import { LabPhone, usePhoneBroken } from "./LabPhone";
import { MutatedFlask3D } from "./MutatedFlask3D";
import { FILE_SPECIMENS, RARITY_LABEL, type Specimen } from "@/lib/specimens";
import { DeskScreens, TraitDisplay } from "./LabDisplays";
import { loadTraits } from "@/lib/useTraits";
import { BLANK_DISPLAY, LAB_DESK } from "@/config/cdn";
import { playCrtOn, playFileArrive, playFloorDrop, playGlassBreak, playPageTurn, playTvBreak, startSubmergedBubbleLoop, preloadVoices, startLabHorror } from "@/lib/fileSounds";

type Item = "clipboard" | "flask" | "files" | "display" | "cam0" | "cam1";
type DeskItem = Exclude<Item, "display" | "cam0" | "cam1">;
const isTv = (it: Item | null) => it === "display" || it === "cam0" || it === "cam1";
type Box = { left: number; top: number; width: number; height: number };
const at = (b: Box): CSSProperties => ({ left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%` });
const FULL: Box = { left: 0, top: 0, width: 100, height: 100 };
const ITEMS: { id: DeskItem; img: SceneImage; label: string }[] = [
  { id: "clipboard", img: "clipboard.webp", label: "▸ wl injection" },
  { id: "flask", img: "flask_black_border.webp", label: "▸ serum m1" },
  { id: "files", img: "files_black_border.webp", label: "▸ files" },
];

// hover labels for the things on the wall, styled like the desk ones
const WALL_TAGS: { id: string; text: string; box: Box }[] = [
  { id: "cam0", text: "▸ cam 02 · dark sovereign", box: LAB_FX.tvs[0].hit },
  { id: "cam1", text: "▸ cam 01 · hellspawn", box: LAB_FX.tvs[1].hit },
  { id: "exit", text: "▸ exit lab", box: LAB_FX.exitPad.hit },
  { id: "tank0", text: "▸ toxic gas", box: LAB_FX.tanks[0].hit },
  { id: "tank1", text: "▸ toxic gas", box: { ...LAB_FX.tanks[1].hit, left: LAB_FX.tanks[1].hit.left - 3 } },
  { id: "phone", text: "▸ phone call", box: LAB_FX.phone.hit },
  { id: "oos", text: "▸ out of service", box: LAB_FX.oos.hit },
];

// Everything the room and its three views need, decoded before the door lets anyone in.
const LAB_IMAGES: SceneImage[] = ["2ndbg.webp", "bgsilhouette.webp", "clipboard.webp", "flask_black_border.webp",
  "files_black_border.webp", "clipboard_black_border_thin.webp", "frame_black_border.webp"];
let ready: Promise<void> | null = null;
export function preloadLab(timeoutMs = 8000): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  ready ??= Promise.race([
    Promise.all([...LAB_IMAGES.map((n) => loadAndDecode(sceneImage(n))), loadAndDecode("/scene/bestspread-thin.webp"),
      ...["/scene/phone-intact.webp", "/scene/phone-broken.webp", "/scene/lab-noticeboard.webp", "/scene/nb2-leftpaper.webp", "/scene/nb2-paper.webp", "/scene/nb2-pinpaper.webp", "/scene/nb2-form.webp", "/scene/nb2-burnpaper.webp", "/scene/nb2-stitchedpaper.webp"].map(loadAndDecode), loadAndDecode(DEVIL_1), loadAndDecode(DEVIL_2), loadAndDecode(BLANK_DISPLAY), loadAndDecode(LAB_DESK), loadTraits()]).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
  return ready;
}

export function LabRoom({ on, zoom = "", onExit }: { on: boolean; zoom?: "" | "zoom-from"; onExit: () => void }) {
  const [hover, setHover] = useState<Item | null>(null);
  const [view, setView] = useState<Item | null>(null);
  const [tag, setTag] = useState<string | null>(null);        // hover labels for the wall things (TVs, exit, tanks, phone)
  const [say, setSay] = useState<string | null>(null);        // what the phone voice is saying, shown in the phone's label
  const [black, setBlack] = useState(false);                  // second call: the room blacks out before you are thrown out
  const blackout = useCallback(() => setBlack(true), []);
  useEffect(() => { if (!on) { setView(null); setHover(null); setTag(null); setSay(null); } }, [on]);
  useEffect(() => { if (on) void import("@/lib/flask3d/createFlaskScene"); }, [on]);   // 3D flask code ready before the flask is picked up
  // walked in with a fresh access code: the injection form comes up by itself once the room has zoomed in
  useEffect(() => {
    if (!on) return;
    const a = getAccess();
    if (!a || a.submitted) return;
    const id = window.setTimeout(() => { setView((v) => v ?? "clipboard"); playFileArrive(); }, 1400);
    return () => window.clearTimeout(id);
  }, [on]);
  const open = (it: Item) => { setHover(null); setView(it); if (it === "files") playPageTurn(); else if (isTv(it)) playCrtOn(); else playFileArrive(); };
  const close = useCallback(() => setView(null), []);
  const phoneBroken = usePhoneBroken();
  // the clipboard says which injection the visitor's code opened (free mint or whitelist)
  const [accessKind, setAccessKind] = useState(getAccess()?.kind ?? null);
  useEffect(() => onAccess(() => setAccessKind(getAccess()?.kind ?? null)), []);
  // horror room tone for as long as you are in the lab, quieter while something is open in front of you
  const horror = useRef<ReturnType<typeof startLabHorror> | null>(null);
  useEffect(() => {
    if (!on) return;
    preloadVoices();
    const h = startLabHorror(); horror.current = h;
    return () => { h.stop(); horror.current = null; };
  }, [on]);
  useEffect(() => { horror.current?.duck(!!view); }, [view]);
  return (
    <section id="s-lab" className={"scene" + (on ? " on" : "") + (zoom ? " " + zoom : "") + (view ? " viewing" : "")} aria-hidden={!on}>
      <div id="lab-stage" inert={!!view} className={view ? "viewing" : ""}>
        <img className="gate-layer" src={sceneImage("2ndbg.webp")} alt="" style={at(FULL)} draggable={false} />
        {/* noticeboard on the left wall: the scientists' notes (click to read) and the two devils' prints */}
        <Noticeboard live={on && !view} onReading={(r) => horror.current?.duck(r || !!view)} />
        <DeskScreens live={on && !view} hot={hover === "display"} />
        <img className="gate-layer lab-desk" src={LAB_DESK} alt="" style={at(FULL)} draggable={false} />
        <LabFx live={on && !view} onTag={setTag} />
        <OutOfService onTag={setTag} />
        <LabPhone on={on} paused={!!view} tabIndex={on && !view ? 0 : -1} onTag={setTag} onSay={setSay} onBlackout={blackout} />
        {LAB_FX.shadows.map((d, i) => (
          <span key={i} className="lab-ao" aria-hidden="true"
            style={{ left: `${(d.x - d.w / 2) / 38.4}%`, top: `${(d.y - d.h / 2) / 18}%`, width: `${d.w / 38.4}%`, height: `${d.h / 18}%` }} />
        ))}
        <ExitPad tabIndex={on && !view ? 0 : -1} onExit={onExit} onTag={setTag} />
        {ITEMS.map((it) => (
          <img key={it.id} className={"gate-layer lab-item" + (hover === it.id ? " hot" : "")} src={sceneImage(it.img)} alt=""
            style={at(LAB.items[it.id].img)} draggable={false} />
        ))}
        <ClipboardPrint box={LAB.items.clipboard.img} hot={hover === "clipboard"} />
        <DeskCork box={LAB.items.flask.img} hot={hover === "flask"} />
        {/* same dark foreground silhouette as the gate scene */}
        <img className="gate-layer lab-silhouette" src={sceneImage("bgsilhouette.webp")} alt="" style={at(FULL)} draggable={false} />
        {LAB_FX.screens.map((sc, i) => (
          <button key={"scr" + i} type="button" className="lab-hit" style={at(sc.box)} aria-label="Open trait scanner"
            tabIndex={on && !view && i === 1 ? 0 : -1}
            onPointerEnter={(e) => { if (e.pointerType === "mouse") setHover("display"); }} onPointerLeave={() => setHover(null)}
            onFocus={() => setHover("display")} onBlur={() => setHover(null)} onClick={() => open("display")} />
        ))}
        {LAB_FX.tvs.map((tv, i) => (
          <button key={"cam" + i} type="button" className="lab-hit" style={at(tv.hit)} aria-label={`Watch ${tv.label}`}
            tabIndex={on && !view ? 0 : -1} onClick={() => open(i === 0 ? "cam0" : "cam1")}
            onPointerEnter={() => setTag("cam" + i)} onPointerLeave={() => setTag(null)} onFocus={() => setTag("cam" + i)} onBlur={() => setTag(null)} />
        ))}
        {ITEMS.map((it) => (
          <button key={it.id} type="button" className="lab-hit" style={at(LAB.items[it.id].hit)} aria-label={`Open ${it.id}`}
            tabIndex={on && !view ? 0 : -1}
            onPointerEnter={(e) => { if (e.pointerType === "mouse") setHover(it.id); }} onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(it.id)} onBlur={() => setHover(null)} onClick={() => open(it.id)} />
        ))}
      </div>
      <div className="lab-overlay" aria-hidden="true" />
      <div className="lab-shade" aria-hidden="true" />
      <div id="lab-ui" aria-hidden="true">
        {ITEMS.map((it) => (
          <span key={it.id} className={"gate-tag clone-tag lab-tag" + (hover === it.id && !view ? " on" : "")}
            style={{ left: `${LAB.items[it.id].hit.left + LAB.items[it.id].hit.width / 2}%`, top: `${LAB.items[it.id].hit.top}%` }}>{it.id === "clipboard" ? (accessKind === "fm" ? "▸ free mint injection" : accessKind === "wl" ? "▸ wl injection" : "▸ wl / fm injection · read only") : it.label}</span>
        ))}
        <span className={"gate-tag clone-tag lab-tag" + (hover === "display" && !view ? " on" : "")}
          style={{ left: `${LAB_FX.screens[1].box.left + LAB_FX.screens[1].box.width / 2}%`, top: `${LAB_FX.screens[1].box.top}%` }}>▸ trait scanner</span>
        {WALL_TAGS.map((w) => {
          const line = w.id === "phone" ? say : null;          // the phone label speaks the voice line while it talks
          const text = w.id === "phone" && phoneBroken ? "▸ dead line" : w.text;
          return (
            <span key={w.id} className={"gate-tag clone-tag lab-tag" + (line ? " lab-say" : "") + (((tag === w.id && !view) || line) ? " on" : "")}
              style={{ left: `${w.box.left + w.box.width / 2}%`, top: `${w.box.top}%` }}>{line ?? text}</span>
          );
        })}
      </div>
      <button type="button" className="lab-room-exit lab-exit" tabIndex={on && !view ? 0 : -1} onClick={onExit}>EXIT</button>
      <LabView item={view} onClose={close} />
      <div className={"lab-blackout" + (black ? " on" : "")} aria-hidden="true" />
    </section>
  );
}

// ---------------------------------------------------------------- the three close-up views
// The close-up only appears once its frame art is decoded (and, for the flask, once the 3D flask is up),
// so the paper / screen and the thing they belong to show up together instead of seconds apart.
const decoded = new Set<string>();
function decode(src: string): Promise<void> {
  if (decoded.has(src)) return Promise.resolve();
  return new Promise<void>((res) => { const i = new Image(); i.src = src; i.decode().then(() => { decoded.add(src); res(); }, () => res()); });
}
const VIEW_ART: Partial<Record<Item, () => string[]>> = {
  clipboard: () => [sceneImage("clipboard_black_border_thin.webp")],
  flask: () => [sceneImage("frame_black_border.webp")],
  files: () => ["/scene/bestspread-thin.webp"],
  display: () => [BLANK_DISPLAY], cam0: () => [BLANK_DISPLAY], cam1: () => [BLANK_DISPLAY],
};
function useViewReady(item: Item | null, flaskUp: boolean) {
  const [ready, setReady] = useState<Item | null>(null);
  useEffect(() => {
    if (!item) { setReady(null); return; }
    let live = true;
    const urls = VIEW_ART[item]?.() ?? [];
    const art = Promise.all(urls.map(decode));
    const cap = new Promise<void>((r) => setTimeout(r, 5000));          // never hold a view back forever
    void Promise.race([art, cap]).then(() => { if (live) setReady(item); });
    return () => { live = false; };
  }, [item]);
  return ready === item && (item !== "flask" || flaskUp);
}

function LabView({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const [flaskUp, setFlaskUp] = useState(false);
  useEffect(() => { if (item !== "flask") { setFlaskUp(false); return; } const id = window.setTimeout(() => setFlaskUp(true), 4000); return () => window.clearTimeout(id); }, [item]);
  const viewReady = useViewReady(item, flaskUp);
  const [shown, setShown] = useState<Item | null>(null);      // keeps the content while it fades out
  const [dropping, setDropping] = useState(false);
  const [page, setPage] = useState(0);                        // files: 0 = transfer log, then one specimen per page
  const [order, setOrder] = useState<Specimen[]>(FILE_SPECIMENS);   // shuffled every time the files are opened
  const pages = FILE_SPECIMENS.length + 1;
  const turn = useCallback((d: number) => { setPage((p) => (p + d + pages) % pages); playPageTurn(); }, [pages]);
  useEffect(() => { if (item === "files") { setPage(0); setOrder(shuffle(FILE_SPECIMENS)); } }, [item]);
  // put it back = let it fall: clipboard and files thud on the floor, the flask shatters
  const drop = useCallback(() => {
    if (!item || dropping) return;
    setDropping(true);
    if (item === "flask") playGlassBreak(0.42); else if (isTv(item)) playTvBreak(0.42); else playFloorDrop(0.42);
    // clear the content in the same tick so the dropped item never pops back during the fade-out
    window.setTimeout(() => { setShown(null); onClose(); setDropping(false); }, 560);
  }, [item, dropping, onClose]);
  useEffect(() => {
    if (item) { setShown(item); return; }
    const t = setTimeout(() => setShown(null), 320); return () => clearTimeout(t);
  }, [item]);
  useEffect(() => {
    if (!item) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") drop();
      else if (item === "files" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) turn(e.key === "ArrowLeft" ? -1 : 1);
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [item, drop, turn]);
  useEffect(() => {
    if (item !== "flask" || dropping) return;
    return startSubmergedBubbleLoop();
  }, [item, dropping]);
  const outside = (e: MouseEvent) => { if (e.target === e.currentTarget) drop(); };
  return (
    <div className={"lab-view" + (item ? " on" : "") + (dropping ? " dropping" : "") + (item && !viewReady && !dropping ? " waiting" : "")} role="dialog" aria-modal="true" aria-hidden={!item} inert={!item}
      aria-label={shown ?? "lab item"} onClick={outside} style={{ "--ink-heavy": `url(${INK_HEAVY})` } as CSSProperties}>
      {shown === "clipboard" && (
        <div className={"lv-clipboard" + (dropping ? " drop" : "")} key={"c" + String(item)}>
          <img src={sceneImage("clipboard_black_border_thin.webp")} alt="" draggable={false} />
          <div className="lv-clip-paper">
            <AccessForm active={item === "clipboard"} />
          </div>
        </div>
      )}
      {shown === "flask" && (
        <div className={"lv-flask" + (dropping ? " drop" : "")} key={"f" + String(item)}>
          <div className="lv-flask-stage">
            <MutatedFlask3D active={item === "flask"} onReady={() => setFlaskUp(true)} />
            <i className="lv-flask-shadow" />
            <span className="lv-flask-hint">drag to turn</span>
          </div>
          <article className="lv-mint">
            <img src={sceneImage("frame_black_border.webp")} alt="" draggable={false} />
            <div className="lv-mint-in">
              <h2>MINT DETAILS</h2>
              <dl>
                <div><dt>Mint time</dt><dd>TBA</dd></div>
                <div><dt>Price</dt><dd>0.004 ZEC</dd></div>
                <div><dt>Network</dt><dd>Zcash</dd></div>
                <div><dt>Supply</dt><dd>606</dd></div>
                <div><dt>Marketplace</dt><dd>TBA</dd></div>
              </dl>
              <h3>RARITY</h3>
              <ul className="lv-rarity">
                <li className="legend"><b>1</b><em>Legend</em> · Dark Sovereign</li>
                <li className="epic"><b>1</b><em>Epic</em> · Hellspawn</li>
                <li className="ultra"><b>100</b><em>Ultra Rare</em></li>
                <li className="rare"><b>204</b><em>Rare</em></li>
                <li className="unc"><b>300</b><em>Uncommon</em></li>
              </ul>
              <a className="lv-mint-x" href="https://x.com/mutatedfoots" target="_blank" rel="noopener noreferrer">follow @mutatedfoots on X for more updates ↗</a>
            </div>
          </article>
        </div>
      )}
      {shown === "files" && (
        <div className={"lv-files" + (dropping ? " drop" : "")} key={"p" + String(item)}>
          <div className="lv-paper" style={{
            backgroundImage: `url(${"/scene/bestspread-thin.webp"})`,
            backgroundSize: `${(3840 / (F.src.paper[2] - F.src.paper[0])) * 100}% ${(1800 / (F.src.paper[3] - F.src.paper[1])) * 100}%`,
            backgroundPosition: `${(F.src.paper[0] / (3840 - (F.src.paper[2] - F.src.paper[0]))) * 100}% ${(F.src.paper[1] / (1800 - (F.src.paper[3] - F.src.paper[1]))) * 100}%`,
            clipPath: F.paperClip,
          }} />
          {page === 0 ? <div className="lv-page">
            <h3>SPECIMEN TRANSFER LOG</h3>
            <p className="lv-sub">Archive copy · do not remove from Lab 7</p>
            <table>
              <thead><tr><th>ID</th><th>Logged</th><th>Status</th></tr></thead>
              <tbody>
                <tr><td>SPC-017</td><td>02:48</td><td className="bad">escaped</td></tr>
                <tr><td>SPC-233</td><td>02:51</td><td className="bad">escaped</td></tr>
                <tr><td>SPC-418</td><td>02:55</td><td className="bad">escaped</td></tr>
                <tr><td>SPC-590</td><td>03:02</td><td className="bad">escaped</td></tr>
                <tr><td>SPC-???</td><td>—</td><td>never logged</td></tr>
                <tr><td>SPC-???</td><td>—</td><td>never logged</td></tr>
              </tbody>
            </table>
            <p className="lv-note">Headcount at 03:14: <b>606</b>. Headcount at 03:15: <b>2</b>.</p>
            <p className="lv-more">recovered specimen files ›</p>
          </div> : <SpecimenPage key={page} sp={order[page - 1]} n={page} of={pages - 1} />}
          <button type="button" className="lv-arrow prev" aria-label="Previous page" onClick={() => turn(-1)} />
          <button type="button" className="lv-arrow next" aria-label="Next page" onClick={() => turn(1)} />
          <span className="lv-pageno">{page === 0 ? "LOG" : `${page} / ${pages - 1}`}</span>
        </div>
      )}
      {shown === "display" && <TraitDisplay key={"d" + String(item)} active={item === "display"} dropping={dropping} />}
      {(shown === "cam0" || shown === "cam1") && (() => {
        const tv = LAB_FX.tvs[shown === "cam0" ? 0 : 1];
        return <TraitDisplay key={shown + String(item)} active={item === shown} dropping={dropping} mode={{ kind: "cam", devil: tv.devil, label: tv.label }} />;
      })()}
      <p className="lv-hint">click outside to put it back</p>
    </div>
  );
}

// ---------------------------------------------------------------- cork for the 2D desk flask
// Drawn in flask_black_border.webp pixel space (1236x1305) right over its mouth, same ink style.
function DeskCork({ box, hot }: { box: Box; hot: boolean }) {
  return (
    <svg className={"lab-cork" + (hot ? " hot" : "")} style={at(box)} viewBox="0 0 1236 1305" preserveAspectRatio="none" aria-hidden="true">
      <path d="M512 160 L490 66 Q614 22 738 66 L716 160 Q614 190 512 160 Z" fill="#8c5a2c" stroke="#0b0705" strokeWidth="10" strokeLinejoin="round" />
      <path d="M520 150 L503 74 Q540 64 566 62 L572 166 Q540 162 520 150 Z" fill="#b07a45" opacity=".85" />
      <path d="M690 156 L705 80 Q716 84 724 88 L708 152 Z" fill="#5e3a1a" opacity=".7" />
      <ellipse cx="614" cy="66" rx="124" ry="34" fill="#c99158" stroke="#0b0705" strokeWidth="10" />
      <ellipse cx="614" cy="66" rx="88" ry="20" fill="none" stroke="#9c6a37" strokeWidth="6" opacity=".7" />
      <g fill="#5e3a1a" opacity=".55">
        <circle cx="560" cy="60" r="5" /><circle cx="650" cy="74" r="4" /><circle cx="600" cy="78" r="3.5" /><circle cx="676" cy="58" r="3.5" />
        <circle cx="540" cy="110" r="4" /><circle cx="600" cy="128" r="5" /><circle cx="660" cy="104" r="4" /><circle cx="690" cy="136" r="3.5" />
      </g>
      <path d="M540 52 Q580 40 620 42" fill="none" stroke="#f0c48c" strokeWidth="7" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}

// ---------------------------------------------------------------- one recovered specimen per page
function shuffle<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j] as T, b[i] as T]; }
  return b;
}
function SpecimenPage({ sp, n, of }: { sp: Specimen | undefined; n: number; of: number }) {
  if (!sp) return null;
  return (
    <div className={"lv-page lv-spec r-" + sp.rarity}>
      <p className="lv-sub">Recovered specimen · file {String(n).padStart(2, "0")} of {of}</p>
      <h3>{sp.name.toUpperCase()}</h3>
      <div className="lv-spec-tags"><span className="lv-spec-rar">{RARITY_LABEL[sp.rarity]}</span><span className="lv-spec-id">{sp.id}</span></div>
      <figure className={"lv-spec-photo" + (sp.silhouette ? " sil" : "")}>
        <img src={sp.img} alt={sp.silhouette ? "Dark Sovereign, silhouette only" : sp.name} draggable={false} />
        <figcaption>{sp.silhouette ? "never photographed" : "cam still · lab 7"}</figcaption>
      </figure>
      <table>
        <tbody>
          <tr><th>Rarity</th><td className="rar">{RARITY_LABEL[sp.rarity]}</td></tr>
          <tr><th>Mutation</th><td>{sp.mutation}</td></tr>
          <tr><th>Class</th><td>{sp.cls}</td></tr>
          <tr><th>Serum</th><td>M1</td></tr>
          <tr><th>Supply</th><td>606</td></tr>
          <tr><th>Medium</th><td>Zcash, shielded</td></tr>
        </tbody>
      </table>
    </div>
  );
}

