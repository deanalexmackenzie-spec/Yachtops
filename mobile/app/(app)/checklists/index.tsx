import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { COLORS } from '../../../lib/constants';
import { useAuth } from '../../../hooks/useAuth';
import {
  useChecklists,
  ChecklistFrequency,
  ChecklistSection,
  ChecklistWithRun,
  ChecklistStep,
} from '../../../hooks/useChecklists';

// ─── Frequency config ──────────────────────────────────────────────────────────

const FREQ_CONFIG: Record<
  ChecklistFrequency,
  { label: string; plural: string; icon: string; color: string; soft: string }
> = {
  daily:     { label: 'Daily',     plural: 'Dailies',   icon: 'sunny-outline',       color: '#1d4ed8', soft: '#dbeafe' },
  weekly:    { label: 'Weekly',    plural: 'Weeklies',  icon: 'calendar-outline',    color: '#166534', soft: '#dcfce7' },
  monthly:   { label: 'Monthly',   plural: 'Monthlies', icon: 'stats-chart-outline', color: '#92400e', soft: '#fef3c7' },
  quarterly: { label: 'Quarterly', plural: 'Quarterly', icon: 'layers-outline',      color: '#6d28d9', soft: '#ede9fe' },
};

const FREQ_ORDER: ChecklistFrequency[] = ['daily', 'weekly', 'monthly', 'quarterly'];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function runStatus(item: ChecklistWithRun): 'done' | 'flagged' | 'in-progress' | 'to-start' {
  if (!item.run) return 'to-start';
  if (item.run.completed_at) return item.run.has_issue ? 'flagged' : 'done';
  if (item.doneSteps > 0) return 'in-progress';
  return 'to-start';
}

const STATUS_LABEL: Record<string, string> = {
  done: 'Done', flagged: 'Flagged', 'in-progress': 'In progress', 'to-start': 'To start',
};
const STATUS_COLOR: Record<string, string> = {
  done: COLORS.done, flagged: COLORS.warn, 'in-progress': '#0284c7', 'to-start': COLORS.inkMute,
};

// ─── FlagIssueModal ────────────────────────────────────────────────────────────

function FlagIssueModal({
  visible, onClose, onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  function submit() { onConfirm(note.trim()); setNote(''); }
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={ms.overlay} onPress={onClose}>
        <Pressable style={ms.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={ms.mTitle}>Flag an issue</Text>
          <Text style={ms.mLabel}>Describe the problem (optional)</Text>
          <TextInput
            style={ms.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. fuel gauge stuck at 60%"
            placeholderTextColor={COLORS.inkMute}
            multiline
            numberOfLines={3}
          />
          <View style={ms.mRow}>
            <TouchableOpacity style={ms.cancelBtn} onPress={onClose}>
              <Text style={ms.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ms.flagBtn} onPress={submit}>
              <Text style={ms.flagTxt}>Flag issue</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── StepRow ───────────────────────────────────────────────────────────────────

function StepRow({
  step, index, runId, profileId, isCurrent, onTick, onUntick, onFlag,
}: {
  step: ChecklistStep;
  index: number;
  runId: string;
  profileId: string;
  isCurrent: boolean;
  onTick: (stepId: string) => void;
  onUntick: (stepId: string) => void;
  onFlag: (stepId: string) => void;
}) {
  const checked = !!step.result?.checked_at;
  const hasIssue = !!step.result?.has_issue;
  const rowBg = hasIssue ? COLORS.warnSoft : isCurrent ? '#fff7ed' : COLORS.surface;
  const borderLeft = hasIssue ? COLORS.warn : isCurrent ? '#f97316' : 'transparent';

  return (
    <View style={[sr.row, { backgroundColor: rowBg, borderLeftColor: borderLeft }]}>
      <TouchableOpacity
        style={[sr.check, checked && { backgroundColor: hasIssue ? COLORS.warn : COLORS.done, borderColor: hasIssue ? COLORS.warn : COLORS.done }]}
        onPress={() => (checked ? onUntick(step.id) : onTick(step.id))}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {checked && <Ionicons name={hasIssue ? 'alert' : 'checkmark'} size={13} color="#fff" />}
      </TouchableOpacity>

      <View style={sr.body}>
        <Text style={[sr.stepNum, checked && { color: COLORS.inkMute }]}>
          {String(index + 1).padStart(2, '0')}
        </Text>
        <View style={sr.textWrap}>
          <Text style={[sr.text, checked && sr.textDone, hasIssue && { color: COLORS.warn }]}>
            {step.text}
          </Text>
          {step.hint ? <Text style={sr.hint}>{step.hint}</Text> : null}
          {hasIssue && step.result?.issue_note ? (
            <Text style={sr.issueNote}>⚠ {step.result.issue_note}</Text>
          ) : null}
          {checked && step.result?.checked_at ? (
            <Text style={sr.ts}>✓ {formatTime(step.result.checked_at)}</Text>
          ) : null}
        </View>
      </View>

      {!hasIssue && (
        <TouchableOpacity style={sr.flagBtn} onPress={() => onFlag(step.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="flag-outline" size={16} color={COLORS.inkMute} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const sr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.rule, borderLeftWidth: 3,
  },
  check: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: COLORS.ruleStrong,
    alignItems: 'center', justifyContent: 'center', marginTop: 1, marginRight: 10, flexShrink: 0,
  },
  body: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  stepNum: { fontSize: 11, fontFamily: 'JetBrainsMono_400Regular', color: COLORS.inkMute, marginRight: 8, marginTop: 2, width: 22 },
  textWrap: { flex: 1 },
  text: { fontSize: 14, color: COLORS.ink, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  textDone: { color: COLORS.inkMute, textDecorationLine: 'line-through' },
  hint: { fontSize: 11, color: COLORS.inkMute, fontFamily: 'Inter_400Regular', marginTop: 2, fontStyle: 'italic' },
  issueNote: { fontSize: 12, color: COLORS.warn, fontFamily: 'Inter_400Regular', marginTop: 4 },
  ts: { fontSize: 11, color: COLORS.inkMute, fontFamily: 'JetBrainsMono_400Regular', marginTop: 4 },
  flagBtn: { paddingLeft: 8, paddingTop: 2 },
});

// ─── RunView ───────────────────────────────────────────────────────────────────

type RowItem =
  | { type: 'section'; id: string; title: string }
  | { type: 'step'; step: ChecklistStep; globalIndex: number };

function RunView({
  title, sections, run, profileId, onTick, onUntick, onFlag, onComplete, onBack,
}: {
  title: string;
  sections: ChecklistSection[];
  run: { id: string; completed_at: string | null; has_issue: boolean };
  profileId: string;
  onTick: (runId: string, stepId: string, profileId: string) => Promise<any>;
  onUntick: (runId: string, stepId: string) => Promise<void>;
  onFlag: (runId: string, stepId: string, note: string, profileId: string) => Promise<any>;
  onComplete: (runId: string, profileId: string) => Promise<any>;
  onBack: () => void;
}) {
  const [flagTarget, setFlagTarget] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const progAnim = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();

  const allSteps = sections.flatMap((s) => s.steps);
  const totalSteps = allSteps.length;
  const doneSteps = allSteps.filter((s) => s.result?.checked_at).length;
  const pct = totalSteps > 0 ? doneSteps / totalSteps : 0;
  const firstUnchecked = allSteps.find((s) => !s.result?.checked_at);

  useEffect(() => {
    Animated.timing(progAnim, { toValue: pct, duration: 300, useNativeDriver: false }).start();
  }, [pct]);

  const barWidth = progAnim.interpolate({ inputRange: [0, 1], outputRange: [0, width - 32] });

  async function handleComplete() {
    setCompleting(true);
    await onComplete(run.id, profileId);
    setCompleting(false);
  }

  const isCompleted = !!run.completed_at;

  const rows: RowItem[] = [];
  let globalIdx = 0;
  for (const sec of sections) {
    if (sec.title) rows.push({ type: 'section', id: sec.id, title: sec.title });
    for (const step of sec.steps) rows.push({ type: 'step', step, globalIndex: globalIdx++ });
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={rv.header}>
        <TouchableOpacity onPress={onBack} style={rv.backBtn}>
          <Ionicons name="chevron-back" size={20} color={COLORS.ink} />
          <Text style={rv.backTxt}>Back</Text>
        </TouchableOpacity>
        <View style={rv.titleWrap}>
          <Text style={rv.title} numberOfLines={1}>{title}</Text>
          <Text style={rv.countTxt}>{doneSteps}/{totalSteps} steps{isCompleted ? ' · Completed' : ''}</Text>
        </View>
      </View>

      <View style={rv.barTrack}>
        <Animated.View style={[rv.barFill, { width: barWidth, backgroundColor: run.has_issue ? COLORS.warn : COLORS.done }]} />
      </View>
      <Text style={rv.pctLabel}>{Math.round(pct * 100)}%</Text>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.type === 'section' ? `sec-${item.id}` : `step-${item.step.id}`}
        renderItem={({ item }) => {
          if (item.type === 'section') {
            return <View style={rv.secHeader}><Text style={rv.secTitle}>{item.title}</Text></View>;
          }
          const isCurrent = !isCompleted && firstUnchecked?.id === item.step.id;
          return (
            <StepRow
              step={item.step}
              index={item.globalIndex}
              runId={run.id}
              profileId={profileId}
              isCurrent={isCurrent}
              onTick={(sid) => onTick(run.id, sid, profileId)}
              onUntick={(sid) => onUntick(run.id, sid)}
              onFlag={(sid) => setFlagTarget(sid)}
            />
          );
        }}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {!isCompleted && (
        <View style={rv.footer}>
          <TouchableOpacity
            style={[rv.completeBtn, doneSteps < totalSteps && rv.completeBtnDim]}
            onPress={handleComplete}
            disabled={completing}
          >
            {completing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={rv.completeTxt}>
                  {doneSteps < totalSteps ? `Complete with ${totalSteps - doneSteps} remaining` : 'Complete checklist'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isCompleted && (
        <View style={[rv.footer, { backgroundColor: run.has_issue ? COLORS.warnSoft : COLORS.doneSoft }]}>
          <View style={rv.doneRow}>
            <Ionicons name={run.has_issue ? 'alert-circle' : 'checkmark-circle'} size={18} color={run.has_issue ? COLORS.warn : COLORS.done} />
            <Text style={[rv.doneTxt, { color: run.has_issue ? COLORS.warn : COLORS.done }]}>
              {run.has_issue ? 'Completed with issues' : 'Checklist complete'}
            </Text>
          </View>
        </View>
      )}

      <FlagIssueModal
        visible={flagTarget !== null}
        onClose={() => setFlagTarget(null)}
        onConfirm={(note) => {
          if (flagTarget) { onFlag(run.id, flagTarget, note, profileId); setFlagTarget(null); }
        }}
      />
    </View>
  );
}

const rv = StyleSheet.create({
  header: {
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.rule,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backTxt: { fontSize: 14, color: COLORS.ink, fontFamily: 'Inter_400Regular' },
  titleWrap: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold' },
  countTxt: { fontSize: 12, color: COLORS.inkMute, fontFamily: 'Inter_400Regular', marginTop: 1 },
  barTrack: { height: 6, backgroundColor: COLORS.rule, marginHorizontal: 16, marginTop: 10, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  pctLabel: { fontSize: 11, color: COLORS.inkMute, fontFamily: 'JetBrainsMono_400Regular', textAlign: 'right', marginHorizontal: 16, marginTop: 2, marginBottom: 8 },
  secHeader: { backgroundColor: COLORS.surface2, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.rule },
  secTitle: { fontSize: 12, fontWeight: '700', color: COLORS.inkSoft, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.rule },
  completeBtn: { backgroundColor: COLORS.done, borderRadius: 8, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  completeBtnDim: { backgroundColor: '#4ade80' },
  completeTxt: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  doneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  doneTxt: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});

// ─── GroupView ─────────────────────────────────────────────────────────────────

function GroupView({
  frequency, checklists, loading, onOpen, onBack,
}: {
  frequency: ChecklistFrequency;
  checklists: ChecklistWithRun[];
  loading: boolean;
  onOpen: (item: ChecklistWithRun) => void;
  onBack: () => void;
}) {
  const cfg = FREQ_CONFIG[frequency];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={gv.header}>
        <TouchableOpacity onPress={onBack} style={gv.backBtn}>
          <Ionicons name="chevron-back" size={20} color={COLORS.ink} />
          <Text style={gv.backTxt}>Folders</Text>
        </TouchableOpacity>
        <View style={gv.titleWrap}>
          <Text style={gv.title}>{cfg.plural}</Text>
          <Text style={gv.sub}>{checklists.length} checklist{checklists.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {loading ? (
        <View style={gv.center}><ActivityIndicator color={cfg.color} /></View>
      ) : checklists.length === 0 ? (
        <View style={gv.center}>
          <Ionicons name="checkbox-outline" size={36} color={COLORS.inkMute} />
          <Text style={gv.emptyTxt}>No {cfg.label.toLowerCase()} checklists yet</Text>
        </View>
      ) : (
        <FlatList
          data={checklists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => {
            const status = runStatus(item);
            const sc = STATUS_COLOR[status];
            const pct = item.totalSteps > 0 ? item.doneSteps / item.totalSteps : 0;
            return (
              <View style={gv.card}>
                <View style={gv.cardTop}>
                  <View style={gv.cardLeft}>
                    <Text style={gv.cardTitle}>{item.title}</Text>
                    {item.department ? <Text style={gv.cardDept}>{item.department}</Text> : null}
                  </View>
                  <View style={[gv.statusPill, { backgroundColor: sc + '22' }]}>
                    <Text style={[gv.statusTxt, { color: sc }]}>{STATUS_LABEL[status]}</Text>
                  </View>
                </View>
                {item.totalSteps > 0 && (
                  <View style={gv.progressRow}>
                    <View style={gv.progTrack}>
                      <View style={[gv.progFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: sc }]} />
                    </View>
                    <Text style={gv.progLabel}>{item.doneSteps}/{item.totalSteps}</Text>
                  </View>
                )}
                <TouchableOpacity style={[gv.openBtn, { borderColor: cfg.color }]} onPress={() => onOpen(item)}>
                  <Text style={[gv.openTxt, { color: cfg.color }]}>{status === 'done' ? 'View run' : 'Open'}</Text>
                  <Ionicons name="chevron-forward" size={14} color={cfg.color} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const gv = StyleSheet.create({
  header: {
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.rule,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backTxt: { fontSize: 14, color: COLORS.ink, fontFamily: 'Inter_400Regular' },
  titleWrap: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 12, color: COLORS.inkMute, fontFamily: 'Inter_400Regular', marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTxt: { fontSize: 14, color: COLORS.inkMute, fontFamily: 'Inter_400Regular' },
  card: { backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.rule, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.ink, fontFamily: 'Inter_700Bold' },
  cardDept: { fontSize: 11, color: COLORS.inkMute, fontFamily: 'Inter_400Regular', marginTop: 2, textTransform: 'capitalize' },
  statusPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progTrack: { flex: 1, height: 4, backgroundColor: COLORS.rule, borderRadius: 2, overflow: 'hidden' },
  progFill: { height: 4, borderRadius: 2 },
  progLabel: { fontSize: 11, color: COLORS.inkMute, fontFamily: 'JetBrainsMono_400Regular', width: 36, textAlign: 'right' },
  openBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 7, paddingVertical: 8, gap: 4, alignSelf: 'flex-end', paddingHorizontal: 14 },
  openTxt: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_700Bold' },
});

// ─── FolderCard ────────────────────────────────────────────────────────────────

function FolderCard({ frequency, total, done, onPress }: {
  frequency: ChecklistFrequency; total: number; done: number; onPress: () => void;
}) {
  const cfg = FREQ_CONFIG[frequency];
  const allDone = total > 0 && done === total;
  return (
    <TouchableOpacity style={fc.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[fc.iconWrap, { backgroundColor: cfg.soft }]}>
        <Ionicons name={cfg.icon as any} size={26} color={cfg.color} />
      </View>
      <Text style={fc.label}>{cfg.plural}</Text>
      <View style={fc.countRow}>
        <Text style={[fc.done, { color: allDone ? COLORS.done : cfg.color }]}>{done}</Text>
        <Text style={fc.slash}>/</Text>
        <Text style={fc.total}>{total}</Text>
      </View>
      <Text style={fc.sub}>done</Text>
      {allDone && total > 0 && (
        <View style={fc.badge}><Ionicons name="checkmark-circle" size={14} color={COLORS.done} /></View>
      )}
    </TouchableOpacity>
  );
}

const fc = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.rule,
    padding: 16, alignItems: 'center', gap: 4, minHeight: 130, justifyContent: 'center', position: 'relative',
  },
  iconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold' },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: 1, marginTop: 2 },
  done: { fontSize: 22, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  slash: { fontSize: 14, color: COLORS.inkMute, fontFamily: 'Inter_400Regular' },
  total: { fontSize: 14, color: COLORS.inkMute, fontFamily: 'Inter_400Regular' },
  sub: { fontSize: 10, color: COLORS.inkMute, fontFamily: 'Inter_400Regular' },
  badge: { position: 'absolute', top: 10, right: 10 },
});

// ─── FlagIssueModal styles ─────────────────────────────────────────────────────

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, gap: 12 },
  mTitle: { fontSize: 16, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold' },
  mLabel: { fontSize: 13, color: COLORS.inkSoft, fontFamily: 'Inter_400Regular' },
  noteInput: {
    borderWidth: 1, borderColor: COLORS.ruleStrong, borderRadius: 8, padding: 10,
    fontSize: 14, color: COLORS.ink, fontFamily: 'Inter_400Regular', minHeight: 70, textAlignVertical: 'top',
  },
  mRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.rule, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelTxt: { fontSize: 14, color: COLORS.inkSoft, fontFamily: 'Inter_400Regular' },
  flagBtn: { flex: 1, backgroundColor: COLORS.warn, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  flagTxt: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
});

// ─── Main screen ───────────────────────────────────────────────────────────────

type ScreenView = 'folders' | 'group' | 'run';

export default function ChecklistsScreen() {
  const { profile } = useAuth();
  const vesselId = profile?.vessel_id;
  const profileId = profile?.id;

  const {
    folderStats, groupChecklists, activeRun, activeSections, activeTitle, loading,
    fetchFolderStats, fetchGroupChecklists, openChecklist,
    tickStep, untickStep, flagStep, completeRun, closeRun,
  } = useChecklists(vesselId, profileId);

  const [view, setView] = useState<ScreenView>('folders');
  const [activeFreq, setActiveFreq] = useState<ChecklistFrequency>('daily');

  useEffect(() => { if (view === 'folders') fetchFolderStats(); }, [view]);

  async function handleOpenFolder(freq: ChecklistFrequency) {
    setActiveFreq(freq);
    await fetchGroupChecklists(freq);
    setView('group');
  }

  async function handleOpenChecklist(item: ChecklistWithRun) {
    await openChecklist(item);
    setView('run');
  }

  function handleBackToFolders() {
    fetchFolderStats();
    setView('folders');
  }

  function handleBackToGroup() {
    fetchGroupChecklists(activeFreq);
    closeRun();
    setView('group');
  }

  const statsMap = Object.fromEntries(folderStats.map((s) => [s.frequency, s]));

  if (view === 'run' && activeRun) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
        <RunView
          title={activeTitle}
          sections={activeSections}
          run={activeRun}
          profileId={profileId ?? ''}
          onTick={tickStep}
          onUntick={untickStep}
          onFlag={flagStep}
          onComplete={completeRun}
          onBack={handleBackToGroup}
        />
      </SafeAreaView>
    );
  }

  if (view === 'group') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
        <GroupView
          frequency={activeFreq}
          checklists={groupChecklists}
          loading={loading}
          onOpen={handleOpenChecklist}
          onBack={handleBackToFolders}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
      <View style={fv.header}>
        <Text style={fv.title}>Checklists</Text>
        <Text style={fv.sub}>Equipment checks · signed completion record</Text>
      </View>
      <ScrollView contentContainerStyle={fv.body}>
        <Text style={fv.sectionLabel}>TODAY'S PROGRESS</Text>
        {loading ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={fv.grid}>
              {FREQ_ORDER.slice(0, 2).map((freq) => (
                <FolderCard key={freq} frequency={freq} total={statsMap[freq]?.total ?? 0} done={statsMap[freq]?.done ?? 0} onPress={() => handleOpenFolder(freq)} />
              ))}
            </View>
            <View style={fv.grid}>
              {FREQ_ORDER.slice(2).map((freq) => (
                <FolderCard key={freq} frequency={freq} total={statsMap[freq]?.total ?? 0} done={statsMap[freq]?.done ?? 0} onPress={() => handleOpenFolder(freq)} />
              ))}
            </View>
          </>
        )}
        <View style={fv.hint}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.inkMute} />
          <Text style={fv.hintTxt}>
            Tap a folder to view and run checklists. Each completion is logged with name and timestamp.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const fv = StyleSheet.create({
  header: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.rule, paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 12, color: COLORS.inkMute, marginTop: 2, fontFamily: 'Inter_400Regular' },
  body: { padding: 16, gap: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.inkMute, fontFamily: 'Inter_700Bold', letterSpacing: 0.8, marginBottom: 4 },
  grid: { flexDirection: 'row', gap: 12 },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, padding: 12, backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.rule },
  hintTxt: { flex: 1, fontSize: 12, color: COLORS.inkMute, fontFamily: 'Inter_400Regular', lineHeight: 17 },
});
