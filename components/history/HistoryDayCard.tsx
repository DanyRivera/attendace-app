import {
  dateKeyToDate,
  formatDate,
  formatTimeText,
  formatWorkedTime,
} from "@/lib/date";
import { calculateWorkedMinutes } from "@/lib/history";
import type { HistoryDayCardProps } from "@/types/history";

export default function HistoryDayCard({ day }: HistoryDayCardProps) {
  const date = dateKeyToDate(day.work_date);
  const dayNumber = formatDate(date, "day");
  const month = formatDate(date, "monthShort");
  const workedMinutes = calculateWorkedMinutes(day.periods);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-black/6 bg-white/85 p-4 shadow-[0_12px_35px_rgba(23,23,23,0.055)] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_16px_42px_rgba(46,167,162,0.1)] sm:px-5">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${day.is_paid ? "bg-emerald-500" : "bg-danger"}`}
      />

      <div className="grid grid-cols-[3.2rem_minmax(0,1fr)] gap-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
        <div className="flex h-13 w-13 shrink-0 flex-col items-center justify-center rounded-xl bg-foreground/[0.035] ring-1 ring-black/6 sm:h-14 sm:w-14">
          <span className="text-[0.58rem] font-bold tracking-[0.12em] text-primary">
            {month}
          </span>
          <strong className="text-xl leading-6 tracking-tight text-foreground">
            {dayNumber}
          </strong>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="min-w-0 text-xs font-semibold leading-5 text-foreground/70 sm:text-sm">
              {formatDate(date)}
            </p>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.62rem] font-bold ring-1 ${
                  day.is_paid
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
                    : "bg-danger/8 text-danger ring-danger/15"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${day.is_paid ? "bg-emerald-500" : "bg-danger"}`}
                />
                {day.is_paid ? "Pagado" : "No pagado"}
              </span>

              {day.paid_at && (
                <span className="text-[0.58rem] font-medium text-foreground/35 sm:text-[0.65rem]">
                  Pagado el {formatDate(new Date(day.paid_at), "long")}
                </span>
              )}
            </div>
          </div>

          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Periodos trabajados">
            {day.periods.map((period) => {
              const isOpen = period.ended_at === null;

              return (
                <li
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[0.66rem] font-semibold ring-1 sm:text-xs ${
                    isOpen
                      ? "bg-primary/10 text-primary ring-primary/15"
                      : "bg-foreground/[0.035] text-foreground/55 ring-black/5"
                  }`}
                  key={period.id}
                >
                  {formatTimeText(period.started_at)}
                  <span aria-hidden="true" className="text-foreground/25">
                    →
                  </span>
                  {period.ended_at === null ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      En curso
                    </span>
                  ) : (
                    formatTimeText(period.ended_at)
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="col-span-2 flex items-center justify-between border-t border-black/6 pt-3 sm:col-span-1 sm:min-w-28 sm:flex-col sm:items-end sm:justify-center sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-foreground/35">
            Total del día
          </span>
          <strong className="text-base font-bold tracking-tight text-foreground sm:mt-1 sm:text-lg">
            {formatWorkedTime(workedMinutes)}
          </strong>
        </div>
      </div>
    </article>
  );
}
