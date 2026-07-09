export const TASK_SELECT = `*,
  assignee:profiles!tasks_assignee_id_fkey(id,name),
  assigner:profiles!tasks_assigner_id_fkey(id,name),
  team:teams(id,name),
  task_labels(label:labels(id,name,color))`;
