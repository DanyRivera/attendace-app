'use client'

import { useState } from "react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import type { WorkerCardData } from "@/types/workers";
import { updateWorkerSalary } from "@/actions/worker";

type WorkerCardProps = {
  worker: WorkerCardData;
};

// Obtiene hasta dos iniciales para identificar visualmente al colaborador.
function getInitials(name: string, lastName: string): string {
  return `${name.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
}

// Presenta el telefono en grupos legibles sin modificar su valor original.
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length !== 10) {
    return phone;
  }

  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export default function WorkerCard({ worker }: WorkerCardProps) {
  const fullName = `${worker.name.trim()} ${worker.last_name.trim()}`;

  const [salary, setSalary] = useState(worker.salary.toFixed(2));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedSalary = Number(salary);
  const isValidSalary =
    salary.trim() !== "" &&
    Number.isFinite(parsedSalary) &&
    parsedSalary > 0;

  const handleSalaryUpdate = async () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (!isValidSalary) {
      toast.error('El salario es obligatorio y debe ser mayor a 0');
      return;
    }

    const confirmation = await Swal.fire({
      title: "Actualizar sueldo",
      text: `Asignarás $${parsedSalary.toFixed(2)} MXN por hora a ${fullName}.`,
      icon: "warning",
      iconColor: "var(--secondary)",
      showCancelButton: true,
      confirmButtonColor: "var(--primary)",
      cancelButtonColor: "var(--danger)",
      confirmButtonText: "Sí, actualizar",
      cancelButtonText: "Cancelar",
      background: "var(--background)",
      color: "var(--foreground)",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await updateWorkerSalary({
        worker_id: worker.id,
        salary: parsedSalary,
      });

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      setSalary(res.data.salary.toFixed(2));
      toast.success(res.message);
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error inesperado. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }

  }

  return (
    <>
      <LoadingOverlay
        description={`Estamos actualizando el sueldo de ${fullName}...`}
        isOpen={isSubmitting}
        title="Actualizando sueldo"
      />

      <article className="group relative overflow-hidden rounded-2xl border border-black/6 bg-white/85 p-4 shadow-[0_12px_35px_rgba(23,23,23,0.055)] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_16px_42px_rgba(46,167,162,0.1)] sm:p-5">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-primary to-secondary"
        />

        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/12 to-secondary/12 text-sm font-bold text-primary ring-1 ring-primary/15 sm:h-14 sm:w-14 sm:rounded-2xl sm:text-base">
            {getInitials(worker.name, worker.last_name)}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="truncate text-sm font-bold tracking-tight text-foreground sm:text-base">
                {fullName}
              </h2>
              <span className="rounded-full bg-primary/8 px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-primary ring-1 ring-primary/12">
                Colaborador
              </span>
            </div>

            <div className="mt-1.5 grid min-w-0 gap-1 text-[0.68rem] font-medium text-foreground/45 sm:grid-cols-2 sm:text-xs">
              <p className="flex min-w-0 items-center gap-1.5">
                <svg
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M4 6.5 12 13l8-6.5M5.5 19h13a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-13a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                  />
                </svg>
                <span className="truncate">{worker.email}</span>
              </p>
              <p className="flex items-center gap-1.5 sm:justify-end">
                <svg
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8.4 4.5 6.8 3.8a2 2 0 0 0-2.5.8l-.7 1.2c-.4.7-.5 1.5-.2 2.2 2.1 5.7 6.8 10.3 12.5 12.5.8.3 1.6.2 2.2-.2l1.2-.7a2 2 0 0 0 .8-2.5l-.7-1.6a2 2 0 0 0-2.3-1.1l-1.8.5a2 2 0 0 1-1.9-.5l-3.9-3.9A2 2 0 0 1 9 8.6l.5-1.8a2 2 0 0 0-1.1-2.3Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                  />
                </svg>
                {formatPhone(worker.phone)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-black/6 pt-4 sm:flex sm:items-end sm:gap-3">
          <label className="block min-w-0 flex-1" htmlFor={`salary-${worker.id}`}>
            <span className="mb-2 block text-[0.65rem] font-bold uppercase tracking-[0.13em] text-foreground/40">
              Sueldo por hora
            </span>
            <span className="flex h-13 items-center rounded-2xl border border-primary/15 bg-primary/4.5 px-3 ring-0 transition focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10">
              <span className="shrink-0 text-sm font-bold text-primary">$</span>
              <input
                className="min-w-0 flex-1 bg-transparent px-2 text-base font-bold text-foreground outline-none"
                disabled={isSubmitting}
                id={`salary-${worker.id}`}
                onChange={(e) => setSalary(e.target.value)}
                value={salary}
                inputMode="decimal"
                min="0"
                placeholder="0.00"
                step="0.01"
                type="number"
              />
              <span className="shrink-0 text-[0.62rem] font-bold tracking-widest text-foreground/35">
                MXN
              </span>
            </span>
          </label>

          <button
            className="mt-3 flex h-13 w-full shrink-0 items-center justify-center rounded-2xl bg-linear-to-r from-primary to-[#35c4bd] px-5 text-xs font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25 active:translate-y-0 sm:mt-0 sm:w-auto"
            type="button"
            disabled={isSubmitting}
            onClick={handleSalaryUpdate}

          >
            Actualizar sueldo
          </button>
        </div>
      </article>
    </>
  );
}
