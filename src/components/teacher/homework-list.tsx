"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteHomeworkAction } from "@/app/actions/homework";
import { BookOpen, FileDown, Trash2, Calendar, Loader } from "lucide-react";

interface HomeworkItem {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  assignedDate: Date;
  dueDate: Date;
  subject: {
    name: string;
    class: { name: string };
  };
}

export function TeacherHomeworkList({
  locale,
  homework,
}: {
  locale: string;
  homework: HomeworkItem[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this homework?")) return;

    setErrorMsg("");
    setLoadingId(id);
    try {
      const res = await deleteHomeworkAction({ homeworkId: id, locale });
      if (res.success) {
        router.refresh();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg("Failed to delete homework.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded-md">
          {errorMsg}
        </div>
      )}

      {homework.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
          <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">No homework assigned yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Click Assign Homework to distribute work to your classes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {homework.map((hw) => {
            const isDeleting = loadingId === hw.id;
            return (
              <div
                key={hw.id}
                className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-gray-50 pb-2 mb-3">
                    <span className="text-xs px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-semibold">
                      Class {hw.subject.class.name} — {hw.subject.name}
                    </span>
                    <button
                      onClick={() => handleDelete(hw.id)}
                      disabled={isDeleting}
                      className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Delete assignment"
                    >
                      {isDeleting ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-gray-800 mb-1.5">{hw.title}</h3>
                  {hw.description && (
                    <p className="text-xs text-gray-500 leading-relaxed mb-4 whitespace-pre-line">
                      {hw.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-50 text-[11px] text-gray-400 mt-auto">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due: {new Date(hw.dueDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>

                  {hw.fileUrl && (
                    <a
                      href={hw.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Attachment
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
