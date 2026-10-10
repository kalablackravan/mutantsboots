import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@/hooks/useFrame";
import { homepageArt } from "@/lib/homepageAsset";
import { IntroArt } from "@/scenes/IntroArt";
import { SCENE_IMAGES, sceneImage } from "@/config/cdn";
import { preloadScene } from "@/lib/scenePreload";
import { Gate } from "@/scenes/Gate";
import { LabRoom, preloadLab } from "@/scenes/LabRoom";
import { primeSceneAudio, startLabHorror, playBlip } from "@/lib/fileSounds";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "mutatedfoots" },
      { name: "description", content: "Enter the mutatedfoots lab and explore what lies beyond the doors." },
      { property: "og:title", content: "mutatedfoots" },
      { property: "og:description", content: "Enter the mutatedfoots lab and explore what lies beyond the doors." },
      { property: "og:image", content: "https://mutatedfoots.xyz" + homepageArt },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://mutatedfoots.xyz" + homepageArt },
    ],
    links: SCENE_IMAGES.map((name) => ({ rel: "preload", as: "image", href: sceneImage(name) })),
  }),
  component: Office,
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function Office() {
  const fr = useFrame();
  const [scene, setScene] = useState<"intro" | "gate" | "lab">("intro");
  const [black, setBlack] = useState<"" | "on" | "lift">("");
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

  // walking through the department door: black falls, the scene changes under it, black lifts as the room zooms in
  const travel = async (to: "gate" | "lab" | "intro") => {
    if (busy.current) return; busy.current = true;
    if (to === "lab") await preloadLab(); // the lab room is decoded before the door lets anyone in
    const t = reduced() ? 0 : 1;
    setBlack("on"); await wait(560 * t);
    if (to === "lab") setLabZoom("zoom-from");
    if (to === "intro") setEntering(false);
    setScene(to); await wait(40);
    setBlack("lift"); setLabZoom("");
    await wait(900 * t); setBlack("");
    busy.current = false;
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

  if (!fr) return <main className="office" />;
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
      <div id="blackout" className={black} />
    </main>
  );
}
