import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { LAB_FX } from "./config";
import { Tv } from "./LabFx";
import { BLANK_DISPLAY } from "@/config/cdn";
import { useTraits } from "@/lib/useTraits";
import { playBlip, startCamStatic } from "@/lib/fileSounds";
import type { Build, Trait, TraitCat } from "@/lib/traits";

type Box = { left: number; top: number; width: number; height: number };
const at = (b: Box): CSSProperties => ({ left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%` });

/** Stacked 44x44 trait layers, pixel-sharp. */
export function Sprite({ layers, className = "", focus }: { layers: Trait[]; className?: string; focus?: string }) {
  return (
    <span className={"sprite " + className}>
      {layers.map((t) => <img key={t.id} src={t.img} alt="" draggable={false} className={focus && t.id !== focus ? "ghost" : undefined} />)}
    </span>
  );
}

/** One trait on its own, zoomed to its own pixels (so a 4px ear fills the box like a costume does). */
export function TraitCrop({ t, className = "" }: { t: Trait; className?: string }) {
  const [x0, y0, x1, y1] = t.bb;
  const side = Math.max(x1 - x0, y1 - y0, 16) + 2;
  const left = (-x0 + (side - (x1 - x0)) / 2) / side * 100;
  const top = (-y0 + (side - (y1 - y0)) / 2) / side * 100;
  return (
    <span className={"tcrop " + className}>
      <img src={t.img} alt="" draggable={false} style={{ width: `${(44 / side) * 100}%`, left: `${left}%`, top: `${top}%` }} />
    </span>
  );
}

// ---------------------------------------------------------------- the desk monitors (matrix green)
// centre: a random specimen assembles layer by layer · right: one trait at a time · left: the scan log
export function DeskScreens({ live, hot }: { live: boolean; hot: boolean }) {
  const T = useTraits();
  const [build, setBuild] = useState<Build | null>(null);
  const [step, setStep] = useState(0);
  const [hold, setHold] = useState(0);
  const [scan, setScan] = useState(1);
  const [one, setOne] = useState<Trait | null>(null);
  const layers = useMemo(() => (T && build ? T.layersOf(build) : []), [T, build]);

  useEffect(() => { if (T && !build) { setBuild(T.randomBuild()); setOne(T.TRAITS[Math.floor(Math.random() * T.TRAITS.length)] ?? null); } }, [T, build]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!T || !live) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 380);
    return () => window.clearInterval(id);
  }, [T, live]);
  useEffect(() => {
    if (!T || !tick) return;
    if (step < layers.length) { setStep(step + 1); return; }
    if (hold < 6) { setHold(hold + 1); return; }
    setBuild(T.randomBuild()); setScan((n) => n + 1); setStep(0); setHold(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
  useEffect(() => {
    if (!T || !live) return;
    const id = window.setInterval(() => setOne(T.TRAITS[Math.floor(Math.random() * T.TRAITS.length)] ?? null), 1700);
    return () => window.clearInterval(id);
  }, [T, live]);

  const shown = layers.slice(0, step);
  const last = shown[shown.length - 1];
  const done = step >= layers.length && layers.length > 0;
  const scr = (k: string) => LAB_FX.screens.find((x) => x.kind === k)!;
  const sText = scr("text"), sBuild = scr("build"), sTrait = scr("trait"), sWave = scr("wave");
  return (
    <>
      <span className={"desk-screen ds-text" + (hot ? " hot" : "")} style={at(sText.box)} aria-hidden="true">
        <span className="ds-lines">
          <b>&gt; TRAIT SCAN #{String(scan).padStart(3, "0")}</b>
          <i>LAYER {last ? last.cat.toUpperCase() : "----"}</i>
          <i>{last ? last.name.toUpperCase() : "WAITING"}</i>
          <i>{step}/{layers.length || 8} LAYERS</i>
          <i className={done ? "ok" : "blink"}>{done ? "STATUS STABLE" : "MUTATING_"}</i>
        </span>
      </span>
      <span className={"desk-screen ds-build" + (hot ? " hot" : "") + (step === 0 ? " glitch" : "")} style={at(sBuild.box)} aria-hidden="true">
        <span className="ds-tint"><Sprite layers={shown} /></span>
      </span>
      <span className={"desk-screen ds-trait" + (hot ? " hot" : "")} style={at(sTrait.box)} aria-hidden="true">
        {one && <span className="ds-tint" key={one.id}><TraitCrop t={one} /></span>}
        {one && <em>{one.cat.toUpperCase()} · {one.name.toUpperCase()}</em>}
      </span>
      <span className={"desk-screen ds-wave" + (hot ? " hot" : "")} style={at(sWave.box)} aria-hidden="true">
        <svg viewBox="0 0 200 100" preserveAspectRatio="none">
          <path className="wv a" d="M0 60 L20 60 L28 58 L34 64 L40 20 L46 86 L52 56 L70 60 L90 60 L98 58 L104 64 L110 20 L116 86 L122 56 L140 60 L160 60 L168 58 L174 64 L180 20 L186 86 L192 56 L200 60" />
          <path className="wv b" d="M0 80 Q25 70 50 80 T100 80 T150 80 T200 80" />
        </svg>
        <span className="wv-bars"><i /><i /><i /><i /><i /><i /></span>
        <em>VITALS · {String(scan).padStart(3, "0")}</em>
      </span>
    </>
  );
}

// ---------------------------------------------------------------- front view: trait scanner on the blank CRT
const CAT_LABEL: Record<TraitCat, string> = {
  face: "Face", eyes: "Eyes", ears: "Ears", nose: "Nose", mouth: "Mouth", chest: "Chest", costume: "Costume", weapon: "Weapon",
};
export function TraitScanner({ active }: { active: boolean }) {
  const T = useTraits();
  const [cat, setCat] = useState<TraitCat>("eyes");
  const [sel, setSel] = useState<string>("");
  const list = useMemo(() => (T ? T.traitsOf(cat) : []), [T, cat]);
  const trait = list.find((t) => t.id === sel) ?? list[0];
  useEffect(() => {          // every time the screen is switched on: a random layer and trait
    if (!active || !T) return;
    const c = T.TRAIT_CATS[Math.floor(Math.random() * T.TRAIT_CATS.length)] ?? "eyes";
    const l = T.traitsOf(c);
    setCat(c); setSel(l[Math.floor(Math.random() * l.length)]?.id ?? "");
  }, [active, T]);
  useEffect(() => {
    if (!active || !list.length) return;
    const k = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const i = Math.max(0, list.findIndex((t) => t.id === trait?.id));
      const n = list[(i + (e.key === "ArrowRight" ? 1 : -1) + list.length) % list.length];
      if (n) { setSel(n.id); playBlip(e.key === "ArrowRight"); }
    };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [active, list, trait]);

  const idx = trait ? list.indexOf(trait) + 1 : 0;
  return (
    <div className="lvd-screen">
      <header className="lvd-top"><b>TRAIT SCANNER // LAB 7</b><span>{T ? `${T.TRAITS.length} TRAITS · ${T.TRAIT_CATS.length} LAYERS` : "BOOTING…"}</span></header>
      <div className="lvd-main">
        <div className="lvd-view">
          <div className="lvd-stage" key={trait?.id ?? ""}>{trait && <TraitCrop t={trait} className="big" />}</div>
        </div>
        <div className="lvd-info">
          {trait && (
            <>
              <p className="lvd-layer">LAYER: {CAT_LABEL[trait.cat].toUpperCase()} · {idx} / {list.length}</p>
              <h2>{trait.name.toUpperCase()}</h2>
              <p className="lvd-note">{trait.devil ? "Reserved for the two Devil 1/1s: Hellspawn and Dark Sovereign." : T?.TRAIT_NOTE[trait.cat]}</p>
            </>
          )}
          <div className="lvd-grid" role="listbox" aria-label={`${CAT_LABEL[cat]} traits`}>
            {list.map((t) => (
              <button key={t.id} type="button" role="option" aria-selected={t.id === trait?.id} title={t.name}
                className={t.id === trait?.id ? "on" : ""} onClick={() => { setSel(t.id); playBlip(); }}>
                <TraitCrop t={t} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <nav className="lvd-tabs" aria-label="Trait layers">
        {(T?.TRAIT_CATS ?? []).map((c) => (
          <button key={c} type="button" className={c === cat ? "on" : ""}
            onClick={() => { if (!T) return; setCat(c); setSel(T.traitsOf(c)[0]?.id ?? ""); playBlip(); }}>
            {CAT_LABEL[c]}
          </button>
        ))}
      </nav>
      <i className="lvd-scan" aria-hidden="true" />
    </div>
  );
}

export type DisplayMode = { kind: "traits" } | { kind: "cam"; devil: 1 | 2; label: string };

// The feed's own picture cuts/jolts are CSS loops that start when this view mounts, so the sound
// is scheduled on the same clock: tv-cut 9 s (cut at 62%), tv-art jolts at 46% and 83% of its loop.
function CamSound({ devil, live }: { devil: 1 | 2; live: boolean }) {
  useEffect(() => {
    if (!live) return;
    const night = devil === 2;
    const cutPhase = night ? 4.5 : 0, joltLen = night ? 5.7 : 4.3, joltPhase = night ? 2 : 0;
    const firstCut = (((0.62 * 9 - cutPhase) % 9) + 9) % 9;
    const jolts = [0.46, 0.83].map((f) => (((f * joltLen - joltPhase) % joltLen) + joltLen) % joltLen);
    return startCamStatic(firstCut, 9, jolts, joltLen);
  }, [devil, live]);
  return null;
}
export function TraitDisplay({ active, dropping, mode = { kind: "traits" } }: { active: boolean; dropping: boolean; mode?: DisplayMode }) {
  return (
    <div className={"lv-display" + (dropping ? " drop" : "")}>
      <i className="lvd-black" aria-hidden="true" />
      {mode.kind === "traits"
        ? <TraitScanner active={active} />
        : <div className="lvd-screen lvd-cam"><Tv devil={mode.devil} label={mode.label} big /><CamSound devil={mode.devil} live={active && !dropping} /></div>}
      <img className="lvd-bezel" src={BLANK_DISPLAY} alt="" draggable={false} />
    </div>
  );
}
