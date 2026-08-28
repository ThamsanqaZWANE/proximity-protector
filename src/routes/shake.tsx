import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ALERT_LABEL, formatClock, useSafety } from "@/lib/safety";

export const Route = createFileRoute("/shake")({
  head: () => ({
    meta: [
      { title: "Shake Alert — A.A Private Security" },
      {
        name: "description",
        content:
          "Shake your phone to raise a silent alert. Disable it within 7 minutes or the A.A Private Security team is called to your location automatically.",
      },
      { property: "og:title", content: "Shake Alert — A.A Private Security" },
      {
        property: "og:description",
        content:
          "Shake-to-alert with a 7 minute cancel window before the security team is dispatched to your phone's location.",
      },
    ],
  }),
  component: ShakeScreen,
});

function ShakeScreen() {
  const {
    shakeArmed,
    setShakeArmed,
    shakeSupported,
    shakeError,
    requestShakePermission,
    jolt,
    raise,
    alert,
    secondsLeft,
    log,
  } = useSafety();

  return (
    <AppShell>
      <div className="space-y-5 px-6">
        <section className="rounded-[13px] bg-panel p-4 ring-1 ring-line">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-steel/70">
                Shake report
              </p>
              <p className="mt-1 text-[13px] text-slate-200">
                {shakeArmed ? "Armed — shake to alert" : "Disarmed"}
              </p>
            </div>
            <button
              onClick={() => setShakeArmed(!shakeArmed)}
              aria-pressed={shakeArmed}
              className={`h-8 w-14 shrink-0 rounded-full ring-1 transition-colors ${
                shakeArmed ? "bg-alarm ring-alarm/40" : "bg-panel2 ring-line"
              }`}
            >
              <span
                className={`block size-6 rounded-full bg-slate-100 transition-transform ${
                  shakeArmed ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <p className="mt-3 font-mono text-[11px] leading-relaxed text-steel/60">
            When a shake is detected you have 7 minutes to disable the alert. If you do not, the
            team is called to your phone's location.
          </p>
          <div className="mt-4">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-steel/60">
              <span>Motion</span>
              <span>{jolt.toFixed(1)} m/s²</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel2">
              <div
                className="h-full bg-amber transition-[width] duration-150"
                style={{ width: `${Math.min(100, (jolt / 40) * 100)}%` }}
              />
            </div>
          </div>
          {!shakeSupported ? (
            <p className="mt-3 font-mono text-[11px] text-amber">
              This device reports no motion sensor — use the SOS button instead.
            </p>
          ) : null}
          {shakeError ? (
            <p className="mt-3 font-mono text-[11px] text-alarm">{shakeError}</p>
          ) : null}
          <div className="mt-4 space-y-2">
            <button
              onClick={requestShakePermission}
              className="w-full rounded-[11px] bg-panel2 py-3.5 font-mono text-[11px] uppercase tracking-[0.16em] text-steel ring-1 ring-line"
            >
              Enable motion access
            </button>
            <button
              onClick={() => raise("shake")}
              className="w-full rounded-[11px] bg-alarm py-3.5 text-sm font-semibold tracking-wide text-alarm-foreground ring-1 ring-alarm/40"
            >
              Simulate shake alert
            </button>
          </div>
        </section>

        {alert ? (
          <section className="rounded-[13px] bg-panel2 p-4 ring-1 ring-alarm/45">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <span className="size-2 rounded-full bg-alarm tick-blink" />
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-alarm">
                  {ALERT_LABEL[alert.kind]}
                </span>
              </span>
              <span className="font-mono text-[13px] text-alarm">{formatClock(secondsLeft)}</span>
            </div>
          </section>
        ) : null}

        <section>
          <p className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-steel/70">
            Alert history
          </p>
          {log.length === 0 ? (
            <p className="rounded-[13px] bg-panel p-4 font-mono text-[11px] text-steel/60 ring-1 ring-line">
              No alerts recorded on this device.
            </p>
          ) : (
            <div className="divide-y divide-line overflow-hidden rounded-[13px] bg-panel ring-1 ring-line">
              {log.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 p-3">
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      entry.outcome === "dispatched" ? "bg-alarm" : "bg-steel/50"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-slate-100">{ALERT_LABEL[entry.kind]}</p>
                    <p className="truncate font-mono text-[11px] text-steel/60">
                      {new Date(entry.at).toLocaleString("en-GB", { hour12: false })}
                      {entry.coords
                        ? ` · ${entry.coords.lat.toFixed(3)}, ${entry.coords.lon.toFixed(3)}`
                        : " · no GPS fix"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ring-1 ${
                      entry.outcome === "dispatched"
                        ? "text-alarm ring-alarm/40"
                        : "text-steel ring-line"
                    }`}
                  >
                    {entry.outcome}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
