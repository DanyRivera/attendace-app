
import Link from "next/link";

const menuItems = [
  {
    href: "/login",
    title: "Inicio de Sesion",
    accent: "from-primary to-[#35c4bd] shadow-primary/25",
  },
  {
    href: "/register-admin",
    title: "Registro Administrador",
    accent: "from-secondary to-[#94b6f2] shadow-secondary/25",
  },
  {
    href: "/register-worker",
    title: "Registro Colaborador",
    accent: "from-danger to-[#f06a7b] shadow-danger/20",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-5 py-7 text-foreground sm:px-8">
      <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-1/3 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-danger/10 blur-3xl" />

      <section className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-md flex-col justify-between lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] lg:items-center lg:gap-20">
        <div className="animate-app-fade-up pt-8 text-center lg:max-w-2xl lg:pt-0 lg:text-left">
          <div className="mx-auto mb-9 flex w-fit items-center gap-3 rounded-full bg-white/80 px-4 py-3 shadow-[0_16px_50px_rgba(46,167,162,0.14)] ring-1 ring-white/80 backdrop-blur lg:mx-0">
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
            Bienvenido
          </p>
          <h1 className="text-4xl font-bold tracking-[-0.05em] sm:text-5xl lg:text-6xl">
            Asistencia simple para equipos modernos.
          </h1>
          <p className="mx-auto mt-5 max-w-sm text-base font-medium leading-7 text-foreground/55 lg:mx-0 lg:max-w-lg">
            Inicia sesion, crea tu administracion o registra a tu equipo para
            comenzar a controlar entradas y salidas.
          </p>
        </div>

        <div className="contents lg:flex lg:flex-col lg:items-stretch lg:gap-8">
          <div className="animate-app-fade-up my-10 flex justify-center [animation-delay:120ms] lg:my-0 lg:justify-center">
            <div className="animate-app-float relative h-60 w-60 rounded-[3rem] bg-white/75 p-5 shadow-[0_30px_90px_rgba(46,167,162,0.18)] ring-1 ring-white/80 backdrop-blur sm:h-72 sm:w-72 lg:h-80 lg:w-80 lg:p-6">
              <div className="absolute -right-3 -top-3 h-[4.5rem] w-[4.5rem] rounded-3xl bg-secondary/25 lg:h-24 lg:w-24" />
              <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-primary/20 lg:h-24 lg:w-24" />
              <div className="relative flex h-full flex-col items-center justify-center rounded-[2.4rem] border border-black/5 bg-gradient-to-br from-white to-background lg:rounded-[2.75rem]">
                <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-primary to-secondary shadow-2xl shadow-primary/25 lg:h-28 lg:w-28 lg:rounded-[2.25rem]">
                  <div className="h-11 w-11 rounded-full border-[5px] border-white/90 border-r-transparent lg:h-[3.25rem] lg:w-[3.25rem]" />
                </div>
                <p className="text-3xl font-semibold tracking-[-0.04em] lg:text-4xl">
                  09:45
                </p>
                <p className="mt-1 text-sm font-medium text-foreground/45">
                  Listo para checar
                </p>
              </div>
            </div>
          </div>

          <div className="animate-app-fade-up pb-2 [animation-delay:220ms] lg:pb-0">
            <div className="grid gap-4 lg:gap-5">
              {menuItems.map((item) => (
                <Link
                  className={`flex min-h-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-r px-6 text-center text-base font-semibold text-white shadow-xl transition duration-300 hover:-translate-y-1 hover:scale-[1.01] active:translate-y-0 active:scale-[0.98] sm:min-h-[4.5rem] sm:text-lg ${item.accent}`}
                  href={item.href}
                  key={item.href}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
