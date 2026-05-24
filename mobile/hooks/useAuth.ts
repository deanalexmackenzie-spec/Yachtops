import { useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, Department } from '../types';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  }

  async function signUp(
    email: string,
    password: string,
    details: {
      full_name: string;
      role: string;
      initials: string;
      department: Department;
      is_officer: boolean;
      color: string;
      vessel_id: string;
    }
  ) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) return error;
    await supabase.from('profiles').insert({ id: data.user.id, ...details });
    return null;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { session, profile, loading, signIn, signUp, signOut };
}
