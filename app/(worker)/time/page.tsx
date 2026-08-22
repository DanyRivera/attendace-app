import AttendanceTracker from "@/components/time/AttendanceTracker";
import CurrentClock from "@/components/time/CurrentClock";
import { DEFAULT_TIME_ZONE } from "@/lib/date";
import { getWorkerTime } from "@/actions/worker";

export default async function Time() {
  const res = await getWorkerTime();

  if (!res.success) {
    throw new Error(res.message);
  }
  const attendance = res.data;

  return (
    <section className="relative mx-auto flex h-[calc(100dvh-13.5rem)] min-h-[23rem] w-full max-w-4xl flex-col items-center justify-between overflow-hidden px-1 py-2 sm:px-4 sm:py-4 lg:h-[calc(100dvh-15rem)]">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-20 h-52 w-52 rounded-full bg-secondary/10 blur-3xl" />

      <CurrentClock
        initialTime={attendance.server_now}
        timeZone={DEFAULT_TIME_ZONE}
      />

      <AttendanceTracker attendance={attendance} />
    </section>
  );
}
