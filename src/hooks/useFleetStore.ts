import { create } from "zustand";
import type { FilterStatus } from "@/types/fleet";

/**
 * =========================
 * TYPES
 * =========================
 */

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

/**
 * =========================
 * INTERNAL SAFE TYPES
 * =========================
 */
type DeviceKey = string;

interface FleetStore {
  /**
   * =========================
   * DEVICE STATE
   * =========================
   */
  selectedDeviceUid: DeviceKey | null;

  /**
   * =========================
   * UI STATE
   * =========================
   */
  searchQuery: string;
  filterStatus: FilterStatus;

  /**
   * =========================
   * HISTORY + PLAYBACK
   * =========================
   */
  historyMode: boolean;
  historyRange: string;

  playbackActive: boolean;
  playbackIndex: number;
  playbackSpeedMs: number;

  /**
   * =========================
   * LIVE STATE
   * =========================
   */
  autoFollow: boolean;
  isConnected: boolean;
  lastUpdated: string | null;

  /**
   * forces map recenter trigger (safe reactive signal)
   */
  centerRequested: number;

  /**
   * =========================
   * UI CONTROLS
   * =========================
   */
  alertsOpen: boolean;

  /**
   * =========================
   * GEOFENCING
   * =========================
   */
  geofences: GeofenceItem[];
  geofenceAlerts: GeofenceAlertItem[];

  /**
   * =========================
   * ACTIONS
   * =========================
   */
  setSelectedDevice: (uid: DeviceKey | null) => void;

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
  setLastUpdated: (value: string | null) => void;

  requestCenter: () => void;
  setAlertsOpen: (value: boolean) => void;

  addGeofence: (item: GeofenceItem) => void;
  removeGeofence: (id: string) => void;

  addGeofenceAlert: (item: GeofenceAlertItem) => void;
  clearGeofenceAlerts: () => void;
}

/**
 * =========================
 * SAFE CONSTANTS
 * =========================
 */
const MAX_ALERTS = 100;

/**
 * =========================
 * STORE
 * =========================
 */
export const useFleetStore = create<FleetStore>((set, get) => ({
  /**
   * =========================
   * INITIAL STATE
   * =========================
   */
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

  /**
   * =========================
   * DEVICE SELECTION (IMPROVED SAFETY)
   * =========================
   */
  setSelectedDevice: (uid) =>
    set((state) => ({
      selectedDeviceUid: uid,
      centerRequested: uid
        ? state.centerRequested + 1
        : state.centerRequested,
      autoFollow: uid ? state.autoFollow : false,
    })),

  /**
   * =========================
   * UI STATE
   * =========================
   */
  setSearchQuery: (query) =>
    set(() => ({ searchQuery: query.trimStart() })),

  setFilterStatus: (status) =>
    set(() => ({ filterStatus: status })),

  /**
   * =========================
   * HISTORY
   * =========================
   */
  setHistoryMode: (value) =>
    set(() => ({
      historyMode: value,
      playbackActive: value ? false : get().playbackActive,
    })),

  setHistoryRange: (value) =>
    set(() => ({ historyRange: value })),

  /**
   * =========================
   * PLAYBACK ENGINE (HARDENED)
   * =========================
   */
  setPlaybackActive: (value) =>
    set(() => ({
      playbackActive: value,
    })),

  setPlaybackIndex: (value) =>
    set(() => ({
      playbackIndex: Math.max(0, value),
    })),

  stepPlaybackForward: (max) =>
    set((state) => {
      if (!max || max <= 0) {
        return { playbackActive: false, playbackIndex: 0 };
      }

      const next = state.playbackIndex + 1;

      if (next >= max) {
        return {
          playbackIndex: max - 1,
          playbackActive: false,
        };
      }

      return { playbackIndex: next };
    }),

  stepPlaybackBackward: () =>
    set((state) => ({
      playbackIndex: Math.max(0, state.playbackIndex - 1),
    })),

  resetPlayback: () =>
    set(() => ({
      playbackActive: false,
      playbackIndex: 0,
    })),

  setPlaybackSpeedMs: (value) =>
    set(() => ({
      playbackSpeedMs: Math.max(200, value),
    })),

  /**
   * =========================
   * LIVE STATE
   * =========================
   */
  setAutoFollow: (value) =>
    set(() => ({ autoFollow: value })),

  setIsConnected: (value) =>
    set(() => ({ isConnected: value })),

  setLastUpdated: (value) =>
    set(() => ({ lastUpdated: value })),

  /**
   * =========================
   * MAP CENTER SIGNAL (IMPROVED)
   * =========================
   */
  requestCenter: () =>
    set((state) => ({
      centerRequested: state.centerRequested + 1,
    })),

  /**
   * =========================
   * ALERT UI
   * =========================
   */
  setAlertsOpen: (value) =>
    set(() => ({ alertsOpen: value })),

  /**
   * =========================
   * GEOFENCES
   * =========================
   */
  addGeofence: (item) =>
    set((state) => ({
      geofences: [...state.geofences, item],
    })),

  removeGeofence: (id) =>
    set((state) => ({
      geofences: state.geofences.filter((g) => g.id !== id),
    })),

  /**
   * =========================
   * ALERT BUFFER (OPTIMIZED)
   * =========================
   */
  addGeofenceAlert: (item) =>
    set((state) => {
      const updated = [item, ...state.geofenceAlerts];

      return {
        geofenceAlerts:
          updated.length > MAX_ALERTS
            ? updated.slice(0, MAX_ALERTS)
            : updated,
      };
    }),

  clearGeofenceAlerts: () =>
    set(() => ({ geofenceAlerts: [] })),
}));