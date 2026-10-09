import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame } from "@/hooks/useFrame";
import { homepageArt } from "@/lib/homepageAsset";
import { IntroArt } from "@/scenes/IntroArt";
import { SCENE_IMAGES, sceneImage } from "@/config/cdn";
import { preloadScene } from "@/lib/scenePreload";
import { CFG } from "@/scenes/config";
import { Gate } from "@/scenes/Gate";
import { Room, type RoomState } from "@/scenes/Room";
import { IV, LINES, CLASSES, classify } from "@/scenes/content";
import { Gallery, Notices, Tasks, Folder, Disclaimer, Menu, Socials } from "@/overlays/Panels";
import { LabRoom, preloadLab } from "@/scenes/LabRoom";
import { primeSceneAudio, startLabHorror, playBlip } from "@/lib/fileSounds";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "mutatedfoots" },
      { name: "description", content: "Enter the mutatedfoots lab and explore what lies beyond the doors." },
      { property: "og:title", content: "mutatedfoots" },
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
  const [scene, setScene] = useState<"intro" | "gate" | "room" | "lab">("intro");
  const [black, setBlack] = useState<"" | "on" | "lift">("");
  const [ov, setOv] = useState<string | null>(null);
  const [beat, setBeat] = useState<Beat | null>(null);
  const [cls, setCls] = useState<string | null>(null);
  const [st, setSt] = useState<RoomState>({ rung: false, hasFolder: false, awaitBell: true, bellDown: false, landingFolder: false, zoom: "" });
  const ans = useRef<{ a1?: string; a2?: string }>({});
  const busy = useRef(false);
  const [entering, setEntering] = useState(false);
  const [gateZoom, setGateZoom] = useState<"" | "zoom-from">("");
  const [labZoom, setLabZoom] = useState<"" | "zoom-from">("");
  useEffect(() => { void preloadScene(); }, []); // start fetching + decoding the scene while the visitor is still on the intro
  // intro: slow creepy ambience. Browsers only allow sound after a click/key/touch, so it starts silent
  // and the first gesture anywhere on the page lets it through; the speaker button mutes it.
  const [soundReady, setSoundReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const music = useRef<ReturnType<typeof startLabHorror> | null>(null);
  useEffect(() => {
    if (scene !== "intro") return;
    const m = startLabHorror(); music.current = m;           // the same horror room tone as the lab
    const unlock = () => { primeSceneAudio(); setSoundReady(true); };
    const evs = ["pointerdown", "keydown", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, unlock, { once: true, passive: true }));
    return () => { evs.forEach((e) => window.removeEventListener(e, unlock)); m.stop(1.4); music.current = null; };
  }, [scene]);
  useEffect(() => { music.current?.setMuted(muted); }, [muted, scene]);
  // the lab (and its heavy art) is only mounted once the visitor has reached the gate: the homepage loads lighter
  const [labMounted, setLabMounted] = useState(false);
  useEffect(() => { if (scene !== "intro") setLabMounted(true); }, [scene]);
  useEffect(() => { if (scene === "gate") void preloadLab(); }, [scene]); // lab room ready before the door is clicked
  const close = useCallback(() => setOv(null), []);

  // walking through the department door: black falls, the scene changes under it, black lifts as the room zooms in
  const travel = async (to: "room" | "gate" | "lab" | "intro") => {
    if (busy.current) return; busy.current = true;
    if (to === "lab") await preloadLab(); // the lab room is decoded before the door lets anyone in
    const t = reduced() ? 0 : 1;
    if (to === "gate") setSt((s) => ({ ...s, zoom: "zoom-away" }));
    setBlack("on"); await wait(560 * t);
    setBeat(null);
    if (to === "room") setSt((s) => ({ ...s, zoom: "zoom-from" }));
    if (to === "lab") setLabZoom("zoom-from");
    if (to === "intro") setEntering(false);
    setScene(to); await wait(40);
    setBlack("lift"); setSt((s) => ({ ...s, zoom: "" })); setLabZoom("");
    await wait(900 * t); setBlack("");
    busy.current = false;
    if (to === "room") setBeat(st.rung ? { text: cls ? LINES.draft : LINES.lookAround } : null);
  };

  // ENTER: same walk-in as the department door. Scene is already decoded, then
  // black falls, the lab appears under it, black lifts as the lab zooms in.
  const enter = async () => {
    if (entering || busy.current) return; setEntering(true);
    primeSceneAudio();
    await preloadScene();
    busy.current = true;
    const t = reduced() ? 0 : 1;
    setBlack("on"); await wait(560 * t);
    setGateZoom("zoom-from"); setScene("gate"); setEntering(false); await wait(40);
    setBlack("lift"); setGateZoom("");
    await wait(900 * t); setBlack("");
    busy.current = false;
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
        <IntroArt />
        <div className="intro-overlay" aria-hidden="true" />
        <button type="button" id="intro-enter" onClick={enter} aria-busy={entering} aria-label="mutatedfoots break in" tabIndex={scene === "intro" ? 0 : -1}>
          <span className="intro-title">mutatedfoots</span>
          <span className="intro-prompt">{entering ? "loading…" : <>break in<span className="intro-arrow" aria-hidden="true">↗</span></>}</span>
        </button>
        <button type="button" className="intro-sound" onClick={() => { primeSceneAudio(); setSoundReady(true); if (soundReady) setMuted((m) => !m); }} aria-label={muted ? "turn the sound on" : "turn the sound off"} tabIndex={scene === "intro" ? 0 : -1}>
          {!soundReady ? "♪ tap for sound" : muted ? "🔇 sound off" : "🔊 sound on"}
        </button>
      </section>
       <Gate on={scene === "gate"} warm={scene === "intro"} zoom={gateZoom} onDoor={() => travel("lab")} onHome={() => { playBlip(false); void travel("intro"); }} />
      {labMounted && <LabRoom on={scene === "lab"} zoom={labZoom} onExit={() => travel("gate")} />}
      {scene === "room" && <Room on f={f} vw={vw} vh={vh} portrait={portrait} st={st} open={openRoom} />}   {/* old room: only mounted if ever entered, so its big PNGs never load */}
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
      {scene === "room" && (
        <>
          <Disclaimer open={ov === "disclaimer"} onClose={close} />
          <Gallery open={ov === "gallery"} onClose={close} />
          <Notices open={ov === "notices"} onClose={close} />
          <Tasks open={ov === "tasks"} onClose={close} portrait={portrait} />
          <Folder open={ov === "folder"} onClose={close} cls={cls} handle="" />
          <Socials open={ov === "socials"} onClose={close} />
          <Menu open={ov === "menu"} onClose={close} go={(k) => setOv(k)} />
        </>
      )}
    </main>
  );
}
