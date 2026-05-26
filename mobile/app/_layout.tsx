import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '../hooks/useAuth';
import { usePushNotifications } from '../hooks/usePushNotifications';

// ─── Global error handler ────────────────────────────────────────────────────
// Catches JS errors that happen before React renders (e.g. module-load throws).
// Output appears in `adb logcat` on Android; use to diagnose production crashes.
const _prevHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error(
    `[YachtOps] ${isFatal ? 'FATAL' : 'non-fatal'} JS error:`,
    error?.message ?? error,
    '\n',
    error?.stack ?? ''
  );
  _prevHandler?.(error, isFatal);
});

// ─── Error boundary ───────────────────────────────────────────────────────────
// Catches errors thrown during React rendering so the APK shows a readable
// crash screen instead of a blank screen.
type BoundaryState = { error: Error | null };
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] render crash:', error.message, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <View style={s.crash}>
          <Text style={s.crashTitle}>YachtOps crashed</Text>
          <Text style={s.crashSub}>Check adb logcat for full stack trace</Text>
          <ScrollView style={s.crashScroll}>
            <Text style={s.crashMsg}>{error.message}</Text>
            <Text style={s.crashStack}>{error.stack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Root layout ──────────────────────────────────────────────────────────────
function RootLayout() {
  const { session, profile, loading } = useAuth();
  usePushNotifications(profile?.id);
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (loading || !fontsLoaded) return;
    const inAuth = segments[0] === '(auth)';
    if (!session) {
      if (!inAuth) router.replace('/(auth)');
    } else if (!profile) {
      if (!inAuth) router.replace('/(auth)');
    } else {
      if (inAuth) router.replace('/(app)/worklist');
    }
  }, [session, profile, loading, fontsLoaded, segments]);

  if (loading || !fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Slot />
    </GestureHandlerRootView>
  );
}

export default function Root() {
  return (
    <ErrorBoundary>
      <RootLayout />
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  crash: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    padding: 24,
    paddingTop: 60,
  },
  crashTitle: {
    color: '#f38ba8',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  crashSub: {
    color: '#a6adc8',
    fontSize: 13,
    marginBottom: 16,
  },
  crashScroll: {
    flex: 1,
  },
  crashMsg: {
    color: '#cdd6f4',
    fontSize: 14,
    marginBottom: 12,
  },
  crashStack: {
    color: '#6c7086',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
