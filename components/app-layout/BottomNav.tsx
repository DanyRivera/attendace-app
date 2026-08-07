"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type BottomNavItem = {
  href: string;
  icon: "clock" | "dashboard" | "history" | "people" | "pay" | "profile";
  label: string;
};

type BottomNavProps = {
  items: BottomNavItem[];
};

function NavIcon({ icon }: { icon: BottomNavItem["icon"] }) {
  if (icon === "clock") {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (icon === "history") {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path d="M4 8V4m0 0h4M4 4l3 3a8 8 0 1 1-2 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M12 8v5l3 2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (icon === "dashboard") {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <rect height="7" rx="2" stroke="currentColor" strokeWidth="1.8" width="7" x="3" y="3" />
        <rect height="7" rx="2" stroke="currentColor" strokeWidth="1.8" width="7" x="14" y="3" />
        <rect height="7" rx="2" stroke="currentColor" strokeWidth="1.8" width="7" x="3" y="14" />
        <rect height="7" rx="2" stroke="currentColor" strokeWidth="1.8" width="7" x="14" y="14" />
      </svg>
    );
  }

  if (icon === "people") {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 19c.4-3.4 2.2-5 5.5-5s5.1 1.6 5.5 5M15 15c3.3-.5 5.1.8 5.5 3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (icon === "pay") {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <rect height="14" rx="3" stroke="currentColor" strokeWidth="1.8" width="18" x="3" y="5" />
        <path d="M3 9h18M16 15h2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20c.5-4.3 2.8-6.5 7-6.5s6.5 2.2 7 6.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export default function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegacion principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_45px_rgba(30,55,70,0.08)] backdrop-blur-xl lg:bottom-5 lg:left-1/2 lg:right-auto lg:w-[min(44rem,calc(100%-3rem))] lg:-translate-x-1/2 lg:rounded-3xl lg:border lg:px-4 lg:py-3"
    >
      <div className="mx-auto grid max-w-xl grid-flow-col auto-cols-fr gap-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[0.68rem] font-semibold transition duration-300 sm:text-xs ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/40 hover:bg-black/[0.03] hover:text-foreground/70"
              }`}
              href={item.href}
              key={item.href}
            >
              <span className="h-6 w-6 transition duration-300 group-hover:-translate-y-0.5">
                <NavIcon icon={item.icon} />
              </span>
              <span>{item.label}</span>
              {isActive ? (
                <span className="absolute -bottom-1 h-1 w-5 rounded-full bg-primary lg:-bottom-2" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
