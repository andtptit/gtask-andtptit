import type { Task } from "@/lib/types";

export default function LabelChips({ task }: { task: Task }) {
  const labels = (task.task_labels || [])
    .map((tl) => tl.label)
    .filter((l): l is NonNullable<typeof l> => !!l);
  if (labels.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {labels.map((l) => (
        <span
          key={l.id}
          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
          style={{ backgroundColor: l.color }}
        >
          {l.name}
        </span>
      ))}
    </span>
  );
}
