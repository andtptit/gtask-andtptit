import {
  CalendarSkeleton,
  ChipsSkeleton,
  PageHeaderSkeleton,
} from "@/components/Skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton />
      <ChipsSkeleton count={4} />
      <CalendarSkeleton />
    </div>
  );
}
