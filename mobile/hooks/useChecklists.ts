import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';

export type ChecklistFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface ChecklistStep {
  id: string;
  checklist_id: string;
  section_id: string | null;
  text: string;
  hint: string | null;
  requires_photo: boolean;
  position: number;
  result?: {
    id: string;
    checked_at: string | null;
    checked_by: string | null;
    issue_note: string | null;
    has_issue: boolean;
  } | null;
}

export interface ChecklistSection {
  id: string;
  title: string;
  position: number;
  steps: ChecklistStep[];
}

export interface ChecklistRun {
  id: string;
  checklist_id: string;
  vessel_id: string;
  started_by: string;
  started_at: string;
  period_date: string;
  completed_at: string | null;
  completed_by: string | null;
  has_issue: boolean;
}

export interface ChecklistWithRun {
  id: string;
  title: string;
  department: string | null;
  frequency: ChecklistFrequency;
  run: ChecklistRun | null;
  totalSteps: number;
  doneSteps: number;
}

export interface FolderStat {
  frequency: ChecklistFrequency;
  total: number;
  done: number;
}

function getPeriodDate(frequency: ChecklistFrequency): string {
  const now = new Date();
  if (frequency === 'daily') {
    return now.toISOString().split('T')[0];
  }
  if (frequency === 'weekly') {
    const d = new Date(now);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  }
  if (frequency === 'monthly') {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }
  // quarterly
  const y = now.getFullYear();
  const q = Math.floor(now.getMonth() / 3);
  const firstMonth = String(q * 3 + 1).padStart(2, '0');
  return `${y}-${firstMonth}-01`;
}

export function useChecklists(vesselId: string | undefined, profileId: string | undefined) {
  const [folderStats, setFolderStats] = useState<FolderStat[]>([]);
  const [groupChecklists, setGroupChecklists] = useState<ChecklistWithRun[]>([]);
  const [activeRun, setActiveRun] = useState<ChecklistRun | null>(null);
  const [activeSections, setActiveSections] = useState<ChecklistSection[]>([]);
  const [activeTitle, setActiveTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchFolderStats = useCallback(async () => {
    if (!vesselId) return;
    setLoading(true);
    const freqs: ChecklistFrequency[] = ['daily', 'weekly', 'monthly', 'quarterly'];
    const stats: FolderStat[] = [];

    for (const freq of freqs) {
      const period = getPeriodDate(freq);
      const { data: cls } = await supabase
        .from('checklists')
        .select('id')
        .eq('vessel_id', vesselId)
        .eq('frequency', freq);

      const ids = (cls ?? []).map((c: any) => c.id);
      let done = 0;
      if (ids.length > 0) {
        const { data: runs } = await supabase
          .from('checklist_runs')
          .select('id')
          .eq('vessel_id', vesselId)
          .in('checklist_id', ids)
          .eq('period_date', period)
          .not('completed_at', 'is', null);
        done = (runs ?? []).length;
      }
      stats.push({ frequency: freq, total: ids.length, done });
    }
    setFolderStats(stats);
    setLoading(false);
  }, [vesselId]);

  const fetchGroupChecklists = useCallback(async (frequency: ChecklistFrequency) => {
    if (!vesselId) return;
    setLoading(true);
    const period = getPeriodDate(frequency);

    const { data: cls } = await supabase
      .from('checklists')
      .select('id, title, department, frequency')
      .eq('vessel_id', vesselId)
      .eq('frequency', frequency)
      .order('title');

    const ids = (cls ?? []).map((c: any) => c.id);
    let runsMap: Record<string, ChecklistRun> = {};
    let stepCountMap: Record<string, number> = {};
    let doneCountMap: Record<string, number> = {};

    if (ids.length > 0) {
      const { data: runs } = await supabase
        .from('checklist_runs')
        .select('*')
        .in('checklist_id', ids)
        .eq('period_date', period);
      for (const r of runs ?? []) {
        runsMap[r.checklist_id] = r;
      }

      const runIds = Object.values(runsMap).map((r) => r.id);
      const { data: steps } = await supabase
        .from('checklist_steps')
        .select('id, checklist_id')
        .in('checklist_id', ids);
      for (const s of steps ?? []) {
        stepCountMap[s.checklist_id] = (stepCountMap[s.checklist_id] ?? 0) + 1;
      }

      if (runIds.length > 0) {
        const { data: results } = await supabase
          .from('checklist_step_results')
          .select('id, run_id, checked_at')
          .in('run_id', runIds)
          .not('checked_at', 'is', null);
        const runToChecklist: Record<string, string> = {};
        for (const r of Object.values(runsMap)) {
          runToChecklist[r.id] = r.checklist_id;
        }
        for (const res of results ?? []) {
          const clId = runToChecklist[res.run_id];
          if (clId) doneCountMap[clId] = (doneCountMap[clId] ?? 0) + 1;
        }
      }
    }

    const list: ChecklistWithRun[] = (cls ?? []).map((c: any) => ({
      id: c.id,
      title: c.title,
      department: c.department,
      frequency: c.frequency,
      run: runsMap[c.id] ?? null,
      totalSteps: stepCountMap[c.id] ?? 0,
      doneSteps: doneCountMap[c.id] ?? 0,
    }));

    setGroupChecklists(list);
    setLoading(false);
  }, [vesselId]);

  const openChecklist = useCallback(async (checklist: ChecklistWithRun) => {
    if (!vesselId || !profileId) return;
    setLoading(true);

    const period = getPeriodDate(checklist.frequency);

    // get or create run
    let run = checklist.run;
    if (!run) {
      const { data: newRun } = await supabase
        .from('checklist_runs')
        .insert({
          checklist_id: checklist.id,
          vessel_id: vesselId,
          started_by: profileId,
          period_date: period,
        })
        .select()
        .single();
      run = newRun;
    }

    if (!run) { setLoading(false); return; }

    // fetch sections
    const { data: sections } = await supabase
      .from('checklist_sections')
      .select('*')
      .eq('checklist_id', checklist.id)
      .order('position');

    // fetch steps
    const { data: steps } = await supabase
      .from('checklist_steps')
      .select('*')
      .eq('checklist_id', checklist.id)
      .order('position');

    // fetch results for this run
    const { data: results } = await supabase
      .from('checklist_step_results')
      .select('*')
      .eq('run_id', run.id);

    const resultMap: Record<string, any> = {};
    for (const r of results ?? []) {
      resultMap[r.step_id] = r;
    }

    const stepList: ChecklistStep[] = (steps ?? []).map((s: any) => ({
      ...s,
      result: resultMap[s.id] ?? null,
    }));

    const sectionList: ChecklistSection[] = (sections ?? []).map((sec: any) => ({
      id: sec.id,
      title: sec.title,
      position: sec.position,
      steps: stepList.filter((s) => s.section_id === sec.id),
    }));

    // steps without a section
    const unsectioned = stepList.filter((s) => s.section_id === null);
    if (unsectioned.length > 0) {
      sectionList.unshift({ id: '__unsectioned', title: '', position: -1, steps: unsectioned });
    }

    setActiveRun(run);
    setActiveSections(sectionList.sort((a, b) => a.position - b.position));
    setActiveTitle(checklist.title);
    setLoading(false);
    return run;
  }, [vesselId, profileId]);

  const tickStep = useCallback(async (runId: string, stepId: string, profileId: string) => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('checklist_step_results')
      .upsert(
        { run_id: runId, step_id: stepId, checked_at: now, checked_by: profileId, has_issue: false },
        { onConflict: 'run_id,step_id' }
      )
      .select()
      .single();

    setActiveSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        steps: sec.steps.map((s) =>
          s.id === stepId ? { ...s, result: data } : s
        ),
      }))
    );
    return data;
  }, []);

  const untickStep = useCallback(async (runId: string, stepId: string) => {
    await supabase
      .from('checklist_step_results')
      .update({ checked_at: null, checked_by: null })
      .eq('run_id', runId)
      .eq('step_id', stepId);

    setActiveSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        steps: sec.steps.map((s) =>
          s.id === stepId ? { ...s, result: s.result ? { ...s.result, checked_at: null, checked_by: null } : null } : s
        ),
      }))
    );
  }, []);

  const flagStep = useCallback(async (runId: string, stepId: string, note: string, profileId: string) => {
    const { data } = await supabase
      .from('checklist_step_results')
      .upsert(
        { run_id: runId, step_id: stepId, has_issue: true, issue_note: note, checked_at: new Date().toISOString(), checked_by: profileId },
        { onConflict: 'run_id,step_id' }
      )
      .select()
      .single();

    // mark the run as having an issue
    await supabase.from('checklist_runs').update({ has_issue: true }).eq('id', runId);

    setActiveSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        steps: sec.steps.map((s) =>
          s.id === stepId ? { ...s, result: data } : s
        ),
      }))
    );
    if (activeRun) setActiveRun({ ...activeRun, has_issue: true });
    return data;
  }, [activeRun]);

  const completeRun = useCallback(async (runId: string, profileId: string) => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('checklist_runs')
      .update({ completed_at: now, completed_by: profileId })
      .eq('id', runId)
      .select()
      .single();
    if (data) setActiveRun(data);
    return data;
  }, []);

  const closeRun = useCallback(() => {
    setActiveRun(null);
    setActiveSections([]);
    setActiveTitle('');
  }, []);

  return {
    folderStats,
    groupChecklists,
    activeRun,
    activeSections,
    activeTitle,
    loading,
    fetchFolderStats,
    fetchGroupChecklists,
    openChecklist,
    tickStep,
    untickStep,
    flagStep,
    completeRun,
    closeRun,
    getPeriodDate,
  };
}
