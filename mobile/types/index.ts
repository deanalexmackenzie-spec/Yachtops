export type Department = 'deck' | 'interior' | 'engine' | 'galley' | 'bridge' | 'eto';
export type NoticePriority = 'info' | 'heads_up' | 'urgent';

export interface Vessel {
  id: string;
  name: string;
  join_code: string;
  flag?: string;
}

export interface Profile {
  id: string;
  vessel_id: string;
  full_name: string;
  role: string;
  initials: string;
  department: Department;
  is_officer: boolean;
  color: string;
  push_token: string | null;
  created_at: string;
}

export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectStatus   = 'planning' | 'active' | 'on_hold' | 'complete';
export type TaskStatus      = 'todo' | 'in_progress' | 'done';

export interface Project {
  id: string;
  vessel_id: string;
  title: string;
  description: string | null;
  department: Department | null;
  priority: ProjectPriority;
  status: ProjectStatus;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  tasks?: ProjectTask[];
}

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  notes: string | null;
  assignee_id: string | null;
  assignee?: Profile;
  status: TaskStatus;
  due_date: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Worklist {
  id: string;
  vessel_id: string;
  department: Department;
  date: string;
  morning_note: string | null;
  published_at: string | null;
  published_by: string | null;
  created_by: string;
  created_at: string;
}

export interface WorklistSection {
  id: string;
  worklist_id: string;
  label: string;
  position: number;
}

export interface WorklistJob {
  id: string;
  worklist_id: string;
  section_id: string | null;
  title: string;
  notes: string | null;
  assignee_id: string | null;
  assignee?: Profile;
  is_priority: boolean;
  photo_required: boolean;
  sop_reference: string | null;
  position: number;
  completed_at: string | null;
  completed_by: string | null;
  completed_by_profile?: Profile;
  completed_note: string | null;
  created_at: string;
}

export interface Notice {
  id: string;
  vessel_id: string;
  author_id: string;
  author?: Profile;
  department: string | null;
  priority: NoticePriority;
  title: string;
  body: string;
  created_at: string;
  notice_reads?: NoticeRead[];
}

export interface NoticeRead {
  notice_id: string;
  user_id: string;
  read_at: string;
}

export interface Reminder {
  id: string;
  author_id: string;
  vessel_id: string;
  title: string;
  body: string;
  is_shared_officers: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  vessel_id: string;
  title: string;
  date: string;
  type: 'drill' | 'delivery' | 'owner' | 'charter' | 'survey' | 'other';
  notes: string | null;
}
