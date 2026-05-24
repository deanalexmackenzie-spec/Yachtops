import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  TextInput, StyleSheet, Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { COLORS } from '../../lib/constants';
import { CalendarEvent } from '../../types';

// ─── Event type config ────────────────────────────────────────────────────────
type EventType = CalendarEvent['type'];

const EVENT_CONFIG: Record<EventType, { label: string; color: string; bg: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  owner:    { label: 'Owner',    color: '#92400e', bg: '#fef3c7', icon: 'diamond'        },
  charter:  { label: 'Charter',  color: '#be185d', bg: '#fce7f3', icon: 'people'         },
  drill:    { label: 'Drill',    color: '#b91c1c', bg: '#fef2f2', icon: 'flame'          },
  delivery: { label: 'Delivery', color: '#15803d', bg: '#f0fdf4', icon: 'cube'           },
  survey:   { label: 'Survey',   color: '#6d28d9', bg: '#ede9fe', icon: 'clipboard'      },
  other:    { label: 'Other',    color: '#57534e', bg: '#f5f5f4', icon: 'calendar-outline'},
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function buildGrid(year: number, month: number) {
  // month is 1-based
  const firstDay = new Date(year, month - 1, 1);
  const lastDay  = new Date(year, month, 0);
  // Monday = 0 … Sunday = 6
  const startDow = (firstDay.getDay() + 6) % 7;

  const cells: { date: string; day: number; currentMonth: boolean; isWeekend: boolean }[] = [];

  // Pad from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, -i);
    cells.push({ date: fmtDate(d), day: d.getDate(), currentMonth: false, isWeekend: isWknd(d) });
  }
  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dt = new Date(year, month - 1, d);
    cells.push({ date: fmtDate(dt), day: d, currentMonth: true, isWeekend: isWknd(dt) });
  }
  // Pad to complete last row
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const dt = new Date(year, month, nextDay++);
    cells.push({ date: fmtDate(dt), day: dt.getDate(), currentMonth: false, isWeekend: isWknd(dt) });
  }
  return cells;
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isWknd(d: Date) { return d.getDay() === 0 || d.getDay() === 6; }

function todayStr() { return fmtDate(new Date()); }

// ─── Add-event modal ──────────────────────────────────────────────────────────
function AddEventModal({
  initialDate,
  onSave,
  onClose,
}: {
  initialDate: string;
  onSave: (params: { title: string; date: string; type: EventType; notes?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle]   = useState('');
  const [date, setDate]     = useState(initialDate);
  const [type, setType]     = useState<EventType>('other');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim() || !date) return;
    setSaving(true);
    await onSave({ title: title.trim(), date, type, notes: notes.trim() || undefined });
    setSaving(false);
    onClose();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={m.sheet}>
          <Text style={m.heading}>Add event</Text>

          {/* Type picker */}
          <Text style={m.label}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(Object.keys(EVENT_CONFIG) as EventType[]).map(t => {
                const cfg = EVENT_CONFIG[t];
                const sel = type === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[m.typeBtn, sel && { borderColor: cfg.color, backgroundColor: cfg.bg }]}
                    onPress={() => setType(t)}
                  >
                    <Ionicons name={cfg.icon} size={13} color={sel ? cfg.color : COLORS.inkMute} />
                    <Text style={[m.typeBtnText, sel && { color: cfg.color }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <Text style={m.label}>Title</Text>
          <TextInput style={m.input} value={title} onChangeText={setTitle} placeholder="e.g. Owner arrival 16:00" autoFocus />

          <Text style={m.label}>Date</Text>
          <TextInput style={m.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />

          <Text style={m.label}>Notes (optional)</Text>
          <TextInput style={[m.input, { minHeight: 60, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="Context, prep needed…" multiline />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
              <Text style={m.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.saveBtn, (!title.trim() || !date) && { opacity: 0.4 }]}
              onPress={submit}
              disabled={saving || !title.trim() || !date}
            >
              {saving ? <ActivityIndicator size="small" color="white" /> : <Text style={m.saveText}>Save event</Text>}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Day detail sheet ─────────────────────────────────────────────────────────
function DaySheet({
  date,
  events,
  isOfficer,
  onDelete,
  onClose,
}: {
  date: string;
  events: CalendarEvent[];
  isOfficer: boolean;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const d = new Date(date + 'T00:00:00');
  const label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={m.sheet}>
          <Text style={m.heading}>{label}</Text>
          {events.length === 0 && (
            <Text style={{ fontSize: 13, color: COLORS.inkMute, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
              No events scheduled.
            </Text>
          )}
          {events.map(ev => {
            const cfg = EVENT_CONFIG[ev.type];
            return (
              <View key={ev.id} style={[ds.row, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={15} color={cfg.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[ds.title, { color: cfg.color }]}>{ev.title}</Text>
                  {ev.notes ? <Text style={ds.notes}>{ev.notes}</Text> : null}
                </View>
                {isOfficer && (
                  <TouchableOpacity
                    onPress={() => Alert.alert('Delete event?', ev.title, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => { onDelete(ev.id); onClose(); } },
                    ])}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={14} color={COLORS.inkMute} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
          <TouchableOpacity style={[m.saveBtn, { marginTop: 16 }]} onPress={onClose}>
            <Text style={m.saveText}>Done</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  vesselId: string;
  isOfficer: boolean;
  authorId: string;
  worklistStats: { total: number; done: number };
  onBackToWorklist: () => void;
}

export default function CalendarPane({ vesselId, isOfficer, authorId, worklistStats, onBackToWorklist }: Props) {
  const today = todayStr();
  const now   = new Date();

  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showAdd,      setShowAdd]      = useState(false);
  const [addDate,      setAddDate]      = useState(today);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { events, loading, addEvent, deleteEvent } = useCalendarEvents(vesselId, year, month);

  const grid = buildGrid(year, month);

  // Map date → events for quick lookup
  const byDate: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    if (!byDate[ev.date]) byDate[ev.date] = [];
    byDate[ev.date].push(ev);
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }
  function goToday() { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }

  const { width } = Dimensions.get('window');
  const CELL_W = Math.floor(width / 7);
  const CELL_H = 64;

  const upcomingCutoff = today;
  const upcoming = events
    .filter(e => e.date >= upcomingCutoff)
    .slice(0, 8);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Worklist summary strip */}
      <View style={c.strip}>
        <Ionicons name="list" size={13} color={COLORS.accent} />
        <Text style={c.stripText}>
          <Text style={{ fontWeight: '700', fontFamily: 'Inter_700Bold' }}>Today's worklist: </Text>
          {worklistStats.done} done · {worklistStats.total - worklistStats.done} remaining
        </Text>
        <TouchableOpacity onPress={onBackToWorklist} style={{ marginLeft: 'auto' }}>
          <Text style={c.backLink}>Back →</Text>
        </TouchableOpacity>
      </View>

      {/* Month header */}
      <View style={c.monthHead}>
        <View>
          <Text style={c.eyebrow}>Look-ahead · pre-arrangements</Text>
          <Text style={c.monthTitle}>{MONTHS[month - 1]} {year}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity style={c.navBtn} onPress={prevMonth}>
            <Ionicons name="chevron-back" size={12} color={COLORS.inkSoft} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToday}>
            <Text style={c.todayBtn}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={c.navBtn} onPress={nextMonth}>
            <Ionicons name="chevron-forward" size={12} color={COLORS.inkSoft} />
          </TouchableOpacity>
          {isOfficer && (
            <TouchableOpacity
              style={c.addBtn}
              onPress={() => { setAddDate(today); setShowAdd(true); }}
            >
              <Ionicons name="add" size={12} color="white" />
              <Text style={c.addBtnText}>Add event</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Day-of-week headers */}
      <View style={c.dowRow}>
        {DOW.map(d => (
          <View key={d} style={[c.dowCell, { width: CELL_W }]}>
            <Text style={[c.dowText, (d === 'Sat' || d === 'Sun') && { color: COLORS.accent }]}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Month grid */}
      <View style={c.grid}>
        {grid.map((cell, i) => {
          const isToday    = cell.date === today;
          const isPast     = cell.date < today;
          const cellEvents = byDate[cell.date] ?? [];
          const visibleEvs = cellEvents.slice(0, 2);
          const overflow   = cellEvents.length - visibleEvs.length;

          return (
            <TouchableOpacity
              key={cell.date + i}
              style={[
                c.cell,
                { width: CELL_W, height: CELL_H },
                !cell.currentMonth && c.cellMuted,
                isPast && cell.currentMonth && c.cellPast,
                cell.isWeekend && cell.currentMonth && !isToday && c.cellWeekend,
                isToday && c.cellToday,
              ]}
              onPress={() => setSelectedDate(cell.date)}
              activeOpacity={0.7}
            >
              <Text style={[c.cellDay, isToday && c.cellDayToday, !cell.currentMonth && { color: COLORS.inkMute }]}>
                {cell.day}
              </Text>

              {/* Event dots/pills */}
              <View style={c.cellEvents}>
                {visibleEvs.map(ev => {
                  const cfg = EVENT_CONFIG[ev.type];
                  return (
                    <View key={ev.id} style={[c.eventDot, { backgroundColor: cfg.color }]} />
                  );
                })}
                {overflow > 0 && (
                  <Text style={c.overflow}>+{overflow}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Upcoming events list */}
      {upcoming.length > 0 && (
        <View style={c.upcomingWrap}>
          <Text style={c.upcomingLabel}>Upcoming</Text>
          {upcoming.map(ev => {
            const cfg = EVENT_CONFIG[ev.type];
            const d   = new Date(ev.date + 'T00:00:00');
            const dayLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            return (
              <View key={ev.id} style={c.upcomingRow}>
                <View style={[c.upcomingDot, { backgroundColor: cfg.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={c.upcomingTitle}>{ev.title}</Text>
                  {ev.notes ? <Text style={c.upcomingNotes} numberOfLines={1}>{ev.notes}</Text> : null}
                </View>
                <Text style={[c.upcomingDate, { fontFamily: 'JetBrainsMono_400Regular' }]}>{dayLabel}</Text>
              </View>
            );
          })}
        </View>
      )}

      {upcoming.length === 0 && !loading && (
        <View style={{ alignItems: 'center', padding: 32 }}>
          <Ionicons name="calendar-outline" size={32} color={COLORS.inkMute} />
          <Text style={{ fontSize: 13, color: COLORS.inkMute, marginTop: 8, fontFamily: 'Inter_400Regular' }}>
            No upcoming events this month.
          </Text>
        </View>
      )}

      {/* Add-event modal */}
      {showAdd && (
        <AddEventModal
          initialDate={addDate}
          onSave={async (params) => {
            await addEvent({ ...params, createdBy: authorId });
          }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Day detail sheet */}
      {selectedDate && (
        <DaySheet
          date={selectedDate}
          events={byDate[selectedDate] ?? []}
          isOfficer={isOfficer}
          onDelete={deleteEvent}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const c = StyleSheet.create({
  strip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, backgroundColor: COLORS.surface2,
    borderBottomWidth: 1, borderBottomColor: COLORS.rule,
  },
  stripText: { fontSize: 12, color: COLORS.inkSoft, flex: 1, fontFamily: 'Inter_400Regular' },
  backLink: { fontSize: 12, fontWeight: '600', color: COLORS.accent, fontFamily: 'Inter_600SemiBold' },

  monthHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: COLORS.rule,
  },
  eyebrow: { fontSize: 10, fontWeight: '600', color: COLORS.inkMute, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: 'Inter_600SemiBold' },
  monthTitle: { fontSize: 20, fontWeight: '800', color: COLORS.ink, letterSpacing: -0.4, fontFamily: 'Inter_800ExtraBold' },
  navBtn: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: COLORS.rule, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
  todayBtn: { fontSize: 11, fontWeight: '600', color: COLORS.inkSoft, paddingHorizontal: 6, fontFamily: 'Inter_600SemiBold' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.accent, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6 },
  addBtnText: { fontSize: 12, fontWeight: '700', color: 'white', fontFamily: 'Inter_700Bold' },

  dowRow: { flexDirection: 'row', backgroundColor: COLORS.surface2, borderBottomWidth: 1, borderBottomColor: COLORS.rule },
  dowCell: { alignItems: 'center', paddingVertical: 6 },
  dowText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.inkMute, fontFamily: 'Inter_700Bold' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: COLORS.rule, gap: 1 },
  cell: { backgroundColor: 'white', padding: 5, flexDirection: 'column' },
  cellMuted: { backgroundColor: COLORS.surface2, opacity: 0.5 },
  cellPast: { backgroundColor: '#fafaf9' },
  cellWeekend: { backgroundColor: '#fdfaf3' },
  cellToday: { backgroundColor: COLORS.ink },

  cellDay: { fontSize: 13, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold', lineHeight: 16 },
  cellDayToday: { color: 'white' },

  cellEvents: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: 3 },
  eventDot: { width: 5, height: 5, borderRadius: 3 },
  overflow: { fontSize: 8, color: COLORS.inkMute, fontFamily: 'Inter_400Regular' },

  upcomingWrap: { padding: 16 },
  upcomingLabel: { fontSize: 10, fontWeight: '600', color: COLORS.inkMute, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10, fontFamily: 'Inter_600SemiBold' },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.rule },
  upcomingDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  upcomingTitle: { fontSize: 13.5, fontWeight: '500', color: COLORS.ink, fontFamily: 'Inter_500Medium' },
  upcomingNotes: { fontSize: 11, color: COLORS.inkMute, marginTop: 1, fontFamily: 'Inter_400Regular' },
  upcomingDate: { fontSize: 11, color: COLORS.inkMute },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 32 },
  heading: { fontSize: 18, fontWeight: '700', color: COLORS.ink, marginBottom: 16, fontFamily: 'Inter_700Bold' },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.inkMute, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, fontFamily: 'Inter_700Bold' },
  input: { borderWidth: 1, borderColor: COLORS.ruleStrong, borderRadius: 8, padding: 12, fontSize: 14, color: COLORS.ink, marginBottom: 16, fontFamily: 'Inter_400Regular' },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.rule },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.inkMute, fontFamily: 'Inter_600SemiBold' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 9, borderWidth: 1, borderColor: COLORS.ruleStrong, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: COLORS.inkSoft, fontFamily: 'Inter_600SemiBold' },
  saveBtn: { flex: 2, paddingVertical: 12, borderRadius: 9, backgroundColor: COLORS.accent, alignItems: 'center' },
  saveText: { fontSize: 14, fontWeight: '700', color: 'white', fontFamily: 'Inter_700Bold' },
});

const ds = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 10, marginBottom: 8 },
  title: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  notes: { fontSize: 12, color: COLORS.inkSoft, marginTop: 2, fontFamily: 'Inter_400Regular' },
});
