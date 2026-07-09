import {
  BoardSkeleton,
  ChipsSkeleton,
  PageHeaderSkeleton,
} from "@/components/Skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <PageHeaderSkeleton />
        <ChipsSkeleton count={4} />
      </div>
      <BoardSkeleton />
    </div>
  );
}
