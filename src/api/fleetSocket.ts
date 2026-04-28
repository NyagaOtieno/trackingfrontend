type Listener = (event: any) => void;
type StatusListener = (status: "connected" | "disconnected" | "reconnecting") => void;

class FleetSocket {
  private ws: WebSocket | null = null;

  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();

  private connected = false;
  private manuallyClosed = false;

  private url: string | null = null;

  private queue: any[] = [];
  private maxQueueSize = 200;

  // 🔥 reconnection control
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private maxReconnectDelay = 15000;

  /**
   * CONNECT
   */
  connect(url?: string) {
    if (this.ws && this.connected) return;

    this.url = url || import.meta.env.VITE_WS_URL;

    if (!this.url) {
      console.error("❌ FleetSocket: Missing VITE_WS_URL");
      return;
    }

    this.manuallyClosed = false;

    this.createConnection();
  }

  /**
   * INTERNAL CONNECTION HANDLER
   */
  private createConnection() {
    if (!this.url) return;

    this.notifyStatus("reconnecting");

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.connected = true;
      this.reconnectAttempts = 0;

      this.notifyStatus("connected");
      console.log("✅ Fleet socket connected");

      this.flushQueue();
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.ws = null;

      this.notifyStatus("disconnected");
      console.warn("⚠️ Fleet socket disconnected");

      if (!this.manuallyClosed) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (err) => {
      console.error("❌ Fleet socket error:", err);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // safer iteration (prevents mutation crash)
        const snapshot = Array.from(this.listeners);
        for (let i = 0; i < snapshot.length; i++) {
          snapshot[i](data);
        }
      } catch (err) {
        console.error("❌ Socket parse error:", err);
      }
    };
  }

  /**
   * AUTO RECONNECT (EXPONENTIAL BACKOFF)
   */
  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    this.reconnectAttempts++;

    console.log(`🔄 Reconnecting in ${delay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.createConnection();
    }, delay);
  }

  /**
   * FLUSH QUEUE SAFELY
   */
  private flushQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    for (let i = 0; i < this.queue.length; i++) {
      this.send(this.queue[i]);
    }

    this.queue = [];
  }

  /**
   * SUBSCRIBE EVENTS
   */
  subscribe(listener: Listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * SUBSCRIBE CONNECTION STATUS (NEW 🔥)
   */
  onStatusChange(listener: StatusListener) {
    this.statusListeners.add(listener);

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyStatus(status: "connected" | "disconnected" | "reconnecting") {
    const snapshot = Array.from(this.statusListeners);
    for (let i = 0; i < snapshot.length; i++) {
      snapshot[i](status);
    }
  }

  /**
   * SEND SAFE
   */
  send(data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.queue.length < this.maxQueueSize) {
        this.queue.push(data);
      }
      return;
    }

    try {
      this.ws.send(JSON.stringify(data));
    } catch (err) {
      console.error("❌ Send failed:", err);
    }
  }

  /**
   * DISCONNECT CLEANLY
   */
  disconnect() {
    this.manuallyClosed = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
    }

    this.ws = null;
    this.connected = false;

    this.listeners.clear();
    this.statusListeners.clear();
    this.queue = [];

    this.notifyStatus("disconnected");
  }

  /**
   * STATUS
   */
  isConnected() {
    return this.connected;
  }
}

export const fleetSocket = new FleetSocket();