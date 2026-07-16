import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useGetPublicPage } from '@workspace/api-client-react';
import { PageView } from '@/components/PageView';

export default function PageDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  // The generated hook already enables only when slug is non-empty/non-null
  const { data, isLoading, error, refetch, isRefetching } = useGetPublicPage(slug ?? '');

  return (
    <PageView
      sections={data?.sections ?? []}
      isLoading={isLoading}
      error={error as Error | null}
      onRefresh={refetch}
      isRefreshing={isRefetching}
    />
  );
}
