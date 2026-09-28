import { useEffect, useRef, useState } from "react";
import { Overlay } from "./Overlay";
import { CHAMBER } from "@/scenes/config";
import { chamberArt } from "@/lib/chamberAssets";

const placement = (item: { x: number; y: number; w: number }) => ({
  left: `${item.x / CHAMBER.width * 100}%`,
  top: `${item.y / CHAMBER.height * 100}%`,
  width: `${item.w / CHAMBER.width * 100}%`,
});

export function LabLock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [inside, setInside] = useState(false);
  const [cabinetOpen, setCabinetOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const chamberScroll = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setCode(""); setInside(false); setCabinetOpen(false); return; }
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!inside) return;
    const frame = requestAnimationFrame(() => {
      const view = chamberScroll.current;
      if (view) view.scrollLeft = (view.scrollWidth - view.clientWidth) / 2;
    });
    return () => cancelAnimationFrame(frame);
  }, [inside]);

  return (
    <Overlay id="lab-lock" open={open} label="laboratory access" onClose={onClose}>
      {inside ? (
        <div className="lab-view" ref={chamberScroll}>
          <div className="chamber-frame" role="img" aria-label="Laboratory chamber with a locked door and broken window">
            <img className="chamber-bg" src={chamberArt("emptychamber (1).webp")} alt="" draggable={false} />
            <img className="chamber-window" src={chamberArt("brokenglasswindows (1).webp")} alt="" style={placement(CHAMBER.window)} draggable={false} />
            <img className="chamber-door" src={chamberArt("LAB-LOCKDOWN.webp")} alt="" style={placement(CHAMBER.door)} draggable={false} />
            <button type="button" className="chamber-cabinet" style={placement(CHAMBER.cabinet)}
              aria-label={cabinetOpen ? "Close cabinet" : "Open cabinet"} aria-pressed={cabinetOpen}
              onClick={() => setCabinetOpen((value) => !value)}>
              <img src={chamberArt(cabinetOpen ? "opencabinet.webp" : "closedcabinet.webp")} alt="" draggable={false} />
            </button>
          </div>
          <button type="button" className="lab-back" onClick={() => setInside(false)}>back</button>
        </div>
      ) : (
        <form className="lab-lock-panel" onSubmit={(e) => { e.preventDefault(); if (code.length === 4) setInside(true); }}>
          <span className="lab-lock-mark" aria-hidden="true">⚠</span>
          <h2>LAB LOCKDOWN</h2>
          <label htmlFor="lab-code">enter 4-digit code</label>
          <input ref={input} id="lab-code" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{4}" maxLength={4} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          <button type="submit" disabled={code.length !== 4}>enter</button>
        </form>
      )}
    </Overlay>
  );
}
