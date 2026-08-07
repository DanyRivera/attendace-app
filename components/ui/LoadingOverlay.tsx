"use client";

import { createPortal } from "react-dom";

type LoadingOverlayProps = {
  isOpen: boolean;
  title?: string;
  description?: string;
};

export default function LoadingOverlay({
  isOpen,
  title = "Cargando",
  description = "Procesando la informacion...",
}: LoadingOverlayProps) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      aria-live="polite"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-white/70 px-6 backdrop-blur-md"
      role="dialog"
    >
      <div className="animate-app-fade-up text-center">
        <div className="relative mx-auto mb-8 flex h-40 w-40 items-center justify-center">
          <span className="absolute h-40 w-40 rounded-full border border-primary/10" />
          <span className="animate-app-pulse-ring absolute h-32 w-32 rounded-full border-2 border-primary/25" />
          <span className="absolute h-28 w-28 animate-spin rounded-full border-[3px] border-primary/10 border-t-primary" />

          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#35c4bd] shadow-2xl shadow-primary/35">
            <span className="flex items-end gap-1" aria-hidden="true">
              <span className="h-3 w-1.5 rounded-full bg-white/75" />
              <span className="h-6 w-1.5 rounded-full bg-white" />
              <span className="h-4 w-1.5 rounded-full bg-white/85" />
            </span>
          </span>
        </div>

        <h2 className="text-2xl font-bold tracking-[-0.03em] text-foreground sm:text-3xl">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-6 text-foreground/50 sm:text-base">
          {description}
        </p>
      </div>
    </div>,
    document.body,
  );
}
