import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReminders } from '../../hooks/useReminders';
import { COLORS } from '../../lib/constants';
import { Reminder } from '../../types';

type Scope = 'personal' | 'officers';

interface Props {
  authorId: string;
  vesselId: string;
  isOfficer: boolean;
  onAddToWorklist: (text: string) => void;
}

function ReminderItem({
  item,
  isShared,
  currentUserId,
  onDelete,
  onAddToWorklist,
}: {
  item: Reminder & { author?: { full_name: string; initials: string; color: string } };
  isShared: boolean;
  currentUserId: string;
  onDelete: () => void;
  onAddToWorklist: () => void;
}) {
  const dotColor = isShared ? '#b45309' : COLORS.inkMute;
  const isOwn = item.author_id === currentUserId;

  return (
    <View style={s.item}>
      <View style={[s.dot, { backgroundColor: dotColor }]} />

      <Text style={s.itemText} numberOfLines={2}>
        {item.body}
        {isShared && item.author && !isOwn && (
          <Text style={s.itemAuthor}>{' · '}{item.author.full_name.split(' ')[0]}</Text>
        )}
        {isShared && isOwn && (
          <Text style={s.itemAuthor}>{' · you'}</Text>
        )}
      </Text>

      <TouchableOpacity style={s.addBtn} onPress={onAddToWorklist} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
        <Ionicons name="arrow-forward" size={10} color={COLORS.accent} />
        <Text style={s.addBtnText}>Add to worklist</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={15} color={COLORS.inkMute} />
      </TouchableOpacity>
    </View>
  );
}

export default function NotesPane({ authorId, vesselId, isOfficer, onAddToWorklist }: Props) {
  const [scope, setScope] = useState<Scope>('personal');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const { personal, shared, loading, addReminder, deleteReminder } = useReminders(authorId, vesselId);

  const items = scope === 'personal' ? personal : shared;

  async function handleSave() {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    await addReminder(text, scope === 'officers');
    setDraft('');
    setSaving(false);
    inputRef.current?.focus();
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete reminder?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteReminder(id, scope === 'officers') },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>My reminders</Text>
          <Text style={s.headerSub}>Jot jobs as they come up, add any to the worklist when ready</Text>
        </View>

        {/* Personal / Officers toggle */}
        <View style={s.toggle}>
          <TouchableOpacity
            style={[s.toggleBtn, scope === 'personal' && s.toggleBtnActive]}
            onPress={() => setScope('personal')}
          >
            <Ionicons name="lock-closed" size={10} color={scope === 'personal' ? COLORS.ink : COLORS.inkMute} />
            <Text style={[s.toggleText, scope === 'personal' && s.toggleTextActive]}>Personal</Text>
          </TouchableOpacity>

          {isOfficer && (
            <TouchableOpacity
              style={[s.toggleBtn, scope === 'officers' && s.toggleBtnActive]}
              onPress={() => setScope('officers')}
            >
              <Ionicons name="people" size={10} color={scope === 'officers' ? COLORS.ink : COLORS.inkMute} />
              <Text style={[s.toggleText, scope === 'officers' && s.toggleTextActive]}>Officers</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick-add row */}
      <View style={s.addRow}>
        <Ionicons name="add" size={14} color={COLORS.inkMute} />
        <TextInput
          ref={inputRef}
          style={s.addInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a reminder and press Save…"
          placeholderTextColor={COLORS.inkMute}
          returnKeyType="done"
          onSubmitEditing={handleSave}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[s.saveBtn, (!draft.trim() || saving) && { opacity: 0.4 }]}
          onPress={handleSave}
          disabled={!draft.trim() || saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="white" />
            : <Text style={s.saveBtnText}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={{ padding: 32, alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      ) : (
        <>
          <Text style={s.listLabel}>
            {scope === 'personal' ? 'Saved reminders · personal' : 'Saved reminders · officers'}
          </Text>

          {items.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="bookmark-outline" size={28} color={COLORS.inkMute} />
              <Text style={s.emptyText}>No {scope === 'personal' ? 'personal' : 'officers\''} reminders yet.</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={r => r.id}
              renderItem={({ item }) => (
                <ReminderItem
                  item={item as any}
                  isShared={scope === 'officers'}
                  currentUserId={authorId}
                  onDelete={() => handleDelete(item.id)}
                  onAddToWorklist={() => onAddToWorklist(item.body)}
                />
              )}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 8 }}
              scrollEnabled={false}
            />
          )}

          {/* Footer hint */}
          <View style={s.foot}>
            <Ionicons
              name={scope === 'personal' ? 'lock-closed' : 'people'}
              size={11}
              color={COLORS.inkMute}
            />
            <Text style={s.footText}>
              {scope === 'personal'
                ? 'Only you can see Personal reminders. Adding to the worklist shares that job with the crew.'
                : 'Officers on this vessel can see and add to this list.'}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
    fontFamily: 'Inter_700Bold',
  },
  headerSub: {
    fontSize: 11,
    color: COLORS.inkMute,
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
    lineHeight: 15,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.rule,
    borderRadius: 8,
    padding: 2,
    flexShrink: 0,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.surface2,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.inkMute,
    fontFamily: 'Inter_600SemiBold',
  },
  toggleTextActive: {
    color: COLORS.ink,
  },

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.ruleStrong,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  addInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.ink,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 0,
  },
  saveBtn: {
    backgroundColor: COLORS.ink,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 7,
    minWidth: 52,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
    fontFamily: 'Inter_700Bold',
  },

  listLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.inkMute,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginHorizontal: 16,
    marginBottom: 10,
    fontFamily: 'Inter_600SemiBold',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface2,
    borderRadius: 9,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  itemText: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.ink,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  itemAuthor: {
    fontSize: 11,
    color: COLORS.inkMute,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: '#bae6fd',
    flexShrink: 0,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    fontFamily: 'Inter_700Bold',
  },

  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.inkMute,
    fontFamily: 'Inter_400Regular',
  },

  foot: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 4,
  },
  footText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.inkMute,
    fontFamily: 'Inter_400Regular',
    lineHeight: 15,
  },
});
