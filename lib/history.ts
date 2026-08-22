import { dateKeyToDate, formatDate } from "@/lib/date";
import type {
  HistoryDayData,
  HistoryGroup,
  HistoryPeriodData,
} from "@/types/history";

const DAY_IN_MILLISECONDS = 86_400_000;

// Suma los minutos de todos los periodos cerrados.
export function calculateWorkedMinutes(periods: HistoryPeriodData[]): number {
  const workedMilliseconds = periods.reduce((total, period) => {
    if (!period.ended_at) {
      return total;
    }

    return (
      total +
      Math.max(
        0,
        new Date(period.ended_at).getTime() -
          new Date(period.started_at).getTime(),
      )
    );
  }, 0);

  return Math.floor(workedMilliseconds / 60_000);
}

// Agrupa los dias trabajados en periodos relativos sin repetirlos.
export function groupHistoryDays(
  todayKey: string,
  days: HistoryDayData[],
): HistoryGroup[] {
  const today = dateKeyToDate(todayKey);
  const mondayBasedDay = (today.getUTCDay() + 6) % 7;
  const groups = new Map<string, HistoryDayData[]>();

  for (const day of days) {
    const workDate = dateKeyToDate(day.work_date);
    const daysAgo = Math.round(
      (today.getTime() - workDate.getTime()) / DAY_IN_MILLISECONDS,
    );
    let label: string;

    if (daysAgo === 0) {
      label = "Hoy";
    } else if (daysAgo === 1) {
      label = "Ayer";
    } else if (daysAgo <= mondayBasedDay) {
      label = "Esta semana";
    } else if (daysAgo <= mondayBasedDay + 7) {
      label = "Semana pasada";
    } else if (
      workDate.getUTCFullYear() === today.getUTCFullYear() &&
      workDate.getUTCMonth() === today.getUTCMonth()
    ) {
      label = "Este mes";
    } else {
      label = formatDate(workDate, "monthYear");
    }

    const group = groups.get(label) ?? [];
    group.push(day);
    groups.set(label, group);
  }

  return Array.from(groups, ([label, groupedDays]) => ({
    days: groupedDays,
    label,
  }));
}
