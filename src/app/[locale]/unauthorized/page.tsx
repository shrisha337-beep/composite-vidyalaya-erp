export default function UnauthorizedPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground mt-2">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    </main>
  );
}
