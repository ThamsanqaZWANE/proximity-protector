import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Contact = {
  id: string;
  name: string;
  role: string;
  phone: string;
};

export type AlertKind = "sos" | "crash" | "shake";

export type ActiveAlert = {
  kind: AlertKind;
  startedAt: number;
  /** seconds until the team is auto-dispatched */
  window: number;
  coords: Coords | null;
};

export type LogEntry = {
  id: string;
  at: number;
  kind: AlertKind;
  outcome: "dispatched" | "cancelled";
  coords: Coords | null;
};

export type Coords = {
  lat: number;
  lon: number;
  accuracy: number;
};

export type SpeedSample = { at: number; kmh: number };

const CONTACTS_KEY = "aa-security.contacts";
const LOG_KEY = "aa-security.log";

const DEFAULT_CONTACTS: Contact[] = [
  { id: "c1", name: "Marcus Kane", role: "Field lead", phone: "+27 82 441 0192" },
  { id: "c2", name: "Dr. Reyes", role: "Medical on-call", phone: "+27 11 710 0044" },
  { id: "c3", name: "Control Room", role: "Dispatch", phone: "+27 11 710 0000" },
];

/** Windows, in seconds, before the security team is automatically dispatched. */
export const DISPATCH_WINDOW: Record<AlertKind, number> = {
  sos: 40,
  crash: 60,
  shake: 7 * 60,
};

export const ALERT_LABEL: Record<AlertKind, string> = {
  sos: "Help requested",
  crash: "Possible crash",
  shake: "Shake detected",
};

type SafetyValue = {
  hydrated: boolean;
  contacts: Contact[];
  addContact: (c: Omit<Contact, "id">) => void;
  removeContact: (id: string) => void;
  log: LogEntry[];
  clearLog: () => void;

  tracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  geoError: string | null;
  speedKmh: number;
  peakKmh: number;
  coords: Coords | null;
  history: SpeedSample[];

  shakeArmed: boolean;
  setShakeArmed: (v: boolean) => void;
  shakeSupported: boolean;
  shakeError: string | null;
  requestShakePermission: () => Promise<void>;
  jolt: number;

  alert: ActiveAlert | null;
  secondsLeft: number;
  raise: (kind: AlertKind) => void;
  cancel: () => void;
  dispatchNow: () => void;
};

const SafetyContext = createContext<SafetyValue | null>(null);

const CRASH_SPEED = 45; // km/h considered "travelling fast"
const CRASH_STOP = 6; // km/h considered "stopped"
const CRASH_LOOKBACK = 8000; // ms
const SHAKE_THRESHOLD = 28; // m/s^2 combined delta

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function SafetyProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>(DEFAULT_CONTACTS);
  const [log, setLog] = useState<LogEntry[]>([]);

  const [tracking, setTracking] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [peakKmh, setPeakKmh] = useState(0);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [history, setHistory] = useState<SpeedSample[]>([]);

  const [shakeArmed, setShakeArmed] = useState(true);
  const [shakeSupported, setShakeSupported] = useState(true);
  const [shakeError, setShakeError] = useState<string | null>(null);
  const [jolt, setJolt] = useState(0);

  const [alert, setAlert] = useState<ActiveAlert | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const coordsRef = useRef<Coords | null>(null);
  const historyRef = useRef<SpeedSample[]>([]);
  const alertRef = useRef<ActiveAlert | null>(null);
  const shakeArmedRef = useRef(true);

  coordsRef.current = coords;
  alertRef.current = alert;
  shakeArmedRef.current = shakeArmed;

  useEffect(() => {
    setContacts(readJSON<Contact[]>(CONTACTS_KEY, DEFAULT_CONTACTS));
    setLog(readJSON<LogEntry[]>(LOG_KEY, []));
    setShakeSupported(typeof window !== "undefined" && "DeviceMotionEvent" in window);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  }, [contacts, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(LOG_KEY, JSON.stringify(log));
  }, [log, hydrated]);

  const raise = useCallback((kind: AlertKind) => {
    if (alertRef.current) return;
    const next: ActiveAlert = {
      kind,
      startedAt: Date.now(),
      window: DISPATCH_WINDOW[kind],
      coords: coordsRef.current,
    };
    alertRef.current = next;
    setAlert(next);
    setSecondsLeft(next.window);
  }, []);

  const finish = useCallback((outcome: LogEntry["outcome"]) => {
    const current = alertRef.current;
    if (!current) return;
    alertRef.current = null;
    setAlert(null);
    setSecondsLeft(0);
    setLog((prev) =>
      [
        {
          id: `${current.startedAt}-${outcome}`,
          at: Date.now(),
          kind: current.kind,
          outcome,
          coords: current.coords,
        },
        ...prev,
      ].slice(0, 30),
    );
  }, []);

  const cancel = useCallback(() => finish("cancelled"), [finish]);
  const dispatchNow = useCallback(() => finish("dispatched"), [finish]);

  // countdown
  useEffect(() => {
    if (!alert) return;
    const id = window.setInterval(() => {
      const left = Math.max(
        0,
        alert.window - Math.floor((Date.now() - alert.startedAt) / 1000),
      );
      setSecondsLeft(left);
      if (left === 0) finish("dispatched");
    }, 250);
    return () => window.clearInterval(id);
  }, [alert, finish]);

  // location + speed
  const startTracking = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoError("This device has no location service.");
      return;
    }
    if (watchIdRef.current !== null) return;
    setGeoError(null);
    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const kmh = Math.max(0, Math.round((pos.coords.speed ?? 0) * 3.6));
        const at = Date.now();
        setCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setSpeedKmh(kmh);
        setPeakKmh((p) => Math.max(p, kmh));

        const next = [...historyRef.current, { at, kmh }].slice(-48);
        historyRef.current = next;
        setHistory(next);

        const wasFast = next.some(
          (s) => s.at >= at - CRASH_LOOKBACK && s.at < at - 400 && s.kmh >= CRASH_SPEED,
        );
        if (wasFast && kmh <= CRASH_STOP) raise("crash");
      },
      (err) => {
        setGeoError(err.message || "Location permission denied.");
        setTracking(false);
        watchIdRef.current = null;
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }, [raise]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    setSpeedKmh(0);
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // shake detection
  const attachMotion = useCallback(() => {
    let last = { x: 0, y: 0, z: 0 };
    let lastFire = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const x = a.x ?? 0;
      const y = a.y ?? 0;
      const z = a.z ?? 0;
      const delta =
        Math.abs(x - last.x) + Math.abs(y - last.y) + Math.abs(z - last.z);
      last = { x, y, z };
      setJolt((j) => Math.max(delta, j * 0.9));
      const now = Date.now();
      if (
        delta > SHAKE_THRESHOLD &&
        shakeArmedRef.current &&
        !alertRef.current &&
        now - lastFire > 2000
      ) {
        lastFire = now;
        raise("shake");
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [raise]);

  useEffect(() => {
    if (!hydrated || !shakeSupported) return;
    return attachMotion();
  }, [hydrated, shakeSupported, attachMotion]);

  const requestShakePermission = useCallback(async () => {
    type MotionCtor = { requestPermission?: () => Promise<PermissionState | string> };
    const ctor = (window as unknown as { DeviceMotionEvent?: MotionCtor }).DeviceMotionEvent;
    if (ctor?.requestPermission) {
      try {
        const res = await ctor.requestPermission();
        if (res !== "granted") setShakeError("Motion access was denied.");
        else setShakeError(null);
      } catch {
        setShakeError("Motion access could not be requested.");
      }
    }
  }, []);

  const addContact = useCallback((c: Omit<Contact, "id">) => {
    setContacts((prev) => [...prev, { ...c, id: `c${Date.now()}` }]);
  }, []);

  const removeContact = useCallback((id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearLog = useCallback(() => setLog([]), []);

  const value = useMemo<SafetyValue>(
    () => ({
      hydrated,
      contacts,
      addContact,
      removeContact,
      log,
      clearLog,
      tracking,
      startTracking,
      stopTracking,
      geoError,
      speedKmh,
      peakKmh,
      coords,
      history,
      shakeArmed,
      setShakeArmed,
      shakeSupported,
      shakeError,
      requestShakePermission,
      jolt,
      alert,
      secondsLeft,
      raise,
      cancel,
      dispatchNow,
    }),
    [
      hydrated,
      contacts,
      addContact,
      removeContact,
      log,
      clearLog,
      tracking,
      startTracking,
      stopTracking,
      geoError,
      speedKmh,
      peakKmh,
      coords,
      history,
      shakeArmed,
      shakeSupported,
      shakeError,
      requestShakePermission,
      jolt,
      alert,
      secondsLeft,
      raise,
      cancel,
      dispatchNow,
    ],
  );

  return <SafetyContext.Provider value={value}>{children}</SafetyContext.Provider>;
}

export function useSafety() {
  const ctx = useContext(SafetyContext);
  if (!ctx) throw new Error("useSafety must be used inside SafetyProvider");
  return ctx;
}

export function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function mapsLink(coords: Coords | null) {
  if (!coords) return null;
  return `https://www.google.com/maps?q=${coords.lat},${coords.lon}`;
}
