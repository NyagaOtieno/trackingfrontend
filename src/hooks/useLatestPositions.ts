import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchLatestPositions } from "@/api/positions";
import { useFleetStore } from "@/hooks/useFleetStore";

export function useLatestPositions() {
  const setIsConnected = useFleetStore((s) => s.setIsConnected);
  const setLastUpdated = useFleetStore((s) => s.setLastUpdated);

  const query = useQuery({
    queryKey:             ["positions"],
    queryFn:              () => fetchLatestPositions({ limit: 5_000, offset: 0 }),
    refetchInterval:      5_000,
    staleTime:            4_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect:   true,
    retry:                1,
  });

  // ✅ KEY FIX: use dataUpdatedAt (a timestamp that changes on EVERY successful
  // refetch) instead of isSuccess (which stays true after the first fetch and
  // never changes again → lastUpdated was freezing at the first fetch time).
  useEffect(() => {
    if (query.dataUpdatedAt > 0) {
      setIsConnected(true);
      setLastUpdated(new Date(query.dataUpdatedAt));
    }
  }, [query.dataUpdatedAt, setIsConnected, setLastUpdated]);

  useEffect(() => {
    if (query.isError) setIsConnected(false);
  }, [query.isError, setIsConnected]);

  return query;
}