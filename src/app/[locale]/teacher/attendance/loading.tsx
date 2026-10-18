export default function Loading() {
  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full animate-pulse">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-md bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 w-52 bg-gray-200 rounded" />
          <div className="h-3 w-40 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg border border-gray-200" />
        ))}
      </div>
    </main>
  );
}
