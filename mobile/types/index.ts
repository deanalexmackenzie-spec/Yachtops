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
  created_at: string;
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
