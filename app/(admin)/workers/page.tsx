import WorkerCard from "@/components/workers/WorkerCard";
import { getWorkers } from "@/actions/worker";

const Workers = async () => {

  const res = await getWorkers();

  if (!res.success) {
    throw new Error(res.message);
  }

  const workers = res.data;

  return (
    <section className="relative mx-auto w-full max-w-6xl pb-4">
      <div className="pointer-events-none absolute -left-24 top-24 h-56 w-56 rounded-full bg-secondary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-80 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <header className="relative mb-8 sm:mb-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.26em] text-primary">
              Equipo
            </p>
            <h1 className="text-3xl font-bold tracking-[-0.045em] text-foreground sm:text-4xl">
              Colaboradores
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/45 sm:text-base">
              Consulta la información de tu equipo y administra su sueldo por hora.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white/75 px-4 py-3 shadow-[0_10px_30px_rgba(23,23,23,0.04)] ring-1 ring-black/6 backdrop-blur-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-4A4.5 4.5 0 0 0 3 18.5V20M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM16 4.2a3.5 3.5 0 0 1 0 6.6M17 14.2a4.5 4.5 0 0 1 4 4.3V20"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.7"
                />
              </svg>
            </span>
            <div>
              <strong className="block text-lg leading-5 text-foreground">
                {workers.length}
              </strong>
              <span className="text-[0.62rem] font-semibold uppercase tracking-[0.11em] text-foreground/35">
                Colaboradores
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="relative grid gap-3 lg:grid-cols-2 lg:gap-4">
        {workers.map((worker) => (
          <WorkerCard key={worker.id} worker={worker} />
        ))}
      </div>
    </section>
  );
};

export default Workers;
