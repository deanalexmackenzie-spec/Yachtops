import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Worklist, WorklistSection, WorklistJob, Department, Profile } from '../types';

export function useWorklist(vesselId: string | undefined, department: Department | undefined, date: string) {
  const [worklist, setWorklist] = useState<Worklist | null>(null);
  const [sections, setSections] = useState<WorklistSection[]>([]);
  const [jobs, setJobs] = useState<WorklistJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!vesselId || !department) return;

    const { data: wl } = await supabase
      .from('worklists')
      .select('*')
      .eq('vessel_id', vesselId)
      .eq('department', department)
      .eq('date', date)
      .single();

    setWorklist(wl ?? null);

    if (wl) {
      const [{ data: secs }, { data: jbs }] = await Promise.all([
        supabase
          .from('worklist_sections')
          .select('*')
          .eq('worklist_id', wl.id)
          .order('position'),
        supabase
          .from('worklist_jobs')
          .select('*, assignee:profiles!worklist_jobs_assignee_id_fkey(*), completed_by_profile:profiles!worklist_jobs_completed_by_fkey(*)')
          .eq('worklist_id', wl.id)
          .order('position'),
      ]);
      setSections(secs ?? []);
      setJobs((jbs ?? []) as WorklistJob[]);
    } else {
      setSections([]);
      setJobs([]);
    }
    setLoading(false);
  }, [vesselId, department, date]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Real-time subscription
  useEffect(() => {
    if (!worklist?.id) return;

    const channel = supabase
      .channel(`worklist-${worklist.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worklist_jobs', filter: `worklist_id=eq.${worklist.id}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worklist_sections', filter: `worklist_id=eq.${worklist.id}` }, fetchAll)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'worklists', filter: `id=eq.${worklist.id}` }, fetchAll)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [worklist?.id, fetchAll]);

  async function createWorklist(vesselId: string, department: Department, createdBy: string) {
    const { data } = await supabase
      .from('worklists')
      .insert({ vessel_id: vesselId, department, date, created_by: createdBy })
      .select()
      .single();
    if (data) setWorklist(data);
    return data;
  }

  async function updateMorningNote(note: string) {
    if (!worklist) return;
    await supabase.from('worklists').update({ morning_note: note }).eq('id', worklist.id);
    setWorklist({ ...worklist, morning_note: note });
  }

  async function publishWorklist(publishedBy: string) {
    if (!worklist) return;
    const now = new Date().toISOString();
    await supabase.from('worklists').update({ published_at: now, published_by: publishedBy }).eq('id', worklist.id);
    setWorklist({ ...worklist, published_at: now, published_by: publishedBy });
  }

  async function addSection(label: string) {
    if (!worklist) return;
    const position = sections.length;
    const { data } = await supabase
      .from('worklist_sections')
      .insert({ worklist_id: worklist.id, label, position })
      .select()
      .single();
    if (data) setSections(prev => [...prev, data]);
    return data;
  }

  async function addJob(params: {
    sectionId: string | null;
    title: string;
    notes?: string;
    assigneeId?: string | null;
    isPriority?: boolean;
    photoRequired?: boolean;
    sopReference?: string;
  }) {
    if (!worklist) return;
    const sectionJobs = jobs.filter(j => j.section_id === params.sectionId);
    const position = sectionJobs.length;
    const { data } = await supabase
      .from('worklist_jobs')
      .insert({
        worklist_id: worklist.id,
        section_id: params.sectionId,
        title: params.title,
        notes: params.notes ?? null,
        assignee_id: params.assigneeId ?? null,
        is_priority: params.isPriority ?? false,
        photo_required: params.photoRequired ?? false,
        sop_reference: params.sopReference ?? null,
        position,
      })
      .select('*, assignee:profiles!worklist_jobs_assignee_id_fkey(*)')
      .single();
    if (data) setJobs(prev => [...prev, data as WorklistJob]);
    return data;
  }

  async function togglePriority(jobId: string) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    const newVal = !job.is_priority;
    await supabase.from('worklist_jobs').update({ is_priority: newVal }).eq('id', jobId);
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, is_priority: newVal } : j));
  }

  async function completeJob(jobId: string, completedBy: string, note?: string) {
    const now = new Date().toISOString();
    await supabase.from('worklist_jobs').update({
      completed_at: now,
      completed_by: completedBy,
      completed_note: note ?? null,
    }).eq('id', jobId);
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, completed_at: now, completed_by: completedBy, completed_note: note ?? null } : j
    ));
  }

  const stats = {
    total: jobs.length,
    done: jobs.filter(j => j.completed_at).length,
    inProgress: jobs.filter(j => !j.completed_at && j.assignee_id).length,
  };

  return {
    worklist, sections, jobs, loading, stats,
    createWorklist, updateMorningNote, publishWorklist,
    addSection, addJob, togglePriority, completeJob,
    refresh: fetchAll,
  };
}
