import { apiClient, unwrapApiResponse } from "./client";
import type { Position, HistoryPoint, ApiResponse } from "@/types/fleet";

/**
 * Fetch the latest live positions from the backend
 */
export async function fetchLatestPositions(): Promise<Position[]> {
  const response = await apiClient.get<ApiResponse<Position[]> | Position[]>(
    "/api/telemetry/latest" // 🔹 use correct endpoint
  );

  return unwrapApiResponse<Position[]>(response.data);
}

/**
 * Fetch historical positions for playback
 */
export async function fetchHistory(
  deviceUid: string,
  params?: { limit?: number; from?: string; to?: string }
): Promise<HistoryPoint[]> {
  const response = await apiClient.get<ApiResponse<HistoryPoint[]> | HistoryPoint[]>(
    "/api/telemetry/history", // 🔹 if your backend has a history route
    {
      params: {
        deviceUid,
        ...params,
      },
    }
  );

  return unwrapApiResponse<HistoryPoint[]>(response.data);
}