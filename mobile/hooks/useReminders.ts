import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Reminder } from '../types';

export function useReminders(authorId: string | undefined, vesselId: string | undefined) {
  const [personal, setPersonal] = useState<Reminder[]>([]);
  const [shared, setShared] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!authorId || !vesselId) return;

    const [{ data: mine }, { data: officers }] = await Promise.all([
      supabase
        .from('reminders')
        .select('*')
        .eq('author_id', authorId)
        .eq('is_shared_officers', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('reminders')
        .select('*, author:profiles!reminders_author_id_fkey(full_name,initials,color)')
        .eq('vessel_id', vesselId)
        .eq('is_shared_officers', true)
        .order('created_at', { ascending: false }),
    ]);

    setPersonal((mine ?? []) as Reminder[]);
    setShared((officers ?? []) as Reminder[]);
    setLoading(false);
  }, [authorId, vesselId]);

  useEffect(() => { load(); }, [load]);

  async function addReminder(body: string, isShared: boolean) {
    if (!authorId || !vesselId) return;
    const { data } = await supabase
      .from('reminders')
      .insert({ author_id: authorId, vessel_id: vesselId, body: body.trim(), title: body.trim(), is_shared_officers: isShared })
      .select('*, author:profiles!reminders_author_id_fkey(full_name,initials,color)')
      .single();
    if (!data) return;
    if (isShared) setShared(prev => [data as Reminder, ...prev]);
    else setPersonal(prev => [data as Reminder, ...prev]);
  }

  async function deleteReminder(id: string, isShared: boolean) {
    await supabase.from('reminders').delete().eq('id', id);
    if (isShared) setShared(prev => prev.filter(r => r.id !== id));
    else setPersonal(prev => prev.filter(r => r.id !== id));
  }

  return { personal, shared, loading, addReminder, deleteReminder };
}
