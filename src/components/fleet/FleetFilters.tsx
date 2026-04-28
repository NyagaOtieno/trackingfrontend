import { useFleetStore } from "@/hooks/useFleetStore";
import type { FilterStatus, FilterCountMap } from "@/types/fleet";

interface FleetFiltersProps {
  counts: FilterCountMap;
}

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: "all",     label: "All" },
  { key: "online",  label: "Online" },
  { key: "offline", label: "Offline" },
  { key: "alerts",  label: "Alerts" },
];

export function FleetFilters({ counts }: FleetFiltersProps) {
  const { filterStatus, setFilterStatus } = useFleetStore();

  // Guard: if counts somehow undefined, show nothing
  if (!counts) return null;

  return (
    <div className="flex flex-wrap gap-1 px-3 pb-2">
      {FILTERS.map((f) => {
        const active = filterStatus === f.key;
        const count = counts[f.key] ?? 0;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilterStatus(f.key)}
            className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
              active
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {f.label} ({count})
          </button>
        );
      })}
    </div>
  );
}