import Link from "next/link";
import { getCompanyWorkerPaymentDays } from "@/actions/payments";
import { getWorkers } from "@/actions/worker";
import PaymentCalculator from "@/components/pay/PaymentCalculator";
import WorkerSelector from "@/components/workers/WorkerSelector";
import { formatDate } from "@/lib/date";

type PayProps = {
  searchParams: Promise<{
    worker?: string | string[];
  }>;
};

export default async function Pay({ searchParams }: PayProps) {
  const workersResult = await getWorkers();

  if (!workersResult.success) {
    throw new Error(workersResult.message);
  }

  const workers = workersResult.data;
  const query = await searchParams;
  const requestedWorkerId =typeof query.worker === "string" ? query.worker : undefined;
  const selectedWorker = workers.find((worker) => worker.id === requestedWorkerId) ?? null;
  const hasValidSalary = selectedWorker
    ? Number.isFinite(selectedWorker.salary) && selectedWorker.salary > 0
    : false;

  const pendingDaysResult = selectedWorker && hasValidSalary
    ? await getCompanyWorkerPaymentDays(selectedWorker.id)
    : null;

  if (pendingDaysResult && !pendingDaysResult.success) {
    throw new Error(pendingDaysResult.message);
  }

  const pendingDays = pendingDaysResult?.data ?? [];
  const todayKey = formatDate(new Date(), "key");

  return (
    <section className="relative mx-auto w-full max-w-6xl pb-4">
      <div className="pointer-events-none absolute -left-24 top-20 h-56 w-56 rounded-full bg-secondary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-80 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <header className="relative mb-8 sm:mb-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.26em] text-primary">
              Nómina
            </p>
            <h1 className="text-3xl font-bold tracking-[-0.045em] text-foreground sm:text-4xl">
              Cálculo de pagos
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/45 sm:text-base">
              Selecciona un colaborador para consultar y calcular sus jornadas pendientes.
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

      {workers.length === 0 ? (
        <div className="relative rounded-3xl border border-black/6 bg-white/80 px-6 py-14 text-center shadow-[0_12px_35px_rgba(23,23,23,0.045)] backdrop-blur-sm">
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
            Cuando alguien se una a tu empresa, podrás calcular aquí sus pagos.
          </p>
        </div>
      ) : (
        <>
          <div className="relative max-w-xl">
            <WorkerSelector
              basePath="/pay"
              helperText="Selecciona al colaborador que deseas pagar."
              pendingText="Cargando jornadas pendientes..."
              selectedWorkerId={selectedWorker?.id}
              workers={workers}
            />
          </div>

          <div className="relative mt-8 sm:mt-10">
            {selectedWorker ? (
              hasValidSalary ? (
                <PaymentCalculator
                  days={pendingDays}
                  key={selectedWorker.id}
                  todayKey={todayKey}
                  worker={selectedWorker}
                />
              ) : (
                <div className="rounded-3xl border border-secondary/15 bg-white/85 px-6 py-12 text-center shadow-[0_12px_35px_rgba(23,23,23,0.05)] backdrop-blur-sm sm:py-14">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary ring-1 ring-secondary/20">
                    <svg
                      aria-hidden="true"
                      className="h-7 w-7"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 3v18M16.5 7H9.75a3.25 3.25 0 0 0 0 6.5h4.5a3.25 3.25 0 0 1 0 6.5H7.5"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.7"
                      />
                    </svg>
                  </span>
                  <h2 className="mt-4 text-lg font-bold text-foreground">
                    Asigna un sueldo por hora
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-foreground/50">
                    {selectedWorker.name} {selectedWorker.last_name} necesita un
                    sueldo mayor a $0.00 antes de calcular sus pagos.
                  </p>
                  <Link
                    className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-primary/20"
                    href="/workers"
                  >
                    Configurar sueldo
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="m9 18 6-6-6-6"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </Link>
                </div>
              )
            ) : (
              <div className="rounded-3xl border border-black/6 bg-white/80 px-6 py-14 text-center shadow-[0_12px_35px_rgba(23,23,23,0.045)] backdrop-blur-sm sm:py-16">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <svg
                    aria-hidden="true"
                    className="h-7 w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M4 7.5h16M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM8 12h3M8 16h7"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.7"
                    />
                  </svg>
                </span>
                <h2 className="mt-4 text-base font-bold tracking-tight text-foreground sm:text-lg">
                  Selecciona un colaborador para comenzar
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-foreground/45">
                  Después podrás elegir sus jornadas y revisar el total antes de
                  registrar el pago.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
