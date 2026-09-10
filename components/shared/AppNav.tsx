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
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-[9px] font-medium transition-colors",
        active
          ? "bg-white/10 text-sidebar-accent"
          : "text-white/35 hover:text-white/60"
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
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1 text-[9px] font-medium transition-colors",
            pathname.startsWith(item.href)
              ? "text-sidebar-accent"
              : "text-white/35"
          )}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
