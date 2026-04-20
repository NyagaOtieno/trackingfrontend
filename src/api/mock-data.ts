import type { Device, Position, HistoryPoint } from '@/types/fleet';

const NAIROBI_CENTER = { lat: -1.2921, lon: 36.8219 };

const vehicleNames = [
  'Transporter Alpha', 'Cargo Runner', 'City Express', 'Highway Mover',
  'Fleet Eagle', 'Swift Hauler', 'Metro Van', 'Route King',
  'Delivery Pro', 'Night Crawler', 'Road Master', 'Quick Ship',
];

const plates = [
  'KBA 100A', 'KCB 201B', 'KDD 302C', 'KBZ 403D',
  'KCA 504E', 'KDE 605F', 'KBB 706G', 'KCF 807H',
  'KDA 908I', 'KBE 010J', 'KCC 111K', 'KDF 212L',
];

export const mockDevices: Device[] = vehicleNames.map((label, i) => ({
  deviceUid: `IMEI_${100000 + i}`,
  label,
  vehicleReg: plates[i],
}));

// Each vehicle drifts around Nairobi
const vehicleStates: Record<string, { lat: number; lon: number; speed: number; heading: number }> = {};

mockDevices.forEach((d, i) => {
  const angle = (i / mockDevices.length) * Math.PI * 2;
  vehicleStates[d.deviceUid] = {
    lat: NAIROBI_CENTER.lat + Math.cos(angle) * 0.03 * (1 + Math.random()),
    lon: NAIROBI_CENTER.lon + Math.sin(angle) * 0.03 * (1 + Math.random()),
    speed: 20 + Math.random() * 60,
    heading: Math.random() * 360,
  };
});

export function getLatestPositions(): Position[] {
  return mockDevices.map((d, i) => {
    const state = vehicleStates[d.deviceUid];
    // Drift vehicles
    const drift = 0.00008;
    state.lat += (Math.random() - 0.5) * drift;
    state.lon += (Math.random() - 0.5) * drift;
    state.speed = Math.max(0, state.speed + (Math.random() - 0.5) * 3);
    state.heading = (state.heading + (Math.random() - 0.5) * 8 + 360) % 360;

    // Some vehicles go offline
    const isOffline = i % 5 === 4;

    return {
      deviceUid: d.deviceUid,
      lat: state.lat,
      lon: state.lon,
      speedKph: isOffline ? 0 : Math.round(state.speed),
      heading: Math.round(state.heading),
      deviceTime: null,
      receivedAt: isOffline
        ? new Date(Date.now() - 1000 * 60 * 30).toISOString()
        : new Date().toISOString(),
    };
  });
}

export function getHistory(deviceUid: string, limit: number = 100): HistoryPoint[] {
  const state = vehicleStates[deviceUid];
  if (!state) return [];

  const points: HistoryPoint[] = [];
  let lat = state.lat;
  let lon = state.lon;

  for (let i = 0; i < limit; i++) {
    lat -= (Math.random() - 0.5) * 0.001;
    lon -= (Math.random() - 0.5) * 0.001;
    points.push({
      id: `${deviceUid}-hist-${i}`,
      deviceUid,
      lat,
      lon,
      receivedAt: new Date(Date.now() - i * 60000).toISOString(),
      speedKph: Math.round(20 + Math.random() * 60),
    });
  }

  return points.reverse();
}
