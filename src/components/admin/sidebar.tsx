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
        "group flex items-center gap-3 px-3.5 py-2.5 rounded-sm text-sm font-medium transition-all duration-150",
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
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-gradient-to-b from-white/20 to-white/10 text-white flex items-center justify-center font-serif font-bold text-sm border border-white/25 shadow-xs ring-1 ring-black/10 shrink-0">
            CV
          </div>
          <div>
            <p className="font-school-header text-[15px] font-semibold text-white tracking-wide leading-snug">
              Composite School
            </p>
            <p className="text-[10px] text-white/75 font-medium tracking-wider uppercase mt-0.5">
              Admin Portal · Chandpur Tarhar
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-sm text-white/70 hover:text-white hover:bg-white/10 lg:hidden transition-colors"
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
          onClick={async () => {
            await signOut({ redirect: false });
            window.location.href = `/${locale}/login`;
          }}
          className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-sm text-sm font-medium text-white/75 hover:text-white hover:bg-white/10 transition-colors"
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
  const pathname = usePathname();

  const isCurrent = (href: string) => {
    const fullHref = `/${locale}${href}`;
    return pathname === fullHref || pathname.startsWith(`${fullHref}/`);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen bg-[#6B1D30] z-20 shadow-md">
        <SidebarContent locale={locale} />
      </aside>

      {/* Mobile Top Header App Bar (Phone View) */}
      <header className="lg:hidden sticky top-0 z-30 h-14 w-full shrink-0 bg-[#6B1D30] text-white flex items-center justify-between px-3 sm:px-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            className="p-2 rounded-sm text-white hover:bg-white/10 transition-colors"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="w-7 h-7 rounded-sm bg-gradient-to-b from-white/20 to-white/10 text-white flex items-center justify-center font-serif font-bold text-xs border border-white/25 shadow-xs shrink-0">
            CV
          </div>
          <div>
            <p className="font-school-header text-sm font-semibold text-white leading-tight">
              Composite School
            </p>
            <p className="text-[10px] text-white/70 font-medium">Admin Portal · Chandpur Tarhar</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-white/15 text-white border border-white/10">
            Headmaster
          </span>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Phone View) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E8E0D4] flex items-center justify-around py-1 shadow-lg">
        <Link
          href={`/${locale}/admin/dashboard`}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 text-xs transition-colors ${
            isCurrent("/admin/dashboard")
              ? "text-[#6B1D30] font-bold"
              : "text-[#7A7267] hover:text-[#2D2A26]"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-[10px]">Dashboard</span>
        </Link>
        <Link
          href={`/${locale}/admin/attendance`}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 text-xs transition-colors ${
            isCurrent("/admin/attendance")
              ? "text-[#6B1D30] font-bold"
              : "text-[#7A7267] hover:text-[#2D2A26]"
          }`}
        >
          <CalendarCheck className="h-4 w-4" />
          <span className="text-[10px]">Attendance</span>
        </Link>
        <Link
          href={`/${locale}/admin/mdm`}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 text-xs transition-colors ${
            isCurrent("/admin/mdm")
              ? "text-[#6B1D30] font-bold"
              : "text-[#7A7267] hover:text-[#2D2A26]"
          }`}
        >
          <UtensilsCrossed className="h-4 w-4" />
          <span className="text-[10px]">MDM</span>
        </Link>
        <Link
          href={`/${locale}/admin/notifications`}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 text-xs transition-colors ${
            isCurrent("/admin/notifications")
              ? "text-[#6B1D30] font-bold"
              : "text-[#7A7267] hover:text-[#2D2A26]"
          }`}
        >
          <Bell className="h-4 w-4" />
          <span className="text-[10px]">Notices</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2.5 py-1 text-xs text-[#7A7267] hover:text-[#2D2A26] transition-colors"
        >
          <Menu className="h-4 w-4" />
          <span className="text-[10px]">Menu</span>
        </button>
      </nav>

      {/* Mobile Drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex flex-col w-72 max-w-[85vw] h-full shadow-2xl bg-[#6B1D30]">
            <SidebarContent locale={locale} onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
