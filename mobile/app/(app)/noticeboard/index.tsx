import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { COLORS } from '../../../lib/constants';
import { Notice, NoticePriority } from '../../../types';

const PRIORITY_CONFIG: Record<NoticePriority, { label: string; color: string; bg: string; icon: string }> = {
  info:     { label: 'Info',     color: COLORS.accent,  bg: COLORS.accentSoft, icon: 'information-circle' },
  heads_up: { label: 'Heads up', color: COLORS.warn,    bg: COLORS.warnSoft,   icon: 'warning' },
  urgent:   { label: 'Urgent',   color: COLORS.alert,   bg: COLORS.alertSoft,  icon: 'alert-circle' },
};

function NoticeCard({ notice, currentUserId, onRead }: { notice: Notice; currentUserId: string; onRead: (id: string) => void }) {
  const cfg = PRIORITY_CONFIG[notice.priority];
  const isRead = notice.notice_reads?.some(r => r.user_id === currentUserId);
  const readCount = notice.notice_reads?.length ?? 0;

  useEffect(() => {
    if (!isRead) onRead(notice.id);
  }, []);

  return (
    <View style={[card.wrap, !isRead && card.unread]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={[card.iconWrap, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={[card.pill, { backgroundColor: cfg.bg }]}>
              <Text style={[card.pillText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            {notice.author && (
              <Text style={card.author}>{notice.author.role} · {notice.author.full_name.split(' ')[0]}</Text>
            )}
          </View>
          <Text style={card.title}>{notice.title}</Text>
          <Text style={card.body}>{notice.body}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={card.time}>
              {new Date(notice.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {new Date(notice.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </Text>
            <Text style={card.reads}>{readCount} {readCount === 1 ? 'read' : 'reads'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function PostNoticeModal({ vesselId, authorId, onPost, onClose }: { vesselId: string; authorId: string; onPost: () => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<NoticePriority>('info');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    await supabase.from('notices').insert({ vessel_id: vesselId, author_id: authorId, title: title.trim(), body: body.trim(), priority });
    setSaving(false);
    onPost();
    onClose();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={post.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={post.sheet}>
          <Text style={post.heading}>Post a notice</Text>
          <Text style={post.sub}>Goes to all crew on this vessel.</Text>

          <Text style={post.label}>Priority</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(Object.keys(PRIORITY_CONFIG) as NoticePriority[]).map(p => {
              const cfg = PRIORITY_CONFIG[p];
              return (
                <TouchableOpacity
                  key={p}
                  style={[post.priorityBtn, priority === p && { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                  onPress={() => setPriority(p)}
                >
                  <Ionicons name={cfg.icon as any} size={14} color={priority === p ? cfg.color : COLORS.inkMute} />
                  <Text style={[post.priorityText, priority === p && { color: cfg.color }]}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={post.label}>Title</Text>
          <TextInput style={post.input} value={title} onChangeText={setTitle} placeholder="e.g. Owner aboard from 14:00 Friday" autoFocus />

          <Text style={post.label}>Body</Text>
          <TextInput style={[post.input, { minHeight: 80, textAlignVertical: 'top' }]} value={body} onChangeText={setBody} placeholder="Full notice text..." multiline />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <TouchableOpacity style={post.cancelBtn} onPress={onClose}>
              <Text style={post.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[post.postBtn, (!title.trim() || !body.trim()) && { opacity: 0.4 }]} onPress={submit} disabled={saving || !title.trim() || !body.trim()}>
              {saving ? <ActivityIndicator size="small" color="white" /> : <Text style={post.postText}>Post notice</Text>}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function NoticeBoardScreen() {
  const { profile } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPost, setShowPost] = useState(false);

  async function load() {
    if (!profile?.vessel_id) return;
    const { data } = await supabase
      .from('notices')
      .select('*, author:profiles!notices_author_id_fkey(*), notice_reads(*)')
      .eq('vessel_id', profile.vessel_id)
      .order('created_at', { ascending: false });
    setNotices((data ?? []) as Notice[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile?.vessel_id]);

  useEffect(() => {
    if (!profile?.vessel_id) return;
    const channel = supabase
      .channel('notices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices', filter: `vessel_id=eq.${profile.vessel_id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notice_reads' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.vessel_id]);

  async function markRead(noticeId: string) {
    if (!profile?.id) return;
    await supabase.from('notice_reads').upsert({ notice_id: noticeId, user_id: profile.id, read_at: new Date().toISOString() }, { onConflict: 'notice_id,user_id' });
  }

  if (!profile) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
      {/* Header */}
      <View style={hdr.wrap}>
        <View>
          <Text style={hdr.title}>Notice Board</Text>
          <Text style={hdr.sub}>Officers' broadcast channel</Text>
        </View>
        {profile.is_officer && (
          <TouchableOpacity style={hdr.postBtn} onPress={() => setShowPost(true)}>
            <Ionicons name="add" size={16} color="white" />
            <Text style={hdr.postText}>Post notice</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      )}

      {!loading && notices.length === 0 && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="megaphone-outline" size={36} color={COLORS.inkMute} />
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: COLORS.inkSoft, marginTop: 12 }}>No notices yet</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.inkMute, textAlign: 'center', marginTop: 6 }}>Officers post announcements here.</Text>
        </View>
      )}

      {!loading && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}>
          {notices.map(n => (
            <NoticeCard key={n.id} notice={n} currentUserId={profile.id} onRead={markRead} />
          ))}
        </ScrollView>
      )}

      {showPost && (
        <PostNoticeModal
          vesselId={profile.vessel_id}
          authorId={profile.id}
          onPost={load}
          onClose={() => setShowPost(false)}
        />
      )}
    </SafeAreaView>
  );
}

const hdr = StyleSheet.create({
  wrap: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.rule, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 12, color: COLORS.inkMute, marginTop: 2, fontFamily: 'Inter_400Regular' },
  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  postText: { fontSize: 13, fontWeight: '700', color: 'white', fontFamily: 'Inter_700Bold' },
});

const card = StyleSheet.create({
  wrap: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.rule },
  unread: { borderColor: COLORS.accent + '40', backgroundColor: COLORS.accentSoft },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  pillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: 'Inter_700Bold' },
  author: { fontSize: 11, color: COLORS.inkMute, fontFamily: 'Inter_400Regular' },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 6, fontFamily: 'Inter_700Bold' },
  body: { fontSize: 13, color: COLORS.inkSoft, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  time: { fontSize: 11, color: COLORS.inkMute, fontFamily: 'JetBrainsMono_400Regular' },
  reads: { fontSize: 11, color: COLORS.inkMute, fontFamily: 'Inter_400Regular' },
});

const post = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 32 },
  heading: { fontSize: 18, fontWeight: '700', color: COLORS.ink, marginBottom: 4, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 13, color: COLORS.inkMute, marginBottom: 20, fontFamily: 'Inter_400Regular' },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.inkMute, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, fontFamily: 'Inter_700Bold' },
  input: { borderWidth: 1, borderColor: COLORS.ruleStrong, borderRadius: 8, padding: 12, fontSize: 14, color: COLORS.ink, marginBottom: 16, fontFamily: 'Inter_400Regular' },
  priorityBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.rule },
  priorityText: { fontSize: 12, fontWeight: '600', color: COLORS.inkMute, fontFamily: 'Inter_600SemiBold' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 9, borderWidth: 1, borderColor: COLORS.ruleStrong, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: COLORS.inkSoft, fontFamily: 'Inter_600SemiBold' },
  postBtn: { flex: 2, paddingVertical: 12, borderRadius: 9, backgroundColor: COLORS.accent, alignItems: 'center' },
  postText: { fontSize: 14, fontWeight: '700', color: 'white', fontFamily: 'Inter_700Bold' },
});
