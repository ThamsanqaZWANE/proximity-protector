import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { mapsLink, useSafety } from "@/lib/safety";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Speed & Location Tracker — A.A Private Security" },
      {
        name: "description",
        content:
          "Live GPS speed tracking with automatic crash detection: a sudden stop after high-speed travel raises an alert to the A.A Private Security team.",
      },
      { property: "og:title", content: "Speed & Location Tracker — A.A Private Security" },
      {
        property: "og:description",
        content:
          "Live GPS speed, coordinates and crash detection for A.A Private Security members on the road.",
      },
    ],
  }),
  component: TrackScreen,
});

function TrackScreen() {
  const {
    tracking,
    startTracking,
    stopTracking,
    speedKmh,
    peakKmh,
    coords,
    history,
    geoError,
    raise,
  } = useSafety();

  const link = mapsLink(coords);
  const bars = history.slice(-24);

  return (
    <AppShell>
      <div className="space-y-5 px-6">
        <section className="rounded-[13px] bg-panel p-4 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel/70">
              Live speed
            </span>
            <span
              className={`font-mono text-[11px] uppercase tracking-[0.14em] ${
                tracking ? "text-amber" : "text-steel/60"
              }`}
            >
              {tracking ? "Streaming" : "Paused"}
            </span>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-mono text-6xl leading-none tabular-nums">
              {String(speedKmh).padStart(3, "0")}
            </span>
            <span className="pb-2 font-mono text-sm text-steel/60">km/h</span>
          </div>
          <div className="mt-4 flex h-20 items-end gap-1" aria-hidden="true">
            {(bars.length ? bars : Array.from({ length: 24 }, () => ({ kmh: 0 }))).map((s, i) => (
              <span
                key={i}
                className={`flex-1 rounded-sm ${
                  s.kmh >= 45 ? "bg-amber" : s.kmh <= 6 ? "bg-alarm/60" : "bg-steel/50"
                }`}
                style={{ height: `${Math.max(4, Math.min(100, s.kmh))}%` }}
              />
            ))}
          </div>
          <p className="mt-3 font-mono text-[11px] text-steel/60">
            Fast travel above 45 km/h followed by an immediate stop raises a crash alert.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[11px] bg-panel p-3 ring-1 ring-line">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-steel/70">
              Latitude
            </p>
            <p className="mt-1 font-mono text-[15px] tabular-nums">
              {coords ? coords.lat.toFixed(5) : "—"}
            </p>
          </div>
          <div className="rounded-[11px] bg-panel p-3 ring-1 ring-line">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-steel/70">
              Longitude
            </p>
            <p className="mt-1 font-mono text-[15px] tabular-nums">
              {coords ? coords.lon.toFixed(5) : "—"}
            </p>
          </div>
          <div className="rounded-[11px] bg-panel p-3 ring-1 ring-line">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-steel/70">
              Accuracy
            </p>
            <p className="mt-1 font-mono text-[15px]">{coords ? `±${coords.accuracy} m` : "—"}</p>
          </div>
          <div className="rounded-[11px] bg-panel p-3 ring-1 ring-line">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-steel/70">
              Peak speed
            </p>
            <p className="mt-1 font-mono text-[15px] tabular-nums">{peakKmh} km/h</p>
          </div>
        </section>

        {geoError ? (
          <p className="rounded-[11px] bg-panel2 p-3 font-mono text-[11px] text-alarm ring-1 ring-alarm/40">
            {geoError}
          </p>
        ) : null}

        <section className="space-y-2">
          <button
            onClick={tracking ? stopTracking : startTracking}
            className="w-full rounded-[11px] bg-alarm py-4 text-sm font-semibold tracking-wide text-alarm-foreground ring-1 ring-alarm/40"
          >
            {tracking ? "Stop tracking" : "Start tracking"}
          </button>
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="block rounded-[11px] bg-panel py-3.5 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-steel ring-1 ring-line"
            >
              Open current position on map
            </a>
          ) : null}
          <button
            onClick={() => raise("crash")}
            className="w-full rounded-[11px] bg-panel py-3.5 font-mono text-[11px] uppercase tracking-[0.16em] text-steel ring-1 ring-line"
          >
            Test crash alert
          </button>
        </section>
      </div>
    </AppShell>
  );
}
