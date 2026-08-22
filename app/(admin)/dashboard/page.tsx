import { getWorkers, getCompanyWorkerHistory } from "@/actions/worker";
import WorkerSelector from "@/components/workers/WorkerSelector";
import HistoryList from "@/components/history/HistoryList";

type DashboardProps = {
  searchParams: Promise<{
    worker?: string | string[];
  }>;
};


const Dashboard = async ({ searchParams }: DashboardProps) => {
  const workersResult = await getWorkers();

  if (!workersResult.success) {
    throw new Error(workersResult.message);
  }

  const workers = workersResult.data;
  const query = await searchParams;
  const requestedWorkerId =
    typeof query.worker === "string" ? query.worker : undefined;
  const selectedWorker =
    workers.find((worker) => worker.id === requestedWorkerId) ??
    workers[0] ??
    null;

  if (!selectedWorker) {
    return (
      <section className="relative mx-auto w-full max-w-5xl pb-4">
        <header className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.26em] text-primary">
            Asistencia
          </p>
          <h1 className="text-3xl font-bold tracking-[-0.045em] text-foreground sm:text-4xl">
            Control de asistencia
          </h1>
        </header>

        <div className="rounded-3xl border border-black/6 bg-white/80 px-6 py-14 text-center shadow-[0_12px_35px_rgba(23,23,23,0.045)] backdrop-blur-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary ring-1 ring-secondary/15">
            <svg aria-hidden="true" className="h-7 w-7" fill="none" viewBox="0 0 24 24">
              <path
                d="M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-4A4.5 4.5 0 0 0 3 18.5V20M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM16 4.2a3.5 3.5 0 0 1 0 6.6M17 14.2a4.5 4.5 0 0 1 4 4.3V20"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
              />
            </svg>
          </span>
          <h2 className="mt-4 text-lg font-bold text-foreground">
            Todavía no hay colaboradores
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-foreground/45">
            Cuando alguien se una a tu empresa, podrás consultar aquí sus jornadas.
          </p>
        </div>
      </section>
    );
  }

  const historyResult = await getCompanyWorkerHistory(
    selectedWorker.id,
  );

  if (!historyResult.success) {
    throw new Error(historyResult.message);
  }

  return (
    <section className="relative mx-auto w-full max-w-6xl pb-4">
      <div className="pointer-events-none absolute -left-24 top-24 h-56 w-56 rounded-full bg-secondary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-96 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <header className="relative mb-7 sm:mb-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.26em] text-primary">
              Asistencia
            </p>
            <h1 className="text-3xl font-bold tracking-[-0.045em] text-foreground sm:text-4xl">
              Control de asistencia
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/45 sm:text-base">
              Consulta las jornadas, periodos y horas registradas por tu equipo.
            </p>
          </div>

          <div className="rounded-2xl bg-white/75 px-4 py-3 shadow-[0_10px_30px_rgba(23,23,23,0.04)] ring-1 ring-black/6 backdrop-blur-sm">
            <strong className="block text-lg leading-5 text-foreground">
              {workers.length}
            </strong>
            <span className="text-[0.62rem] font-semibold uppercase tracking-[0.11em] text-foreground/35">
              Colaboradores
            </span>
          </div>
        </div>
      </header>

      <div className="relative max-w-xl">
        <WorkerSelector
          basePath="/dashboard"
          helperText="Selecciona a quién deseas consultar."
          pendingText="Cargando historial..."
          selectedWorkerId={selectedWorker.id}
          workers={workers}
        />
      </div>

      <div className="relative mt-8 sm:mt-10">
        <HistoryList
          days={historyResult.data}
          emptyDescription="Sus entradas, salidas y horas trabajadas aparecerán aquí."
          emptyTitle={`${selectedWorker.name} todavía no tiene días registrados`}
        />
      </div>
    </section>
  );
};

export default Dashboard;
