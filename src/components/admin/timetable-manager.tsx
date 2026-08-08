"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTimetableSlotAction, deleteTimetableSlotAction } from "@/app/actions/timetable";
import { Calendar, Trash2, Plus, Loader, CheckCircle2, AlertCircle } from "lucide-react";

interface SubjectOption {
  id: string;
  name: string;
}

interface TeacherOption {
  id: string;
  fullName: string;
}

interface TimetableSlotItem {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: { name: string };
  teacher: { fullName: string };
}

const DAYS_OF_WEEK = [
  { val: 1, label: "Monday / सोमवार" },
  { val: 2, label: "Tuesday / मंगलवार" },
  { val: 3, label: "Wednesday / बुधवार" },
  { val: 4, label: "Thursday / गुरुवार" },
  { val: 5, label: "Friday / शुक्रवार" },
  { val: 6, label: "Saturday / शनिवार" },
];

export function TimetableManager({
  locale,
  classes,
  subjects,
  teachers,
  selectedClass,
  sectionId,
  slots,
}: {
  locale: string;
  classes: string[];
  subjects: SubjectOption[];
  teachers: TeacherOption[];
  selectedClass: string;
  sectionId: string;
  slots: TimetableSlotItem[];
}) {
  const router = useRouter();

  // Form State
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:45");

  const [loading, setLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  function handleClassChange(val: string) {
    router.push(`/${locale}/admin/timetable?class=${val}`);
  }

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!sectionId || !subjectId || !teacherId) {
      setErrorMsg("All fields are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await createTimetableSlotAction({
        sectionId,
        subjectId,
        teacherId,
        dayOfWeek,
        startTime,
        endTime,
        locale,
      });

      if (res.success) {
        setSuccessMsg(res.message);
        router.refresh();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg("Failed to add timetable slot.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSlot(id: string) {
    if (!confirm("Are you sure you want to remove this timetable slot?")) return;

    setErrorMsg("");
    setSuccessMsg("");
    setDeleteLoadingId(id);

    try {
      const res = await deleteTimetableSlotAction({ slotId: id, locale });
      if (res.success) {
        setSuccessMsg(res.message);
        router.refresh();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg("Failed to delete slot.");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  // Group slots by day
  const slotsByDay: Record<number, TimetableSlotItem[]> = {};
  DAYS_OF_WEEK.forEach((d) => {
    slotsByDay[d.val] = slots
      .filter((s) => s.dayOfWeek === d.val)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Class Selector Dropdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Select Class to Setup Timetable / कक्षा चुनें
        </label>
        <div className="max-w-xs">
          <select
            value={selectedClass}
            onChange={(e) => handleClassChange(e.target.value)}
            className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
          >
            <option value="">Select Class</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedClass && sectionId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roster timetable slots list */}
          <div className="lg:col-span-2 space-y-4">
            {DAYS_OF_WEEK.map((d) => {
              const daySlots = slotsByDay[d.val] || [];
              return (
                <div key={d.val} className="bg-white border border-gray-200 rounded-lg p-5">
                  <h3 className="text-sm font-bold text-gray-800 border-b border-gray-50 pb-2 mb-3">
                    {d.label}
                  </h3>

                  {daySlots.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No periods scheduled / कोई कालांश निर्धारित नहीं है</p>
                  ) : (
                    <div className="space-y-2">
                      {daySlots.map((slot) => {
                        const isDeleting = deleteLoadingId === slot.id;
                        return (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-100 hover:bg-gray-100/50 transition-colors text-xs"
                          >
                            <div>
                              <span className="font-bold text-gray-700">
                                {slot.startTime} - {slot.endTime}
                              </span>
                              <span className="mx-2 text-gray-300">|</span>
                              <span className="font-medium text-blue-700">{slot.subject.name}</span>
                              <span className="mx-2 text-gray-300">|</span>
                              <span className="text-gray-500">Tr. {slot.teacher.fullName}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              disabled={isDeleting}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <Loader className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add period form */}
          <div>
            <div className="bg-white border border-gray-200 rounded-lg p-5 sticky top-24">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 mb-4 flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-green-600" />
                Add Period / कालांश जोड़ें
              </h3>

              <form onSubmit={handleAddSlot} className="space-y-4 text-xs">
                {/* Weekday */}
                <div>
                  <label className="block text-gray-500 mb-1">Weekday / वार</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none bg-white"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.val} value={d.val}>
                        {d.label.split(" / ")[0]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-gray-500 mb-1">Subject / विषय</label>
                  <select
                    value={subjectId}
                    required
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none bg-white"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Teacher */}
                <div>
                  <label className="block text-gray-500 mb-1">Teacher / शिक्षक</label>
                  <select
                    value={teacherId}
                    required
                    onChange={(e) => setTeacherId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none bg-white"
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start & End Times */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-500 mb-1">Start Time / प्रारंभ</label>
                    <input
                      type="time"
                      value={startTime}
                      required
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">End Time / समाप्ति</label>
                    <input
                      type="time"
                      value={endTime}
                      required
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none bg-white"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-white font-medium rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  {loading && <Loader className="h-3.5 w-3.5 animate-spin" />}
                  Save Slot / सुरक्षित करें
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
