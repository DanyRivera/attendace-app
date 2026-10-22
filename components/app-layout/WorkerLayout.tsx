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
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 top-20"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(46, 167, 162, 0.12) 0%, rgba(46, 167, 162, 0.045) 26%, transparent 62%)",
        }}
      />

      <AppHeader companyName={companyName} userName={userName} />

      <main className="relative mx-auto w-full max-w-7xl px-5 pb-28 pt-6 sm:px-8 lg:px-10 lg:pb-32 lg:pt-8">
        {children}
      </main>

      <BottomNav items={workerNavItems} />
    </div>
  );
}
