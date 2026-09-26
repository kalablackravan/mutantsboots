import { useEffect, useRef, useState } from "react";
import { Overlay } from "./Overlay";
import labAsset from "@/assets/fomies/lab.webp.asset.json";

// stable absolute Lovable asset URL so the lab art loads on external hosts too
const LAB = `https://project--0bfd5bc5-6bb7-4ec3-a335-ffc88504037e.lovable.app${labAsset.url}`;

export function LabLock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [inside, setInside] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setCode(""); setInside(false); return; }
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <Overlay id="lab-lock" open={open} label="laboratory access" onClose={onClose}>
      {inside ? (
        <figure className="lab-view">
          <img src={LAB} alt="the laboratory, seen from inside" draggable={false} />
          <button type="button" className="lab-back" onClick={() => setInside(false)}>back</button>
        </figure>
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
