import React from 'react';
import { useGetPublicHomepage } from '@workspace/api-client-react';
import { PageView } from '@/components/PageView';

export default function HomeScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useGetPublicHomepage();

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
