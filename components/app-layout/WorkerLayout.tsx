import AppHeader from "@/components/app-layout/AppHeader";
import BottomNav, {
  type BottomNavItem,
} from "@/components/app-layout/BottomNav";

const workerNavItems: BottomNavItem[] = [
  { href: "/time", icon: "clock", label: "Checador" },
  { href: "/history", icon: "history", label: "Historial" },
  { href: "/profile", icon: "profile", label: "Perfil" },
];

type WorkerLayoutProps = {
  children: React.ReactNode;
  companyName?: string;
  userName?: string;
};

export default function WorkerLayout({
  children,
  companyName,
  userName,
}: WorkerLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed -left-32 top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none fixed -right-32 bottom-20 h-96 w-96 rounded-full bg-secondary/15 blur-3xl" />

      <AppHeader companyName={companyName} userName={userName} />

      <main className="relative mx-auto w-full max-w-7xl px-5 pb-28 pt-6 sm:px-8 lg:px-10 lg:pb-32 lg:pt-8">
        {children}
      </main>

      <BottomNav items={workerNavItems} />
    </div>
  );
}
