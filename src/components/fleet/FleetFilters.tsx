import { useFleetStore } from "@/hooks/useFleetStore";
import type { FilterStatus, FilterCountMap } from "@/types/fleet";

interface FleetFiltersProps {
  counts: FilterCountMap;
}

const filters: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "online", label: "Online" },
  { key: "offline", label: "Offline" },
  { key: "expired", label: "Expired" },
  { key: "alerts", label: "Alerts" },
];

export function FleetFilters({ counts }: FleetFiltersProps) {
  const { filterStatus, setFilterStatus } = useFleetStore();

  return (
    <div className="px-3 pb-2 flex flex-wrap gap-1">
      {filters.map((f) => {
        const active = filterStatus === f.key;

        return (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`text-[11px] px-2 py-1 rounded-md transition ${
              active
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {f.label} ({counts[f.key]})
          </button>
        );
      })}
    </div>
  );
}