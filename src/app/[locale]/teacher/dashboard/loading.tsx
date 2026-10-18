export default function Loading() {
  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full animate-pulse">
      <div className="space-y-2 mb-6">
        <div className="h-6 w-44 bg-gray-200 rounded" />
        <div className="h-3 w-36 bg-gray-100 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg border border-gray-200" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-lg border border-gray-200" />
        ))}
      </div>
    </main>
  );
}
