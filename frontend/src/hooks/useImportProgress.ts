import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type ImportStatus =
  | 'idle'
  | 'queued'
  | 'downloading'
  | 'parsing'
  | 'processing'
  | 'completed'
  | 'failed';

export interface ImportProgress {
  status: ImportStatus;
  total?: number;
  processed?: number;
  created?: number;
  updated?: number;
  failed?: number;
  error?: string;
  log_id?: number;
  updated_at?: string;
}

const ACTIVE_STATUSES: ImportStatus[] = ['queued', 'downloading', 'parsing', 'processing'];

export function useImportProgress(sourceId: string | number, enabled = true) {
  const query = useQuery<ImportProgress>({
    queryKey: ['admin', 'xml-sources', sourceId, 'import-progress'],
    queryFn: async () => {
      const { data } = await api.get(`/admin/xml-sources/${sourceId}/import-progress`);
      return data.data;
    },
    enabled,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && ACTIVE_STATUSES.includes(status)) {
        return 2000;
      }
      return false;
    },
  });

  const isActive = ACTIVE_STATUSES.includes(query.data?.status ?? 'idle');
  const isTerminal = query.data?.status === 'completed' || query.data?.status === 'failed';

  return {
    ...query,
    progress: query.data ?? { status: 'idle' as ImportStatus },
    isActive,
    isTerminal,
  };
}
