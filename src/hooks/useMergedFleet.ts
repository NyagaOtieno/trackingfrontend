import { useFleetDevices } from "@/hooks/useFleetDevices";
import { useLatestPositions } from "@/hooks/useLatestPositions";

/**
 * SAFE preloader
 * Only enable when explicitly needed
 */
export function useMergedFleet(enabled: boolean = false) {
  useFleetDevices({ enabled });
  useLatestPositions({ enabled });
}