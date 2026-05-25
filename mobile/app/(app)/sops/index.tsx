import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Pressable, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { COLORS, DEPT_CONFIG } from '../../../lib/constants';
import { useAuth } from '../../../hooks/useAuth';
import { useSOPs, SOP } from '../../../hooks/useSOPs';
import { Department } from '../../../types';

// ─── Department filter tabs ────────────────────────────────────────────────────

const DEPT_TABS: { key: Department | null; label: string }[] = [
  { key: null,       label: 'All' },
  { key: 'deck',     label: 'Deck' },
  { key: 'engine',   label: 'Engine' },
  { key: 'interior', label: 'Interior' },
  { key: 'galley',   label: 'Galley' },
  { key: 'bridge',   label: 'Bridge' },
];

// ─── Simple markdown renderer (bold + headers + lists) ────────────────────────

function renderContent(content: string) {
  const lines = content.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('## ')) {
      return <Text key={i} style={rd.h2}>{line.slice(3)}</Text>;
    }
    if (line.startsWith('### ')) {
      return <Text key={i} style={rd.h3}>{line.slice(4)}</Text>;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <View key={i} style={rd.bullet}>
          <Text style={rd.bulletDot}>·</Text>
          <Text style={rd.bulletText}>{renderInline(line.slice(2))}</Text>
        </View>
      );
    }
    const numMatch = line.match(/^(\d+)\. (.*)/);
    if (numMatch) {
      return (
        <View key={i} style={rd.bullet}>
          <Text style={rd.bulletNum}>{numMatch[1]}.</Text>
          <Text style={rd.bulletText}>{renderInline(numMatch[2])}</Text>
        </View>
      );
    }
    if (line.trim() === '') {
      return <View key={i} style={{ height: 8 }} />;
    }
    return <Text key={i} style={rd.body}>{renderInline(line)}</Text>;
  });
}

function renderInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <Text key={i} style={{ fontFamily: 'Inter_700Bold' }}>{part.slice(2, -2)}</Text>
      : part
  );
}

// ─── SOP detail modal ──────────────────────────────────────────────────────────

function SOPDetail({
  sop,
  isOfficer,
  onClose,
  onEdit,
  onDelete,
}: {
  sop: SOP;
  isOfficer: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const deptCfg = sop.department ? DEPT_CONFIG[sop.department as Department] : null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
        {/* Header */}
        <View style={det.header}>
          <TouchableOpacity onPress={onClose} style={det.backBtn}>
            <Ionicons name="chevron-back" size={20} color={COLORS.ink} />
            <Text style={det.backTxt}>SOPs</Text>
          </TouchableOpacity>
          {isOfficer && (
            <View style={det.actions}>
              <TouchableOpacity style={det.actionBtn} onPress={onEdit}>
                <Ionicons name="pencil-outline" size={18} color={COLORS.inkSoft} />
              </TouchableOpacity>
              <TouchableOpacity style={det.actionBtn} onPress={onDelete}>
                <Ionicons name="trash-outline" size={18} color={COLORS.alert} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={det.body}>
          {/* Meta */}
          <View style={det.meta}>
            {sop.ref_code && (
              <Text style={det.refCode}>{sop.ref_code}</Text>
            )}
            {deptCfg && (
              <View style={[det.deptPill, { backgroundColor: deptCfg.soft }]}>
                <Text style={[det.deptTxt, { color: deptCfg.color }]}>{deptCfg.label}</Text>
              </View>
            )}
            {sop.category && (
              <Text style={det.category}>{sop.category}</Text>
            )}
          </View>

          <Text style={det.title}>{sop.title}</Text>

          <Text style={det.updatedAt}>
            Updated {new Date(sop.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>

          <View style={det.divider} />

          <View style={det.content}>
            {renderContent(sop.content)}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const det = StyleSheet.create({
  header: {
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.rule,
    paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backTxt: { fontSize: 14, color: COLORS.ink, fontFamily: 'Inter_400Regular' },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 8 },
  body: { padding: 20, paddingBottom: 60 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 },
  refCode: { fontSize: 12, fontFamily: 'JetBrainsMono_400Regular', color: COLORS.inkMute, backgroundColor: COLORS.surface2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  deptPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  deptTxt: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  category: { fontSize: 12, color: COLORS.inkMute, fontFamily: 'Inter_400Regular' },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold', lineHeight: 28, marginBottom: 6 },
  updatedAt: { fontSize: 12, color: COLORS.inkMute, fontFamily: 'Inter_400Regular', marginBottom: 16 },
  divider: { height: 1, backgroundColor: COLORS.rule, marginBottom: 20 },
  content: { gap: 2 },
});

const rd = StyleSheet.create({
  h2: { fontSize: 16, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold', marginTop: 16, marginBottom: 6 },
  h3: { fontSize: 14, fontWeight: '700', color: COLORS.inkSoft, fontFamily: 'Inter_700Bold', marginTop: 12, marginBottom: 4 },
  body: { fontSize: 14, color: COLORS.ink, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  bullet: { flexDirection: 'row', gap: 8, marginVertical: 2 },
  bulletDot: { fontSize: 14, color: COLORS.inkSoft, fontFamily: 'Inter_400Regular', marginTop: 1, width: 12 },
  bulletNum: { fontSize: 13, color: COLORS.inkMute, fontFamily: 'JetBrainsMono_400Regular', marginTop: 2, width: 20 },
  bulletText: { flex: 1, fontSize: 14, color: COLORS.ink, fontFamily: 'Inter_400Regular', lineHeight: 22 },
});

// ─── Create/Edit modal ─────────────────────────────────────────────────────────

function SOPEditModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Partial<SOP>;
  onClose: () => void;
  onSave: (params: { title: string; content: string; department: string; category: string; ref_code: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [dept, setDept] = useState(initial?.department ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [refCode, setRefCode] = useState(initial?.ref_code ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) { Alert.alert('Title required'); return; }
    setSaving(true);
    await onSave({ title: title.trim(), content, department: dept.trim(), category: category.trim(), ref_code: refCode.trim().toUpperCase() });
    setSaving(false);
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
        <View style={em.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={em.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={em.heading}>{initial?.id ? 'Edit SOP' : 'New SOP'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Text style={em.save}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={em.body} keyboardShouldPersistTaps="handled">
          <Text style={em.label}>Title *</Text>
          <TextInput style={em.input} value={title} onChangeText={setTitle} placeholder="Procedure name" />

          <View style={em.row}>
            <View style={{ flex: 1 }}>
              <Text style={em.label}>Ref code</Text>
              <TextInput style={em.input} value={refCode} onChangeText={setRefCode} placeholder="DECK-001" autoCapitalize="characters" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={em.label}>Department</Text>
              <TextInput style={em.input} value={dept} onChangeText={setDept} placeholder="deck" autoCapitalize="none" />
            </View>
          </View>

          <Text style={em.label}>Category</Text>
          <TextInput style={em.input} value={category} onChangeText={setCategory} placeholder="e.g. Tender Ops, Safety" />

          <Text style={em.label}>Content (markdown supported)</Text>
          <TextInput
            style={[em.input, em.contentInput]}
            value={content}
            onChangeText={setContent}
            placeholder={"## Section\n\n1. Step one\n2. Step two"}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const em = StyleSheet.create({
  header: {
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.rule,
    paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  heading: { fontSize: 15, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold' },
  cancel: { fontSize: 14, color: COLORS.inkSoft, fontFamily: 'Inter_400Regular' },
  save: { fontSize: 14, fontWeight: '700', color: COLORS.accent, fontFamily: 'Inter_700Bold' },
  body: { padding: 16, gap: 4, paddingBottom: 60 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.inkMute, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6, marginTop: 12, fontFamily: 'Inter_700Bold' },
  input: { borderWidth: 1, borderColor: COLORS.ruleStrong, borderRadius: 8, padding: 12, fontSize: 14, color: COLORS.ink, fontFamily: 'Inter_400Regular', backgroundColor: COLORS.surface },
  row: { flexDirection: 'row', gap: 10 },
  contentInput: { minHeight: 300, lineHeight: 22 },
});

// ─── SOP list card ─────────────────────────────────────────────────────────────

function SOPCard({ sop, onPress }: { sop: SOP; onPress: () => void }) {
  const deptCfg = sop.department ? DEPT_CONFIG[sop.department as Department] : null;
  return (
    <TouchableOpacity style={sc.card} onPress={onPress} activeOpacity={0.75}>
      <View style={sc.top}>
        <View style={sc.left}>
          {sop.ref_code && <Text style={sc.ref}>{sop.ref_code}</Text>}
          <Text style={sc.title} numberOfLines={2}>{sop.title}</Text>
          {sop.category && <Text style={sc.category}>{sop.category}</Text>}
        </View>
        {deptCfg && (
          <View style={[sc.deptDot, { backgroundColor: deptCfg.color }]} />
        )}
      </View>
      <View style={sc.footer}>
        <Text style={sc.updated}>
          Updated {new Date(sop.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={COLORS.inkMute} />
      </View>
    </TouchableOpacity>
  );
}

const sc = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.rule,
    padding: 14, gap: 10,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  left: { flex: 1, gap: 3 },
  ref: { fontSize: 11, fontFamily: 'JetBrainsMono_400Regular', color: COLORS.inkMute },
  title: { fontSize: 14, fontWeight: '600', color: COLORS.ink, fontFamily: 'Inter_700Bold', lineHeight: 20 },
  category: { fontSize: 12, color: COLORS.inkMute, fontFamily: 'Inter_400Regular' },
  deptDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  updated: { fontSize: 11, color: COLORS.inkMute, fontFamily: 'Inter_400Regular' },
});

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function SOPsScreen() {
  const { profile } = useAuth();
  const isOfficer = profile?.is_officer ?? false;
  const { sops, loading, fetchSOPs, createSOP, updateSOP, deleteSOP } = useSOPs(profile?.vessel_id);

  const [deptFilter, setDeptFilter] = useState<Department | null>(null);
  const [search, setSearch] = useState('');
  const [selectedSOP, setSelectedSOP] = useState<SOP | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingSOP, setEditingSOP] = useState<SOP | null>(null);

  useEffect(() => {
    fetchSOPs(deptFilter, search);
  }, [deptFilter]);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (text.trim().length === 0 || text.trim().length >= 2) {
      fetchSOPs(deptFilter, text);
    }
  }, [deptFilter, fetchSOPs]);

  function handleDelete(sop: SOP) {
    Alert.alert('Delete SOP', `Delete "${sop.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteSOP(sop.id); setSelectedSOP(null); } },
    ]);
  }

  // Group SOPs by category within their department
  const grouped: { category: string; items: SOP[] }[] = [];
  for (const sop of sops) {
    const cat = sop.category ?? 'General';
    const existing = grouped.find(g => g.category === cat);
    if (existing) existing.items.push(sop);
    else grouped.push({ category: cat, items: [sop] });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.title}>SOPs</Text>
            <Text style={s.sub}>Standard operating procedures</Text>
          </View>
          {isOfficer && (
            <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)}>
              <Ionicons name="add" size={16} color={COLORS.surface} />
              <Text style={s.addBtnTxt}>New SOP</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search */}
        <View style={s.searchRow}>
          <Ionicons name="search-outline" size={16} color={COLORS.inkMute} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={handleSearch}
            placeholder="Search procedures…"
            placeholderTextColor={COLORS.inkMute}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.inkMute} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Department filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll} contentContainerStyle={s.tabRow}>
        {DEPT_TABS.map(t => {
          const active = deptFilter === t.key;
          const cfg = t.key ? DEPT_CONFIG[t.key] : null;
          return (
            <TouchableOpacity
              key={String(t.key)}
              style={[s.tab, active && { backgroundColor: cfg?.color ?? COLORS.ink }]}
              onPress={() => setDeptFilter(t.key)}
            >
              <Text style={[s.tabTxt, active && { color: '#fff' }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={s.center}><ActivityIndicator color={COLORS.accent} /></View>
      ) : sops.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="document-text-outline" size={40} color={COLORS.inkMute} />
          <Text style={s.emptyTxt}>
            {search ? 'No SOPs match your search' : 'No SOPs yet'}
          </Text>
          {isOfficer && !search && (
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)}>
              <Text style={s.emptyBtnTxt}>Create first SOP</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={g => g.category}
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
          renderItem={({ item: group }) => (
            <View style={{ gap: 8 }}>
              <Text style={s.groupLabel}>{group.category}</Text>
              {group.items.map(sop => (
                <SOPCard key={sop.id} sop={sop} onPress={() => setSelectedSOP(sop)} />
              ))}
            </View>
          )}
        />
      )}

      {/* Detail modal */}
      {selectedSOP && (
        <SOPDetail
          sop={selectedSOP}
          isOfficer={isOfficer}
          onClose={() => setSelectedSOP(null)}
          onEdit={() => { setEditingSOP(selectedSOP); setSelectedSOP(null); }}
          onDelete={() => handleDelete(selectedSOP)}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <SOPEditModal
          onClose={() => setShowCreate(false)}
          onSave={async (params) => {
            await createSOP({ ...params, created_by: profile?.id ?? '' });
            setShowCreate(false);
          }}
        />
      )}

      {/* Edit modal */}
      {editingSOP && (
        <SOPEditModal
          initial={editingSOP}
          onClose={() => setEditingSOP(null)}
          onSave={async (params) => {
            const updated = await updateSOP(editingSOP.id, params);
            setEditingSOP(null);
            if (updated) setSelectedSOP(updated);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.rule, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, gap: 12 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 12, color: COLORS.inkMute, marginTop: 2, fontFamily: 'Inter_400Regular' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.ink, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnTxt: { fontSize: 13, fontWeight: '700', color: COLORS.surface, fontFamily: 'Inter_700Bold' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface2, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.ink, fontFamily: 'Inter_400Regular' },
  tabScroll: { borderBottomWidth: 1, borderBottomColor: COLORS.rule, backgroundColor: COLORS.surface, maxHeight: 48 },
  tabRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: 'row', alignItems: 'center' },
  tab: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, backgroundColor: COLORS.surface2 },
  tabTxt: { fontSize: 12, fontWeight: '600', color: COLORS.inkSoft, fontFamily: 'Inter_600SemiBold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTxt: { fontSize: 14, color: COLORS.inkMute, fontFamily: 'Inter_400Regular' },
  emptyBtn: { borderWidth: 1, borderColor: COLORS.ruleStrong, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  emptyBtnTxt: { fontSize: 13, fontWeight: '600', color: COLORS.inkSoft, fontFamily: 'Inter_600SemiBold' },
  groupLabel: { fontSize: 11, fontWeight: '700', color: COLORS.inkMute, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 0.7 },
});
