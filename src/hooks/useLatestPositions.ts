import { useQuery } from "@tanstack/react-query";
import { fetchLatestPositions } from "@/api/positions";
import { useFleetStore } from "@/hooks/useFleetStore";
import { useEffect } from "react";

export function useLatestPositions() {
  const setIsConnected = useFleetStore((s) => s.setIsConnected);
  const setLastUpdated = useFleetStore((s) => s.setLastUpdated);

  const query = useQuery({
    queryKey: ["positions"],
    queryFn: fetchLatestPositions,
    refetchInterval: 5000,
    staleTime: 4000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    if (query.isSuccess) {
      setIsConnected(true);
      setLastUpdated(new Date());
    }
    if (query.isError) {
      setIsConnected(false);
    }
  }, [query.isSuccess, query.isError, setIsConnected, setLastUpdated]);

  return query;
}