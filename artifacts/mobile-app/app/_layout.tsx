import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { setBaseUrl } from '@workspace/api-client-react';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';
import { useColors } from '@/hooks/useColors';

// Set the base URL once at module load so all API calls resolve correctly.
// EXPO_PUBLIC_DOMAIN is injected by the dev workflow and matches REPLIT_DEV_DOMAIN.
if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function LanguageToggleButton() {
  const { lang, toggleLanguage } = useLanguage();
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={toggleLanguage}
      style={[styles.langBtn, { backgroundColor: colors.accent + '22', borderRadius: colors.radius }]}
      activeOpacity={0.75}
    >
      <Text style={[styles.langBtnText, { color: colors.accent }]}>
        {lang === 'en' ? 'عربي' : 'EN'}
      </Text>
    </TouchableOpacity>
  );
}

function RootLayoutNav() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        headerRight: () => <LanguageToggleButton />,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="page/[slug]"
        options={{
          headerBackTitle: 'Back',
          headerTitle: '',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <LanguageProvider>
                <RootLayoutNav />
              </LanguageProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
});
