import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../hooks/useAuth';
import { useWorklist } from '../../../hooks/useWorklist';
import { COLORS, DEPT_CONFIG, TODAY } from '../../../lib/constants';
import { WorklistJob, WorklistSection } from '../../../types';
import NotesPane from '../../../components/worklist/NotesPane';

// ─── Sub-tabs ────────────────────────────────────────────────────────────────
type Pane = 'worklist' | 'calendar' | 'notes';

// ─── Sign-off modal ───────────────────────────────────────────────────────────
function SignOffModal({
  job,
  crewList,
  onConfirm,
  onClose,
}: {
  job: WorklistJob;
  crewList: { id: string; full_name: string; initials: string; color: string }[];
  onConfirm: (byId: string, note?: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={modal.sheet}>
          <Text style={modal.title}>Sign off completed</Text>
          <Text style={modal.sub}>Who completed this?</Text>
          <Text style={modal.jobTitle} numberOfLines={2}>"{job.title}"</Text>

          <View style={modal.crewGrid}>
            {crewList.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[modal.crewBtn, selected === c.id && { borderColor: c.color, backgroundColor: c.color + '18' }]}
                onPress={() => setSelected(c.id)}
              >
                <View style={[modal.avatar, { backgroundColor: c.color }]}>
                  <Text style={modal.avatarText}>{c.initials}</Text>
                </View>
                <Text style={[modal.crewName, selected === c.id && { color: c.color }]} numberOfLines={1}>
                  {c.full_name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={modal.noteLabel}>Note (optional)</Text>
          <TextInput
            style={modal.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Any notes..."
            multiline
            numberOfLines={2}
          />

          <View style={modal.actions}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
              <Text style={modal.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.confirmBtn, !selected && { opacity: 0.4 }]}
              onPress={() => selected && onConfirm(selected, note || undefined)}
              disabled={!selected}
            >
              <Ionicons name="checkmark" size={15} color="white" />
              <Text style={modal.confirmText}>Mark complete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Add-job modal ────────────────────────────────────────────────────────────
function AddJobModal({
  sectionId,
  initialTitle = '',
  crewList,
  onAdd,
  onClose,
}: {
  sectionId: string | null;
  initialTitle?: string;
  crewList: { id: string; full_name: string; initials: string; color: string }[];
  onAdd: (params: { title: string; notes?: string; assigneeId?: string | null; isPriority?: boolean }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [notes, setNotes] = useState('');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [priority, setPriority] = useState(false);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[modal.sheet, { paddingBottom: Platform.OS === 'ios' ? 32 : 20 }]}>
          <Text style={modal.title}>Add a job</Text>
          <Text style={modal.sub}>Type a job, assign someone or leave open.</Text>

          <Text style={modal.noteLabel}>Job title</Text>
          <TextInput
            style={modal.noteInput}
            value={title}
            onChangeText={setTitle}
            placeholder="What needs doing?"
            autoFocus
          />

          <Text style={modal.noteLabel}>Notes (optional)</Text>
          <TextInput
            style={modal.noteInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Instructions, context..."
            multiline
            numberOfLines={2}
          />

          <Text style={modal.noteLabel}>Assign to</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[modal.assignBtn, assignee === null && modal.assignBtnActive]}
                onPress={() => setAssignee(null)}
              >
                <Text style={[modal.assignText, assignee === null && { color: COLORS.ink }]}>Open</Text>
              </TouchableOpacity>
              {crewList.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[modal.assignBtn, assignee === c.id && { borderColor: c.color, backgroundColor: c.color + '18' }]}
                  onPress={() => setAssignee(c.id)}
                >
                  <View style={[modal.avatarSm, { backgroundColor: c.color }]}>
                    <Text style={modal.avatarSmText}>{c.initials}</Text>
                  </View>
                  <Text style={[modal.assignText, assignee === c.id && { color: c.color }]}>{c.full_name.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={[modal.priorityRow, priority && { backgroundColor: '#fff7ed' }]} onPress={() => setPriority(!priority)}>
            <Ionicons name="flag" size={16} color={priority ? COLORS.warn : COLORS.inkMute} />
            <Text style={[modal.priorityText, priority && { color: COLORS.warn }]}>
              {priority ? 'Priority — flagged' : 'Mark as priority'}
            </Text>
          </TouchableOpacity>

          <View style={modal.actions}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
              <Text style={modal.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.confirmBtn, !title.trim() && { opacity: 0.4 }]}
              onPress={() => title.trim() && onAdd({ title: title.trim(), notes: notes.trim() || undefined, assigneeId: assignee, isPriority: priority })}
              disabled={!title.trim()}
            >
              <Ionicons name="add" size={15} color="white" />
              <Text style={modal.confirmText}>Add job</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Job row ──────────────────────────────────────────────────────────────────
function JobRow({
  job,
  isHod,
  onTick,
  onPriority,
}: {
  job: WorklistJob;
  isHod: boolean;
  onTick: (job: WorklistJob) => void;
  onPriority: (id: string) => void;
}) {
  const done = !!job.completed_at;
  const time = job.completed_at
    ? new Date(job.completed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <TouchableOpacity style={[row.wrap, done && row.done, job.is_priority && !done && row.priority]} onPress={() => !done && onTick(job)} activeOpacity={0.7}>
      {/* Checkbox */}
      <View style={[row.check, done && row.checkDone]}>
        {done && <Ionicons name="checkmark" size={12} color="white" />}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text style={[row.title, done && row.titleDone]} numberOfLines={2}>{job.title}</Text>

        <View style={row.meta}>
          {done && job.completed_by_profile && (
            <>
              <View style={[row.dot, { backgroundColor: job.completed_by_profile.color }]} />
              <Text style={row.metaText}>{job.completed_by_profile.full_name.split(' ')[0]}</Text>
              <Text style={[row.metaText, { fontFamily: 'JetBrainsMono_400Regular' }]}> · {time}</Text>
            </>
          )}
          {!done && job.assignee && (
            <>
              <View style={[row.dot, { backgroundColor: job.assignee.color }]} />
              <Text style={row.metaText}>{job.assignee.full_name.split(' ')[0]}</Text>
            </>
          )}
          {!done && !job.assignee && (
            <Text style={[row.metaText, { color: COLORS.inkMute }]}>Open · anyone</Text>
          )}
          {job.notes && <Text style={[row.metaText, { color: COLORS.inkMute, marginLeft: 6 }]} numberOfLines={1}> · {job.notes}</Text>}
        </View>
      </View>

      {/* Priority flag */}
      {isHod && !done && (
        <TouchableOpacity onPress={() => onPriority(job.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={job.is_priority ? 'flag' : 'flag-outline'} size={16} color={job.is_priority ? COLORS.warn : COLORS.inkMute} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─── Morning note ─────────────────────────────────────────────────────────────
function MorningNote({ note, onEdit, isHod }: { note: string | null; onEdit: (text: string) => void; isHod: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? '');

  function save() {
    onEdit(draft.trim());
    setEditing(false);
  }

  return (
    <View style={note_.wrap}>
      <View style={note_.header}>
        <Text style={note_.eyebrow}>Morning note · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        {isHod && !editing && (
          <TouchableOpacity onPress={() => { setDraft(note ?? ''); setEditing(true); }}>
            <Text style={note_.editBtn}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {editing ? (
        <>
          <TextInput
            style={note_.input}
            value={draft}
            onChangeText={setDraft}
            multiline
            autoFocus
            placeholder="Weather, plan, priorities for the day..."
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={note_.cancelBtn} onPress={() => setEditing(false)}>
              <Text style={note_.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={note_.saveBtn} onPress={save}>
              <Text style={note_.saveText}>Save note</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text style={note_.text}>{note || 'No morning note yet.'}</Text>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function WorklistScreen() {
  const { profile } = useAuth();
  const date = TODAY;
  const vesselId = profile?.vessel_id;
  const dept = profile?.department;
  const isHod = profile?.is_officer ?? false;

  const { worklist, sections, jobs, loading, stats, createWorklist, updateMorningNote, publishWorklist, addSection, addJob, togglePriority, completeJob } = useWorklist(vesselId, dept, date);

  const [pane, setPane] = useState<Pane>('worklist');
  const [signOffJob, setSignOffJob] = useState<WorklistJob | null>(null);
  const [addingToSection, setAddingToSection] = useState<string | null | undefined>(undefined);
  const [addJobInitialTitle, setAddJobInitialTitle] = useState('');
  const [addSectionName, setAddSectionName] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [publishing, setPublishing] = useState(false);

  if (!profile) return null;

  const deptCfg = DEPT_CONFIG[dept!];
  const published = !!worklist?.published_at;

  // Flatten crew from jobs' assignees for sign-off (in real app, fetch vessel crew)
  const crewList = [
    { id: profile.id, full_name: profile.full_name, initials: profile.initials, color: profile.color },
    ...jobs
      .filter(j => j.assignee && j.assignee.id !== profile.id)
      .map(j => j.assignee!)
      .filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i),
  ];

  async function handlePublish() {
    if (!vesselId || !dept) return;
    setPublishing(true);
    try {
      if (!worklist) await createWorklist(vesselId, dept, profile.id);
      await publishWorklist(profile.id);
    } finally {
      setPublishing(false);
    }
  }

  async function handleAddJob(params: { title: string; notes?: string; assigneeId?: string | null; isPriority?: boolean }) {
    if (!worklist && vesselId && dept) {
      const wl = await createWorklist(vesselId, dept, profile.id);
      if (!wl) return;
    }
    await addJob({ sectionId: addingToSection ?? null, ...params });
    setAddingToSection(undefined);
  }

  async function handleAddSection() {
    if (!addSectionName.trim()) return;
    if (!worklist && vesselId && dept) await createWorklist(vesselId, dept, profile.id);
    await addSection(addSectionName.trim());
    setAddSectionName('');
    setShowAddSection(false);
  }

  async function handleSignOff(byId: string, note?: string) {
    if (!signOffJob) return;
    await completeJob(signOffJob.id, byId, note);
    setSignOffJob(null);
  }

  const doneJobs = jobs.filter(j => j.completed_at);
  const activeJobs = jobs.filter(j => !j.completed_at);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
      {/* Header */}
      <View style={hdr.wrap}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[hdr.deptDot, { backgroundColor: deptCfg.color }]} />
            <Text style={hdr.title}>
              {stats.total === 0 ? 'No jobs yet' : `${stats.total} job${stats.total !== 1 ? 's' : ''}`}
            </Text>
            {published
              ? <View style={hdr.publishedBadge}><Text style={hdr.publishedText}>Published</Text></View>
              : isHod && <View style={hdr.draftBadge}><Text style={hdr.draftText}>Draft</Text></View>
            }
          </View>
          {stats.total > 0 && (
            <Text style={hdr.sub}>
              {stats.done} done · {stats.inProgress} in progress · {stats.total - stats.done - stats.inProgress} to start
            </Text>
          )}
        </View>

        {isHod && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {!published && (
              <TouchableOpacity style={hdr.addBtn} onPress={() => setAddingToSection(null)}>
                <Ionicons name="add" size={16} color={COLORS.inkSoft} />
                <Text style={hdr.addBtnText}>Add job</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[hdr.publishBtn, published && { backgroundColor: COLORS.surface2 }]}
              onPress={handlePublish}
              disabled={publishing || published}
            >
              {publishing
                ? <ActivityIndicator size="small" color="white" />
                : <>
                    <Ionicons name={published ? 'checkmark-circle' : 'send'} size={15} color={published ? COLORS.done : 'white'} />
                    <Text style={[hdr.publishText, published && { color: COLORS.done }]}>
                      {published ? 'Sent' : 'Send to crew'}
                    </Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Sub-tabs */}
      <View style={tab.bar}>
        {(['worklist', 'calendar', 'notes'] as Pane[]).map(p => (
          <TouchableOpacity key={p} style={[tab.btn, pane === p && tab.btnActive]} onPress={() => setPane(p)}>
            <Text style={[tab.text, pane === p && tab.textActive]}>
              {p === 'worklist' ? `Worklist${stats.total ? ` · ${stats.total}` : ''}` : p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      )}

      {!loading && pane === 'worklist' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Morning note */}
          {(isHod || worklist?.morning_note) && (
            <MorningNote
              note={worklist?.morning_note ?? null}
              onEdit={updateMorningNote}
              isHod={isHod}
            />
          )}

          {/* Unpublished crew view */}
          {!published && !isHod && (
            <View style={empty.wrap}>
              <Ionicons name="time-outline" size={36} color={COLORS.inkMute} />
              <Text style={empty.title}>Worklist not yet published</Text>
              <Text style={empty.sub}>Your Bosun is building today's list — check back shortly.</Text>
            </View>
          )}

          {/* Job sections */}
          {(published || isHod) && sections.map(sec => {
            const secJobs = jobs.filter(j => j.section_id === sec.id);
            return (
              <View key={sec.id}>
                <View style={secRow.wrap}>
                  <Text style={secRow.label}>{sec.label}</Text>
                  <Text style={secRow.count}>{secJobs.filter(j => j.completed_at).length}/{secJobs.length}</Text>
                  {isHod && !published && (
                    <TouchableOpacity onPress={() => setAddingToSection(sec.id)} style={{ marginLeft: 8 }}>
                      <Ionicons name="add-circle-outline" size={16} color={COLORS.inkMute} />
                    </TouchableOpacity>
                  )}
                </View>
                {secJobs.map(job => (
                  <JobRow key={job.id} job={job} isHod={isHod} onTick={setSignOffJob} onPriority={togglePriority} />
                ))}
              </View>
            );
          })}

          {/* Unsectioned jobs */}
          {(published || isHod) && (() => {
            const unsectioned = jobs.filter(j => !j.section_id);
            if (unsectioned.length === 0 && sections.length > 0) return null;
            return (
              <View>
                {sections.length > 0 && unsectioned.length > 0 && (
                  <View style={secRow.wrap}>
                    <Text style={secRow.label}>Other</Text>
                    <Text style={secRow.count}>{unsectioned.filter(j => j.completed_at).length}/{unsectioned.length}</Text>
                  </View>
                )}
                {unsectioned.map(job => (
                  <JobRow key={job.id} job={job} isHod={isHod} onTick={setSignOffJob} onPriority={togglePriority} />
                ))}
              </View>
            );
          })()}

          {/* Empty state */}
          {(published || isHod) && jobs.length === 0 && (
            <View style={empty.wrap}>
              <Ionicons name="checkmark-circle-outline" size={36} color={COLORS.inkMute} />
              <Text style={empty.title}>No jobs yet</Text>
              {isHod && <Text style={empty.sub}>Tap "Add job" to start building today's list.</Text>}
            </View>
          )}

          {/* HOD tools: add section */}
          {isHod && !published && (
            <View style={{ padding: 16, gap: 8 }}>
              {showAddSection ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[secRow.sectionInput, { flex: 1 }]}
                    value={addSectionName}
                    onChangeText={setAddSectionName}
                    placeholder="Section name (e.g. Before 10am)"
                    autoFocus
                    onSubmitEditing={handleAddSection}
                  />
                  <TouchableOpacity style={hdr.publishBtn} onPress={handleAddSection}>
                    <Text style={hdr.publishText}>Add</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={secRow.addSectionBtn} onPress={() => setShowAddSection(true)}>
                  <Ionicons name="add" size={14} color={COLORS.inkMute} />
                  <Text style={secRow.addSectionText}>Add section header</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {!loading && pane === 'calendar' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: COLORS.ink, marginBottom: 4 }}>Look-ahead</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.inkMute }}>Calendar view coming soon — events and drills will appear here.</Text>
        </ScrollView>
      )}

      {!loading && pane === 'notes' && (
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <NotesPane
            authorId={profile.id}
            vesselId={profile.vessel_id}
            isOfficer={isHod}
            onAddToWorklist={(text) => {
              setAddJobInitialTitle(text);
              setAddingToSection(null);
            }}
          />
        </ScrollView>
      )}

      {/* Modals */}
      {signOffJob && (
        <SignOffModal
          job={signOffJob}
          crewList={crewList}
          onConfirm={handleSignOff}
          onClose={() => setSignOffJob(null)}
        />
      )}

      {addingToSection !== undefined && (
        <AddJobModal
          sectionId={addingToSection}
          initialTitle={addJobInitialTitle}
          crewList={crewList}
          onAdd={handleAddJob}
          onClose={() => { setAddingToSection(undefined); setAddJobInitialTitle(''); }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const hdr = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.rule,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
  },
  deptDot: { width: 8, height: 8, borderRadius: 4 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 12, color: COLORS.inkMute, marginTop: 2, fontFamily: 'Inter_400Regular' },
  publishedBadge: { backgroundColor: COLORS.doneSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  publishedText: { fontSize: 11, fontWeight: '700', color: COLORS.done, fontFamily: 'Inter_700Bold' },
  draftBadge: { backgroundColor: COLORS.warnSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  draftText: { fontSize: 11, fontWeight: '700', color: COLORS.warn, fontFamily: 'Inter_700Bold' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.ruleStrong, borderRadius: 8,
  },
  addBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.inkSoft, fontFamily: 'Inter_600SemiBold' },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.accent, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  publishText: { fontSize: 13, fontWeight: '700', color: 'white', fontFamily: 'Inter_700Bold' },
});

const tab = StyleSheet.create({
  bar: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.rule, flexDirection: 'row', paddingHorizontal: 16 },
  btn: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  btnActive: { borderBottomColor: COLORS.ink },
  text: { fontSize: 13, fontWeight: '600', color: COLORS.inkMute, fontFamily: 'Inter_600SemiBold' },
  textActive: { color: COLORS.ink },
});

const note_ = StyleSheet.create({
  wrap: { backgroundColor: COLORS.surface, margin: 16, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.rule },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eyebrow: { fontSize: 11, fontWeight: '600', color: COLORS.inkMute, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: 'Inter_600SemiBold' },
  editBtn: { fontSize: 12, fontWeight: '600', color: COLORS.accent, fontFamily: 'Inter_600SemiBold' },
  text: { fontSize: 14, color: COLORS.ink, lineHeight: 22, fontFamily: 'Inter_400Regular' },
  input: { fontSize: 14, color: COLORS.ink, lineHeight: 22, borderWidth: 1, borderColor: COLORS.ruleStrong, borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top', fontFamily: 'Inter_400Regular' },
  cancelBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: COLORS.ruleStrong, alignItems: 'center' },
  cancelText: { fontSize: 13, fontWeight: '600', color: COLORS.inkSoft, fontFamily: 'Inter_600SemiBold' },
  saveBtn: { flex: 2, paddingVertical: 9, borderRadius: 8, backgroundColor: COLORS.ink, alignItems: 'center' },
  saveText: { fontSize: 13, fontWeight: '700', color: 'white', fontFamily: 'Inter_700Bold' },
});

const row = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.rule },
  done: { opacity: 0.55 },
  priority: { backgroundColor: '#fff7ed' },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.ruleStrong, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: COLORS.done, borderColor: COLORS.done },
  title: { fontSize: 14, fontWeight: '500', color: COLORS.ink, fontFamily: 'Inter_500Medium' },
  titleDone: { textDecorationLine: 'line-through', color: COLORS.inkMute },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: COLORS.inkSoft, fontFamily: 'Inter_400Regular' },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
});

const secRow = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: COLORS.surface2, borderBottomWidth: 1, borderBottomColor: COLORS.rule },
  label: { flex: 1, fontSize: 11, fontWeight: '700', color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: 'Inter_700Bold' },
  count: { fontSize: 11, fontFamily: 'JetBrainsMono_400Regular', color: COLORS.inkMute },
  addSectionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.ruleStrong, borderRadius: 8 },
  addSectionText: { fontSize: 13, fontWeight: '600', color: COLORS.inkMute, fontFamily: 'Inter_600SemiBold' },
  sectionInput: { borderWidth: 1, borderColor: COLORS.ruleStrong, borderRadius: 8, padding: 10, fontSize: 14, fontFamily: 'Inter_400Regular', color: COLORS.ink },
});

const empty = StyleSheet.create({
  wrap: { alignItems: 'center', padding: 40, gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.inkSoft, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 13, color: COLORS.inkMute, textAlign: 'center', fontFamily: 'Inter_400Regular' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.ink, marginBottom: 4, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 13, color: COLORS.inkMute, marginBottom: 12, fontFamily: 'Inter_400Regular' },
  jobTitle: { fontSize: 14, color: COLORS.inkSoft, fontStyle: 'italic', marginBottom: 20, fontFamily: 'Inter_400Regular' },
  crewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  crewBtn: { alignItems: 'center', gap: 6, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.rule, width: '22%' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '700', color: 'white', fontFamily: 'Inter_700Bold' },
  crewName: { fontSize: 11, fontWeight: '600', color: COLORS.inkSoft, fontFamily: 'Inter_600SemiBold' },
  noteLabel: { fontSize: 11, fontWeight: '700', color: COLORS.inkMute, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, fontFamily: 'Inter_700Bold' },
  noteInput: { borderWidth: 1, borderColor: COLORS.ruleStrong, borderRadius: 8, padding: 10, fontSize: 14, color: COLORS.ink, minHeight: 48, textAlignVertical: 'top', fontFamily: 'Inter_400Regular', marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 9, borderWidth: 1, borderColor: COLORS.ruleStrong, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: COLORS.inkSoft, fontFamily: 'Inter_600SemiBold' },
  confirmBtn: { flex: 2, flexDirection: 'row', gap: 6, paddingVertical: 12, borderRadius: 9, backgroundColor: COLORS.done, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 14, fontWeight: '700', color: 'white', fontFamily: 'Inter_700Bold' },
  assignBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.rule },
  assignBtnActive: { borderColor: COLORS.ink, backgroundColor: COLORS.surface2 },
  assignText: { fontSize: 13, fontWeight: '600', color: COLORS.inkMute, fontFamily: 'Inter_600SemiBold' },
  avatarSm: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarSmText: { fontSize: 8, fontWeight: '700', color: 'white', fontFamily: 'Inter_700Bold' },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.rule, marginBottom: 16 },
  priorityText: { fontSize: 13, fontWeight: '600', color: COLORS.inkMute, fontFamily: 'Inter_600SemiBold' },
});
