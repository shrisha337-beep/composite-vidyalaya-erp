import { isDemoMode } from "@/lib/demo-mode";

export function DemoBanner() {
  if (!isDemoMode()) return null;

  return (
    <div
      role="alert"
      className="bg-amber-500 text-slate-950 font-semibold px-4 py-1.5 text-center text-xs sm:text-sm tracking-wide shadow-xs border-b border-amber-600 sticky top-0 z-50 flex items-center justify-center gap-2 select-none"
    >
      <span>Demo environment. All data is synthetic. / डेमो वातावरण। सभी डेटा कृत्रिम (सिंथेटिक) है।</span>
    </div>
  );
}
