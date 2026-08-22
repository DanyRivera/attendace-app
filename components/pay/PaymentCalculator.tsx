"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { dateKeyToDate, formatDate, formatWorkedTime } from "@/lib/date";
import type { PendingPaymentDay } from "@/types/payments";
import type { CompanyWorkerData } from "@/types/workers";
import { registerCompanyWorkerPayment } from "@/actions/payments";

type PaymentCalculatorProps = {
  worker: CompanyWorkerData;
  days: PendingPaymentDay[];
};

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function PaymentCalculator({
  worker,
  days,
}: PaymentCalculatorProps) {
  const [selectedDayIds, setSelectedDayIds] = useState<Set<string>>(
    () => new Set(),
  );

  if (days.length === 0) {
    return (
      <div className="rounded-3xl border border-black/6 bg-white/80 px-6 py-14 text-center shadow-[0_12px_35px_rgba(23,23,23,0.045)] backdrop-blur-sm sm:py-16">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <svg
            aria-hidden="true"
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="m5 12 4 4 10-10M4 4h16v16H4z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
            />
          </svg>
        </span>
        <h2 className="mt-4 text-lg font-bold text-foreground">
          {worker.name} no tiene jornadas pendientes
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-foreground/45">
          Sus jornadas cerradas y anteriores al día de hoy ya están pagadas o
          todavía no existen.
        </p>
      </div>
    );
  }

  const selectedDays = days.filter((day) => selectedDayIds.has(day.day_id));
  const selectedMinutes = selectedDays.reduce((total, day) => total + day.worked_minutes, 0,);
  const selectedAmount = selectedDays.reduce((total, day) => total + day.estimated_amount, 0,);
  const allDaysSelected = selectedDayIds.size === days.length;
  const hourlySalary = days[0].hourly_salary;

  const toggleDay = (dayId: string) => {
    setSelectedDayIds((current) => {
      const next = new Set(current);

      if (next.has(dayId)) {
        next.delete(dayId);
      } else {
        next.add(dayId);
      }

      return next;
    });
  };

  const toggleAllDays = () => {
    setSelectedDayIds(
      allDaysSelected ? new Set() : new Set(days.map((day) => day.day_id)),
    );
  };

  const handlePaymentConfirmation = async () => {
    if (selectedDays.length === 0) {
      return;
    }

    const fullName = `${worker.name.trim()} ${worker.last_name.trim()}`;
    const dayLabel =
      selectedDays.length === 1
        ? "1 jornada"
        : `${selectedDays.length} jornadas`;

    const confirmation = await Swal.fire({
      title: "Confirmar pago",
      text: `Registrarás ${currencyFormatter.format(selectedAmount)} para ${fullName}, correspondiente a ${dayLabel} y ${formatWorkedTime(selectedMinutes)}. Esta acción marcará las jornadas como pagadas y será irreversible.`,
      icon: "warning",
      iconColor: "var(--secondary)",
      showCancelButton: true,
      confirmButtonColor: "var(--primary)",
      cancelButtonColor: "var(--danger)",
      confirmButtonText: "Sí, registrar",
      cancelButtonText: "Cancelar",
      focusCancel: true,
      reverseButtons: true,
      background: "var(--background)",
      color: "var(--foreground)",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    // Conecta aquí registerCompanyWorkerPayment.
    const res = await registerCompanyWorkerPayment({
      worker_id: worker.id,
      day_ids: Array.from(selectedDayIds)
    });

    if (!res.success) {
      toast.error(res.message);
      return;
    }

    // Pago registrado correctamente.
    setSelectedDayIds(new Set());
    toast.success(res.message);

  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-7">
      <div className="min-w-0">
        <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-primary">
              Jornadas disponibles
            </p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {worker.name} {worker.last_name}
            </h2>
            <p className="mt-1 text-xs font-medium text-foreground/40">
              {days.length} {days.length === 1 ? "jornada pendiente" : "jornadas pendientes"}
            </p>
            <p className="mt-3 text-sm leading-6 text-foreground/55">
              Selecciona las jornadas que deseas incluir en este pago.
            </p>
          </div>

          <button
            className="w-full shrink-0 rounded-xl bg-primary/8 px-4 py-2.5 text-xs font-bold text-primary ring-1 ring-primary/15 transition hover:bg-primary/13 focus:outline-none focus:ring-4 focus:ring-primary/10 sm:w-auto"
            onClick={toggleAllDays}
            type="button"
          >
            {allDaysSelected ? "Limpiar selección" : "Seleccionar todas"}
          </button>
        </div>

        <fieldset
          aria-label="Selecciona las jornadas que deseas pagar"
          className="grid gap-4"
        >
          {days.map((day) => {
            const isSelected = selectedDayIds.has(day.day_id);
            const date = dateKeyToDate(day.work_date);

            return (
              <label
                className={`group relative grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-2xl border p-5 shadow-[0_8px_24px_rgba(23,23,23,0.04)] transition duration-200 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-6 sm:py-5 ${isSelected
                  ? "border-primary/35 bg-primary/[0.055] shadow-[0_12px_30px_rgba(46,167,162,0.1)]"
                  : "border-black/7 bg-white/90 hover:border-primary/25 hover:bg-white"
                  }`}
                key={day.day_id}
              >
                <input
                  checked={isSelected}
                  className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  name="payment-days"
                  onChange={() => toggleDay(day.day_id)}
                  type="checkbox"
                  value={day.day_id}
                />

                <span
                  aria-hidden="true"
                  className={`pointer-events-none flex h-5 w-5 shrink-0 items-center justify-center rounded border transition peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20 ${isSelected
                    ? "border-primary bg-primary text-white"
                    : "border-foreground/30 bg-white text-transparent group-hover:border-primary/60"
                    }`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <path
                      d="m5 12 4.5 4.5L19 7"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.8"
                    />
                  </svg>
                </span>

                <span className="min-w-0">
                  <strong className="block text-sm font-bold leading-6 text-foreground sm:text-base">
                    {formatDate(date)}
                  </strong>
                  <span className="mt-1 block text-xs font-medium text-foreground/40">
                    {formatWorkedTime(day.worked_minutes)} trabajadas
                  </span>
                </span>

                <span className="col-start-2 shrink-0 border-t border-black/5 pt-3 sm:col-start-3 sm:row-start-1 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:text-right">
                  <span className="block text-[0.58rem] font-bold uppercase tracking-[0.12em] text-foreground/30">
                    Importe
                  </span>
                  <strong
                    className={`mt-1 block text-base font-bold tracking-tight transition ${isSelected ? "text-primary" : "text-foreground"
                      }`}
                  >
                    {currencyFormatter.format(day.estimated_amount)}
                  </strong>
                </span>
              </label>
            );
          })}
        </fieldset>
      </div>

      <aside className="overflow-hidden rounded-3xl border border-black/6 bg-white/90 shadow-[0_16px_42px_rgba(23,23,23,0.06)] backdrop-blur-sm lg:sticky lg:top-6">
        <div className="bg-linear-to-br from-primary to-[#35c4bd] px-6 py-6 text-white">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/75">
            Resumen del pago
          </p>
          <strong className="mt-3 block text-3xl font-bold leading-none tracking-[-0.04em] sm:text-4xl lg:text-3xl">
            {currencyFormatter.format(selectedAmount)}
          </strong>
          <span className="mt-2 block text-xs font-medium text-white/75">
            Total estimado en MXN
          </span>
        </div>

        <dl className="divide-y divide-black/6 px-6">
          <div className="flex items-center justify-between gap-4 py-5">
            <dt className="text-xs font-semibold text-foreground/45">Jornadas</dt>
            <dd className="text-sm font-bold text-foreground">
              {selectedDays.length} de {days.length}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-5">
            <dt className="text-xs font-semibold text-foreground/45">Tiempo</dt>
            <dd className="text-sm font-bold text-foreground">
              {formatWorkedTime(selectedMinutes)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-5">
            <dt className="text-xs font-semibold text-foreground/45">Sueldo por hora</dt>
            <dd className="text-sm font-bold text-foreground">
              {currencyFormatter.format(hourlySalary)}
            </dd>
          </div>
        </dl>

        <div className="border-t border-black/6 bg-foreground/[0.02] px-6 py-5">
          <p className="text-xs leading-5 text-foreground/40">
            {selectedDays.length === 0
              ? "Selecciona al menos una jornada para preparar el pago."
              : "Revisa las jornadas seleccionadas antes de registrar el pago."}
          </p>

          <button
            className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-primary to-[#35c4bd] px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-none disabled:bg-foreground/10 disabled:text-foreground/30 disabled:shadow-none"
            disabled={selectedDays.length === 0}
            onClick={handlePaymentConfirmation}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-4.5 w-4.5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="m5 12 4.5 4.5L19 7"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
              />
            </svg>
            Registrar pago
          </button>
        </div>
      </aside>
    </div>
  );
}
