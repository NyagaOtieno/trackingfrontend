import { useQuery } from '@tanstack/react-query';
import { fetchHistory } from '@/api/positions';
import type { HistoryPoint } from '@/types/fleet';

export function useHistory(deviceUid: string | null, range?: { from?: string; to?: string; limit?: number }) {
  return useQuery<HistoryPoint[]>({
    queryKey: ['positions', 'history', deviceUid, range],
    queryFn: () => fetchHistory(deviceUid!, range),
    enabled: !!deviceUid,
    staleTime: 30_000,
    retry: 2,
  });
}
