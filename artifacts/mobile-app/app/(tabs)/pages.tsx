import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { useGetPublicNav } from '@workspace/api-client-react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PagesScreen() {
  const colors = useColors();
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: navItems, isLoading, error, refetch, isRefetching } = useGetPublicNav();

  const topPad = Platform.OS === 'web' ? 67 : 0;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>Failed to load pages</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={[styles.retry, { color: colors.accent }]}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pages = navItems?.filter((p) => !p.isHomepage) ?? [];

  if (!pages.length) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="file-text" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>No pages available</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.accent}
        />
      }
    >
      <Text style={[styles.heading, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>
        {isRTL ? 'الصفحات' : 'Pages'}
      </Text>
      <View style={styles.list}>
        {pages.map((page) => (
          <TouchableOpacity
            key={page.id}
            style={[
              styles.pageItem,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius * 2,
              },
            ]}
            onPress={() => router.push(`/page/${page.slug}` as never)}
            activeOpacity={0.75}
          >
            <View style={[styles.pageItemInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View
                style={[
                  styles.pageIcon,
                  {
                    backgroundColor: colors.accent + '18',
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Feather name="file-text" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.pageTitle,
                    {
                      color: colors.foreground,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                >
                  {t(page.titleAr, page.titleEn)}
                </Text>
                <Text
                  style={[
                    styles.pageSlug,
                    {
                      color: colors.mutedForeground,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                >
                  /{page.slug}
                </Text>
              </View>
              <Feather
                name={isRTL ? 'chevron-left' : 'chevron-right'}
                size={18}
                color={colors.mutedForeground}
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ height: Platform.OS === 'web' ? 34 : 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 20,
    fontFamily: 'Inter_700Bold',
  },
  list: {
    gap: 12,
  },
  pageItem: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  pageItemInner: {
    padding: 18,
    alignItems: 'center',
    gap: 14,
  },
  pageIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
    fontFamily: 'Inter_600SemiBold',
  },
  pageSlug: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
  },
  retry: {
    fontSize: 14,
    textDecorationLine: 'underline',
    fontFamily: 'Inter_400Regular',
  },
});
