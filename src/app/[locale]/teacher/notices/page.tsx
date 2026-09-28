import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Bell, Paperclip, AlertTriangle, Download } from "lucide-react";

export default async function TeacherNoticesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireRole(["TEACHER"]);
  const { locale } = await params;

  // Fetch notices targeted at ALL or TEACHERS
  const notices = await prisma.notice.findMany({
    where: {
      audience: { in: ["ALL", "TEACHERS"] },
    },
    orderBy: { postedAt: "desc" },
    take: 50,
    include: {
      attachments: true,
    },
  });

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/teacher/dashboard`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            सूचनाएं / Notices
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Announcements from the administration
          </p>
        </div>
      </div>

      {/* Notices List */}
      <div className="space-y-4">
        {notices.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <Bell className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              No notices posted yet. Check back later.
            </p>
          </div>
        ) : (
          notices.map((n) => (
            <div
              key={n.id}
              className={`bg-white border rounded-lg p-5 ${
                n.isEmergency
                  ? "border-red-200 bg-red-50/30"
                  : "border-gray-200"
              }`}
            >
              {/* Title Row */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {n.isEmergency && (
                    <span className="shrink-0 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Urgent / आवश्यक
                    </span>
                  )}
                  <h3 className="text-sm font-bold text-gray-800">{n.title}</h3>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(n.postedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Body */}
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {n.body}
              </p>

              {/* Attachments */}
              {n.attachments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    Attachments ({n.attachments.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {n.attachments.map((att) => {
                      const isImage = att.fileType.startsWith("image/");
                      return (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          <Download className="h-3 w-3" />
                          {att.fileName}
                          <span className="text-blue-400 text-[10px]">
                            ({(att.fileSize / 1024).toFixed(0)} KB)
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
