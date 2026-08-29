import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { initials, useSafety } from "@/lib/safety";
import { useFakeCall } from "@/components/FakeCallOverlay";

function useBatteryLevel() {
  const [level, setLevel] = useState<number | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number; addEventListener: (e: string, cb: () => void) => void }>;
    };
    if (!nav.getBattery) return;
    let cancelled = false;
    nav.getBattery().then((b) => {
      if (cancelled) return;
      const read = () => setLevel(Math.round(b.level * 100));
      read();
      b.addEventListener("levelchange", read);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return level;
}


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "A.A Private Security — Panic Button & Live Safety Console" },
      {
        name: "description",
        content:
          "Hold the SOS button to dispatch the A.A Private Security team with your live location. Crash detection, shake alerts and instant contact notifications.",
      },
      { property: "og:title", content: "A.A Private Security — Panic Button & Safety Console" },
      {
        property: "og:description",
        content:
          "One-touch emergency dispatch with live GPS, crash detection and shake alerts for A.A Private Security members.",
      },
    ],
  }),
  component: SosScreen,
});

const HOLD_MS = 1200;

function SosScreen() {
  const { speedKmh, coords, tracking, startTracking, geoError, contacts, raise, history } =
    useSafety();
  const fakeCall = useFakeCall();
  const battery = useBatteryLevel();
  const [hold, setHold] = useState(0);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const beginHold = () => {
    const started = Date.now();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / HOLD_MS);
      setHold(p);
      if (p >= 1) {
        window.clearInterval(timerRef.current!);
        timerRef.current = null;
        setHold(0);
        raise("sos");
      }
    }, 40);
  };

  const endHold = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setHold(0);
  };

  const recent = history.slice(-6);

  return (
    <AppShell>
      <div className="px-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[14px] bg-panel p-4 ring-1 ring-line">
            <p className="text-[12px] lowercase text-steel/70">speed</p>
            <p className="mt-1 text-[26px] font-bold leading-none tabular-nums text-slate-50">
              {String(speedKmh).padStart(3, "0")}
            </p>
            <p className="mt-1 text-[12px] lowercase text-steel/60">km/h</p>
          </div>
          <div className="rounded-[14px] bg-panel p-4 ring-1 ring-line">
            <p className="text-[12px] lowercase text-steel/70">gps</p>
            <p
              className={`mt-1 text-[26px] font-bold leading-none lowercase ${coords ? "text-amber" : "text-alarm"}`}
            >
              {coords ? "lock" : "off"}
            </p>
            <p className="mt-1 text-[12px] lowercase text-steel/60">
              {coords ? `±${coords.accuracy} m` : "no fix"}
            </p>
          </div>
          <div className="rounded-[14px] bg-panel p-4 ring-1 ring-line">
            <p className="text-[12px] lowercase text-steel/70">battery</p>
            <p className="mt-1 text-[26px] font-bold leading-none tabular-nums text-slate-50">
              {battery !== null ? `${battery}%` : "--"}
            </p>
            <p className="mt-1 text-[12px] lowercase text-steel/60">phone</p>
          </div>
        </div>

        <button
          onClick={() => fakeCall.start(15)}
          className="mt-3 w-full rounded-full bg-panel py-4 text-[15px] font-semibold lowercase text-slate-100 ring-1 ring-line"
        >
          {fakeCall.pending !== null
            ? `decoy call in ${fakeCall.pending}s`
            : "need an exit? ring me in 15s"}
        </button>
      </div>

      <div className="mt-6 flex flex-col items-center px-6">
        <button
          onPointerDown={beginHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          aria-label="Hold to request immediate help"
          className="sos-pulse relative grid size-[230px] place-items-center rounded-full bg-alarm select-none touch-none"
        >
          <span
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(rgba(255,255,255,0.35) ${hold * 360}deg, transparent 0deg)`,
            }}
          />
          <span className="relative text-center">
            <span className="block text-[15px] lowercase text-alarm-foreground/85">
              hold to call
            </span>
            <span className="mt-2 block text-[64px] font-bold leading-none tracking-tight text-alarm-foreground">
              SOS
            </span>
            <span className="mt-2 block text-[15px] lowercase text-alarm-foreground/80">armed</span>
          </span>
        </button>
        <p className="mt-5 text-[15px] lowercase text-steel/70">dispatch in 40s</p>
        <Link
          to="/record"
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-full bg-panel py-4 text-[15px] font-semibold lowercase text-slate-100 ring-1 ring-line"
        >
          <span className="size-3.5 rounded-full bg-alarm" aria-hidden="true" />
          start recording
        </Link>
      </div>


      <div className="mt-6 px-6">
        <div className="rounded-[13px] bg-panel2 p-4 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <span className={`size-2 rounded-full ${tracking ? "bg-amber tick-blink" : "bg-steel/50"}`} />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel">
                Crash detection
              </span>
            </span>
            <span className="font-mono text-[11px] text-steel/60">
              {tracking ? "Monitoring" : "Standby"}
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-steel/60">
                Speed history
              </p>
              <p className="font-mono text-lg text-slate-100">
                {recent.length > 1
                  ? `${String(recent[0]!.kmh).padStart(3, "0")} → ${String(
                      recent[recent.length - 1]!.kmh,
                    ).padStart(3, "0")}`
                  : "awaiting data"}
              </p>
            </div>
            <div className="flex h-9 items-end gap-1" aria-hidden="true">
              {(recent.length ? recent : [0, 0, 0, 0, 0, 0].map(() => ({ kmh: 0 }))).map(
                (s, i) => (
                  <span
                    key={i}
                    className={`w-2 rounded-sm ${
                      s.kmh >= 45 ? "bg-amber" : s.kmh <= 6 ? "bg-alarm/70" : "bg-steel/55"
                    }`}
                    style={{ height: `${Math.max(6, Math.min(100, s.kmh))}%` }}
                  />
                ),
              )}
            </div>
          </div>
          {geoError ? (
            <p className="mt-3 font-mono text-[11px] text-alarm">{geoError}</p>
          ) : null}
          <button
            onClick={startTracking}
            disabled={tracking}
            className="mt-4 w-full rounded-[11px] bg-alarm py-3.5 text-sm font-semibold tracking-wide text-alarm-foreground ring-1 ring-alarm/40 disabled:bg-panel disabled:text-steel disabled:ring-line"
          >
            {tracking ? "Tracking active" : "Start location tracking"}
          </button>
        </div>
      </div>

      <div className="mt-5 px-6">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel/70">
            Emergency contacts
          </p>
          <Link to="/team" className="font-mono text-[11px] text-steel/60">
            {contacts.length} ready
          </Link>
        </div>
        <div className="divide-y divide-line overflow-hidden rounded-[13px] bg-panel ring-1 ring-line">
          {contacts.slice(0, 3).map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-panel2 font-mono text-[11px] text-steel ring-1 ring-line">
                {initials(c.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-slate-100">{c.name}</p>
                <p className="truncate font-mono text-[11px] text-steel/60">
                  {c.role} · {c.phone}
                </p>
              </div>
              <span className="shrink-0 rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-300 ring-1 ring-line">
                Ready
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
