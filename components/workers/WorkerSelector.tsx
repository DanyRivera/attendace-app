"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CompanyWorkerData } from "@/types/workers";

type WorkerSelectorProps = {
  workers: CompanyWorkerData[];
  selectedWorkerId?: string;
  basePath: string;
  helperText: string;
  pendingText: string;
};

export default function WorkerSelector({
  workers,
  selectedWorkerId,
  basePath,
  helperText,
  pendingText,
}: WorkerSelectorProps) {
  const router = useRouter();
  const selectorRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selectedWorker =
    workers.find((worker) => worker.id === selectedWorkerId) ?? null;

  useEffect(() => {
    const closeSelector = (event: MouseEvent) => {
      if (!selectorRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeSelector);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeSelector);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const handleWorkerChange = (workerId: string) => {
    setIsOpen(false);

    if (workerId === selectedWorkerId) {
      return;
    }

    startTransition(() => {
      router.replace(`${basePath}?worker=${encodeURIComponent(workerId)}`, {
        scroll: false,
      });
    });
  };

  return (
    <div
      className="relative z-20 rounded-3xl border border-black/6 bg-white/72 p-4 shadow-[0_12px_35px_rgba(23,23,23,0.045)] backdrop-blur-sm sm:p-5"
      ref={selectorRef}
    >
      <span
        className="mb-2 block text-[0.65rem] font-bold uppercase tracking-[0.15em] text-foreground/40"
        id="worker-selector-label"
      >
        Colaborador
      </span>

      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby="worker-selector-label worker-selector-value"
        className="relative flex h-14 w-full items-center rounded-2xl border border-black/8 bg-white/80 text-left shadow-[0_8px_24px_rgba(23,23,23,0.04)] outline-none transition hover:border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-wait disabled:opacity-60"
        disabled={isPending}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="pointer-events-none ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M4.5 21a7.5 7.5 0 0 1 15 0"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.7"
            />
          </svg>
        </span>
        <span
          className={`min-w-0 flex-1 truncate px-3 pr-12 text-base font-semibold ${
            selectedWorker ? "text-foreground" : "text-foreground/35"
          }`}
          id="worker-selector-value"
        >
          {selectedWorker
            ? `${selectedWorker.name} ${selectedWorker.last_name}`
            : "Selecciona un colaborador"}
        </span>
        <span className="pointer-events-none absolute right-4 text-foreground/35">
          {isPending ? (
            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          ) : (
            <svg
              aria-hidden="true"
              className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="m7 9.5 5 5 5-5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          )}
        </span>
      </button>

      {isOpen && (
        <div
          aria-labelledby="worker-selector-label"
          className="absolute inset-x-4 top-[6.35rem] z-50 max-h-64 overflow-y-auto rounded-2xl border border-black/8 bg-white p-1.5 shadow-[0_20px_55px_rgba(23,23,23,0.16)] sm:inset-x-5 sm:top-[6.6rem]"
          role="listbox"
        >
          {workers.map((worker) => {
            const isSelected = worker.id === selectedWorkerId;

            return (
              <button
                aria-selected={isSelected}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-foreground/[0.04]"
                }`}
                key={worker.id}
                onClick={() => handleWorkerChange(worker.id)}
                role="option"
                type="button"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                    isSelected
                      ? "bg-primary text-white"
                      : "bg-secondary/10 text-secondary"
                  }`}
                >
                  {worker.name.trim().charAt(0)}
                  {worker.last_name.trim().charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">
                    {worker.name} {worker.last_name}
                  </strong>
                  <span className="block truncate text-[0.65rem] font-medium text-foreground/40">
                    {worker.email}
                  </span>
                </span>
                {isSelected && (
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="m5 12 4.5 4.5L19 7"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}

      <span className="mt-2 block text-xs font-medium text-foreground/35">
        {isPending ? pendingText : helperText}
      </span>
    </div>
  );
}
