import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface SOP {
  id: string;
  vessel_id: string;
  department: string | null;
  category: string | null;
  title: string;
  content: string;
  ref_code: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useSOPs(vesselId: string | undefined) {
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSOPs = useCallback(async (dept?: string | null, search?: string) => {
    if (!vesselId) return;
    setLoading(true);

    let q = supabase
      .from('sops')
      .select('*')
      .eq('vessel_id', vesselId)
      .order('department', { ascending: true })
      .order('title', { ascending: true });

    if (dept) q = q.eq('department', dept);
    if (search?.trim()) q = q.ilike('title', `%${search.trim()}%`);

    const { data } = await q;
    setSOPs((data ?? []) as SOP[]);
    setLoading(false);
  }, [vesselId]);

  const createSOP = useCallback(async (params: {
    title: string;
    content: string;
    department?: string;
    category?: string;
    ref_code?: string;
    created_by: string;
  }) => {
    if (!vesselId) return null;
    const { data } = await supabase
      .from('sops')
      .insert({ vessel_id: vesselId, ...params })
      .select()
      .single();
    if (data) setSOPs(prev => [data as SOP, ...prev]);
    return data as SOP | null;
  }, [vesselId]);

  const updateSOP = useCallback(async (id: string, params: {
    title?: string;
    content?: string;
    department?: string;
    category?: string;
    ref_code?: string;
  }) => {
    const { data } = await supabase
      .from('sops')
      .update({ ...params, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (data) setSOPs(prev => prev.map(s => s.id === id ? data as SOP : s));
    return data as SOP | null;
  }, []);

  const deleteSOP = useCallback(async (id: string) => {
    await supabase.from('sops').delete().eq('id', id);
    setSOPs(prev => prev.filter(s => s.id !== id));
  }, []);

  return { sops, loading, fetchSOPs, createSOP, updateSOP, deleteSOP };
}
