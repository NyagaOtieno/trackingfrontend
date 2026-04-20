export interface Device {
  id?: number;

  // UI-required
  deviceUid: string;
  label: string;

  // common display values
  vehicleReg?: string | null;
  clientId?: string | null;
  companyId?: string | null;
  saccoId?: string | null;
  expiresAt?: string | null;
  isExpired?: boolean;
  alertCount?: number;

  // backend aliases / optional joins
  device_uid?: string;
  imei?: string | null;
  simNumber?: string | null;
  sim_number?: string | null;
  protocolType?: string | null;
  protocol_type?: string | null;
  vehicleId?: number | null;
  vehicle_id?: number | null;
  expires_at?: string | null;

  // vehicle fields
  plate_number?: string | null;
  unit_name?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  status?: string | null;
}