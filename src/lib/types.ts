export interface Profile {
  id: string;
  email: string;
  name: string;
  title: string | null;
  role: "admin" | "manager" | "member";
  is_active: boolean;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  is_leader: boolean;
  profile?: Profile;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  team_id: string | null;
  assigner_id: string;
  assignee_id: string;
  parent_task_id: string | null;
  status: string;
  priority: string;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee?: { id: string; name: string } | null;
  assigner?: { id: string; name: string } | null;
  team?: { id: string; name: string } | null;
  task_labels?: { label: Label | null }[];
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: { id: string; name: string } | null;
}

export interface Attachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  size: number;
  uploaded_by: string;
  created_at: string;
  uploader?: { id: string; name: string } | null;
}

export interface Notification {
  id: string;
  user_id: string;
  task_id: string | null;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
}
