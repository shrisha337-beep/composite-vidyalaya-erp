"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Download, Eye, FileText, Loader } from "lucide-react";
import Link from "next/link";
import { TcPdfDocument } from "@/components/admin/tc-pdf-document";

// Dynamically import PDF components with SSR disabled to avoid Node.js window errors
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFViewer),
  { ssr: false }
);

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false }
);

export function TcDownloadClient({
  locale,
  student,
  tc,
}: {
  locale: string;
  student: any;
  tc: any;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader className="h-8 w-8 text-gray-400 animate-spin mb-4" />
        <p className="text-sm text-gray-500">Loading PDF engine...</p>
      </div>
    );
  }

  const documentName = `TC_${student.admissionNo}_${student.fullName.replace(/\s+/g, "_")}.pdf`;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              Transfer Certificate Details / विवरण स्थानान्तरण प्रमाण पत्र
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Book No: <span className="font-semibold text-gray-700">{tc.bookNumber || "—"}</span> · 
              Serial No: <span className="font-semibold text-gray-700">{tc.tcNumber}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <PDFDownloadLink
              document={<TcPdfDocument tc={tc} student={student} />}
              fileName={documentName}
            >
              {({ loading }) => (
                <button
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors bg-green-600 hover:bg-green-700 disabled:opacity-65"
                >
                  <Download className="h-4 w-4" />
                  {loading ? "Generating PDF..." : "Download PDF"}
                </button>
              )}
            </PDFDownloadLink>

            <Link
              href={`/${locale}/admin/students/${student.id}`}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Back to Profile
            </Link>
          </div>
        </div>
      </div>

      {/* PDF Web Previewer */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 h-[650px] flex flex-col">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
          <Eye className="h-4 w-4 text-gray-400" />
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            PDF Document Preview / पूर्वावलोकन
          </h3>
        </div>

        <div className="flex-1 w-full rounded border border-gray-100 overflow-hidden bg-gray-50">
          <PDFViewer width="100%" height="100%" className="border-0">
            <TcPdfDocument tc={tc} student={student} />
          </PDFViewer>
        </div>
      </div>
    </div>
  );
}
