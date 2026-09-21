"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { repairSession } from "@/app/actions/repair-session";
import { AlertTriangle, Wrench, CheckCircle, Loader2 } from "lucide-react";

export function RepairBanner({
  missingClasses,
}: {
  missingClasses: string[];
}) {
  const router = useRouter();
  const [repairing, setRepairing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  async function handleRepair() {
    setRepairing(true);
    try {
      const res = await repairSession();
      setResult(res);
      if (res.success) {
        router.refresh();
      }
    } catch {
      setResult({ success: false, message: "An unexpected error occurred." });
    } finally {
      setRepairing(false);
    }
  }

  if (result?.success) {
    return (
      <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-800">Repair complete</p>
          <p className="text-xs text-green-700 mt-0.5">{result.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800">
          Missing classes detected
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          The following classes are missing from the current session:{" "}
          <span className="font-semibold">
            {missingClasses.map((n) => `Class ${n}`).join(", ")}
          </span>
          . Students cannot be added to these classes until they are created.
        </p>

        {result && !result.success && (
          <p className="text-xs text-red-600 mt-1.5">{result.message}</p>
        )}

        <button
          onClick={handleRepair}
          disabled={repairing}
          className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors bg-amber-600 hover:bg-amber-700 disabled:opacity-60"
        >
          {repairing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Repairing…
            </>
          ) : (
            <>
              <Wrench className="h-3.5 w-3.5" />
              Repair: create missing classes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
