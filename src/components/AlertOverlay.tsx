import { ALERT_LABEL, formatClock, initials, mapsLink, useSafety } from "@/lib/safety";

export function AlertOverlay() {
  const { alert, secondsLeft, cancel, dispatchNow, contacts } = useSafety();
  if (!alert) return null;

  const progress = 1 - secondsLeft / alert.window;
  const link = mapsLink(alert.coords);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/95 px-6 pt-10 pb-8 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-alarm tick-blink" />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-alarm">
            {ALERT_LABEL[alert.kind]}
          </span>
        </div>

        <p className="mt-3 text-[15px] leading-relaxed text-slate-200">
          The security team and your contacts will be dispatched to your location when the
          countdown ends. Cancel now if you are safe.
        </p>

        <div className="relative mx-auto mt-8 size-56 shrink-0">
          <div className="absolute inset-0 rounded-full ring-2 ring-line" />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(var(--alarm) ${progress * 360}deg, transparent 0deg)`,
              mask: "radial-gradient(circle, transparent 92px, black 94px)",
              WebkitMask: "radial-gradient(circle, transparent 92px, black 94px)",
            }}
          />
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="font-mono text-5xl leading-none text-alarm">
                {formatClock(secondsLeft)}
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-steel/70">
                To dispatch
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[13px] bg-panel p-4 ring-1 ring-line">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-steel/70">
            Location shared
          </p>
          {alert.coords ? (
            <>
              <p className="mt-1 font-mono text-[13px] text-slate-100">
                {alert.coords.lat.toFixed(5)}, {alert.coords.lon.toFixed(5)} · ±
                {alert.coords.accuracy} m
              </p>
              {link ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block font-mono text-[11px] uppercase tracking-[0.14em] text-amber"
                >
                  Open on map →
                </a>
              ) : null}
            </>
          ) : (
            <p className="mt-1 font-mono text-[13px] text-amber">
              No GPS fix — last known position unavailable
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {contacts.map((c) => (
              <span
                key={c.id}
                className="rounded-full bg-panel2 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-steel ring-1 ring-line"
              >
                {initials(c.name)} notified
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-2 pt-6">
          <button
            onClick={cancel}
            className="w-full rounded-[11px] bg-alarm py-4 text-sm font-semibold tracking-wide text-alarm-foreground ring-1 ring-alarm/40"
          >
            Cancel dispatch
          </button>
          <button
            onClick={dispatchNow}
            className="w-full rounded-[11px] bg-panel py-3.5 font-mono text-[11px] uppercase tracking-[0.16em] text-steel ring-1 ring-line"
          >
            Dispatch immediately
          </button>
        </div>
      </div>
    </div>
  );
}
