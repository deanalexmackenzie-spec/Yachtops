import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../lib/constants';

export default function SOPsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>SOPs</Text>
        <Text style={s.sub}>Procedures & manuals · read-only</Text>
      </View>
      <View style={s.placeholder}>
        <Ionicons name="document-text-outline" size={40} color={COLORS.inkMute} />
        <Text style={s.phTitle}>SOPs — Phase 2</Text>
        <Text style={s.phSub}>Ship-specific training manual, numbered procedure PDFs, and crew sign-off roster.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.rule, paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.ink, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 12, color: COLORS.inkMute, marginTop: 2, fontFamily: 'Inter_400Regular' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  phTitle: { fontSize: 16, fontWeight: '700', color: COLORS.inkSoft, fontFamily: 'Inter_700Bold' },
  phSub: { fontSize: 13, color: COLORS.inkMute, textAlign: 'center', lineHeight: 20, fontFamily: 'Inter_400Regular' },
});
