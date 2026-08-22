"use client";

import { useEffect, useState } from "react";
import { formatDate, formatTime } from "@/lib/date";

type CurrentClockProps = {
  initialTime: string;
  timeZone: string;
};

export default function CurrentClock({
  initialTime,
  timeZone,
}: CurrentClockProps) {
  const [currentTime, setCurrentTime] = useState(() => new Date(initialTime));
  const formattedTime = formatTime(currentTime, timeZone);

  useEffect(() => {
    const initialTimestamp = new Date(initialTime).getTime();
    const startedAt = performance.now();

    const updateClock = () => {
      const elapsed = performance.now() - startedAt;
      setCurrentTime(new Date(initialTimestamp + elapsed));
    };

    const interval = window.setInterval(updateClock, 1000);

    return () => window.clearInterval(interval);
  }, [initialTime]);

  return (
    <div className="relative text-center">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
        Hoy
      </p>
      <p className="text-5xl font-semibold tracking-[-0.06em] text-foreground sm:text-6xl lg:text-7xl">
        {formattedTime.time}
        <span className="ml-2 text-xl font-medium tracking-normal text-foreground/45 sm:text-2xl">
          {formattedTime.period}
        </span>
      </p>
      <p className="mt-3 text-sm font-medium text-foreground/50 sm:text-base">
        {formatDate(currentTime, "full", timeZone)}
      </p>
    </div>
  );
}
