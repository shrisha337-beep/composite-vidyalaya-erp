import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { Bell, Plus, AlertTriangle } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function createNotice(formData: FormData) {
  "use server";
  const session = await requireRole(["ADMIN"]);

  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  const audience = formData.get("audience") as string;
  const isEmergency = formData.get("isEmergency") === "on";

  if (!title?.trim() || !body?.trim()) {
    return;
  }

  await prisma.notice.create({
    data: {
      title: title.trim(),
      body: body.trim(),
      audience: audience as any,
      isEmergency,
      postedById: session.user.id,
    },
  });

  const locale = formData.get("locale") as string;
  revalidatePath(`/${locale}/admin/notifications`);
  redirect(`/${locale}/admin/notifications`);
}

export default async function AdminNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale } = await params;

  const notices = await prisma.notice.findMany({
    orderBy: { postedAt: "desc" },
    take: 50,
  });

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Notices / सूचनाएं
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Post announcements for teachers and staff.
          </p>
        </div>
      </div>

      {/* New Notice Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Post New Notice
        </h2>
        <form action={createNotice} className="space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Title
            </label>
            <input
              name="title"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
              placeholder="Notice title…"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Body
            </label>
            <textarea
              name="body"
              required
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent resize-y"
              placeholder="Notice body…"
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Audience
              </label>
              <select
                name="audience"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              >
                <option value="ALL">All</option>
                <option value="TEACHERS">Teachers only</option>
                <option value="STUDENTS">Students (for records)</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                name="isEmergency"
                className="rounded border-gray-300"
              />
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              Mark as urgent
            </label>
            <button
              type="submit"
              className="ml-auto px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
              style={{ background: "hsl(var(--primary))" }}
            >
              Post Notice
            </button>
          </div>
        </form>
      </div>

      {/* Notice List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Bell className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">
            Posted Notices ({notices.length})
          </h2>
        </div>

        {notices.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">
            No notices posted yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {notices.map((n) => (
              <li key={n.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {n.isEmergency && (
                        <span className="shrink-0 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                          Urgent
                        </span>
                      )}
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {n.title}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {n.body}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs text-gray-400 capitalize block">
                      {n.audience.toLowerCase().replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-400 block mt-0.5">
                      {new Date(n.postedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
