import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../hooks/useAuth';
import { useProjects } from '../../../hooks/useProjects';
import { COLORS, DEPT_CONFIG } from '../../../lib/constants';
import { Project, ProjectTask, ProjectStatus, Department } from '../../../types';

// ─── Config ─────────────────────────────────────────────────────────────────

const STATUS_TABS: { key: ProjectStatus | 'all'; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'active',   label: 'Active' },
  { key: 'planning', label: 'Planning' },
  { key: 'on_hold',  label: 'On Hold' },
  { key: 'complete', label: 'Complete' },
];

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    color: '#6b7280', soft: '#f9fafb' },
  medium: { label: 'Medium', color: '#2563eb', soft: '#eff6ff' },
  high:   { label: 'High',   color: '#c2410c', soft: '#fff7ed' },
  urgent: { label: 'Urgent', color: '#b91c1c', soft: '#fef2f2' },
};

const STATUS_CONFIG = {
  planning: { label: 'Planning', color: '#6b7280' },
  active:   { label: 'Active',   color: '#2563eb' },
  on_hold:  { label: 'On Hold',  color: '#c2410c' },
  complete: { label: 'Complete', color: '#15803d' },
};

const DEPARTMENTS: Array<{ key: Department; label: string }> = [
  { key: 'deck',     label: 'Deck' },
  { key: 'engine',   label: 'Engineering' },
  { key: 'interior', label: 'Interior' },
  { key: 'galley',   label: 'Galley' },
  { key: 'bridge',   label: 'Bridge' },
  { key: 'eto',      label: 'ETO' },
];

// ─── Task row ────────────────────────────────────────────────────────────────

function TaskRow({
  task, isOfficer,
  onStatusChange, onDelete,
}: {
  task: ProjectTask;
  isOfficer: boolean;
  onStatusChange: (id: string, s: ProjectTask['status']) => void;
  onDelete: (id: string) => void;
}) {
  const done = task.status === 'done';
  const inProgress = task.status === 'in_progress';

  function cycleStatus() {
    if (!isOfficer) return;
    const next: Record<ProjectTask['status'], ProjectTask['status']> = {
      todo: 'in_progress', in_progress: 'done', done: 'todo',
    };
    onStatusChange(task.id, next[task.status]);
  }

  return (
    <View style={ts.row}>
      <TouchableOpacity onPress={cycleStatus} style={ts.check}>
        <View style={[
          ts.checkbox,
          done && { backgroundColor: COLORS.done, borderColor: COLORS.done },
          inProgress && { borderColor: '#2563eb' },
        ]}>
          {done && <Ionicons name="checkmark" size={12} color="white" />}
          {inProgress && <View style={ts.inProgressDot} />}
        </View>
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text style={[ts.taskTitle, done && ts.taskDone]}>{task.title}</Text>
        {task.assignee && (
          <Text style={ts.taskMeta}>
            {task.assignee.full_name}
            {task.due_date ? `  ·  Due ${task.due_date}` : ''}
          </Text>
        )}
        {task.notes ? <Text style={ts.taskNotes}>{task.notes}</Text> : null}
      </View>

      {isOfficer && (
        <TouchableOpacity
          onPress={() => Alert.alert('Delete task', `Remove "${task.title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(task.id) },
          ])}
          style={{ padding: 8 }}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.inkMute} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project, onPress,
}: {
  project: Project & { taskCount: number; doneCount: number };
  onPress: () => void;
}) {
  const prio = PRIORITY_CONFIG[project.priority];
  const status = STATUS_CONFIG[project.status];
  const deptCfg = project.department ? DEPT_CONFIG[project.department as Department] : null;
  const progress = project.taskCount > 0 ? project.doneCount / project.taskCount : 0;
  const isOverdue = project.due_date && project.status !== 'complete'
    && project.due_date < new Date().toISOString().split('T')[0];

  return (
    <TouchableOpacity style={pc.card} onPress={onPress} activeOpacity={0.75}>
      {/* Priority stripe */}
      <View style={[pc.stripe, { backgroundColor: prio.color }]} />

      <View style={{ flex: 1, padding: 14 }}>
        {/* Header row */}
        <View style={pc.headerRow}>
          <Text style={pc.title} numberOfLines={2}>{project.title}</Text>
          <View style={[pc.statusPill, { backgroundColor: status.color + '18' }]}>
            <Text style={[pc.statusTxt, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* Meta row */}
        <View style={pc.metaRow}>
          {deptCfg && (
            <View style={[pc.deptDot, { backgroundColor: deptCfg.color }]} />
          )}
          {deptCfg && <Text style={pc.metaTxt}>{deptCfg.label}</Text>}
          <View style={[pc.prioPill, { backgroundColor: prio.soft }]}>
            <Text style={[pc.prioTxt, { color: prio.color }]}>{prio.label}</Text>
          </View>
          {project.due_date && (
            <Text style={[pc.dueTxt, isOverdue && { color: COLORS.alert }]}>
              {isOverdue ? '⚠ ' : ''}Due {project.due_date}
            </Text>
          )}
        </View>

        {project.description ? (
          <Text style={pc.desc} numberOfLines={2}>{project.description}</Text>
        ) : null}

        {/* Progress bar */}
        {project.taskCount > 0 && (
          <View style={{ marginTop: 10 }}>
            <View style={pc.progressBg}>
              <View style={[pc.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
            </View>
            <Text style={pc.progressTxt}>
              {project.doneCount}/{project.taskCount} tasks done
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Add project modal ────────────────────────────────────────────────────────

function AddProjectModal({
  visible, onClose, onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (params: {
    title: string; description: string; department: Department | null;
    priority: Project['priority']; dueDate: string | null;
  }) => void;
}) {
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [dept, setDept]         = useState<Department | null>(null);
  const [priority, setPriority] = useState<Project['priority']>('medium');
  const [dueDate, setDueDate]   = useState('');

  function reset() { setTitle(''); setDesc(''); setDept(null); setPriority('medium'); setDueDate(''); }

  function handleSave() {
    if (!title.trim()) { Alert.alert('Title required'); return; }
    onSave({ title: title.trim(), description: desc.trim(), department: dept, priority, dueDate: dueDate.trim() || null });
    reset();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={m.header}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Text style={m.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={m.headerTitle}>New Project</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={m.save}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={m.body} keyboardShouldPersistTaps="handled">
          <Text style={m.label}>Title</Text>
          <TextInput style={m.input} value={title} onChangeText={setTitle} placeholder="Project name" />

          <Text style={m.label}>Description (optional)</Text>
          <TextInput style={[m.input, { height: 80, textAlignVertical: 'top' }]}
            value={desc} onChangeText={setDesc} placeholder="What needs to be done?" multiline />

          <Text style={m.label}>Department (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <TouchableOpacity
              style={[m.chip, dept === null && m.chipActive]}
              onPress={() => setDept(null)}
            >
              <Text style={[m.chipTxt, dept === null && m.chipTxtActive]}>All</Text>
            </TouchableOpacity>
            {DEPARTMENTS.map(d => (
              <TouchableOpacity
                key={d.key}
                style={[m.chip, dept === d.key && m.chipActive, dept === d.key && { borderColor: DEPT_CONFIG[d.key].color }]}
                onPress={() => setDept(d.key)}
              >
                <Text style={[m.chipTxt, dept === d.key && { color: DEPT_CONFIG[d.key].color }]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={m.label}>Priority</Text>
          <View style={m.row}>
            {(Object.keys(PRIORITY_CONFIG) as Project['priority'][]).map(p => (
              <TouchableOpacity
                key={p}
                style={[m.prioPill, priority === p && { backgroundColor: PRIORITY_CONFIG[p].color }]}
                onPress={() => setPriority(p)}
              >
                <Text style={[m.prioPillTxt, priority === p && { color: 'white' }]}>
                  {PRIORITY_CONFIG[p].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={m.label}>Due date (optional)</Text>
          <TextInput style={m.input} value={dueDate} onChangeText={setDueDate}
            placeholder="YYYY-MM-DD" keyboardType="numeric" maxLength={10} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Project detail modal ─────────────────────────────────────────────────────

function ProjectDetailModal({
  project, visible, isOfficer, userId,
  onClose, onStatusChange, onDelete,
  addTask, updateTaskStatus, deleteTask, fetchTasks,
}: {
  project: Project | null;
  visible: boolean;
  isOfficer: boolean;
  userId: string;
  onClose: () => void;
  onStatusChange: (id: string, status: ProjectStatus) => void;
  onDelete: (id: string) => void;
  addTask: (p: Parameters<ReturnType<typeof useProjects>['addTask']>[0]) => Promise<ProjectTask | null>;
  updateTaskStatus: (id: string, s: ProjectTask['status']) => void;
  deleteTask: (id: string) => void;
  fetchTasks: (id: string) => Promise<ProjectTask[]>;
}) {
  const [tasks, setTasks]         = useState<ProjectTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask]     = useState(false);

  const loadTasks = useCallback(async () => {
    if (!project) return;
    setLoadingTasks(true);
    const t = await fetchTasks(project.id);
    setTasks(t);
    setLoadingTasks(false);
  }, [project, fetchTasks]);

  useEffect(() => { if (visible && project) loadTasks(); }, [visible, project?.id]);

  async function handleAddTask() {
    if (!project || !newTaskTitle.trim()) return;
    setAddingTask(true);
    const t = await addTask({
      projectId: project.id,
      title: newTaskTitle.trim(),
      position: tasks.length,
      createdBy: userId,
    });
    if (t) setTasks(prev => [...prev, t]);
    setNewTaskTitle('');
    setAddingTask(false);
  }

  async function handleStatusChange(taskId: string, status: ProjectTask['status']) {
    await updateTaskStatus(taskId, status);
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, status, completed_at: status === 'done' ? new Date().toISOString() : null }
      : t
    ));
  }

  async function handleDeleteTask(taskId: string) {
    await deleteTask(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }

  if (!project) return null;

  const prio = PRIORITY_CONFIG[project.priority];
  const status = STATUS_CONFIG[project.status];
  const deptCfg = project.department ? DEPT_CONFIG[project.department as Department] : null;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  const NEXT_STATUS: Record<ProjectStatus, ProjectStatus> = {
    planning: 'active', active: 'on_hold', on_hold: 'active', complete: 'planning',
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={d.container}>
        {/* Header */}
        <View style={d.header}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="chevron-down" size={24} color={COLORS.inkSoft} />
          </TouchableOpacity>
          {isOfficer && (
            <TouchableOpacity
              onPress={() => Alert.alert('Delete project', `Remove "${project.title}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => { onDelete(project.id); onClose(); } },
              ])}
              style={{ padding: 4 }}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.alert} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <View style={d.body}>
            {/* Title + badges */}
            <Text style={d.title}>{project.title}</Text>
            <View style={d.badgeRow}>
              <View style={[d.badge, { backgroundColor: prio.soft }]}>
                <Text style={[d.badgeTxt, { color: prio.color }]}>{prio.label}</Text>
              </View>
              <View style={[d.badge, { backgroundColor: status.color + '18' }]}>
                <Text style={[d.badgeTxt, { color: status.color }]}>{status.label}</Text>
              </View>
              {deptCfg && (
                <View style={[d.badge, { backgroundColor: deptCfg.soft }]}>
                  <Text style={[d.badgeTxt, { color: deptCfg.color }]}>{deptCfg.label}</Text>
                </View>
              )}
              {project.due_date && (
                <Text style={d.dueTxt}>Due {project.due_date}</Text>
              )}
            </View>

            {project.description ? (
              <Text style={d.desc}>{project.description}</Text>
            ) : null}

            {/* Status advance (officers) */}
            {isOfficer && project.status !== 'complete' && (
              <TouchableOpacity
                style={d.advanceBtn}
                onPress={() => onStatusChange(project.id, NEXT_STATUS[project.status])}
              >
                <Text style={d.advanceTxt}>
                  Move to {STATUS_CONFIG[NEXT_STATUS[project.status]].label}
                </Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.accent} />
              </TouchableOpacity>
            )}
            {isOfficer && project.status === 'complete' && (
              <TouchableOpacity
                style={[d.advanceBtn, { borderColor: COLORS.rule }]}
                onPress={() => onStatusChange(project.id, 'planning')}
              >
                <Text style={[d.advanceTxt, { color: COLORS.inkMute }]}>Reopen project</Text>
              </TouchableOpacity>
            )}

            {/* Tasks */}
            <Text style={d.sectionTitle}>
              Tasks{tasks.length > 0 ? ` · ${doneCount}/${tasks.length} done` : ''}
            </Text>

            {loadingTasks
              ? <ActivityIndicator color={COLORS.inkMute} style={{ marginVertical: 16 }} />
              : tasks.length === 0
                ? <Text style={d.empty}>No tasks yet{isOfficer ? ' — add one below' : ''}.</Text>
                : tasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isOfficer={isOfficer}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteTask}
                    />
                  ))
            }

            {/* Add task (officers) */}
            {isOfficer && (
              <View style={d.addTaskRow}>
                <TextInput
                  style={d.addTaskInput}
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                  placeholder="Add task…"
                  onSubmitEditing={handleAddTask}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[d.addTaskBtn, !newTaskTitle.trim() && { opacity: 0.4 }]}
                  onPress={handleAddTask}
                  disabled={!newTaskTitle.trim() || addingTask}
                >
                  {addingTask
                    ? <ActivityIndicator size="small" color="white" />
                    : <Ionicons name="add" size={20} color="white" />
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProjectsScreen() {
  const { profile } = useAuth();
  const {
    projects, loading,
    fetchProjects, fetchTasks,
    createProject, updateProject, deleteProject,
    addTask, updateTaskStatus, deleteTask,
  } = useProjects(profile?.vessel_id);

  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [showAdd, setShowAdd]           = useState(false);
  const [selected, setSelected]         = useState<Project | null>(null);
  const [taskCounts, setTaskCounts]     = useState<Record<string, { total: number; done: number }>>({});

  const isOfficer = profile?.is_officer ?? false;

  useEffect(() => {
    fetchProjects(statusFilter === 'all' ? undefined : statusFilter);
  }, [statusFilter, fetchProjects]);

  // Load task counts for all visible projects
  useEffect(() => {
    if (projects.length === 0) return;
    Promise.all(
      projects.map(async p => {
        const tasks = await fetchTasks(p.id);
        return { id: p.id, total: tasks.length, done: tasks.filter(t => t.status === 'done').length };
      })
    ).then(counts => {
      const map: Record<string, { total: number; done: number }> = {};
      counts.forEach(c => { map[c.id] = { total: c.total, done: c.done }; });
      setTaskCounts(map);
    });
  }, [projects.length]);

  async function handleCreateProject(params: {
    title: string; description: string; department: Department | null;
    priority: Project['priority']; dueDate: string | null;
  }) {
    if (!profile) return;
    await createProject({ ...params, createdBy: profile.id });
    fetchProjects(statusFilter === 'all' ? undefined : statusFilter);
  }

  async function handleStatusChange(id: string, status: ProjectStatus) {
    await updateProject(id, { status });
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
  }

  async function handleDelete(id: string) {
    await deleteProject(id);
  }

  const enriched = projects.map(p => ({
    ...p,
    taskCount: taskCounts[p.id]?.total ?? 0,
    doneCount: taskCounts[p.id]?.done ?? 0,
  }));

  return (
    <View style={s.container}>
      {/* Status filter tabs */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={s.tabsScroll} contentContainerStyle={s.tabs}
      >
        {STATUS_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, statusFilter === tab.key && s.tabActive]}
            onPress={() => setStatusFilter(tab.key)}
          >
            <Text style={[s.tabTxt, statusFilter === tab.key && s.tabTxtActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading
        ? <ActivityIndicator color={COLORS.inkMute} style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={enriched}
            keyExtractor={p => p.id}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={s.empty}>
                <Ionicons name="folder-open-outline" size={40} color={COLORS.inkMute} />
                <Text style={s.emptyTxt}>No projects</Text>
                {isOfficer && <Text style={s.emptyHint}>Tap + to create one</Text>}
              </View>
            }
            renderItem={({ item }) => (
              <ProjectCard
                project={item}
                onPress={() => setSelected(item)}
              />
            )}
          />
        )
      }

      {/* FAB */}
      {isOfficer && (
        <TouchableOpacity style={s.fab} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      )}

      <AddProjectModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleCreateProject}
      />

      <ProjectDetailModal
        project={selected}
        visible={!!selected}
        isOfficer={isOfficer}
        userId={profile?.id ?? ''}
        onClose={() => setSelected(null)}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        addTask={addTask}
        updateTaskStatus={updateTaskStatus}
        deleteTask={deleteTask}
        fetchTasks={fetchTasks}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  tabsScroll: { borderBottomWidth: 1, borderBottomColor: COLORS.rule, maxHeight: 48 },
  tabs: { paddingHorizontal: 16, gap: 4, alignItems: 'center' },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tabActive: { backgroundColor: COLORS.ink },
  tabTxt: { fontSize: 13, color: COLORS.inkMute, fontFamily: 'Inter_600SemiBold' },
  tabTxtActive: { color: 'white' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTxt: { fontSize: 16, color: COLORS.inkSoft, fontFamily: 'Inter_600SemiBold' },
  emptyHint: { fontSize: 13, color: COLORS.inkMute, fontFamily: 'Inter_400Regular' },
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.ink,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
});

const pc = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    flexDirection: 'row',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
    overflow: 'hidden',
  },
  stripe: { width: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusTxt: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  deptDot: { width: 8, height: 8, borderRadius: 4 },
  metaTxt: { fontSize: 12, color: COLORS.inkSoft, fontFamily: 'Inter_500Medium' },
  prioPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  prioTxt: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  dueTxt: { fontSize: 11, color: COLORS.inkMute, fontFamily: 'Inter_400Regular' },
  desc: { fontSize: 13, color: COLORS.inkSoft, lineHeight: 18, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  progressBg: { height: 4, backgroundColor: COLORS.rule, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: COLORS.done, borderRadius: 2 },
  progressTxt: { fontSize: 11, color: COLORS.inkMute, marginTop: 4, fontFamily: 'Inter_400Regular' },
});

const ts = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10,
         borderBottomWidth: 1, borderBottomColor: COLORS.rule, gap: 10 },
  check: { paddingTop: 2 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2,
              borderColor: COLORS.ruleStrong, alignItems: 'center', justifyContent: 'center' },
  inProgressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  taskTitle: { fontSize: 14, color: COLORS.ink, fontFamily: 'Inter_500Medium' },
  taskDone: { textDecorationLine: 'line-through', color: COLORS.inkMute },
  taskMeta: { fontSize: 12, color: COLORS.inkMute, marginTop: 2, fontFamily: 'Inter_400Regular' },
  taskNotes: { fontSize: 12, color: COLORS.inkSoft, marginTop: 2, fontFamily: 'Inter_400Regular' },
});

const m = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.rule,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold' },
  cancel: { fontSize: 15, color: COLORS.inkMute, fontFamily: 'Inter_500Medium' },
  save:   { fontSize: 15, color: COLORS.accent,  fontFamily: 'Inter_700Bold' },
  body: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.inkMute,
           textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, marginTop: 4,
           fontFamily: 'Inter_700Bold' },
  input: { borderWidth: 1, borderColor: COLORS.ruleStrong, borderRadius: 9,
           padding: 12, fontSize: 14, color: COLORS.ink, marginBottom: 16,
           fontFamily: 'Inter_400Regular' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
          borderWidth: 1.5, borderColor: COLORS.rule, marginRight: 8 },
  chipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipTxt: { fontSize: 13, color: COLORS.inkSoft, fontFamily: 'Inter_500Medium' },
  chipTxtActive: { color: 'white' },
  row: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  prioPill: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center',
              borderWidth: 1.5, borderColor: COLORS.rule },
  prioPillTxt: { fontSize: 13, fontWeight: '600', color: COLORS.inkSoft, fontFamily: 'Inter_600SemiBold' },
});

const d = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.rule,
  },
  body: { padding: 20 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.ink,
           fontFamily: 'Inter_800ExtraBold', marginBottom: 10, lineHeight: 28 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTxt: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  dueTxt: { fontSize: 12, color: COLORS.inkMute, alignSelf: 'center',
            fontFamily: 'Inter_400Regular' },
  desc: { fontSize: 14, color: COLORS.inkSoft, lineHeight: 20,
          fontFamily: 'Inter_400Regular', marginBottom: 16 },
  advanceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.accent, borderRadius: 10,
    paddingVertical: 10, marginBottom: 20,
  },
  advanceTxt: { fontSize: 14, color: COLORS.accent, fontFamily: 'Inter_600SemiBold' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.inkMute,
                  textTransform: 'uppercase', letterSpacing: 0.8,
                  fontFamily: 'Inter_700Bold', marginBottom: 8 },
  empty: { fontSize: 14, color: COLORS.inkMute, fontFamily: 'Inter_400Regular',
           paddingVertical: 16 },
  addTaskRow: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'center' },
  addTaskInput: { flex: 1, borderWidth: 1, borderColor: COLORS.ruleStrong, borderRadius: 9,
                  padding: 11, fontSize: 14, color: COLORS.ink, fontFamily: 'Inter_400Regular' },
  addTaskBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.ink,
                alignItems: 'center', justifyContent: 'center' },
});
