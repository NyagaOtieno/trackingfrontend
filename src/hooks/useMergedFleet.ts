import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API = "http://100.50.173.65:4000";

export function useMergedFleet() {
  return useQuery({
    queryKey: ["fleet-merged"],
    queryFn: async () => {
      const [vehiclesRes, telemetryRes] = await Promise.all([
        axios.get(`${API}/api/vehicles`),
        axios.get(`${API}/api/telemetry/latest`),
      ]);

      const vehicles = vehiclesRes.data.data || [];
      const telemetry = telemetryRes.data.data || [];

      // 🔥 Build telemetry map (correct matching)
      const posMap = new Map<string, any>();

      for (const t of telemetry) {
        const key = String(t.device_id ?? "").trim();
        if (key) posMap.set(key, t);
      }

      return vehicles.map((v: any) => {
        const key = String(v.deviceUid ?? v.device_uid ?? "").trim();
        const t = posMap.get(key);

        return {
          ...v,
          position: t
            ? {
                deviceUid: key,
                lat: t.latitude,
                lon: t.longitude,
                speedKph: t.speed,
                receivedAt: t.signal_time,
              }
            : null,
        };
      });
    },
    refetchInterval: 5000,
  });
}