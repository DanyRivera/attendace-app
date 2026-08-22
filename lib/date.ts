export const DEFAULT_TIME_ZONE = "America/Mexico_City";

export type DateFormat =
  | "full"
  | "long"
  | "monthYear"
  | "day"
  | "monthShort"
  | "key";

// Formatea una fecha con la variante visual solicitada.
export function formatDate(
  date: Date,
  format: DateFormat = "full",
  timeZone = DEFAULT_TIME_ZONE,
): string {
  if (format === "key") {
    const parts = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone,
      year: "numeric",
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value ?? "";
    const month = parts.find((part) => part.type === "month")?.value ?? "";
    const day = parts.find((part) => part.type === "day")?.value ?? "";

    return `${year}-${month}-${day}`;
  }

  if (format === "long") {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "long",
      timeZone,
    }).format(date);
  }

  if (format === "monthYear") {
    const value = new Intl.DateTimeFormat("es-MX", {
      month: "long",
      timeZone,
      year: "numeric",
    }).format(date);

    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  if (format === "day") {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      timeZone,
    }).format(date);
  }

  if (format === "monthShort") {
    return new Intl.DateTimeFormat("es-MX", {
      month: "short",
      timeZone,
    })
      .format(date)
      .replace(".", "")
      .toUpperCase();
  }

  const parts = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    timeZone,
    weekday: "long",
    year: "numeric",
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const formattedDate = `${weekday}, ${day} de ${month} de ${year}`;

  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
}

// Separa una hora en valor numerico y periodo am o pm.
export function formatTime(
  date: Date,
  timeZone = DEFAULT_TIME_ZONE,
): { time: string; period: string } {
  const parts = new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    hour12: true,
    minute: "2-digit",
    timeZone,
  }).formatToParts(date);

  const hour =
    parts.find((part) => part.type === "hour")?.value.padStart(2, "0") ??
    "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const period =
    parts
      .find((part) => part.type === "dayPeriod")
      ?.value.replaceAll(".", "")
      .replaceAll(" ", "")
      .toLowerCase() ?? "";

  return {
    time: `${hour}:${minute}`,
    period,
  };
}

// Formatea una hora completa y usa un marcador cuando no existe.
export function formatTimeText(
  value: Date | string | null,
  timeZone = DEFAULT_TIME_ZONE,
): string {
  if (!value) {
    return "--:--";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  const { time, period } = formatTime(date, timeZone);

  return `${time} ${period}`;
}

// Convierte una fecha YYYY-MM-DD sin desplazarla por zona horaria.
export function dateKeyToDate(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00Z`);
}

// Convierte minutos acumulados en horas y minutos legibles.
export function formatWorkedTime(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}
