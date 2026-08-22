"use client";

import { useEffect, useRef, useState } from "react";
import Swal from 'sweetalert2'
import { toast } from 'sonner';
import {
  DEFAULT_TIME_ZONE,
  formatDate,
  formatTimeText,
  formatWorkedTime,
} from "@/lib/date";
import { registerTime } from '@/actions/worker';
import { useRouter } from 'next/navigation';
import type { TodayAttendanceData } from '@/types/time';

type AttendanceTrackerProps = {
  attendance: TodayAttendanceData;
};

const REGISTRATION_START_MINUTES = 7 * 60;
const REGISTRATION_END_MINUTES = 21 * 60 + 30;

const registrationTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  timeZone: DEFAULT_TIME_ZONE,
});

function getMinutesInRegistrationTimeZone(date: Date): number {
  const parts = registrationTimeFormatter.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );

  return hour * 60 + minute;
}

export default function AttendanceTracker({ attendance }: AttendanceTrackerProps) {

  const router = useRouter();
  const refreshedDateRef = useRef<string | null>(null);
  const [currentTime, setCurrentTime] = useState(
    () => new Date(attendance.server_now),
  );

  const currentWorkDate = formatDate(currentTime, "key");
  const currentMinutes = getMinutesInRegistrationTimeZone(currentTime);
  const isCurrentAttendance = currentWorkDate === attendance.work_date;
  const isWithinRegistrationWindow =
    isCurrentAttendance &&
    currentMinutes >= REGISTRATION_START_MINUTES &&
    currentMinutes < REGISTRATION_END_MINUTES;

  useEffect(() => {
    const initialTimestamp = new Date(attendance.server_now).getTime();
    const startedAt = performance.now();
    refreshedDateRef.current = null;

    const updateRegistrationTime = () => {
      const elapsed = performance.now() - startedAt;
      const nextTime = new Date(initialTimestamp + elapsed);
      const nextWorkDate = formatDate(nextTime, "key");

      setCurrentTime(nextTime);

      if (
        nextWorkDate !== attendance.work_date &&
        refreshedDateRef.current !== nextWorkDate
      ) {
        refreshedDateRef.current = nextWorkDate;
        router.refresh();
      }
    };

    const interval = window.setInterval(updateRegistrationTime, 1000);

    return () => window.clearInterval(interval);
  }, [attendance.server_now, attendance.work_date, router]);

  const displayedClockIn =
    attendance.open_started_at ?? attendance.latest_clock_in;

  const displayedClockOut = attendance.open_period_id
    ? null
    : attendance.last_clock_out;

  const attendanceSummary = [
    {
      label: "Hora de llegada",
      value: formatTimeText(displayedClockIn),
      accent: "text-primary bg-primary/10 ring-primary/15",
      icon: (
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          <path d="M12 7v5l3 2M17 3h4v4M21 3l-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      ),
    },
    {
      label: "Hora de salida",
      value: formatTimeText(displayedClockOut),
      accent: "text-secondary bg-secondary/10 ring-secondary/15",
      icon: (
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          <path d="M12 7v5l3 2M17 3h4v4M16 8l5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      ),
    },
    {
      label: "Horas trabajadas",
      value: formatWorkedTime(attendance.worked_minutes),
      accent: "text-danger bg-danger/10 ring-danger/15",
      icon: (
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="m8 12 2.5 2.5L16.5 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      ),
    },
  ];

  const handleRegistro = async () => {

    if (!isWithinRegistrationWindow) {
      return;
    }

    const isClockedIn = attendance.open_period_id !== null;

    const result = await Swal.fire({
      title: isClockedIn
        ? "Registrar salida"
        : "Registrar entrada",

      text: isClockedIn
        ? "Estás a punto de registrar tu hora de salida."
        : "Estás a punto de registrar tu hora de entrada.",

      icon: "warning",
      iconColor: "var(--secondary)",
      showCancelButton: true,
      confirmButtonColor: "var(--primary)",
      cancelButtonColor: "var(--danger)",

      confirmButtonText: isClockedIn
        ? "Sí, registrar salida"
        : "Sí, registrar entrada",

      cancelButtonText: "Cancelar",
      background: "var(--background)",
      color: "var(--foreground)",
    });

    if (result.isConfirmed) {
      try {
        const res = await registerTime();

        if (!res.success) {
          toast.error(`${res.message} : ${res.code}`);
          return
        }

        const registeredAction = res.action;

        router.refresh();

        await Swal.fire({
          title:
            registeredAction === "clock_in"
              ? "Entrada registrada"
              : "Salida registrada",
          text:
            registeredAction === "clock_in"
              ? "Tu hora de entrada fue registrada correctamente."
              : "Tu hora de salida fue registrada correctamente.",
          icon: "success",
        });
      } catch (error) {
        console.log(error);
        toast.error("Ocurrio un error inesperado. Intenta nuevamente.");
      }
    }

  };

  return (
    <>
      <div className="relative flex items-center justify-center py-2">
        <span className="animate-app-pulse-ring pointer-events-none absolute h-44 w-44 rounded-full border-2 border-primary/25 sm:h-56 sm:w-56" />
        <span className="pointer-events-none absolute h-40 w-40 rounded-full bg-primary/10 blur-xl sm:h-52 sm:w-52" />

        <button
          aria-label={
            isWithinRegistrationWindow
              ? "Registrar hora"
              : "Registro de asistencia fuera de horario"
          }
          className="group relative flex h-38 w-38 flex-col items-center justify-center rounded-full bg-linear-to-br from-primary via-[#49b8bd] to-secondary text-white shadow-[0_24px_60px_rgba(46,167,162,0.3)] ring-[9px] ring-white/60 transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_rgba(46,167,162,0.38)] active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40 disabled:grayscale disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:shadow-none sm:h-48 sm:w-48"
          disabled={!isWithinRegistrationWindow}
          onClick={handleRegistro}
          title={
            isWithinRegistrationWindow
              ? "Registrar hora"
              : "Registro disponible de 7:00 a. m. a 9:30 p. m."
          }
          type="button"
        >
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 transition group-hover:scale-105 group-disabled:scale-100 sm:h-30 sm:w-30">
            <svg aria-hidden="true" className="h-16 w-16 sm:h-20 sm:w-20" fill="none" viewBox="0 0 24 24">
              <path d="M5.8 10.8A6.3 6.3 0 0 1 12 5.5a6.3 6.3 0 0 1 6.2 5.3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
              <path d="M8.2 11.2A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 3.8 3.2c.5 3.4-1.1 6.7-3.3 8.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
              <path d="M10.4 11.7a1.7 1.7 0 0 1 3.2 0c.4 2.4-.6 4.7-2 6.4M6 13.3c.1 3.2 1.2 5.8 3 7.7M18 13.2c-.1 2.8-1.1 5.4-2.8 7.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
            </svg>
          </span>
        </button>
      </div>

      <div className="relative grid w-full grid-cols-3 py-2 sm:py-4">
        {attendanceSummary.map((item, index) => (
          <div
            className={`flex min-w-0 flex-col items-center px-1 py-2 text-center sm:px-4 sm:py-3 ${index > 0 ? "border-l border-black/8" : ""}`}
            key={item.label}
          >
            <span
              className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ring-1 sm:h-11 sm:w-11 sm:rounded-2xl ${item.accent}`}
            >
              <span className="h-5 w-5 sm:h-6 sm:w-6">{item.icon}</span>
            </span>
            <strong className="whitespace-nowrap text-xs font-bold tracking-tight sm:text-lg">
              {item.value}
            </strong>
            <span className="mt-1 text-[0.62rem] font-medium leading-4 text-foreground/40 sm:text-xs">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
