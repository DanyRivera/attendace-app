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
    <section className="relative mx-auto flex h-[calc(100dvh-13.5rem)] min-h-[23rem] w-full max-w-4xl flex-col items-center justify-between px-1 py-2 sm:px-4 sm:py-4 lg:h-[calc(100dvh-15rem)]">
      <CurrentClock
        initialTime={attendance.server_now}
        timeZone={DEFAULT_TIME_ZONE}
      />

      <AttendanceTracker attendance={attendance} />
    </section>
  );
}
