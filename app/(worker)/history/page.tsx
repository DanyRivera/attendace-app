import HistoryList from "@/components/history/HistoryList";
import { getWorkerHistory } from "@/actions/worker";

export default async function History() {

  const res = await getWorkerHistory();

  if (!res.success) {
    throw new Error(res.message);
  }

  return (
    <section className="relative mx-auto w-full max-w-5xl pb-4">
      <div className="pointer-events-none absolute -left-20 top-28 h-52 w-52 rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-96 h-60 w-60 rounded-full bg-secondary/10 blur-3xl" />

      <header className="relative mb-8 sm:mb-10">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.26em] text-primary">
          Historial
        </p>
        <h1 className="text-3xl font-bold tracking-[-0.045em] text-foreground sm:text-4xl">
          Días y Horas
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/45 sm:text-base">
          Consulta tus entradas, salidas, horas acumuladas y estado de pago.
        </p>
      </header>

      <div className="relative">
        <HistoryList
          days={res.data}
          emptyDescription="Tus entradas, salidas y horas trabajadas aparecerán aquí."
          emptyTitle="Todavía no tienes días registrados"
        />
      </div>
    </section>
  );
}
