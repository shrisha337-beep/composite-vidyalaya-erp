"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarCheck,
  BookOpen,
  UtensilsCrossed,
  Package,
  Bell,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Clock,
  ChevronRight,
  Inbox,
} from "lucide-react";

const navItems = [
  { label: "Dashboard",       href: "/admin/dashboard",      icon: LayoutDashboard },
  { label: "Students",        href: "/admin/students",        icon: Users           },
  { label: "Teachers",        href: "/admin/teachers",        icon: UserCheck       },
  { label: "Teacher Leaves",  href: "/admin/leave-requests",  icon: Inbox           },
  { label: "Classes",         href: "/admin/classes",         icon: GraduationCap   },
  { label: "Attendance",      href: "/admin/attendance",      icon: CalendarCheck   },
  { label: "Timetable",       href: "/admin/timetable",       icon: Clock           },
  { label: "Marks",           href: "/admin/marks",           icon: BookOpen        },
  { label: "Notices",         href: "/admin/notifications",   icon: Bell            },
  { label: "Reports",         href: "/admin/reports",         icon: FileText        },
  { label: "Settings",        href: "/admin/settings",        icon: Settings        },
];

function NavLink({
  item,
  locale,
  onClick,
}: {
  item: (typeof navItems)[0];
  locale: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const href = `/${locale}${item.href}`;
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
        isActive
          ? "bg-white/10 text-white font-medium"
          : "text-white/60 hover:text-white hover:bg-white/5",
      ].join(" ")}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {isActive && <ChevronRight className="h-3 w-3 opacity-50" />}
    </Link>
  );
}

function SidebarContent({ locale, onClose }: { locale: string; onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <div>
          <p className="text-sm font-semibold text-white leading-tight">
            Composite Vidyalaya
          </p>
          <p className="text-xs text-white/50 mt-0.5">Chandpur Tarhar</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-white/50 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} locale={locale} onClick={onClose} />
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-2 py-3 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}

export function AdminSidebar({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside
        className="hidden lg:flex flex-col w-56 shrink-0 sticky top-0 h-screen"
        style={{ background: "hsl(var(--primary))" }}
      >
        <SidebarContent locale={locale} />
      </aside>

      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-3 left-3 z-40 p-2 rounded-md shadow"
        style={{ background: "hsl(var(--primary))", color: "#fff" }}
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside
            className="relative flex flex-col w-60 h-full shadow-xl"
            style={{ background: "hsl(var(--primary))" }}
          >
            <SidebarContent locale={locale} onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
