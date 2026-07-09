export function TaskCardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-4 w-14 rounded-full" />
      </div>
      <div className="mt-3 flex gap-2">
        <div className="skeleton h-3 w-16 rounded-full" />
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-3 w-24" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return <div className="skeleton h-7 w-48" />;
}

export function ChipsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton h-7 w-20 rounded-full" />
      ))}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, col) => (
        <div key={col} className="rounded-xl border border-gray-200 bg-gray-100/60 p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-4 w-6 rounded-full" />
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 - (col % 2) }).map((_, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="skeleton h-4 w-3/4" />
                <div className="mt-2 flex gap-2">
                  <div className="skeleton h-3 w-12 rounded-full" />
                  <div className="skeleton h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="bg-gray-50 px-4 py-2.5">
        <div className="skeleton h-3 w-1/3" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-gray-100 px-4 py-3">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-4 w-16" />
          <div className="skeleton h-4 w-16" />
          <div className="skeleton h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={`h${i}`} className="bg-gray-50 px-2 py-2">
          <div className="skeleton mx-auto h-3 w-6" />
        </div>
      ))}
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="min-h-[96px] bg-white p-1.5">
          <div className="skeleton ml-auto h-3 w-5" />
          {i % 3 === 0 && <div className="skeleton mt-2 h-4 w-full" />}
          {i % 5 === 0 && <div className="skeleton mt-1 h-4 w-4/5" />}
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="card">
        <div className="flex justify-between gap-2">
          <div className="skeleton h-6 w-1/2" />
          <div className="flex gap-2">
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="skeleton h-5 w-16 rounded-full" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton mb-1 h-3 w-14" />
              <div className="skeleton h-4 w-20" />
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton mt-2 h-4 w-2/3" />
        </div>
        <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
          <div className="skeleton h-8 w-28 rounded-lg" />
          <div className="skeleton h-8 w-24 rounded-lg" />
        </div>
      </div>
      <div className="card">
        <div className="skeleton h-4 w-32" />
        <div className="mt-3 flex flex-col gap-2">
          <div className="skeleton h-14 w-full" />
          <div className="skeleton h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
