import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CalendarEvent } from '../types';

export function useCalendarEvents(vesselId: string | undefined, year: number, month: number) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vesselId) return;
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('vessel_id', vesselId)
      .gte('date', from)
      .lte('date', to)
      .order('date');

    setEvents((data ?? []) as CalendarEvent[]);
    setLoading(false);
  }, [vesselId, year, month]);

  useEffect(() => { load(); }, [load]);

  async function addEvent(params: {
    title: string;
    date: string;
    type: CalendarEvent['type'];
    notes?: string;
    createdBy: string;
  }) {
    if (!vesselId) return;
    const { data } = await supabase
      .from('calendar_events')
      .insert({ vessel_id: vesselId, ...params, created_by: params.createdBy })
      .select()
      .single();
    if (data) setEvents(prev => [...prev, data as CalendarEvent].sort((a, b) => a.date.localeCompare(b.date)));
    return data;
  }

  async function deleteEvent(id: string) {
    await supabase.from('calendar_events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
  }

  return { events, loading, addEvent, deleteEvent, refresh: load };
}
