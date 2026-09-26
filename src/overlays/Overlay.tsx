import { useEffect, useRef, type ReactNode } from "react";
import { art } from "@/lib/assets";

// every overlay: dim behind, the art centred and contained (never stretched), X to close, Esc closes,
// focus handed in on open and back to the opener on close.
export function Overlay({ id, open, label, onClose, children, className = "" }: {
  id: string; open: boolean; label: string; onClose: () => void; children: ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const back = useRef<Element | null>(null);
  useEffect(() => {
    if (!open) return;
    back.current = document.activeElement;
    ref.current?.querySelector<HTMLElement>("[data-ovclose]")?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", k);
    return () => { removeEventListener("keydown", k); (back.current as HTMLElement | null)?.focus?.(); };
  }, [open, onClose]);
  return (
    <div id={id} ref={ref} className={"ov " + className + (open ? " on" : "")} role="dialog" aria-modal="true" aria-label={label} aria-hidden={!open}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {open && children}
      {open && (
        <button type="button" className="ov-x" data-ovclose aria-label="close" onClick={onClose}>
          <img src={art("X.webp")} alt="" draggable={false} />
        </button>
      )}
    </div>
  );
}
