import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { LAB_FX } from "./config";
import { BLANK_DISPLAY } from "@/config/cdn";
import { useTraits } from "@/lib/useTraits";
import { playBlip } from "@/lib/fileSounds";
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

// ---------------------------------------------------------------- the three desk monitors (matrix green)
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
  const [sText, sBuild, sTrait] = LAB_FX.screens;
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
        {one && T && <span className="ds-tint" key={one.id}><Sprite layers={T.layersOf(T.wearing(one))} focus={one.id} /></span>}
        {one && <em>{one.cat.toUpperCase()} · {one.name.toUpperCase()}</em>}
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
  const [iso, setIso] = useState(false);
  const list = useMemo(() => (T ? T.traitsOf(cat) : []), [T, cat]);
  const trait = list.find((t) => t.id === sel) ?? list[0];
  useEffect(() => {          // every time the screen is switched on: a random layer and trait
    if (!active || !T) return;
    const c = T.TRAIT_CATS[Math.floor(Math.random() * T.TRAIT_CATS.length)] ?? "eyes";
    const l = T.traitsOf(c);
    setCat(c); setSel(l[Math.floor(Math.random() * l.length)]?.id ?? ""); setIso(false);
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

  const layers = T && trait ? (iso ? [trait] : T.layersOf(T.wearing(trait))) : [];
  const idx = trait ? list.indexOf(trait) + 1 : 0;
  return (
    <div className="lvd-screen">
      <header className="lvd-top"><b>TRAIT SCANNER // LAB 7</b><span>{T ? `${T.TRAITS.length} TRAITS · ${T.TRAIT_CATS.length} LAYERS` : "BOOTING…"}</span></header>
      <div className="lvd-main">
        <div className="lvd-view">
          <div className="lvd-stage" key={(trait?.id ?? "") + String(iso)}><Sprite layers={layers} className="big" /></div>
          <button type="button" className="lvd-iso" onClick={() => { setIso((v) => !v); playBlip(!iso); }}>
            {iso ? "◉ trait only" : "◉ on specimen"} <span>· switch</span>
          </button>
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
                <Sprite layers={T ? T.layersOf(T.wearing(t)) : [t]} focus={t.id} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <nav className="lvd-tabs" aria-label="Trait layers">
        {(T?.TRAIT_CATS ?? []).map((c) => (
          <button key={c} type="button" className={c === cat ? "on" : ""}
            onClick={() => { if (!T) return; setCat(c); setSel(T.traitsOf(c)[0]?.id ?? ""); setIso(false); playBlip(); }}>
            {CAT_LABEL[c]}
          </button>
        ))}
      </nav>
      <i className="lvd-scan" aria-hidden="true" />
    </div>
  );
}

export function TraitDisplay({ active, dropping }: { active: boolean; dropping: boolean }) {
  return (
    <div className={"lv-display" + (dropping ? " drop" : "")}>
      <TraitScanner active={active} />
      <img className="lvd-bezel" src={BLANK_DISPLAY} alt="" draggable={false} />
    </div>
  );
}
