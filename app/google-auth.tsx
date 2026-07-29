import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

// Signals to WebBrowser.openAuthSessionAsync that the
// auth session is complete — must be at module level
WebBrowser.maybeCompleteAuthSession();

export default function GoogleAuthScreen() {
  useEffect(() => {
    // Immediately redirect to Today tab once this
    // screen mounts — auth state is already handled
    // by onAuthStateChange in useAuthStore
    router.replace('/(tabs)');
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );
}