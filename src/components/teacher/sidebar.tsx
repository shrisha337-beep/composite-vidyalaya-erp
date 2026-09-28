"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  BookOpen,
  ClipboardList,
  CalendarDays,
  FileCheck,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronRight,
  GraduationCap,
  BarChart3,
  User,
  Bell,
} from "lucide-react";

const navItems = [
  { label: "Dashboard",       href: "/teacher/dashboard",      icon: LayoutDashboard },
  { label: "My Classes",      href: "/teacher/my-classes",     icon: GraduationCap   },
  { label: "Students",        href: "/teacher/students",       icon: Users           },
  { label: "Attendance",      href: "/teacher/attendance",     icon: CalendarCheck   },
  { label: "Marks Entry",     href: "/teacher/marks-entry",    icon: ClipboardList   },
  { label: "Homework",        href: "/teacher/homework",       icon: BookOpen        },
  { label: "Timetable",       href: "/teacher/timetable",      icon: CalendarDays    },
  { label: "Apply Leave",     href: "/teacher/leave",          icon: FileText        },
  { label: "Student Leaves",  href: "/teacher/leave-approval", icon: FileCheck       },
  { label: "Notices",         href: "/teacher/notices",        icon: Bell            },
  { label: "Reports",         href: "/teacher/reports",        icon: BarChart3       },
  { label: "Profile",         href: "/teacher/profile",        icon: User            },
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
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm bg-white/15 text-white flex items-center justify-center font-bold text-sm">
            CV
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight leading-snug">
              Composite Vidyalaya
            </p>
            <p className="text-[11px] text-white/70 font-medium mt-0.5">Teacher Portal</p>
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

export function TeacherSidebar({ locale }: { locale: string }) {
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
          <div>
            <p className="text-sm font-bold text-white leading-tight">
              Composite Vidyalaya
            </p>
            <p className="text-[10px] text-white/70">Teacher Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-white/15 text-white border border-white/10">
            Faculty
          </span>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Phone View) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E8E0D4] flex items-center justify-around py-1 shadow-lg">
        <Link
          href={`/${locale}/teacher/dashboard`}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 text-xs transition-colors ${
            isCurrent("/teacher/dashboard")
              ? "text-[#6B1D30] font-bold"
              : "text-[#7A7267] hover:text-[#2D2A26]"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-[10px]">Home</span>
        </Link>
        <Link
          href={`/${locale}/teacher/attendance`}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 text-xs transition-colors ${
            isCurrent("/teacher/attendance")
              ? "text-[#6B1D30] font-bold"
              : "text-[#7A7267] hover:text-[#2D2A26]"
          }`}
        >
          <CalendarCheck className="h-4 w-4" />
          <span className="text-[10px]">Attendance</span>
        </Link>
        <Link
          href={`/${locale}/teacher/marks-entry`}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 text-xs transition-colors ${
            isCurrent("/teacher/marks-entry")
              ? "text-[#6B1D30] font-bold"
              : "text-[#7A7267] hover:text-[#2D2A26]"
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span className="text-[10px]">Marks</span>
        </Link>
        <Link
          href={`/${locale}/teacher/notices`}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 text-xs transition-colors ${
            isCurrent("/teacher/notices")
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
