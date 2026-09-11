"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FlaskConical, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/tests", label: "Tests", icon: FlaskConical },
  { href: "/orders", label: "Orders", icon: ClipboardList },
] as const;

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  variant = "desktop",
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  variant?: "desktop" | "mobile";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center rounded-lg text-[9px] font-medium transition-colors",
        variant === "desktop"
          ? cn(
              "gap-1 px-3 py-2",
              active
                ? "bg-white/10 text-sidebar-accent"
                : "text-white/35 hover:text-white/60"
            )
          : cn(
              "min-h-[44px] min-w-[44px] justify-center gap-0.5 px-3 py-1",
              active ? "text-sidebar-accent" : "text-white/35"
            )
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 top-0 z-40 hidden h-full w-[76px] flex-col items-center bg-sidebar py-6 md:flex">
      <div className="flex flex-1 flex-col items-center gap-2 pt-4">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sidebar-accent to-teal text-xs font-bold text-primary">
        DT
      </div>
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t bg-sidebar px-2 py-1 md:hidden">
      {navItems.map((item) => (
        <NavItem
          key={item.href}
          {...item}
          active={pathname.startsWith(item.href)}
          variant="mobile"
        />
      ))}
    </nav>
  );
}
