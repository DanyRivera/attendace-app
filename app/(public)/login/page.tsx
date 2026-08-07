import Link from "next/link";
import LoginForm from "@/components/login/LoginForm";

export default function Login() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-5 py-7 text-foreground sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute -left-28 top-10 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-0 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-48 w-48 rounded-full bg-danger/8 blur-3xl" />

      <section className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-5xl flex-col animate-app-fade-up">
        <Link
          className="mb-8 inline-flex w-fit items-center gap-2 text-sm font-semibold text-foreground/50 transition hover:text-primary"
          href="/"
        >
          <span className="text-xl leading-none">&larr;</span>
          Regresar al inicio
        </Link>

        <div className="flex flex-col justify-center flex-1 md:grid md:items-center gap-10 pb-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-20">
          <div className="text-center lg:text-left">
            <div className="mx-auto mb-8 flex w-fit items-center gap-3 rounded-full bg-white/75 px-4 py-3 shadow-[0_16px_50px_rgba(46,167,162,0.14)] ring-1 ring-white/80 backdrop-blur lg:mx-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-white shadow-lg shadow-primary/25">
                T
              </div>
              <div className="text-left">
                <p className="text-lg font-bold leading-tight tracking-tight">
                  Time Check
                </p>
                <p className="text-xs font-medium text-foreground/45">
                  Attendance app
                </p>
              </div>
            </div>

            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-primary">
              Bienvenido de vuelta
            </p>
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl lg:text-6xl hidden md:block ">
              Inicia sesion en Time Check.
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-base font-medium leading-7 text-foreground/55 lg:mx-0 hidden md:block">
              Accede a tu espacio de trabajo para registrar tu asistencia y
              consultar la actividad de tu equipo.
            </p>
          </div>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
