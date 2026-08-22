import { getUser } from "@/actions/auth";
import ProfileForm from "@/components/profile/ProfileForm";
import { redirect } from "next/navigation";

// Muestra el perfil precargado segun el rol del usuario autenticado.
export default async function Profile() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName = `${user.name.trim()} ${user.lastName.trim()}`.trim();
  const initials = [user.name, user.lastName]
    .map((value) => value.trim().charAt(0))
    .join("")
    .toUpperCase();
  const profileUser = {
    name: user.name,
    lastName: user.lastName,
    email: user.email ?? "",
    phone: user.phone,
    isAdmin: user.isAdmin,
    company: user.company
      ? {
          name: user.company.name,
          direction: user.company.direction,
          phone: user.company.phone,
          code: user.company.code,
        }
      : null,
  };

  return (
    <section className="relative mx-auto w-full max-w-6xl pb-4">
      <div className="pointer-events-none absolute -left-24 top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-72 h-64 w-64 rounded-full bg-secondary/12 blur-3xl" />

      <header className="relative mb-7 sm:mb-9">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.26em] text-primary">
          Configuración
        </p>
        <h1 className="text-3xl font-bold tracking-[-0.045em] text-foreground sm:text-4xl">
          Mi perfil
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/45 sm:text-base">
          Revisa y mantén actualizada tu información personal
          {user.isAdmin ? " y la de tu empresa" : ""}.
        </p>
      </header>

      <div className="relative mb-5 overflow-hidden rounded-3xl bg-linear-to-r from-primary via-[#48b8b7] to-secondary p-5 text-white shadow-[0_20px_55px_rgba(46,167,162,0.2)] sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex items-center gap-4 sm:gap-5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/18 text-xl font-bold ring-1 ring-white/30 backdrop-blur sm:h-20 sm:w-20 sm:text-2xl">
            {initials || "U"}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold tracking-tight sm:text-2xl">
                {fullName || "Usuario"}
              </h2>
              <span className="rounded-full bg-white/16 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] ring-1 ring-white/25">
                {user.isAdmin ? "Administrador" : "Colaborador"}
              </span>
            </div>
            <p className="mt-1 truncate text-xs font-medium text-white/75 sm:text-sm">
              {user.email}
            </p>
            {user.company?.name && (
              <p className="mt-2 inline-flex rounded-lg bg-black/8 px-2.5 py-1 text-[0.65rem] font-semibold text-white/85 ring-1 ring-white/12 sm:text-xs">
                {user.company.name}
              </p>
            )}
          </div>
        </div>
      </div>

      <ProfileForm user={profileUser} />
    </section>
  );
}
