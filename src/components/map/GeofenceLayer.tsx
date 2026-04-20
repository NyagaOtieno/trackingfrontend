import { Circle, Popup } from "react-leaflet";
import { useFleetStore } from "@/hooks/useFleetStore";

export function GeofenceLayer() {
  const { geofences } = useFleetStore();

  return (
    <>
      {geofences
        .filter((g) => g.active !== false)
        .map((g) => (
          <Circle
            key={g.id}
            center={g.center}
            radius={g.radius}
            pathOptions={{
              color: "#ef4444",
              fillColor: "#ef4444",
              fillOpacity: 0.12,
              weight: 2,
            }}
          >
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold">{g.name}</div>
                <div>Radius: {g.radius} m</div>
              </div>
            </Popup>
          </Circle>
        ))}
    </>
  );
}

export default GeofenceLayer;