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

      const vehicles = vehiclesRes.data.data;
      const telemetry = telemetryRes.data.data;

      // 🔥 TEMP MATCH (since no real relation exists)
      return telemetry.map((t: any, index: number) => {
        const vehicle = vehicles[index]; // ⚠️ TEMP: match by index

        return {
          deviceUid: t.device_id,
          lat: t.latitude,
          lon: t.longitude,
          speedKph: t.speed,
          receivedAt: t.signal_time,

          // 🔥 IMPORTANT
          vehicleReg: vehicle?.plate_number ?? "Unknown",
        };
      });
    },
    refetchInterval: 5000,
  });
}