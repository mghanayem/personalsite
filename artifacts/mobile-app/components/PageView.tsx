import React from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { SectionRenderer } from '@/components/sections/SectionRenderer';
import { SectionWithImages } from '@workspace/api-client-react';

interface PageViewProps {
  sections: SectionWithImages[];
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function PageView({ sections, isLoading, error, onRefresh, isRefreshing }: PageViewProps) {
  const colors = useColors();

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View style={{ gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.skeleton,
                { backgroundColor: colors.muted, borderRadius: colors.radius },
                i === 1 && { height: 200 },
              ]}
            />
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorIcon, { color: colors.mutedForeground }]}>!</Text>
        <Text style={[styles.errorText, { color: colors.foreground }]}>
          Failed to load content
        </Text>
        {onRefresh && (
          <Text
            style={[styles.retryText, { color: colors.accent }]}
            onPress={onRefresh}
          >
            Tap to retry
          </Text>
        )}
      </View>
    );
  }

  if (!sections.length) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          No content yet
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        ) : undefined
      }
    >
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  skeleton: {
    height: 80,
    width: '100%',
    opacity: 0.6,
  },
  errorIcon: {
    fontSize: 40,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
  },
  retryText: {
    fontSize: 14,
    textDecorationLine: 'underline',
    fontFamily: 'Inter_400Regular',
  },
});
