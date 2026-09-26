import { useState } from "react";
import { art } from "@/lib/assets";
import { CFG, artBox, px, type Frame } from "./config";

export type RoomState = { rung: boolean; hasFolder: boolean; awaitBell: boolean; bellDown: boolean; landingFolder: boolean; zoom: "" | "zoom-from" | "zoom-away" };
type Props = { on: boolean; f: Frame; vw: number; vh: number; portrait: boolean; st: RoomState; open: (k: string) => void };

// the intake office. layers in art space, hits over them, the vignette on top.
export function Room({ on, f, vw, vh, portrait, st, open }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const c = CFG.art.canvas;
  const whole = px({ x: 0, y: 0, w: c.w, h: c.h }, f);
  const B = (k: string) => px(artBox(k, f, vw, vh), f);
  const hi = (k: string) => (hover === k ? " on" : "");
  const hits: [string, string][] = [
    ["gallery", "the staff wall"], ["board", "noticeboard"], ["tasks", "the tray"], ["socials", "socials"],
    ...(st.hasFolder ? ([["folder", "your folder"]] as [string, string][]) : []),
    ["bell", "the bell"], ["menu", "menu"], ["exit", "exit to the corridor"],
  ];
  const cls = ["scene", on && "on", st.zoom, st.awaitBell && "await-bell", st.bellDown && "bell-down", st.hasFolder && "has-folder", st.landingFolder && "landing-folder", portrait && "portrait"].filter(Boolean).join(" ");
  return (
    <section id="s-room" className={cls} aria-hidden={!on}>
      <img id="room-bg" className="layer full" src={art("01-room-open.png")} alt="" style={whole} draggable={false} />
      <img id="room-iris" className="layer full" src={art("06-clerk-iris.webp")} alt="" style={whole} draggable={false} />
      <img id="hi-gallery" className={"layer crop hi" + hi("gallery")} src={art("hit-gallery.webp")} alt="" style={B("gallery")} draggable={false} />
      <div className="board" style={B("board")}>
        <img id="hi-board" className={"layer hi" + hi("board")} src={art("hit-noticeboard.webp")} alt="" draggable={false} />
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const b = CFG.papers[n];
          return <img key={n} id={"paper-" + n} className={"layer paper" + (hover === "board" ? " lift" : "")} src={art(`noticeboard-paper-${n}.webp`)} alt=""
            style={{ transformOrigin: `${b.x + b.w / 2}% ${b.y + b.h / 2}%` }} draggable={false} />;
        })}
      </div>
      <img className="crumple layer crop" src={art("crumpled-paper.png")} alt="" style={{ ...B("crumple"), visibility: portrait ? "hidden" : undefined }} draggable={false} />
      <img id="tray-bottom" className="layer crop" src={art("task-tray-bottom.webp")} alt="" style={B("tasks")} draggable={false} />
      <img id="hi-tasks" className={"layer crop hi" + hi("tasks")} src={art("hit-tasks.webp")} alt="" style={B("tasks")} draggable={false} />
      <img id="tray-top" className="layer crop" src={art("task-tray-top.webp")} alt="" style={B("tasks")} draggable={false} />
      <img id="hi-socials" className={"layer crop hi" + hi("socials")} src={art("hit-socials.webp")} alt="" style={B("socials")} draggable={false} />
      {st.hasFolder && <img id="hi-folder" className={"layer crop hi fold cur" + hi("folder")} src={art("hit-folder.webp")} alt="" style={B("folder")} draggable={false} />}
      <img id="hi-bell" className={"layer crop hi" + hi("bell")} src={art("05-hit-bell.webp")} alt="" style={B("bell")} draggable={false} />
      <img id="hi-bell-pressed" className="layer crop hi" src={art("05-hit-bell-pressed.webp")} alt="" style={B("bell")} draggable={false} />
      <img id="hi-menu" className={"layer crop hi" + hi("menu")} src={art("hit-menu.webp")} alt="" style={B("menu")} draggable={false} />
      <img className="layer full vignette" src={art("overlay-top.webp")} alt="" style={whole} draggable={false} />
      {hits.map(([k, l]) => (
        <button key={k} type="button" className="hit" data-hit={k} aria-label={l} style={B(k)} tabIndex={on ? 0 : -1}
          onPointerEnter={() => setHover(k)} onPointerLeave={() => setHover(null)}
          onFocus={() => setHover(k)} onBlur={() => setHover(null)} onClick={() => open(k)}>
          {k === "exit" && <img src={art("back-button-mob.png")} alt="" draggable={false} />}
        </button>
      ))}
    </section>
  );
}
