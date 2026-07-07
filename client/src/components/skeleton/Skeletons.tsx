export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />;
}

export function PageSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-3">
          {Array.from({ length: Math.min(lines, 3) }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg bg-white ring-1 ring-slate-200" />
          ))}
        </div>
        {Array.from({ length: Math.max(0, lines - 3) }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <Skeleton className="mb-3 h-24 w-full" />
          <Skeleton className="mb-2 h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-72 w-full rounded-lg bg-white ring-1 ring-slate-200" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
