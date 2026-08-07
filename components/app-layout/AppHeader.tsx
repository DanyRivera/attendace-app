type AppHeaderProps = {
  companyName?: string;
  userName?: string;
};

export default function AppHeader({
  companyName = "Mi empresa",
  userName,
}: AppHeaderProps) {
  const initial = userName?.trim().charAt(0).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-background/80 px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-white shadow-lg shadow-primary/25">
            T
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight sm:text-lg">
              Time Check
            </p>
            <p className="text-[0.68rem] font-medium text-foreground/40 sm:text-xs">
              Attendance app
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="min-w-0 text-right">
            <p className="max-w-24 truncate text-[0.65rem] font-semibold text-foreground/45 sm:max-w-52 sm:text-xs">
              Empresa
            </p>
            <p className="max-w-24 truncate text-xs font-bold sm:max-w-52 sm:text-sm">
              {companyName}
            </p>
          </div>

          <div
            aria-label={userName ? `Perfil de ${userName}` : "Perfil de usuario"}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-sm font-bold text-secondary ring-1 ring-secondary/20 sm:flex"
            title={userName}
          >
            {initial}
          </div>

          <button
            aria-label="Cerrar sesion"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground/35 transition hover:bg-danger/10 hover:text-danger"
            title="Cerrar sesion"
            type="button"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4M9 12h9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
