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
  UtensilsCrossed,
} from "lucide-react";

const navItems = [
  { label: "Dashboard",       href: "/admin/dashboard",      icon: LayoutDashboard },
  { label: "Students",        href: "/admin/students",        icon: Users           },
  { label: "Teachers",        href: "/admin/teachers",        icon: UserCheck       },
  { label: "Teacher Leaves",  href: "/admin/leave-requests",  icon: Inbox           },
  { label: "Classes",         href: "/admin/classes",         icon: GraduationCap   },
  { label: "Attendance",      href: "/admin/attendance",      icon: CalendarCheck   },
  { label: "Mid-Day Meal",    href: "/admin/mdm",             icon: UtensilsCrossed },
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
        "group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-white/15 text-white font-semibold shadow-xs"
          : "text-white/75 hover:text-white hover:bg-white/10",
      ].join(" ")}
    >
      <Icon className="h-4 w-4 shrink-0 text-white/90" />
      <span className="flex-1">{item.label}</span>
      {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60 text-white" />}
    </Link>
  );
}

function SidebarContent({ locale, onClose }: { locale: string; onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full bg-[#6B1D30]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/15">
        <div>
          <p className="text-base font-bold text-white tracking-tight leading-snug">
            Composite Vidyalaya
          </p>
          <p className="text-xs text-white/70 font-medium mt-0.5">Admin Portal</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 lg:hidden transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} locale={locale} onClick={onClose} />
        ))}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-white/15">
        <button
          onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
          className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-white/75 hover:text-white hover:bg-white/10 transition-colors"
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
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen bg-[#6B1D30] z-20 shadow-md">
        <SidebarContent locale={locale} />
      </aside>

      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-3 left-3 z-40 p-2.5 rounded-xl shadow-md bg-[#6B1D30] text-white hover:bg-[#581726] transition-colors"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex flex-col w-64 h-full shadow-2xl bg-[#6B1D30]">
            <SidebarContent locale={locale} onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
