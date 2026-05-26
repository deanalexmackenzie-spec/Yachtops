import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { COLORS, DEPT_CONFIG } from '../../lib/constants';
import { Department } from '../../types';

const DEPARTMENTS: { key: Department; icon: string; sub: string }[] = [
  { key: 'deck',     icon: '⚓', sub: 'Bosun · Deckhands' },
  { key: 'interior', icon: '★', sub: 'Chief Stew · Crew' },
  { key: 'engine',   icon: '⚙', sub: 'Chief Eng · Techs' },
  { key: 'galley',   icon: '🍳', sub: 'Head Chef · Cooks' },
];

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [dept, setDept] = useState<Department | null>(null);
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [vesselName, setVesselName] = useState<string | null>(null);
  const [vesselId, setVesselId] = useState<string | null>(null);
  const [isDeptHead, setIsDeptHead] = useState(false);

  async function lookupVessel(code: string) {
    const { data, error } = await supabase.rpc('vessel_by_join_code', { code: code.trim().toUpperCase() });
    if (error || !data || data.length === 0) return null;
    return data[0] as { id: string; vessel_name: string; vessel_flag: string };
  }

  async function handleCodeChange(code: string) {
    setJoinCode(code.toUpperCase());
    setVesselName(null);
    setVesselId(null);
    if (code.trim().length === 6) {
      const vessel = await lookupVessel(code);
      if (vessel) { setVesselName(vessel.vessel_name); setVesselId(vessel.id); }
    }
  }

  async function handleSubmit() {
    if (!email || !password) { Alert.alert('Missing fields', 'Email and password are required.'); return; }
    if (mode === 'signup') {
      if (!fullName || !dept) { Alert.alert('Missing fields', 'Please fill in all fields and select a department.'); return; }
      if (!joinCode.trim()) { Alert.alert('Vessel code required', 'Enter the 6-character code from your captain.'); return; }
    }

    setLoading(true);

    if (mode === 'signin') {
      const err = await signIn(email.trim().toLowerCase(), password);
      if (err) Alert.alert('Sign in failed', err.message);
    } else {
      // Validate vessel code before creating auth user
      let vid = vesselId;
      if (!vid) {
        const vessel = await lookupVessel(joinCode);
        if (!vessel) {
          Alert.alert('Code not found', 'Check the code with your vessel manager.');
          setLoading(false);
          return;
        }
        vid = vessel.id;
        setVesselName(vessel.vessel_name);
        setVesselId(vid);
      }

      const initials = fullName.trim().split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 3);
      const color = DEPT_CONFIG[dept!].color;
      const err = await signUp(email.trim().toLowerCase(), password, {
        full_name: fullName.trim(),
        role: role.trim() || 'Crew',
        initials,
        department: dept!,
        is_officer: isDeptHead,
        color,
        vessel_id: vid,
      });
      if (err) Alert.alert('Sign up failed', err.message);
    }

    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.bg} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Brand */}
        <View style={s.logo}>
          <Ionicons name="navigate-circle" size={28} color="white" />
        </View>
        <Text style={s.appName}>YachtOps</Text>
        <Text style={s.vesselName}>M/Y Eclipse</Text>

        {/* Card */}
        <View style={s.card}>
          {/* Mode toggle */}
          <View style={s.modeRow}>
            <TouchableOpacity style={[s.modeBtn, mode === 'signin' && s.modeBtnActive]} onPress={() => setMode('signin')}>
              <Text style={[s.modeBtnText, mode === 'signin' && s.modeBtnTextActive]}>Sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.modeBtn, mode === 'signup' && s.modeBtnActive]} onPress={() => setMode('signup')}>
              <Text style={[s.modeBtnText, mode === 'signup' && s.modeBtnTextActive]}>First time</Text>
            </TouchableOpacity>
          </View>

          {mode === 'signup' && (
            <>
              <Text style={s.label}>Full name</Text>
              <TextInput style={s.input} value={fullName} onChangeText={setFullName} placeholder="Your name" autoCapitalize="words" />
              <Text style={s.label}>Your role</Text>
              <TextInput style={s.input} value={role} onChangeText={setRole} placeholder="e.g. Bosun, Deckhand, Chief Stew" autoCapitalize="words" />
            </>
          )}

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input} value={email} onChangeText={setEmail}
            placeholder="your@email.com" keyboardType="email-address"
            autoCapitalize="none" autoCorrect={false}
          />

          <Text style={s.label}>Password</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

          {mode === 'signup' && (
            <>
              <Text style={[s.label, { marginTop: 20 }]}>Your department</Text>
              <View style={s.deptGrid}>
                {DEPARTMENTS.map(d => {
                  const cfg = DEPT_CONFIG[d.key];
                  const selected = dept === d.key;
                  return (
                    <TouchableOpacity
                      key={d.key}
                      style={[s.deptCard, selected && { borderColor: cfg.color, backgroundColor: cfg.soft }]}
                      onPress={() => setDept(d.key)}
                    >
                      <View style={[s.deptIcon, { backgroundColor: cfg.color }]}>
                        <Text style={{ fontSize: 18 }}>{d.icon}</Text>
                      </View>
                      <Text style={[s.deptLabel, selected && { color: cfg.color }]}>{cfg.label}</Text>
                      <Text style={s.deptSub}>{d.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {mode === 'signup' && (
            <TouchableOpacity
              style={[s.hodToggle, isDeptHead && s.hodToggleActive]}
              onPress={() => setIsDeptHead(!isDeptHead)}
            >
              <View style={[s.hodCheck, isDeptHead && s.hodCheckActive]}>
                {isDeptHead && <Ionicons name="checkmark" size={12} color="white" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.hodLabel, isDeptHead && { color: COLORS.ink }]}>I'm a department head or officer</Text>
                <Text style={s.hodSub}>Bosun · Chief Stew · Chief Engineer · Head Chef · Captain</Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.submit} onPress={handleSubmit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={s.submitText}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
            }
          </TouchableOpacity>

          {/* Vessel join code — required for signup */}
          {mode === 'signup' && (
            <>
              <Text style={[s.label, { marginTop: 4 }]}>Vessel join code</Text>
              <View style={s.codeRow}>
                <TextInput
                  style={[s.codeInput, vesselName ? s.codeInputValid : null]}
                  value={joinCode}
                  onChangeText={handleCodeChange}
                  placeholder="XXXXXX"
                  placeholderTextColor={COLORS.inkMute}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                />
                {vesselName ? (
                  <View style={s.vesselFound}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.done} />
                    <Text style={s.vesselFoundTxt}>{vesselName}</Text>
                  </View>
                ) : joinCode.length === 6 ? (
                  <View style={s.vesselFound}>
                    <Ionicons name="close-circle" size={14} color={COLORS.alert} />
                    <Text style={[s.vesselFoundTxt, { color: COLORS.alert }]}>Code not found</Text>
                  </View>
                ) : null}
              </View>
              <Text style={s.codeHint}>Ask your captain or vessel manager for the code.</Text>
            </>
          )}

          <Text style={s.foot}>
            Your account follows you between vessels. Most crew see only their department; officers can oversee any department from inside the app.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#1c1917' },
  scroll: { padding: 24, paddingBottom: 48, alignItems: 'center' },
  logo: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: '#0c4a6e',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 48, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  appName: { fontSize: 28, fontWeight: '800', color: 'white', letterSpacing: -0.5, fontFamily: 'Inter_800ExtraBold' },
  vesselName: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4, marginBottom: 28, fontFamily: 'Inter_500Medium' },
  card: {
    width: '100%', maxWidth: 440,
    backgroundColor: 'white', borderRadius: 18, padding: 28,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 32, shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  modeRow: { flexDirection: 'row', backgroundColor: COLORS.surface2, borderRadius: 10, padding: 3, marginBottom: 20 },
  modeBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  modeBtnActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.inkMute, fontFamily: 'Inter_600SemiBold' },
  modeBtnTextActive: { color: COLORS.ink },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.inkMute, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, fontFamily: 'Inter_700Bold' },
  input: {
    borderWidth: 1, borderColor: COLORS.ruleStrong, borderRadius: 9,
    padding: 12, fontSize: 14, color: COLORS.ink, marginBottom: 16,
    fontFamily: 'Inter_400Regular',
  },
  deptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  deptCard: {
    width: '47%', padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.rule,
    backgroundColor: 'white',
  },
  deptIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  deptLabel: { fontSize: 15, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold' },
  deptSub: { fontSize: 11, color: COLORS.inkMute, marginTop: 2, fontFamily: 'Inter_400Regular' },
  submit: {
    backgroundColor: COLORS.ink, borderRadius: 9, padding: 14,
    alignItems: 'center', marginTop: 4, marginBottom: 8,
  },
  submitText: { color: 'white', fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  codeRow: { gap: 8, marginBottom: 4 },
  codeInput: {
    borderWidth: 1, borderColor: COLORS.ruleStrong, borderRadius: 9,
    padding: 12, fontSize: 18, color: COLORS.ink, letterSpacing: 6,
    fontFamily: 'JetBrainsMono_500Medium', textAlign: 'center',
  },
  codeInputValid: { borderColor: COLORS.done, backgroundColor: COLORS.doneSoft },
  vesselFound: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 2 },
  vesselFoundTxt: { fontSize: 12, color: COLORS.done, fontFamily: 'Inter_600SemiBold' },
  codeHint: { fontSize: 11, color: COLORS.inkMute, fontFamily: 'Inter_400Regular', marginBottom: 16 },
  foot: { fontSize: 11, color: COLORS.inkMute, lineHeight: 16, marginTop: 16, borderTopWidth: 1, borderTopColor: COLORS.rule, paddingTop: 16, fontFamily: 'Inter_400Regular' },
  hodToggle: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.rule,
    backgroundColor: 'white', marginBottom: 16,
  },
  hodToggleActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  hodCheck: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: COLORS.ruleStrong,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  hodCheckActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  hodLabel: { fontSize: 13, fontWeight: '600', color: COLORS.inkSoft, fontFamily: 'Inter_600SemiBold' },
  hodSub: { fontSize: 11, color: COLORS.inkMute, marginTop: 2, fontFamily: 'Inter_400Regular' },
});
