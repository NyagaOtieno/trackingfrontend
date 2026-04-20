import { useQuery } from "@tanstack/react-query";
import { apiClient, unwrapApiResponse } from "@/api/client";
import type { AlertItem, ApiResponse } from "@/types/fleet";

async function fetchAlerts(): Promise<AlertItem[]> {
  try {
    const response = await apiClient.get<ApiResponse<AlertItem[]> | AlertItem[]>(
      "/api/alerts"
    );
    return unwrapApiResponse<AlertItem[]>(response.data) ?? [];
  } catch {
    return [];
  }
}

export function useAlerts() {
  return useQuery<AlertItem[]>({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export default useAlerts;