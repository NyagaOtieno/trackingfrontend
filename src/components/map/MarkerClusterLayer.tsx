import { memo, useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import type { Position } from "@/types/fleet";

interface Props {
  positions: Position[];
}

const MarkerClusterLayer = memo(({ positions }: Props) => {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerMap = useRef<Map<number, L.Marker>>(new Map());

  useEffect(() => {
    if (!map) return;

    if (!clusterRef.current) {
      clusterRef.current = L.markerClusterGroup({
        chunkedLoading: true,
        chunkInterval: 200,
        chunkDelay: 50,
      });

      map.addLayer(clusterRef.current);
    }

    const cluster = clusterRef.current!;
    const activeIds = new Set<number>();

    positions.forEach((pos) => {
      if (!pos.lat || !pos.lon) return;

      activeIds.add(pos.deviceUid);

      const latLng = L.latLng(pos.lat, pos.lon);
      const existing = markerMap.current.get(pos.deviceUid);

      if (existing) {
        existing.setLatLng(latLng);
      } else {
        const marker = L.marker(latLng, {
          icon: L.divIcon({
            className: "custom-marker",
            html: `
              <div style="
                background:${pos.speedKph > 5 ? "#16a34a" : "#64748b"};
                color:white;
                padding:4px 6px;
                border-radius:6px;
                font-size:10px;
              ">
                ${pos.vehicleReg}
              </div>
            `,
          }),
        }).bindPopup(`
          <b>${pos.vehicleReg}</b><br/>
          Speed: ${pos.speedKph} km/h
        `);

        markerMap.current.set(pos.deviceUid, marker);
        cluster.addLayer(marker);
      }
    });

    // cleanup
    markerMap.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        cluster.removeLayer(marker);
        markerMap.current.delete(id);
      }
    });
  }, [positions, map]);

  return null;
});

export default MarkerClusterLayer;