import { PageHeaderSkeleton, TableSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeaderSkeleton />
      <TableSkeleton rows={3} />
      <TableSkeleton rows={5} />
      <div className="card">
        <div className="flex items-end gap-4" style={{ height: 180 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="skeleton w-2/3"
                style={{ height: `${30 + ((i * 23) % 60)}%` }}
              />
              <div className="skeleton h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
