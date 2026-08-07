import Link from "next/link";
import RegisterForm from "@/components/register-admin/RegisterForm";

export default function RegisterAdmin() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-5 py-7 text-foreground sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute -left-28 top-16 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />

      <section className="relative mx-auto w-full max-w-5xl animate-app-fade-up">
        <Link
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-foreground/50 transition hover:text-primary"
          href="/"
        >
          <span className="text-xl leading-none">&larr;</span>
          Regresar al inicio
        </Link>

        <div className="mb-8 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-primary">
            Nuevo espacio de trabajo
          </p>
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
            Registra tu empresa y comienza a organizar tu equipo.
          </h1>
          <p className="mt-4 text-base font-medium leading-7 text-foreground/55">
            Crea la cuenta del encargado y los datos principales de tu empresa
            en un solo paso.
          </p>
        </div>

        <RegisterForm />
      </section>
    </main>
  );
}
