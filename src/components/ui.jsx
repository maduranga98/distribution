import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "../lib/utils";

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // no background scroll behind the sheet
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={cn("max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl sm:p-5", wide ? "sm:max-w-2xl" : "sm:max-w-md")}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="-mr-1 rounded p-2 hover:bg-neutral-100"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, children }) => (
  <label className="block"><span className="label">{label}</span>{children}</label>
);

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
    <div className="min-w-0">
      <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
      {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
    </div>
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{children}</div>
  </div>
);

export const Stat = ({ label, value, hint, tone, className }) => (
  <div className={cn("card min-w-0 p-3 sm:p-4", className)}>
    <p className="text-xs font-medium text-neutral-500">{label}</p>
    <p className={cn("mt-1 break-words text-lg font-semibold tracking-tight sm:text-2xl", tone === "bad" && "text-red-600", tone === "good" && "text-emerald-600")}>{value}</p>
    {hint && <p className="mt-0.5 text-xs text-neutral-400">{hint}</p>}
  </div>
);

export const Empty = ({ children }) => (
  <div className="px-4 py-12 text-center text-sm text-neutral-400">{children}</div>
);

export const Badge = ({ tone = "gray", children }) => (
  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",
    tone === "red" && "bg-red-50 text-red-600", tone === "green" && "bg-emerald-50 text-emerald-700",
    tone === "amber" && "bg-amber-50 text-amber-700", tone === "gray" && "bg-neutral-100 text-neutral-600")}>{children}</span>
);

export const Spinner = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-brand" />
  </div>
);
