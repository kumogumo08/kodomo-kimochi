import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ChildProvider } from '@/contexts/ChildContext';
import { PremiumProvider } from '@/contexts/PremiumContext';
import { TutorialProvider } from '@/contexts/TutorialContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PremiumProvider>
        <TutorialProvider>
          <View style={{ flex: 1 }}>
            <ChildProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack>
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="(tabs)"
                    options={{
                      headerShown: false,
                      title: t('tabs.home'),
                    }}
                  />

                  <Stack.Screen
                    name="emotion/[id]"
                    options={{
                      title: '',
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                  <Stack.Screen
                    name="premium"
                    options={{
                      headerBackButtonDisplayMode: 'minimal',
                    }}
                  />
                </Stack>

                <StatusBar style="auto" />
              </ThemeProvider>
            </ChildProvider>
          </View>
        </TutorialProvider>
      </PremiumProvider>
    </GestureHandlerRootView>
  );
}
