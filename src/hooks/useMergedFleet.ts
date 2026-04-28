import { useEffect } from "react";
import { useFleetDevices } from "@/hooks/useFleetDevices";
import { useLatestPositions } from "@/hooks/useLatestPositions";

/**
 * Preloads vehicles and positions into react-query cache.
 * Call once at page level — no return value needed.
 */
export function useMergedFleet() {
  useFleetDevices();
  useLatestPositions();
}