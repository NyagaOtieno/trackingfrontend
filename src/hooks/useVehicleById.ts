import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

export function useVehicleById(id?: string | number) {
  return useQuery({
    queryKey: ["vehicle", id],
    enabled: !!id,

    queryFn: async () => {
      const res = await apiClient.get(`/vehicles/${id}`);
      return res.data;
    },
  });
}