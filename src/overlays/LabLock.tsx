import { useEffect, useRef } from "react";
import { LAB_ROOM_IMAGE } from "@/config/cdn";
import { Button } from "@/components/ui/button";

export function LabLock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const exit = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement;
    const frame = requestAnimationFrame(() => exit.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    addEventListener("keydown", closeOnEscape);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("keydown", closeOnEscape);
      (previousFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  return (
    <div id="lab-lock" className={"lab-room-overlay" + (open ? " on" : "")} role="dialog" aria-modal="true"
      aria-label="laboratory room" aria-hidden={!open}>
      {open && <>
        <div className="lab-room-stage">
          <img src={LAB_ROOM_IMAGE} alt="Laboratory room" draggable={false} />
        </div>
        <Button ref={exit} type="button" variant="ghost" className="lab-room-exit" onClick={onClose}>EXIT</Button>
      </>}
    </div>
  );
}
