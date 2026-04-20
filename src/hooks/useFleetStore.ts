import { create } from "zustand";
import type { FilterStatus } from "@/types/fleet";

export interface GeofenceAlertItem {
  id: string;
  deviceUid: string;
  geofenceId: string;
  geofenceName: string;
  type: "ENTER" | "EXIT";
  time: string;
}

export interface GeofenceItem {
  id: string;
  name: string;
  center: [number, number];
  radius: number;
  active?: boolean;
}

interface FleetStore {
  selectedDeviceUid: string | null;
  searchQuery: string;
  filterStatus: FilterStatus;
  historyMode: boolean;
  historyRange: string;

  playbackActive: boolean;
  playbackIndex: number;
  playbackSpeedMs: number;

  autoFollow: boolean;
  isConnected: boolean;
  lastUpdated: Date | null;
  centerRequested: number;
  alertsOpen: boolean;

  geofences: GeofenceItem[];
  geofenceAlerts: GeofenceAlertItem[];

  setSelectedDevice: (uid: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: FilterStatus) => void;
  setHistoryMode: (value: boolean) => void;
  setHistoryRange: (value: string) => void;

  setPlaybackActive: (value: boolean) => void;
  setPlaybackIndex: (value: number) => void;
  stepPlaybackForward: (max: number) => void;
  stepPlaybackBackward: () => void;
  resetPlayback: () => void;
  setPlaybackSpeedMs: (value: number) => void;

  setAutoFollow: (value: boolean) => void;
  setIsConnected: (value: boolean) => void;
  setLastUpdated: (value: Date | null) => void;
  requestCenter: () => void;
  setAlertsOpen: (value: boolean) => void;

  addGeofence: (item: GeofenceItem) => void;
  removeGeofence: (id: string) => void;
  addGeofenceAlert: (item: GeofenceAlertItem) => void;
  clearGeofenceAlerts: () => void;
}

export const useFleetStore = create<FleetStore>((set, get) => ({
  selectedDeviceUid: null,
  searchQuery: "",
  filterStatus: "all",
  historyMode: false,
  historyRange: "30m",

  playbackActive: false,
  playbackIndex: 0,
  playbackSpeedMs: 1200,

  autoFollow: true,
  isConnected: true,
  lastUpdated: null,
  centerRequested: 0,
  alertsOpen: false,

  geofences: [],
  geofenceAlerts: [],

  setSelectedDevice: (uid) =>
    set({
      selectedDeviceUid: uid,
      centerRequested: uid ? get().centerRequested + 1 : get().centerRequested,
    }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setHistoryMode: (value) => set({ historyMode: value }),
  setHistoryRange: (value) => set({ historyRange: value }),

  setPlaybackActive: (value) => set({ playbackActive: value }),
  setPlaybackIndex: (value) => set({ playbackIndex: Math.max(0, value) }),

  stepPlaybackForward: (max) =>
    set((state) => {
      if (max <= 0) return { playbackActive: false, playbackIndex: 0 };

      const next = state.playbackIndex + 1;
      if (next >= max) {
        return { playbackIndex: max - 1, playbackActive: false };
      }

      return { playbackIndex: next };
    }),

  stepPlaybackBackward: () =>
    set((state) => ({
      playbackIndex: Math.max(0, state.playbackIndex - 1),
    })),

  resetPlayback: () =>
    set({
      playbackActive: false,
      playbackIndex: 0,
    }),

  setPlaybackSpeedMs: (value) =>
    set({
      playbackSpeedMs: Math.max(200, value),
    }),

  setAutoFollow: (value) => set({ autoFollow: value }),
  setIsConnected: (value) => set({ isConnected: value }),
  setLastUpdated: (value) => set({ lastUpdated: value }),

  requestCenter: () =>
    set((state) => ({ centerRequested: state.centerRequested + 1 })),

  setAlertsOpen: (value) => set({ alertsOpen: value }),

  addGeofence: (item) =>
    set((state) => ({
      geofences: [...state.geofences, item],
    })),

  removeGeofence: (id) =>
    set((state) => ({
      geofences: state.geofences.filter((g) => g.id !== id),
    })),

  addGeofenceAlert: (item) =>
    set((state) => ({
      geofenceAlerts: [item, ...state.geofenceAlerts].slice(0, 100),
    })),

  clearGeofenceAlerts: () => set({ geofenceAlerts: [] }),
}));