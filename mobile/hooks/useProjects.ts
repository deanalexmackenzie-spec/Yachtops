import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Project, ProjectTask, ProjectStatus, Department } from '../types';

export function useProjects(vesselId: string | undefined) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProjects = useCallback(async (statusFilter?: ProjectStatus) => {
    if (!vesselId) return;
    setLoading(true);
    let q = supabase
      .from('projects')
      .select('*')
      .eq('vessel_id', vesselId)
      .order('created_at', { ascending: false });
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data } = await q;
    setProjects((data ?? []) as Project[]);
    setLoading(false);
  }, [vesselId]);

  const fetchTasks = useCallback(async (projectId: string): Promise<ProjectTask[]> => {
    const { data } = await supabase
      .from('project_tasks')
      .select('*, assignee:profiles!project_tasks_assignee_id_fkey(*)')
      .eq('project_id', projectId)
      .order('position');
    return (data ?? []) as ProjectTask[];
  }, []);

  const createProject = useCallback(async (params: {
    title: string;
    description?: string;
    department?: Department | null;
    priority?: Project['priority'];
    dueDate?: string | null;
    createdBy: string;
  }): Promise<Project | null> => {
    if (!vesselId) return null;
    const { data } = await supabase
      .from('projects')
      .insert({
        vessel_id: vesselId,
        title: params.title,
        description: params.description ?? null,
        department: params.department ?? null,
        priority: params.priority ?? 'medium',
        status: 'planning',
        due_date: params.dueDate ?? null,
        created_by: params.createdBy,
      })
      .select()
      .single();
    if (data) setProjects(prev => [data as Project, ...prev]);
    return data as Project | null;
  }, [vesselId]);

  const updateProject = useCallback(async (id: string, updates: Partial<Pick<Project,
    'title' | 'description' | 'department' | 'priority' | 'status' | 'due_date'
  >>) => {
    const { data } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (data) setProjects(prev => prev.map(p => p.id === id ? data as Project : p));
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    await supabase.from('projects').delete().eq('id', id);
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  const addTask = useCallback(async (params: {
    projectId: string;
    title: string;
    notes?: string;
    assigneeId?: string | null;
    dueDate?: string | null;
    position: number;
    createdBy: string;
  }): Promise<ProjectTask | null> => {
    const { data } = await supabase
      .from('project_tasks')
      .insert({
        project_id: params.projectId,
        title: params.title,
        notes: params.notes ?? null,
        assignee_id: params.assigneeId ?? null,
        due_date: params.dueDate ?? null,
        position: params.position,
        created_by: params.createdBy,
      })
      .select('*, assignee:profiles!project_tasks_assignee_id_fkey(*)')
      .single();
    return data as ProjectTask | null;
  }, []);

  const updateTaskStatus = useCallback(async (taskId: string, status: ProjectTask['status']) => {
    await supabase
      .from('project_tasks')
      .update({
        status,
        completed_at: status === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', taskId);
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    await supabase.from('project_tasks').delete().eq('id', taskId);
  }, []);

  return {
    projects, loading,
    fetchProjects, fetchTasks,
    createProject, updateProject, deleteProject,
    addTask, updateTaskStatus, deleteTask,
  };
}
