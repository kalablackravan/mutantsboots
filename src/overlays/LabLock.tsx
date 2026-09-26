import { useEffect, useRef, useState } from "react";
import { Overlay } from "./Overlay";

export function LabLock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setCode(""); setSubmitted(false); return; }
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <Overlay id="lab-lock" open={open} label="laboratory access" onClose={onClose}>
      <form className="lab-lock-panel" onSubmit={(e) => { e.preventDefault(); if (code.length === 4) setSubmitted(true); }}>
        <span className="lab-lock-mark" aria-hidden="true">⚠</span>
        <h2>LAB LOCKDOWN</h2>
        <label htmlFor="lab-code">enter 4-digit code</label>
        <input ref={input} id="lab-code" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{4}" maxLength={4} value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setSubmitted(false); }} />
        <button type="submit" disabled={code.length !== 4}>enter</button>
        {submitted && <p role="status">access locked.</p>}
      </form>
    </Overlay>
  );
}