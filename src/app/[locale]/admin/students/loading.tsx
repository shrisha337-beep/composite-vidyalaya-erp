export default function Loading() {
  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-3 w-32 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-32 bg-gray-200 rounded" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded border border-gray-200" />
        ))}
      </div>
    </main>
  );
}
