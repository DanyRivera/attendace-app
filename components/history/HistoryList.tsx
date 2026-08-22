import HistoryDayCard from "@/components/history/HistoryDayCard";
import { formatDate } from "@/lib/date";
import { groupHistoryDays } from "@/lib/history";
import type { HistoryDayData } from "@/types/history";

type HistoryListProps = {
  days: HistoryDayData[];
  emptyTitle: string;
  emptyDescription: string;
};

// Agrupa y muestra jornadas con una presentacion compartida.
export default function HistoryList({
  days,
  emptyTitle,
  emptyDescription,
}: HistoryListProps) {
  const todayKey = formatDate(new Date(), "key");
  const historyGroups = groupHistoryDays(todayKey, days);

  if (historyGroups.length === 0) {
    return (
      <div className="rounded-2xl border border-black/6 bg-white/80 px-6 py-12 text-center shadow-[0_12px_35px_rgba(23,23,23,0.045)] backdrop-blur-sm sm:py-16">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <svg
            aria-hidden="true"
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
          >
            <rect
              height="16"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.7"
              width="18"
              x="3"
              y="5"
            />
            <path
              d="M8 3v4M16 3v4M3 10h18M8 14h3M8 17h6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.7"
            />
          </svg>
        </span>
        <h2 className="mt-4 text-base font-bold tracking-tight text-foreground sm:text-lg">
          {emptyTitle}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-foreground/45">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {historyGroups.map((group, groupIndex) => (
        <section aria-labelledby={`history-group-${groupIndex}`} key={group.label}>
          <div className="mb-3 flex items-center gap-3">
            <h2
              className="shrink-0 text-sm font-bold tracking-tight text-foreground sm:text-base"
              id={`history-group-${groupIndex}`}
            >
              {group.label}
            </h2>
            <span className="h-px flex-1 bg-linear-to-r from-black/10 to-transparent" />
            <span className="text-[0.65rem] font-semibold text-foreground/30">
              {group.days.length} {group.days.length === 1 ? "día" : "días"}
            </span>
          </div>

          <div className="space-y-3">
            {group.days.map((day) => (
              <HistoryDayCard day={day} key={day.id} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
