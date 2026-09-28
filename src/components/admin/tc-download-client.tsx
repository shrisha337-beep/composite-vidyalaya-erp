"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Download, Eye, Loader, RefreshCw } from "lucide-react";
import Link from "next/link";
import { TcPdfDocument } from "@/components/admin/tc-pdf-document";
import { pdf } from "@react-pdf/renderer";

// Dynamically import PDFDownloadLink with SSR disabled
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
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generatePdfPreview = useCallback(async () => {
    setGenerating(true);
    setPdfError(false);
    try {
      const doc = <TcPdfDocument tc={tc} student={student} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      setPdfDataUrl(url);
    } catch (err) {
      console.error("PDF preview generation failed:", err);
      setPdfError(true);
    } finally {
      setGenerating(false);
    }
  }, [tc, student]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      generatePdfPreview();
    }
    // Cleanup blob URL on unmount
    return () => {
      if (pdfDataUrl) {
        URL.revokeObjectURL(pdfDataUrl);
      }
    };
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* PDF Preview — uses generated blob URL in iframe for mobile compatibility */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col" style={{ minHeight: "500px" }}>
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
          <Eye className="h-4 w-4 text-gray-400" />
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            PDF Document Preview / पूर्वावलोकन
          </h3>
        </div>

        <div className="flex-1 w-full rounded border border-gray-100 overflow-hidden bg-gray-50 relative" style={{ minHeight: "450px" }}>
          {generating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
              <Loader className="h-8 w-8 text-gray-400 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Generating preview...</p>
            </div>
          )}

          {pdfError && !generating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 gap-3 px-6 text-center">
              <p className="text-sm text-gray-600 font-medium">
                Preview could not be generated on this device.
              </p>
              <p className="text-xs text-gray-400">
                Please use the Download PDF button above to view the certificate.
              </p>
              <button
                onClick={generatePdfPreview}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Preview
              </button>
            </div>
          )}

          {pdfDataUrl && !generating && !pdfError && (
            <iframe
              src={pdfDataUrl}
              title="TC PDF Preview"
              width="100%"
              height="100%"
              style={{ border: "none", minHeight: "450px" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
