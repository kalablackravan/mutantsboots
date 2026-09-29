import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { useFrame } from "@/hooks/useFrame";
import { homepageArt } from "@/lib/homepageAsset";
import { SCENE_IMAGES, sceneImage } from "@/config/cdn";
import { CFG } from "@/scenes/config";
import { Gate } from "@/scenes/Gate";
import { Room, type RoomState } from "@/scenes/Room";
import { IV, LINES, CLASSES, classify } from "@/scenes/content";
import { Gallery, Notices, Tasks, Folder, Disclaimer, Menu, Socials } from "@/overlays/Panels";
import { LabLock } from "@/overlays/LabLock";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "mutatedfoots — enter the lab" },
      { name: "description", content: "Enter the mutatedfoots lab and explore what lies beyond the doors." },
      { property: "og:title", content: "mutatedfoots — enter the lab" },
      { property: "og:description", content: "Enter the mutatedfoots lab and explore what lies beyond the doors." },
      { property: "og:image", content: homepageArt },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: homepageArt },
    ],
    links: SCENE_IMAGES.map((name) => ({ rel: "preload", as: "image", href: sceneImage(name) })),
  }),
  component: Office,
});

type Opt = { k: string; t: string };
type Beat = { text: string; opts?: Opt[]; pick?: (k: string) => void };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function Office() {
  const fr = useFrame();
  const [scene, setScene] = useState<"intro" | "gate" | "room">("intro");
  const [black, setBlack] = useState<"" | "on" | "lift">("");
  const [ov, setOv] = useState<string | null>(null);
  const [beat, setBeat] = useState<Beat | null>(null);
  const [cls, setCls] = useState<string | null>(null);
  const [st, setSt] = useState<RoomState>({ rung: false, hasFolder: false, awaitBell: true, bellDown: false, landingFolder: false, zoom: "" });
  const ans = useRef<{ a1?: string; a2?: string }>({});
  const busy = useRef(false);
  const close = useCallback(() => setOv(null), []);

  // walking through the department door: black falls, the scene changes under it, black lifts as the room zooms in
  const travel = async (to: "room" | "gate") => {
    if (busy.current) return; busy.current = true;
    const t = reduced() ? 0 : 1;
    if (to === "gate") setSt((s) => ({ ...s, zoom: "zoom-away" }));
    setBlack("on"); await wait(560 * t);
    setBeat(null);
    if (to === "room") setSt((s) => ({ ...s, zoom: "zoom-from" }));
    setScene(to); await wait(40);
    setBlack("lift"); setSt((s) => ({ ...s, zoom: "" }));
    await wait(900 * t); setBlack("");
    busy.current = false;
    if (to === "room") setBeat(st.rung ? { text: cls ? LINES.draft : LINES.lookAround } : null);
  };

  const q = (text: string, question: { q: string; options: Opt[] }, pick: (k: string) => void) =>
    setBeat({ text: text ? text + " " + question.q : question.q, opts: question.options, pick });
  const startInterview = () => {
    q("", IV.opener, (a1) => {
      ans.current.a1 = a1;
      const route = IV.opener.options.find((o) => o.k === a1)?.r;
      const R = route ? IV.routes[route] : undefined;
      if (!R) return;
      q(R.intro, R.q2, (a2) => {
        ans.current.a2 = a2;
        const re2 = R.q2.options.find((o) => o.k === a2)?.react ?? "";
        q(re2, R.q3, (a3) => {
          const re3 = R.q3.options.find((o) => o.k === a3)?.react ?? "";
          const k = classify(a1, a2, a3);
          const result = CLASSES[k];
          if (!result) return;
          setCls(k);
          setSt((s) => ({ ...s, hasFolder: true, landingFolder: true }));
          setTimeout(() => setSt((s) => ({ ...s, landingFolder: false })), 700);
          setBeat({ text: `${re3} ${result.name}. ${result.desc} ${LINES.draft}` });
        });
      });
    });
  };

  const ring = async () => {
    setSt((s) => ({ ...s, bellDown: true }));
    await wait(180);
    setSt((s) => ({ ...s, bellDown: false, awaitBell: false, rung: true }));
    if (cls) { setBeat({ text: LINES.filed }); return; }
    setBeat({
      text: LINES.greet + (fr?.portrait ? " " + LINES.mobile : ""),
      opts: [{ k: "A", t: "i'm here to apply." }, { k: "B", t: "just looking around." }],
      pick: (k) => (k === "A" ? startInterview() : setBeat({ text: LINES.lookAround })),
    });
  };

  const openRoom = (k: string) => {
    if (k === "bell") return void ring();
    if (k === "exit") return void travel("gate");
    setOv(({ board: "notices", gallery: "gallery", tasks: "tasks", folder: "folder", menu: "menu", socials: "socials" } as Record<string, string>)[k] ?? null);
  };

  if (!fr) return <main className="office" />;
  const { f, vw, vh, portrait } = fr;
  const b = CFG.bubble;
  return (
    <main className="office">
      <h1 className="sr-only">mutatedfoots</h1>
      <section id="intro" className={"scene" + (scene === "intro" ? " on" : "")} aria-hidden={scene !== "intro"}>
        <img className="intro-art" src={homepageArt} alt="" draggable={false} />
        <div className="intro-overlay" aria-hidden="true" />
        <button type="button" id="intro-enter" onClick={() => setScene("gate")} aria-label="mutatedfoots enter" tabIndex={scene === "intro" ? 0 : -1}>
          <span className="intro-title">mutatedfoots</span>
          <span className="intro-prompt">enter <span aria-hidden="true">↗</span></span>
        </button>
      </section>
      <Gate on={scene === "gate"} onDoor={() => travel("room")} />
      <Room on={scene === "room"} f={f} vw={vw} vh={vh} portrait={portrait} st={st} open={openRoom} />
      {scene === "room" && beat && (
        <div id="bubble" className="bub" role="status" aria-live="polite"
          style={{ left: f.ox + b.cx * f.scale, bottom: vh - (f.oy + b.tip * f.scale) + 20, maxWidth: Math.max(280, Math.min(b.maxw * f.scale, vw - 24)) }}>
          <p>{beat.text}</p>
          {beat.opts && (
            <div id="vopts" className="opts">
              {beat.opts.map((o) => (
                <button key={o.k} type="button" onClick={() => beat.pick?.(o.k)}><b>{o.k}</b> {o.t}</button>
              ))}
            </div>
          )}
        </div>
      )}
      <div id="blackout" className={black} />
      <Disclaimer open={ov === "disclaimer"} onClose={close} />
       <LabLock open={ov === "lab"} onClose={close} />
      <Gallery open={ov === "gallery"} onClose={close} />
      <Notices open={ov === "notices"} onClose={close} />
      <Tasks open={ov === "tasks"} onClose={close} portrait={portrait} />
      <Folder open={ov === "folder"} onClose={close} cls={cls} handle="" />
      <Socials open={ov === "socials"} onClose={close} />
      <Menu open={ov === "menu"} onClose={close} go={(k) => setOv(k)} />
    </main>
  );
}
