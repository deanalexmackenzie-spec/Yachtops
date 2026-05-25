import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { COLORS } from '../../../lib/constants';
import { useAuth } from '../../../hooks/useAuth';
import { useWatch, WatchSlot } from '../../../hooks/useWatch';
import { Profile } from '../../../types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const WATCH_TIMES = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];

const SLOT_COLORS = [
  '#0c4a6e', '#166534', '#92400e', '#6d28d9',
  '#be185d', '#0f766e', '#b45309', '#1e3a8a',
];

function getCrewColor(profile: Profile, index: number): string {
  return profile.color ?? SLOT_COLORS[index % SLOT_COLORS.length];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isoWeekDates(offset = 0): string[] {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function fmtDay(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return { dow: d.toLocaleDateString('en-GB', { weekday: 'short' }), day: d.getDate() };
}

function fmtTime(t: string) {
  return t.slice(0, 5);
}

function isToday(iso: string) {
  return iso === new Date().toISOString().split('T')[0];
}

// ─── Add-slot modal ────────────────────────────────────────────────────────────

function AddSlotModal({
  crew,
  defaultDate,
  onClose,
  onSave,
}: {
  crew: Profile[];
  defaultDate: string;
  onClose: () => void;
  onSave: (params: { assigneeId: string; date: string; startTime: string; endTime: string; notes: string }) => Promise<void>;
}) {
  const [assigneeId, setAssigneeId] = useState(crew[0]?.id ?? '');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('04:00');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!assigneeId) { Alert.alert('Select a crew member'); return; }
    setSaving(true);
    await onSave({ assigneeId, date, startTime: startTime + ':00', endTime: endTime + ':00', notes });
    setSaving(false);
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={am.overlay}>
        <View style={am.sheet}>
          <Text style={am.heading}>Add watch slot</Text>

          <Text style={am.label}>Date</Text>
          <TextInput
            style={am.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />

          <Text style={am.label}>Crew member</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={am.crewScroll}>
            {crew.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[am.crewBtn, assigneeId === c.id && { borderColor: c.color, backgroundColor: c.color + '18' }]}
                onPress={() => setAssigneeId(c.id)}
              >
                <View style={[am.avatar, { backgroundColor: c.color }]}>
                  <Text style={am.avatarTxt}>{c.initials}</Text>
                </View>
                <Text style={[am.crewName, assigneeId === c.id && { color: c.color }]}>
                  {c.full_name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={am.row}>
            <View style={{ flex: 1 }}>
              <Text style={am.label}>Start</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {WATCH_TIMES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[am.timePill, startTime === t && am.timePillActive]}
                    onPress={() => setStartTime(t)}
                  >
                    <Text style={[am.timeTxt, startTime === t && am.timeTxtActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={am.row}>
            <View style={{ flex: 1 }}>
              <Text style={am.label}>End</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {WATCH_TIMES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[am.timePill, endTime === t && am.timePillActive]}
                    onPress={() => setEndTime(t)}
                  >
                    <Text style={[am.timeTxt, endTime === t && am.timeTxtActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <Text style={am.label}>Notes (optional)</Text>
          <TextInput style={am.input} value={notes} onChangeText={setNotes} placeholder="e.g. Underway, anchor watch" />

          <View style={am.btnRow}>
            <TouchableOpacity style={am.cancelBtn} onPress={onClose}>
              <Text style={am.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={am.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={am.saveTxt}>Add slot</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const am = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 4, paddingBottom: 36 },
  heading: { fontSize: 16, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.inkMute, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 10, marginBottom: 6, fontFamily: 'Inter_700Bold' },
  input: { borderWidth: 1, borderColor: COLORS.ruleStrong, borderRadius: 8, padding: 11, fontSize: 14, color: COLORS.ink, fontFamily: 'Inter_400Regular' },
  crewScroll: { maxHeight: 90 },
  crewBtn: { alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.rule, marginRight: 8, width: 72 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 11, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  crewName: { fontSize: 11, fontWeight: '600', color: COLORS.inkSoft, fontFamily: 'Inter_600SemiBold' },
  row: { flexDirection: 'row', gap: 10 },
  timePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.surface2, marginRight: 6 },
  timePillActive: { backgroundColor: COLORS.ink },
  timeTxt: { fontSize: 12, fontFamily: 'JetBrainsMono_400Regular', color: COLORS.inkSoft },
  timeTxtActive: { color: '#fff' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.rule, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelTxt: { fontSize: 14, color: COLORS.inkSoft, fontFamily: 'Inter_400Regular' },
  saveBtn: { flex: 2, backgroundColor: COLORS.ink, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveTxt: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
});

// ─── Day column ────────────────────────────────────────────────────────────────

function DayColumn({
  date,
  slots,
  crew,
  isOfficer,
  onAdd,
  onDelete,
}: {
  date: string;
  slots: WatchSlot[];
  crew: Profile[];
  isOfficer: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const { dow, day } = fmtDay(date);
  const today = isToday(date);

  return (
    <View style={dc.col}>
      {/* Day header */}
      <View style={[dc.dayHead, today && dc.dayHeadToday]}>
        <Text style={[dc.dow, today && dc.dowToday]}>{dow}</Text>
        <Text style={[dc.dayNum, today && dc.dayNumToday]}>{day}</Text>
      </View>

      {/* Slots */}
      {slots.length === 0 ? (
        <View style={dc.empty}>
          <Text style={dc.emptyTxt}>—</Text>
        </View>
      ) : (
        slots.map(slot => {
          const crewIdx = crew.findIndex(c => c.id === slot.assignee_id);
          const color = slot.assignee ? getCrewColor(slot.assignee, crewIdx) : COLORS.inkMute;
          return (
            <TouchableOpacity
              key={slot.id}
              style={[dc.slot, { borderLeftColor: color }]}
              onLongPress={() => isOfficer && Alert.alert(
                slot.assignee?.full_name ?? 'Slot',
                `${fmtTime(slot.start_time)} – ${fmtTime(slot.end_time)}${slot.notes ? '\n' + slot.notes : ''}`,
                [
                  { text: 'Close', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => onDelete(slot.id) },
                ]
              )}
            >
              <View style={[dc.dot, { backgroundColor: color }]} />
              <View style={dc.slotText}>
                <Text style={dc.slotName} numberOfLines={1}>
                  {slot.assignee?.full_name.split(' ')[0] ?? '—'}
                </Text>
                <Text style={dc.slotTime}>
                  {fmtTime(slot.start_time)}–{fmtTime(slot.end_time)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {isOfficer && (
        <TouchableOpacity style={dc.addBtn} onPress={onAdd}>
          <Ionicons name="add" size={14} color={COLORS.inkMute} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const dc = StyleSheet.create({
  col: { width: 110, borderRightWidth: 1, borderRightColor: COLORS.rule, paddingBottom: 8 },
  dayHead: { paddingVertical: 10, alignItems: 'center', backgroundColor: COLORS.surface2, borderBottomWidth: 1, borderBottomColor: COLORS.rule },
  dayHeadToday: { backgroundColor: COLORS.ink },
  dow: { fontSize: 11, fontWeight: '700', color: COLORS.inkMute, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  dowToday: { color: 'rgba(255,255,255,0.7)' },
  dayNum: { fontSize: 18, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold' },
  dayNumToday: { color: '#fff' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 16 },
  emptyTxt: { fontSize: 18, color: COLORS.rule },
  slot: {
    marginHorizontal: 6, marginTop: 6, padding: 8, borderRadius: 6,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.rule,
    borderLeftWidth: 3, flexDirection: 'row', alignItems: 'flex-start', gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 4, flexShrink: 0 },
  slotText: { flex: 1 },
  slotName: { fontSize: 12, fontWeight: '600', color: COLORS.ink, fontFamily: 'Inter_600SemiBold' },
  slotTime: { fontSize: 10, color: COLORS.inkMute, fontFamily: 'JetBrainsMono_400Regular', marginTop: 2 },
  addBtn: { marginHorizontal: 6, marginTop: 6, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.ruleStrong, borderRadius: 6 },
});

// ─── Roster list (mobile-friendly alternative to grid) ────────────────────────

function RosterList({
  slots,
  crew,
  isOfficer,
  onDelete,
}: {
  slots: WatchSlot[];
  crew: Profile[];
  isOfficer: boolean;
  onDelete: (id: string) => void;
}) {
  if (slots.length === 0) return (
    <View style={{ alignItems: 'center', paddingTop: 48, gap: 8 }}>
      <Ionicons name="time-outline" size={36} color={COLORS.inkMute} />
      <Text style={{ fontSize: 14, color: COLORS.inkMute, fontFamily: 'Inter_400Regular' }}>No watch slots this week</Text>
    </View>
  );

  // Group by date
  const byDate: Record<string, WatchSlot[]> = {};
  for (const s of slots) {
    byDate[s.date] = [...(byDate[s.date] ?? []), s];
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
      {Object.entries(byDate).map(([date, daySlots]) => {
        const { dow, day } = fmtDay(date);
        const today = isToday(date);
        return (
          <View key={date}>
            <View style={[rl.dateHead, today && { backgroundColor: COLORS.ink }]}>
              <Text style={[rl.dateTxt, today && { color: '#fff' }]}>{dow} {day}</Text>
              {today && <Text style={rl.todayPill}>Today</Text>}
            </View>
            {daySlots.map(slot => {
              const crewIdx = crew.findIndex(c => c.id === slot.assignee_id);
              const color = slot.assignee ? getCrewColor(slot.assignee, crewIdx) : COLORS.inkMute;
              return (
                <View key={slot.id} style={[rl.slot, { borderLeftColor: color }]}>
                  <View style={[rl.avatar, { backgroundColor: color }]}>
                    <Text style={rl.avatarTxt}>{slot.assignee?.initials ?? '?'}</Text>
                  </View>
                  <View style={rl.slotBody}>
                    <Text style={rl.slotName}>{slot.assignee?.full_name ?? 'Unknown'}</Text>
                    <Text style={rl.slotTime}>{fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}</Text>
                    {slot.notes && <Text style={rl.slotNote}>{slot.notes}</Text>}
                  </View>
                  {isOfficer && (
                    <TouchableOpacity onPress={() => Alert.alert('Delete slot', 'Remove this watch slot?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => onDelete(slot.id) },
                    ])}>
                      <Ionicons name="trash-outline" size={16} color={COLORS.inkMute} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const rl = StyleSheet.create({
  dateHead: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.surface2, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dateTxt: { fontSize: 13, fontWeight: '700', color: COLORS.inkSoft, fontFamily: 'Inter_700Bold' },
  todayPill: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_700Bold' },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.rule, borderLeftWidth: 3, marginBottom: 6 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt: { fontSize: 11, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  slotBody: { flex: 1 },
  slotName: { fontSize: 14, fontWeight: '600', color: COLORS.ink, fontFamily: 'Inter_600SemiBold' },
  slotTime: { fontSize: 12, color: COLORS.inkMute, fontFamily: 'JetBrainsMono_400Regular', marginTop: 1 },
  slotNote: { fontSize: 12, color: COLORS.inkSoft, fontFamily: 'Inter_400Regular', marginTop: 2 },
});

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function WatchScreen() {
  const { profile } = useAuth();
  const isOfficer = profile?.is_officer ?? false;
  const { slots, crew, loading, fetchSlots, fetchCrew, addSlot, deleteSlot } = useWatch(profile?.vessel_id);

  const [weekOffset, setWeekOffset] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [addDefaultDate, setAddDefaultDate] = useState('');

  const weekDates = isoWeekDates(weekOffset);
  const fromDate = weekDates[0];
  const toDate = weekDates[6];

  useEffect(() => {
    fetchCrew();
  }, []);

  useEffect(() => {
    fetchSlots(fromDate, toDate);
  }, [weekOffset]);

  function openAdd(date?: string) {
    setAddDefaultDate(date ?? weekDates[0]);
    setShowAdd(true);
  }

  const weekLabel = (() => {
    const from = new Date(fromDate + 'T00:00:00');
    const to = new Date(toDate + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${from.toLocaleDateString('en-GB', opts)} – ${to.toLocaleDateString('en-GB', opts)}`;
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.title}>Watch Roster</Text>
            <Text style={s.sub}>Who's on · by day</Text>
          </View>
          {isOfficer && (
            <TouchableOpacity style={s.addBtn} onPress={() => openAdd()}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.addBtnTxt}>Add slot</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Week navigation */}
        <View style={s.weekNav}>
          <TouchableOpacity style={s.navBtn} onPress={() => setWeekOffset(w => w - 1)}>
            <Ionicons name="chevron-back" size={18} color={COLORS.inkSoft} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setWeekOffset(0)}>
            <Text style={s.weekLabel}>{weekLabel}{weekOffset === 0 ? ' · This week' : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.navBtn} onPress={() => setWeekOffset(w => w + 1)}>
            <Ionicons name="chevron-forward" size={18} color={COLORS.inkSoft} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={COLORS.accent} /></View>
      ) : (
        <>
          {/* Horizontal scrolling day grid */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.gridScroll}
            contentContainerStyle={s.grid}
          >
            {weekDates.map(date => (
              <DayColumn
                key={date}
                date={date}
                slots={slots.filter(s => s.date === date)}
                crew={crew}
                isOfficer={isOfficer}
                onAdd={() => openAdd(date)}
                onDelete={deleteSlot}
              />
            ))}
          </ScrollView>

          {/* Roster list below grid */}
          <View style={s.listSection}>
            <Text style={s.listHeading}>WEEK SUMMARY</Text>
            <RosterList
              slots={slots}
              crew={crew}
              isOfficer={isOfficer}
              onDelete={deleteSlot}
            />
          </View>
        </>
      )}

      {showAdd && (
        <AddSlotModal
          crew={crew}
          defaultDate={addDefaultDate}
          onClose={() => setShowAdd(false)}
          onSave={async (params) => {
            await addSlot({ ...params, createdBy: profile?.id ?? '' });
            setShowAdd(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.rule, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, gap: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 12, color: COLORS.inkMute, marginTop: 2, fontFamily: 'Inter_400Regular' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.ink, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { padding: 4 },
  weekLabel: { fontSize: 13, fontWeight: '600', color: COLORS.inkSoft, fontFamily: 'Inter_600SemiBold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gridScroll: { maxHeight: 260, borderBottomWidth: 1, borderBottomColor: COLORS.rule },
  grid: { flexDirection: 'row' },
  listSection: { flex: 1 },
  listHeading: { fontSize: 11, fontWeight: '700', color: COLORS.inkMute, fontFamily: 'Inter_700Bold', letterSpacing: 0.7, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
});
