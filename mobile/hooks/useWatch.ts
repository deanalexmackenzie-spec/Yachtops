import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

export interface WatchSlot {
  id: string;
  vessel_id: string;
  assignee_id: string;
  assignee?: Profile;
  date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export function useWatch(vesselId: string | undefined) {
  const [slots, setSlots] = useState<WatchSlot[]>([]);
  const [crew, setCrew] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCrew = useCallback(async () => {
    if (!vesselId) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('vessel_id', vesselId)
      .order('full_name');
    setCrew((data ?? []) as Profile[]);
  }, [vesselId]);

  const fetchSlots = useCallback(async (fromDate: string, toDate: string) => {
    if (!vesselId) return;
    setLoading(true);

    const { data } = await supabase
      .from('watch_slots')
      .select('*, assignee:profiles!watch_slots_assignee_id_fkey(*)')
      .eq('vessel_id', vesselId)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date')
      .order('start_time');

    setSlots((data ?? []) as WatchSlot[]);
    setLoading(false);
  }, [vesselId]);

  const addSlot = useCallback(async (params: {
    assigneeId: string;
    date: string;
    startTime: string;
    endTime: string;
    notes?: string;
    createdBy: string;
  }) => {
    if (!vesselId) return null;
    const { data } = await supabase
      .from('watch_slots')
      .insert({
        vessel_id: vesselId,
        assignee_id: params.assigneeId,
        date: params.date,
        start_time: params.startTime,
        end_time: params.endTime,
        notes: params.notes ?? null,
        created_by: params.createdBy,
      })
      .select('*, assignee:profiles!watch_slots_assignee_id_fkey(*)')
      .single();
    if (data) setSlots(prev => [...prev, data as WatchSlot].sort((a, b) =>
      a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)
    ));
    return data as WatchSlot | null;
  }, [vesselId]);

  const deleteSlot = useCallback(async (id: string) => {
    await supabase.from('watch_slots').delete().eq('id', id);
    setSlots(prev => prev.filter(s => s.id !== id));
  }, []);

  return { slots, crew, loading, fetchSlots, fetchCrew, addSlot, deleteSlot };
}
