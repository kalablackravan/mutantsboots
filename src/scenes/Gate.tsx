import { useCallback, useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";
import { Button } from "@/components/ui/button";
import { sceneImage, type SceneImage } from "@/config/cdn";
import { CLONE, LOCK, SCENE_LAYERS } from "./config";
import { ClassifiedFile } from "@/overlays/ClassifiedFile";
import { preloadFile } from "@/lib/fileArt";
import { playDoorBurst, playDoorOpen, playKitClose, playKitOpen, playVesselBlip, startBeepAlarm, startGaugeDings, startPipeFlow, startSubmergedBubbleLoop } from "@/lib/fileSounds";
import { LockKeypad } from "@/overlays/LockKeypad";
import { Faucet, FirstAidKit, GateBackdrop, HomePad, SignLogo, SlimeDrips, VESSEL_CLEAN_BOX, VesselBubbles } from "./GateProps";

type LayerBox = { left: number; top: number; width: number; height: number; objectPosition?: string };
type Props = { on: boolean; warm?: boolean; zoom?: "" | "zoom-from"; onDoor: () => void; onLab?: () => void; onHome?: () => void };

const position = (box: LayerBox): CSSProperties => ({
  left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%`,
  objectPosition: box.objectPosition,
});

function SceneLayer({ name, box, className = "", onLoad }: { name: SceneImage; box: LayerBox; className?: string; onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void }) {
  const hideOnError = (event: SyntheticEvent<HTMLImageElement>) => { event.currentTarget.hidden = true; };
  return <img className={`gate-layer ${className}`} src={sceneImage(name)} alt="" style={position(box)}
    decoding="sync" loading="eager" fetchPriority="high" draggable={false} onError={hideOnError} onLoad={onLoad} />;
}

// A pressure gauge needle: parked on LOW, sweeps LOW -> HIGH in a loop while active,
// and when released it falls back from wherever it is (no jump).
function Gauge({ cx, cy, r, dur, delay, active }: { cx: number; cy: number; r: number; dur: number; delay: number; active: boolean }) {
  const needle = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = needle.current; if (!el) return;
    if (active) { el.style.transition = ""; el.style.transform = ""; el.classList.add("run"); return; }
    if (!el.classList.contains("run")) return;
    const now = getComputedStyle(el).transform;
    el.classList.remove("run"); el.style.transform = now === "none" ? "" : now;
    void el.getBoundingClientRect();
    el.style.transition = "transform .7s cubic-bezier(.5,0,.75,0)";
    el.style.transform = "rotate(-120deg)";
  }, [active]);
  return (
    <span className="gauge" aria-hidden="true" style={{
      left: `${(cx - r) / 38.4}%`, top: `${(cy - r) / 18}%`, width: `${(2 * r) / 38.4}%`, height: `${(2 * r) / 18}%`,
      "--gd": `${dur}s`, "--gdl": `${delay}s`,
    } as CSSProperties}>
      <span ref={needle} className="gauge-needle" /><span className="gauge-pin" />
    </span>
  );
}

export function Gate({ on, warm = false, zoom = "", onDoor, onLab, onHome }: Props) {
  const [open, setOpen] = useState(false);
  const [openReady, setOpenReady] = useState(false);
  const [cloneHover, setCloneHover] = useState(false);
  const [lockHover, setLockHover] = useState(false);
  const [faucetHover, setFaucetHover] = useState(false);
  const [homeHover, setHomeHover] = useState(false);
  const [padOpen, setPadOpen] = useState(false);       // lockdown door keypad close-up
  const [padHover, setPadHover] = useState(false);
  const [kitOpen, setKitOpen] = useState(false);       // first-aid box on the wall (empty)
  const [kitHover, setKitHover] = useState(false);
  // lockdown door: click it and something on the other side throws itself at it
  const [burst, setBurst] = useState(false);
  const burstTimer = useRef(0);
  const slam = () => {
    if (burst || fileOpen) return;
    setBurst(true); playDoorBurst();
    burstTimer.current = window.setTimeout(() => setBurst(false), 1700);
  };
  useEffect(() => () => window.clearTimeout(burstTimer.current), []);
  const born = useRef(performance.now());              // CSS loops (vessel lights, drips) run from mount: sounds use the same clock
  const lastDoorSound = useRef(0);
  const doorSound = () => { const now = performance.now(); if (now - lastDoorSound.current > 1200) { lastDoorSound.current = now; playDoorOpen(); } };
  const [fileOpen, setFileOpen] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  useEffect(() => { if (on) void preloadFile(); }, [on]); // file art is ready long before anyone clicks
  useEffect(() => {
    if (!on || !cloneHover || fileOpen) return;
    return startSubmergedBubbleLoop();
  }, [on, cloneHover, fileOpen]);
  useEffect(() => {                                   // the gauges ding at the top of every sweep while the cursor is on the vessel
    if (!on || !cloneHover || fileOpen) return;
    const big = CLONE.gauges[1];                       // the big top gauge: same timing as its needle (peak at 62% of the sweep)
    return startGaugeDings(big.delay + big.dur * 0.62, big.dur);
  }, [on, cloneHover, fileOpen]);
  useEffect(() => {                                   // liquid flowing through the pipes, always, quietly
    if (!on || fileOpen) return;
    return startPipeFlow();
  }, [on, fileOpen]);
  useEffect(() => {                                   // vessel status lights: a tick each time a light comes on (capGlow: on at 0% of its loop)
    if (!on || fileOpen) return;
    const timers: number[] = [];
    CLONE.lights.forEach((l, i) => {
      const red = i === CLONE.lights.length - 1;
      const next = () => {
        const now = (performance.now() - born.current) / 1000;
        const phase = ((((now - l.delay) % l.period) + l.period) % l.period) / l.period;
        const dt = ((1 - phase) % 1) * l.period || l.period;
        timers.push(window.setTimeout(() => { playVesselBlip(red); next(); }, dt * 1000));
      };
      next();
    });
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [on, fileOpen]);
  useEffect(() => {                                   // quiet lockdown alert while the red alarm is up
    if (!on || !(lockHover || burst) || fileOpen) return;
    return startBeepAlarm();                           // red beacons on: beep-beep alarm on a 2 s loop
  }, [on, lockHover || burst, fileOpen]);
  const openFile = async () => {
    if (fileBusy || fileOpen) return;
    setFileBusy(true); await preloadFile(); setFileBusy(false); // never open onto a blank page
    setCloneHover(false); setFileOpen(true);
  };
  const closeFile = useCallback(() => setFileOpen(false), []);
  return (
    <section id="s-gate" className={"scene" + (on ? " on" : warm ? " warm" : "") + (zoom ? " " + zoom : "")} aria-hidden={!on}>
      <div id="gate-stage" inert={fileOpen} className={[open && openReady ? "slime-open" : "", cloneHover ? "clone-hover" : "", fileOpen ? "file-open" : "", burst ? "lock-burst" : ""].filter(Boolean).join(" ")}>
        <SceneLayer name="bg.webp" box={SCENE_LAYERS.full} className="gate-background" />
        <GateBackdrop />
        <SceneLayer name="chair.webp" box={SCENE_LAYERS.full} />
        <SceneLayer name="clonebase.webp" box={SCENE_LAYERS.full} className="clone-body" />
        <img className="gate-layer vessel-clean" src="/scene/vessel-clean.webp" alt="" draggable={false} style={VESSEL_CLEAN_BOX} />
        <VesselBubbles live={on && !fileOpen} layer="back" />
        {CLONE.gauges.map((g, i) => <Gauge key={i} {...g} active={cloneHover && !fileOpen} />)}
        <SceneLayer name="clonespecimen.webp" box={SCENE_LAYERS.full} className="clone-specimen" />
        <VesselBubbles live={false} layer="front" />
        <SceneLayer name="clonecables.webp" box={SCENE_LAYERS.full} className="clone-cables" />
        {CLONE.lights.map((l, i) => (
          <span key={i} className="cap-light" aria-hidden="true" style={{
            left: `${(l.x0 - 3) / 38.4}%`, top: `${(l.y0 - 3) / 18}%`, width: `${(l.x1 - l.x0 + 6) / 38.4}%`, height: `${(l.y1 - l.y0 + 6) / 18}%`,
            "--lc": l.color, "--lp": `${l.period}s`, "--ld": `${l.delay}s`,
          } as CSSProperties}><i /></span>
        ))}
        <FirstAidKit open={kitOpen} />
        <SceneLayer name="closeddoor.webp" box={SCENE_LAYERS.full} className="slime-closed" />
        <SceneLayer name="lockdoor.webp" box={SCENE_LAYERS.full} />
        <SignLogo />
        <SceneLayer name="opendoor.webp" box={SCENE_LAYERS.full} className="slime-open-layer"
          onLoad={(event) => { void event.currentTarget.decode().then(() => setOpenReady(true)).catch(() => setOpenReady(false)); }} />
        <SlimeDrips live={on && !fileOpen} doorOpen={open && openReady} />
        <HomePad tabIndex={on ? 0 : -1} onHome={() => onHome?.()} onTag={setHomeHover} />
        <button type="button" className="gate-keypad-hit" style={{ left: `${2256 / 38.4}%`, top: `${872 / 18}%`, width: `${114 / 38.4}%`, height: `${192 / 18}%` }}
          tabIndex={on ? 0 : -1} aria-label="Enter the door code" onClick={() => setPadOpen(true)}
          onPointerEnter={() => setPadHover(true)} onPointerLeave={() => setPadHover(false)} />
        <button type="button" className="kit-hit" style={{ left: `${2470 / 38.4}%`, top: `${264 / 18}%`, width: `${190 / 38.4}%`, height: `${134 / 18}%` }}
          tabIndex={on ? 0 : -1} aria-label={kitOpen ? "Close the first-aid box" : "Open the first-aid box"}
          onClick={() => { if (kitOpen) playKitClose(); else playKitOpen(); setKitOpen(!kitOpen); }}
          onPointerEnter={() => setKitHover(true)} onPointerLeave={() => setKitHover(false)} />
        <Faucet tabIndex={on ? 0 : -1} onTag={setFaucetHover} />
        <SceneLayer name="bgsilhouette.webp" box={SCENE_LAYERS.full} className="gate-silhouette" />
        <button type="button" className="clone-hit" style={position(SCENE_LAYERS.cloneHit)}
          aria-label="Open the classified file" tabIndex={on ? 0 : -1}
          onPointerEnter={(event) => { if (event.pointerType === "mouse") setCloneHover(true); void preloadFile(); }}
          onPointerLeave={() => setCloneHover(false)} onFocus={() => setCloneHover(true)} onBlur={() => setCloneHover(false)}
          onClick={openFile} />
        <button type="button" className="lock-hit" style={position(SCENE_LAYERS.lockHit)}
          aria-label="Open lab lockdown room" tabIndex={on ? 0 : -1}
          onPointerEnter={(event) => { if (event.pointerType === "mouse") setLockHover(true); }}
          onPointerLeave={() => setLockHover(false)} onFocus={() => setLockHover(true)} onBlur={() => setLockHover(false)} onClick={() => { slam(); onLab?.(); }} />
        <Button type="button" variant="ghost" className="slime-hit" style={position(SCENE_LAYERS.doorHit)}
          aria-label="Open Department of FOMO" tabIndex={on ? 0 : -1}
          onPointerEnter={(event) => { if (event.pointerType === "mouse") { setOpen(true); doorSound(); } }}
          onPointerLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
          onClick={() => { onDoor(); }} />
      </div>
      <div className="gate-overlay" aria-hidden="true" />
      {/* UI above the pulsing overlay, same frame as the stage, so the hint stays readable */}
      <div id="gate-ui" aria-hidden="true">
        {/* lockdown door: only the two warning lamps blink while the cursor is on it (no sweeping beams, no red wash) */}
        <div className={"alarm" + ((lockHover || burst) && !fileOpen ? " on" : "")}>
          {LOCK.beacons.map((b, i) => (
            <span key={i} className="beacon" style={{ left: `${b.x}%`, top: `${b.y}%`, "--bd": `${i * -0.55}s` } as CSSProperties}>
              <i className="beacon-lamp" />
            </span>
          ))}
        </div>
        <span className={"gate-tag clone-tag lock-tag" + (lockHover && !fileOpen ? " on" : "")}
          style={{ left: `${SCENE_LAYERS.lockHit.left + SCENE_LAYERS.lockHit.width / 2}%`, top: `${SCENE_LAYERS.lockHit.top}%` }}>
          ⛔ no access
        </span>
        <span className={"gate-tag clone-tag" + (padHover && !fileOpen && !padOpen ? " on" : "")}
          style={{ left: `${2313 / 38.4}%`, top: `${858 / 18}%` }}>▸ enter code</span>
        <span className={"gate-tag clone-tag" + (kitHover && !fileOpen ? " on" : "")}
          style={{ left: `${2589 / 38.4}%`, top: `${252 / 18}%` }}>{kitOpen ? "▸ empty" : "▸ first aid"}</span>
        <span className={"gate-tag clone-tag" + (homeHover && !fileOpen ? " on" : "")}
          style={{ left: `${1224 / 38.4}%`, top: `${855 / 18}%` }}>▸ exit to home</span>
        <span className={"gate-tag clone-tag" + (faucetHover && !fileOpen ? " on" : "")}
          style={{ left: `${3275 / 38.4}%`, top: `${1286 / 18}%` }}>▸ open the valve</span>
        <span className={"gate-tag clone-tag" + (cloneHover || fileBusy ? " on" : "")}
          style={{ left: `${SCENE_LAYERS.cloneHit.left + SCENE_LAYERS.cloneHit.width / 2}%`, top: `${SCENE_LAYERS.cloneHit.top}%` }}>
          {fileBusy ? "opening file…" : "▸ click to open file"}
        </span>
      </div>
      <LockKeypad open={padOpen} onClose={() => setPadOpen(false)} />
      <ClassifiedFile open={fileOpen} onClose={closeFile} />
    </section>
  );
}