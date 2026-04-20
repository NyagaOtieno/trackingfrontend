import { useAlerts } from "@/hooks/useAlerts";

export function AlertsInbox() {
  const { data: alerts = [] } = useAlerts();

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-3 text-sm font-semibold">Alerts Inbox</div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="rounded-xl border border-border bg-card p-3 shadow-sm"
          >
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm font-semibold">
                {alert.vehicleReg || alert.deviceUid}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(alert.createdAt).toLocaleString()}
              </div>
            </div>

            <div className="text-sm">{alert.message}</div>

            <div className="mt-1 text-xs text-muted-foreground">
              {alert.type}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}